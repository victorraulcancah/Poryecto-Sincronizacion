<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Events\OnPaymentConfirmed;
use App\Models\Compra;
use App\Models\CompraTracking;
use App\Models\Pago;
use App\Models\User;
use App\Services\FacturacionComprasService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class WebhookController extends Controller
{
    /**
     * Webhook para recibir notificaciones de pago confirmado
     */
    public function webhookPago(Request $request): JsonResponse
    {
        try {
            Log::info("Webhook de pago recibido", [
                'headers' => $request->headers->all(),
                'body' => $request->all()
            ]);

            // Validar datos del webhook
            $validator = Validator::make($request->all(), [
                'compra_id' => 'required|integer|exists:compras,id',
                'estado_pago' => 'required|string|in:confirmado,aprobado,completado',
                'metodo_pago' => 'required|string',
                'referencia_pago' => 'nullable|string',
                'monto' => 'required|numeric|min:0',
                'fecha_pago' => 'required|date',
                'signature' => 'nullable|string' // Para validar autenticidad del webhook
            ]);

            if ($validator->fails()) {
                Log::warning("Webhook de pago con datos inválidos", [
                    'errors' => $validator->errors()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Datos del webhook inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // Buscar la compra
            $compra = Compra::with('user')->findOrFail($data['compra_id']);

            // Verificar que la compra esté en estado apropiado
            if ($compra->estado_compra_id !== 2) { // Debe estar aprobada
                Log::warning("Compra no está en estado apropiado para procesar pago", [
                    'compra_id' => $compra->id,
                    'estado_actual' => $compra->estado_compra_id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'La compra no está en estado apropiado para procesar el pago'
                ], 422);
            }

            // Verificar que el monto coincida
            if (abs($compra->total - $data['monto']) > 0.01) {
                Log::warning("Monto del webhook no coincide con el total de la compra", [
                    'compra_id' => $compra->id,
                    'monto_compra' => $compra->total,
                    'monto_webhook' => $data['monto']
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'El monto del pago no coincide con el total de la compra'
                ], 422);
            }

            // Validar firma del webhook (opcional, para seguridad)
            if (isset($data['signature']) && !$this->validarFirmaWebhook($request, $data['signature'])) {
                Log::warning("Firma del webhook inválida", [
                    'compra_id' => $compra->id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Firma del webhook inválida'
                ], 401);
            }

            DB::beginTransaction();

            // Actualizar estado de la compra a pagada
            $compra->update([
                'estado_compra_id' => 3, // Pagada
                'metodo_pago' => $data['metodo_pago']
            ]);

            // Crear registro de pago
            Pago::create([
                'compra_id' => $compra->id,
                'metodo_pago' => $data['metodo_pago'],
                'monto' => $data['monto'],
                'moneda' => 'PEN',
                'referencia_pago' => $data['referencia_pago'] ?? null,
                'estado' => 'APROBADO',
                'fecha_pago' => $data['fecha_pago'],
                'fecha_confirmacion' => now(),
                'datos_adicionales' => json_encode($request->all()),
                'ip_origen' => $request->ip()
            ]);

            // Crear tracking
            CompraTracking::crearRegistro(
                $compra->id,
                3,
                "Pago confirmado vía {$data['metodo_pago']} - Webhook. Ref: " . ($data['referencia_pago'] ?? 'N/A'),
                null
            );

            DB::commit();

            // Disparar evento de pago confirmado
            event(new OnPaymentConfirmed(
                $compra,
                $compra->user,
                $data['metodo_pago'],
                $data['referencia_pago'] ?? null
            ));

            // FACTURACIÓN AUTOMÁTICA - Si requiere factura, generarla
            $resultadoFacturacion = null;
            if ($compra->requiereFacturacion()) {
                try {
                    $facturacionService = app(FacturacionComprasService::class);
                    $resultadoFacturacion = $facturacionService->generarComprobanteAutomatico($compra);

                    if ($resultadoFacturacion['success']) {
                        Log::info('Comprobante generado automáticamente desde webhook', [
                            'compra_id' => $compra->id,
                            'comprobante_id' => $resultadoFacturacion['comprobante']->id,
                            'numero' => $resultadoFacturacion['comprobante']->serie . '-' . $resultadoFacturacion['comprobante']->correlativo
                        ]);
                    } else {
                        Log::warning('Falló facturación automática desde webhook', [
                            'compra_id' => $compra->id,
                            'error' => $resultadoFacturacion['error'] ?? 'Error desconocido'
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Error en facturación automática desde webhook', [
                        'compra_id' => $compra->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info("Webhook de pago procesado exitosamente", [
                'compra_id' => $compra->id,
                'cliente_id' => $compra->user->id ?? $compra->user_cliente_id,
                'monto' => $data['monto'],
                'factura_generada' => $resultadoFacturacion ? $resultadoFacturacion['success'] : false
            ]);

            $respuesta = [
                'success' => true,
                'message' => 'Pago procesado exitosamente',
                'compra_id' => $compra->id,
                'estado' => 'pagado'
            ];

            // Agregar información de facturación
            if ($resultadoFacturacion && $resultadoFacturacion['success']) {
                $respuesta['facturacion'] = [
                    'comprobante_generado' => true,
                    'numero_comprobante' => $resultadoFacturacion['comprobante']->serie . '-' . $resultadoFacturacion['comprobante']->correlativo,
                    'estado_sunat' => $resultadoFacturacion['comprobante']->estado
                ];
            } elseif ($resultadoFacturacion && !$resultadoFacturacion['success']) {
                $respuesta['facturacion'] = [
                    'comprobante_generado' => false,
                    'mensaje' => 'El comprobante se procesará en segundo plano'
                ];
            }

            return response()->json($respuesta);

        } catch (\Exception $e) {
            Log::error("Error procesando webhook de pago", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook para Culqi
     */
    public function webhookCulqi(Request $request): JsonResponse
    {
        try {
            Log::info("Webhook Culqi recibido", [
                'headers' => $request->headers->all(),
                'body' => $request->all()
            ]);

            // Validar firma de Culqi
            if (!$this->validarFirmaCulqi($request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Firma de Culqi inválida'
                ], 401);
            }

            $data = $request->all();

            // Buscar compra por referencia
            $compra = Compra::where('referencia_pago', $data['id'])->first();

            if (!$compra) {
                Log::warning("Compra no encontrada para referencia Culqi", [
                    'referencia' => $data['id']
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Compra no encontrada'
                ], 404);
            }

            // Procesar según el estado del cargo
            if ($data['type'] === 'charge.succeeded') {
                return $this->procesarPagoCulqi($compra, $data);
            } elseif ($data['type'] === 'charge.failed') {
                return $this->procesarPagoFallidoCulqi($compra, $data);
            }

            return response()->json([
                'success' => true,
                'message' => 'Webhook procesado'
            ]);

        } catch (\Exception $e) {
            Log::error("Error procesando webhook Culqi", [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Procesar pago exitoso de Culqi
     */
    private function procesarPagoCulqi($compra, $data)
    {
        DB::beginTransaction();

        $compra->update([
            'estado_compra_id' => 3, // Pagada
            'metodo_pago' => 'Culqi'
        ]);

        // Crear registro de pago
        Pago::create([
            'compra_id' => $compra->id,
            'metodo_pago' => 'Culqi',
            'monto' => $data['amount'] / 100, // Culqi envía en centavos
            'moneda' => $data['currency_code'] ?? 'PEN',
            'referencia_pago' => $data['id'],
            'proveedor_pago' => 'Culqi',
            'estado' => 'APROBADO',
            'fecha_pago' => now(),
            'fecha_confirmacion' => now(),
            'datos_adicionales' => json_encode($data)
        ]);

        // Crear tracking
        CompraTracking::crearRegistro(
            $compra->id,
            3,
            "Pago confirmado vía Culqi - Webhook. Cargo ID: {$data['id']}",
            null
        );

        DB::commit();

        // Disparar evento
        event(new OnPaymentConfirmed(
            $compra,
            $compra->user,
            'Culqi',
            $data['id']
        ));

        // FACTURACIÓN AUTOMÁTICA
        $resultadoFacturacion = null;
        if ($compra->requiereFacturacion()) {
            try {
                $facturacionService = app(FacturacionComprasService::class);
                $resultadoFacturacion = $facturacionService->generarComprobanteAutomatico($compra);

                if ($resultadoFacturacion['success']) {
                    Log::info('Comprobante generado desde webhook Culqi', [
                        'compra_id' => $compra->id,
                        'comprobante_id' => $resultadoFacturacion['comprobante']->id
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error en facturación desde webhook Culqi', [
                    'compra_id' => $compra->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $respuesta = [
            'success' => true,
            'message' => 'Pago Culqi procesado exitosamente'
        ];

        if ($resultadoFacturacion && $resultadoFacturacion['success']) {
            $respuesta['facturacion'] = [
                'comprobante_generado' => true,
                'numero_comprobante' => $resultadoFacturacion['comprobante']->serie . '-' . $resultadoFacturacion['comprobante']->correlativo
            ];
        }

        return response()->json($respuesta);
    }

    /**
     * Procesar pago fallido de Culqi
     */
    private function procesarPagoFallidoCulqi($compra, $data)
    {
        $compra->update([
            'estado_compra_id' => 4, // Pago fallido
            'observaciones' => 'Pago fallido: ' . ($data['failure_message'] ?? 'Error desconocido')
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pago fallido registrado'
        ]);
    }

    /**
     * Validar firma del webhook
     */
    private function validarFirmaWebhook(Request $request, string $signature): bool
    {
        $secret = config('services.webhook.secret');
        if (!$secret) {
            return true; // Si no hay secret configurado, permitir
        }

        $payload = $request->getContent();
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Validar firma de Culqi
     */
    private function validarFirmaCulqi(Request $request): bool
    {
        $secret = config('services.culqi.webhook_secret');
        if (!$secret) {
            return true; // Si no hay secret configurado, permitir
        }

        $signature = $request->header('Culqi-Signature');
        $payload = $request->getContent();
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }
}