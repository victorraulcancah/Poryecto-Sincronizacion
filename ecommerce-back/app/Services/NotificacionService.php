<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\PlantillaNotificacion;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificacionService
{
    /**
     * Enviar notificación usando plantilla
     */
    public function enviarConPlantilla($codigoPlantilla, $destinatario, $datos)
    {
        $plantilla = PlantillaNotificacion::where('codigo', $codigoPlantilla)
            ->where('activo', true)
            ->first();

        if (!$plantilla) {
            Log::error("Plantilla no encontrada: {$codigoPlantilla}");
            return false;
        }

        $renderizado = $plantilla->renderizar($datos);

        return $this->enviar([
            'tipo' => $plantilla->tipo,
            'canal' => $plantilla->canal,
            'destinatario' => $destinatario,
            'asunto' => $renderizado['asunto'],
            'mensaje' => $renderizado['contenido'],
            'datos_adicionales' => $datos
        ]);
    }

    /**
     * Enviar notificación
     */
    public function enviar($params)
    {
        // Crear registro de notificación
        $notificacion = Notificacion::create([
            'user_id' => $params['user_id'] ?? null,
            'email' => $params['destinatario']['email'] ?? null,
            'telefono' => $params['destinatario']['telefono'] ?? null,
            'tipo' => $params['tipo'],
            'canal' => $params['canal'],
            'asunto' => $params['asunto'] ?? '',
            'mensaje' => $params['mensaje'],
            'datos_adicionales' => $params['datos_adicionales'] ?? null,
            'estado' => 'PENDIENTE'
        ]);

        // Enviar según el canal
        try {
            switch ($params['canal']) {
                case 'EMAIL':
                    $this->enviarEmail($notificacion);
                    break;
                case 'WHATSAPP':
                    $this->enviarWhatsApp($notificacion);
                    break;
                case 'SMS':
                    $this->enviarSMS($notificacion);
                    break;
            }

            $notificacion->update([
                'estado' => 'ENVIADO',
                'enviado_at' => now()
            ]);

            return true;
        } catch (\Exception $e) {
            $notificacion->update([
                'estado' => 'FALLIDO',
                'error' => $e->getMessage(),
                'intentos' => $notificacion->intentos + 1
            ]);

            Log::error("Error enviando notificación: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Enviar email
     */
    private function enviarEmail($notificacion)
    {
        Mail::raw($notificacion->mensaje, function ($message) use ($notificacion) {
            $message->to($notificacion->email)
                ->subject($notificacion->asunto);
        });
    }

    /**
     * Enviar WhatsApp (usando API de WhatsApp Business)
     */
    private function enviarWhatsApp($notificacion)
    {
        // Configurar según tu proveedor de WhatsApp API
        // Ejemplo con Twilio, Meta WhatsApp Business API, etc.
        
        $apiUrl = env('WHATSAPP_API_URL');
        $apiToken = env('WHATSAPP_API_TOKEN');

        if (!$apiUrl || !$apiToken) {
            throw new \Exception('WhatsApp API no configurada');
        }

        $response = Http::withToken($apiToken)->post($apiUrl, [
            'to' => $notificacion->telefono,
            'message' => $notificacion->mensaje
        ]);

        if (!$response->successful()) {
            throw new \Exception('Error al enviar WhatsApp: ' . $response->body());
        }
    }

    /**
     * Enviar SMS
     */
    private function enviarSMS($notificacion)
    {
        // Configurar según tu proveedor de SMS
        // Ejemplo con Twilio, Nexmo, etc.
        
        $apiUrl = env('SMS_API_URL');
        $apiToken = env('SMS_API_TOKEN');

        if (!$apiUrl || !$apiToken) {
            throw new \Exception('SMS API no configurada');
        }

        $response = Http::withToken($apiToken)->post($apiUrl, [
            'to' => $notificacion->telefono,
            'message' => $notificacion->mensaje
        ]);

        if (!$response->successful()) {
            throw new \Exception('Error al enviar SMS: ' . $response->body());
        }
    }

    /**
     * Notificar venta realizada
     */
    public function notificarVentaRealizada($venta, $cliente)
    {
        $datos = [
            'nombre' => $cliente->nombre_completo ?? $cliente->razon_social,
            'numero_venta' => $venta->numero_venta ?? $venta->id,
            'total' => 'S/ ' . number_format($venta->total, 2),
            'fecha' => $venta->created_at->format('d/m/Y H:i')
        ];

        $destinatario = [
            'email' => $cliente->email,
            'telefono' => $cliente->telefono
        ];

        // Enviar por email
        $this->enviarConPlantilla('VENTA_REALIZADA_EMAIL', $destinatario, $datos);

        // Enviar por WhatsApp si está configurado
        if ($cliente->telefono && env('WHATSAPP_ENABLED')) {
            $this->enviarConPlantilla('VENTA_REALIZADA_WHATSAPP', $destinatario, $datos);
        }
    }

    /**
     * Notificar comprobante generado
     */
    public function notificarComprobanteGenerado($comprobante, $cliente)
    {
        $datos = [
            'nombre' => $cliente->nombre_completo ?? $cliente->razon_social,
            'tipo_comprobante' => $comprobante->tipo_comprobante == '01' ? 'Factura' : 'Boleta',
            'numero' => $comprobante->serie . '-' . $comprobante->correlativo,
            'total' => 'S/ ' . number_format($comprobante->importe_total, 2),
            'link_descarga' => route('api.cliente.descargar-comprobante', $comprobante->id)
        ];

        $destinatario = [
            'email' => $cliente->email ?? $comprobante->cliente_email,
            'telefono' => $cliente->telefono
        ];

        $this->enviarConPlantilla('COMPROBANTE_GENERADO_EMAIL', $destinatario, $datos);

        if ($destinatario['telefono'] && env('WHATSAPP_ENABLED')) {
            $this->enviarConPlantilla('COMPROBANTE_GENERADO_WHATSAPP', $destinatario, $datos);
        }
    }

    /**
     * Recordatorio de pago
     */
    public function recordatorioPago($cuentaPorCobrar, $cliente)
    {
        $diasVencidos = now()->diffInDays($cuentaPorCobrar->fecha_vencimiento, false);

        $datos = [
            'nombre' => $cliente->nombre_completo ?? $cliente->razon_social,
            'numero_documento' => $cuentaPorCobrar->numero_documento,
            'monto' => 'S/ ' . number_format($cuentaPorCobrar->saldo_pendiente, 2),
            'fecha_vencimiento' => $cuentaPorCobrar->fecha_vencimiento->format('d/m/Y'),
            'dias_vencidos' => abs($diasVencidos),
            'estado' => $diasVencidos < 0 ? 'vencida' : 'por vencer'
        ];

        $destinatario = [
            'email' => $cliente->email,
            'telefono' => $cliente->telefono
        ];

        $this->enviarConPlantilla('RECORDATORIO_PAGO_EMAIL', $destinatario, $datos);

        if ($destinatario['telefono'] && env('WHATSAPP_ENABLED')) {
            $this->enviarConPlantilla('RECORDATORIO_PAGO_WHATSAPP', $destinatario, $datos);
        }
    }
}
