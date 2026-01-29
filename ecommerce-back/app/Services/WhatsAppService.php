<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Servicio para envío de mensajes y documentos por WhatsApp
 * Soporta múltiples proveedores: Twilio, Meta WhatsApp Business API, etc.
 */
class WhatsAppService
{
    private $provider;
    private $apiUrl;
    private $apiToken;
    private $fromNumber;

    public function __construct()
    {
        $this->provider = env('WHATSAPP_PROVIDER', 'twilio'); // twilio, meta, custom
        $this->apiUrl = env('WHATSAPP_API_URL');
        $this->apiToken = env('WHATSAPP_API_TOKEN');
        $this->fromNumber = env('WHATSAPP_FROM_NUMBER');
    }

    /**
     * Enviar mensaje de texto simple
     */
    public function enviarMensaje($telefono, $mensaje)
    {
        try {
            $telefono = $this->formatearTelefono($telefono);

            Log::info('Enviando mensaje WhatsApp', [
                'telefono' => $telefono,
                'provider' => $this->provider
            ]);

            switch ($this->provider) {
                case 'twilio':
                    return $this->enviarTwilio($telefono, $mensaje);
                case 'meta':
                    return $this->enviarMeta($telefono, $mensaje);
                case 'custom':
                    return $this->enviarCustom($telefono, $mensaje);
                default:
                    throw new \Exception('Proveedor de WhatsApp no soportado: ' . $this->provider);
            }

        } catch (\Exception $e) {
            Log::error('Error enviando WhatsApp', [
                'telefono' => $telefono,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Enviar comprobante (PDF + mensaje)
     */
    public function enviarComprobante($comprobante, $telefono)
    {
        try {
            $telefono = $this->formatearTelefono($telefono);

            $tipoDoc = $comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta';
            $numero = $comprobante->serie . '-' . str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT);

            // Mensaje
            $mensaje = "✅ *{$tipoDoc} Electrónica*\n\n";
            $mensaje .= "📄 Número: *{$numero}*\n";
            $mensaje .= "👤 Cliente: {$comprobante->cliente_razon_social}\n";
            $mensaje .= "💰 Total: S/ " . number_format($comprobante->importe_total, 2) . "\n";
            $mensaje .= "📅 Fecha: " . \Carbon\Carbon::parse($comprobante->fecha_emision)->format('d/m/Y') . "\n\n";

            if ($comprobante->estado === 'ACEPTADO') {
                $mensaje .= "✓ *Aceptado por SUNAT*\n\n";
            }

            $mensaje .= "Adjunto encontrará su comprobante en PDF.\n\n";
            $mensaje .= "Gracias por su preferencia.";

            // Enviar mensaje primero
            $this->enviarMensaje($telefono, $mensaje);

            // Luego enviar el PDF si existe
            if ($comprobante->pdf_base64) {
                $this->enviarDocumento($telefono, $comprobante->pdf_base64, "{$tipoDoc}_{$numero}.pdf");
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Error enviando comprobante por WhatsApp', [
                'comprobante_id' => $comprobante->id,
                'telefono' => $telefono,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Enviar documento (PDF, XML, imagen)
     */
    public function enviarDocumento($telefono, $contenidoBase64, $nombreArchivo, $caption = null)
    {
        try {
            $telefono = $this->formatearTelefono($telefono);

            Log::info('Enviando documento WhatsApp', [
                'telefono' => $telefono,
                'archivo' => $nombreArchivo,
                'provider' => $this->provider
            ]);

            switch ($this->provider) {
                case 'twilio':
                    return $this->enviarDocumentoTwilio($telefono, $contenidoBase64, $nombreArchivo, $caption);
                case 'meta':
                    return $this->enviarDocumentoMeta($telefono, $contenidoBase64, $nombreArchivo, $caption);
                case 'custom':
                    return $this->enviarDocumentoCustom($telefono, $contenidoBase64, $nombreArchivo, $caption);
                default:
                    throw new \Exception('Proveedor de WhatsApp no soportado');
            }

        } catch (\Exception $e) {
            Log::error('Error enviando documento por WhatsApp', [
                'telefono' => $telefono,
                'archivo' => $nombreArchivo,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Enviar mediante Twilio
     */
    private function enviarTwilio($telefono, $mensaje)
    {
        $accountSid = env('TWILIO_ACCOUNT_SID');
        $authToken = env('TWILIO_AUTH_TOKEN');
        $from = env('TWILIO_WHATSAPP_FROM'); // Ej: whatsapp:+14155238886

        if (!$accountSid || !$authToken || !$from) {
            throw new \Exception('Credenciales de Twilio no configuradas');
        }

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'From' => $from,
                'To' => 'whatsapp:' . $telefono,
                'Body' => $mensaje
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error Twilio: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Enviar documento mediante Twilio
     */
    private function enviarDocumentoTwilio($telefono, $contenidoBase64, $nombreArchivo, $caption)
    {
        $accountSid = env('TWILIO_ACCOUNT_SID');
        $authToken = env('TWILIO_AUTH_TOKEN');
        $from = env('TWILIO_WHATSAPP_FROM');

        // Guardar temporalmente el archivo
        $tempPath = storage_path('app/temp/' . $nombreArchivo);
        file_put_contents($tempPath, base64_decode($contenidoBase64));

        // Subir a un servidor público temporal (Twilio requiere URL pública)
        // Alternativa: usar Storage::cloud() si tienes S3 configurado
        $publicUrl = $this->subirArchivoTemporal($tempPath, $nombreArchivo);

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'From' => $from,
                'To' => 'whatsapp:' . $telefono,
                'Body' => $caption ?? 'Documento adjunto',
                'MediaUrl' => $publicUrl
            ]);

        // Limpiar archivo temporal
        unlink($tempPath);

        if (!$response->successful()) {
            throw new \Exception('Error Twilio documento: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Enviar mediante Meta WhatsApp Business API
     */
    private function enviarMeta($telefono, $mensaje)
    {
        $apiToken = env('META_WHATSAPP_TOKEN');
        $phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');

        if (!$apiToken || !$phoneNumberId) {
            throw new \Exception('Credenciales de Meta WhatsApp no configuradas');
        }

        $url = "https://graph.facebook.com/v18.0/{$phoneNumberId}/messages";

        $response = Http::withToken($apiToken)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $telefono,
                'type' => 'text',
                'text' => [
                    'body' => $mensaje
                ]
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error Meta WhatsApp: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Enviar documento mediante Meta WhatsApp Business API
     */
    private function enviarDocumentoMeta($telefono, $contenidoBase64, $nombreArchivo, $caption)
    {
        $apiToken = env('META_WHATSAPP_TOKEN');
        $phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');

        // 1. Subir el documento primero
        $url = "https://graph.facebook.com/v18.0/{$phoneNumberId}/media";

        $tempPath = storage_path('app/temp/' . $nombreArchivo);
        file_put_contents($tempPath, base64_decode($contenidoBase64));

        $uploadResponse = Http::withToken($apiToken)
            ->attach('file', file_get_contents($tempPath), $nombreArchivo)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'type' => 'application/pdf'
            ]);

        unlink($tempPath);

        if (!$uploadResponse->successful()) {
            throw new \Exception('Error subiendo documento a Meta: ' . $uploadResponse->body());
        }

        $mediaId = $uploadResponse->json('id');

        // 2. Enviar el mensaje con el documento
        $url = "https://graph.facebook.com/v18.0/{$phoneNumberId}/messages";

        $response = Http::withToken($apiToken)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $telefono,
                'type' => 'document',
                'document' => [
                    'id' => $mediaId,
                    'caption' => $caption,
                    'filename' => $nombreArchivo
                ]
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error enviando documento Meta: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Enviar mediante API personalizada
     */
    private function enviarCustom($telefono, $mensaje)
    {
        if (!$this->apiUrl || !$this->apiToken) {
            throw new \Exception('API personalizada no configurada');
        }

        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl, [
                'phone' => $telefono,
                'message' => $mensaje
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error API personalizada: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Enviar documento mediante API personalizada
     */
    private function enviarDocumentoCustom($telefono, $contenidoBase64, $nombreArchivo, $caption)
    {
        if (!$this->apiUrl || !$this->apiToken) {
            throw new \Exception('API personalizada no configurada');
        }

        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl . '/document', [
                'phone' => $telefono,
                'document_base64' => $contenidoBase64,
                'filename' => $nombreArchivo,
                'caption' => $caption
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error API personalizada documento: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Formatear número de teléfono a formato internacional
     */
    private function formatearTelefono($telefono)
    {
        // Remover espacios, guiones y paréntesis
        $telefono = preg_replace('/[\s\-\(\)]/', '', $telefono);

        // Si no empieza con +, agregar código de país (Perú +51 por defecto)
        if (!str_starts_with($telefono, '+')) {
            $codigoPais = env('WHATSAPP_DEFAULT_COUNTRY_CODE', '+51');

            // Si empieza con 0, removerlo
            if (str_starts_with($telefono, '0')) {
                $telefono = substr($telefono, 1);
            }

            $telefono = $codigoPais . $telefono;
        }

        return $telefono;
    }

    /**
     * Subir archivo temporal a storage público
     * (Puedes modificar esto para usar S3 o cualquier storage público)
     */
    private function subirArchivoTemporal($rutaLocal, $nombreArchivo)
    {
        // Opción 1: Subir a storage/app/public (accesible vía URL pública)
        $rutaPublica = 'temp_whatsapp/' . $nombreArchivo;
        Storage::disk('public')->put($rutaPublica, file_get_contents($rutaLocal));

        // Retornar URL pública
        return url('storage/' . $rutaPublica);

        // Opción 2: Si tienes S3 configurado
        // Storage::disk('s3')->put($rutaPublica, file_get_contents($rutaLocal), 'public');
        // return Storage::disk('s3')->url($rutaPublica);
    }

    /**
     * Verificar si WhatsApp está habilitado
     */
    public static function estaHabilitado()
    {
        return env('WHATSAPP_ENABLED', false) === true || env('WHATSAPP_ENABLED', false) === 'true';
    }

    /**
     * Enviar notificación de venta
     */
    public function notificarVenta($venta, $telefono)
    {
        $mensaje = "🛒 *Nueva Venta Registrada*\n\n";
        $mensaje .= "📋 Venta #" . ($venta->numero_venta ?? $venta->id) . "\n";
        $mensaje .= "💰 Total: S/ " . number_format($venta->total, 2) . "\n";
        $mensaje .= "📅 " . $venta->created_at->format('d/m/Y H:i') . "\n\n";
        $mensaje .= "Gracias por su compra.";

        return $this->enviarMensaje($telefono, $mensaje);
    }

    /**
     * Recordatorio de pago
     */
    public function recordatorioPago($cuentaPorCobrar, $telefono)
    {
        $diasVencidos = now()->diffInDays($cuentaPorCobrar->fecha_vencimiento, false);
        $estado = $diasVencidos < 0 ? '⚠️ VENCIDA' : '⏰ POR VENCER';

        $mensaje = "{$estado}\n\n";
        $mensaje .= "📄 Documento: {$cuentaPorCobrar->numero_documento}\n";
        $mensaje .= "💵 Saldo: S/ " . number_format($cuentaPorCobrar->saldo_pendiente, 2) . "\n";
        $mensaje .= "📅 Vencimiento: " . $cuentaPorCobrar->fecha_vencimiento->format('d/m/Y') . "\n";

        if ($diasVencidos < 0) {
            $mensaje .= "⚠️ Días vencidos: " . abs($diasVencidos) . "\n";
        }

        $mensaje .= "\nPor favor, proceda con el pago a la brevedad.";

        return $this->enviarMensaje($telefono, $mensaje);
    }
}
