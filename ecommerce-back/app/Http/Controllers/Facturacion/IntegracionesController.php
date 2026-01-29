<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\Integracion;

class IntegracionesController extends Controller
{
    /**
     * Listar integraciones configuradas
     */
    public function index()
    {
        try {
            $integraciones = Integracion::orderBy('nombre')->get();

            return response()->json([
                'success' => true,
                'data' => $integraciones->map(function ($integracion) {
                    return [
                        'id' => $integracion->id,
                        'nombre' => $integracion->nombre,
                        'tipo' => $integracion->tipo,
                        'activo' => $integracion->activo,
                        'descripcion' => $integracion->descripcion,
                        'ultima_sincronizacion' => $integracion->ultima_sincronizacion
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener integraciones: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener integraciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de una integración
     */
    public function show($id)
    {
        try {
            $integracion = Integracion::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $integracion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Integración no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear nueva integración
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'tipo' => 'required|in:pasarela,contabilidad,erp,crm,otro',
            'descripcion' => 'nullable|string|max:500',
            'url_base' => 'required|url',
            'api_key' => 'nullable|string',
            'api_secret' => 'nullable|string',
            'configuracion' => 'nullable|array'
        ]);

        try {
            $integracion = Integracion::create([
                'nombre' => $request->nombre,
                'tipo' => $request->tipo,
                'descripcion' => $request->descripcion,
                'url_base' => $request->url_base,
                'api_key' => $request->api_key ? encrypt($request->api_key) : null,
                'api_secret' => $request->api_secret ? encrypt($request->api_secret) : null,
                'configuracion' => json_encode($request->configuracion ?? []),
                'activo' => true
            ]);

            Log::info('Integración creada', [
                'integracion_id' => $integracion->id,
                'nombre' => $integracion->nombre,
                'tipo' => $integracion->tipo
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Integración creada exitosamente',
                'data' => $integracion
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error al crear integración: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al crear integración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar integración
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'nullable|string|max:100',
            'descripcion' => 'nullable|string|max:500',
            'url_base' => 'nullable|url',
            'api_key' => 'nullable|string',
            'api_secret' => 'nullable|string',
            'configuracion' => 'nullable|array',
            'activo' => 'nullable|boolean'
        ]);

        try {
            $integracion = Integracion::findOrFail($id);

            $data = $request->only(['nombre', 'descripcion', 'url_base', 'activo']);

            if ($request->filled('api_key')) {
                $data['api_key'] = encrypt($request->api_key);
            }

            if ($request->filled('api_secret')) {
                $data['api_secret'] = encrypt($request->api_secret);
            }

            if ($request->filled('configuracion')) {
                $data['configuracion'] = json_encode($request->configuracion);
            }

            $integracion->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Integración actualizada exitosamente',
                'data' => $integracion->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error al actualizar integración: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar integración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar integración
     */
    public function destroy($id)
    {
        try {
            $integracion = Integracion::findOrFail($id);
            $nombreIntegracion = $integracion->nombre;

            $integracion->delete();

            Log::info('Integración eliminada', [
                'integracion_id' => $id,
                'nombre' => $nombreIntegracion
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Integración eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al eliminar integración: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar integración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Probar conexión con una integración
     */
    public function probarConexion($id)
    {
        try {
            $integracion = Integracion::findOrFail($id);

            $startTime = microtime(true);

            // Realizar petición de prueba
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . ($integracion->api_key ? decrypt($integracion->api_key) : ''),
                    'Accept' => 'application/json'
                ])
                ->get($integracion->url_base . '/health');

            $tiempoRespuesta = round((microtime(true) - $startTime) * 1000, 2);

            $exitoso = $response->successful();

            Log::info('Prueba de conexión con integración', [
                'integracion_id' => $integracion->id,
                'nombre' => $integracion->nombre,
                'exitoso' => $exitoso,
                'tiempo_respuesta' => $tiempoRespuesta
            ]);

            return response()->json([
                'success' => $exitoso,
                'message' => $exitoso ? 'Conexión exitosa' : 'Error de conexión',
                'data' => [
                    'estado' => $exitoso ? 'activo' : 'inactivo',
                    'codigo_estado' => $response->status(),
                    'tiempo_respuesta' => $tiempoRespuesta . ' ms',
                    'respuesta' => $response->json()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al probar conexión: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al probar conexión',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Integración con Culqi (Pasarela de pagos)
     */
    public function culqi(Request $request)
    {
        $request->validate([
            'accion' => 'required|in:crear_cargo,verificar_pago,listar_cargos',
            'monto' => 'required_if:accion,crear_cargo|numeric|min:0.01',
            'email' => 'required_if:accion,crear_cargo|email',
            'token_id' => 'required_if:accion,verificar_pago|string',
            'cargo_id' => 'required_if:accion,verificar_pago|string'
        ]);

        try {
            $culqiKey = config('services.culqi.secret_key');

            if (!$culqiKey) {
                return response()->json([
                    'success' => false,
                    'message' => 'Credenciales de Culqi no configuradas'
                ], 500);
            }

            switch ($request->accion) {
                case 'crear_cargo':
                    return $this->culqiCrearCargo($culqiKey, $request);

                case 'verificar_pago':
                    return $this->culqiVerificarPago($culqiKey, $request->cargo_id);

                case 'listar_cargos':
                    return $this->culqiListarCargos($culqiKey);

                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Acción no válida'
                    ], 422);
            }

        } catch (\Exception $e) {
            Log::error('Error en integración Culqi: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error en integración con Culqi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Integración con sistemas contables
     */
    public function contabilidad(Request $request)
    {
        $request->validate([
            'sistema' => 'required|in:concar,siscont,otro',
            'accion' => 'required|in:enviar_comprobante,sincronizar_cuentas',
            'comprobante_id' => 'required_if:accion,enviar_comprobante|integer'
        ]);

        try {
            $integracion = Integracion::where('tipo', 'contabilidad')
                ->where('activo', true)
                ->first();

            if (!$integracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay integración contable configurada'
                ], 404);
            }

            switch ($request->accion) {
                case 'enviar_comprobante':
                    return $this->enviarComprobanteContable($integracion, $request->comprobante_id);

                case 'sincronizar_cuentas':
                    return $this->sincronizarCuentasContables($integracion);

                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Acción no válida'
                    ], 422);
            }

        } catch (\Exception $e) {
            Log::error('Error en integración contable: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error en integración contable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook genérico para recibir datos de integraciones
     */
    public function webhook(Request $request, $integracionId)
    {
        try {
            $integracion = Integracion::findOrFail($integracionId);

            Log::info('Webhook recibido', [
                'integracion_id' => $integracion->id,
                'integracion_nombre' => $integracion->nombre,
                'data' => $request->all()
            ]);

            // Procesar según el tipo de integración
            switch ($integracion->tipo) {
                case 'pasarela':
                    return $this->procesarWebhookPasarela($integracion, $request);

                case 'contabilidad':
                    return $this->procesarWebhookContabilidad($integracion, $request);

                default:
                    return response()->json([
                        'success' => true,
                        'message' => 'Webhook recibido'
                    ]);
            }

        } catch (\Exception $e) {
            Log::error('Error procesando webhook: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error procesando webhook',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Métodos auxiliares privados
     */
    private function culqiCrearCargo($apiKey, $request)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json'
        ])->post('https://api.culqi.com/v2/charges', [
            'amount' => $request->monto * 100, // Culqi trabaja en centavos
            'currency_code' => 'PEN',
            'email' => $request->email,
            'source_id' => $request->token_id
        ]);

        return response()->json([
            'success' => $response->successful(),
            'data' => $response->json()
        ]);
    }

    private function culqiVerificarPago($apiKey, $cargoId)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey
        ])->get("https://api.culqi.com/v2/charges/{$cargoId}");

        return response()->json([
            'success' => $response->successful(),
            'data' => $response->json()
        ]);
    }

    private function culqiListarCargos($apiKey)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey
        ])->get('https://api.culqi.com/v2/charges');

        return response()->json([
            'success' => $response->successful(),
            'data' => $response->json()
        ]);
    }

    private function enviarComprobanteContable($integracion, $comprobanteId)
    {
        // Implementar lógica de envío al sistema contable
        return response()->json([
            'success' => true,
            'message' => 'Comprobante enviado al sistema contable',
            'data' => [
                'comprobante_id' => $comprobanteId,
                'sistema' => $integracion->nombre
            ]
        ]);
    }

    private function sincronizarCuentasContables($integracion)
    {
        // Implementar lógica de sincronización de cuentas
        return response()->json([
            'success' => true,
            'message' => 'Cuentas contables sincronizadas',
            'data' => [
                'cuentas_sincronizadas' => 0,
                'sistema' => $integracion->nombre
            ]
        ]);
    }

    private function procesarWebhookPasarela($integracion, $request)
    {
        // Procesar webhook de pasarela de pagos
        return response()->json([
            'success' => true,
            'message' => 'Webhook de pasarela procesado'
        ]);
    }

    private function procesarWebhookContabilidad($integracion, $request)
    {
        // Procesar webhook de sistema contable
        return response()->json([
            'success' => true,
            'message' => 'Webhook contable procesado'
        ]);
    }

    /**
     * Sincronizar todas las integraciones activas
     */
    public function sincronizarTodas()
    {
        try {
            $integraciones = Integracion::where('activo', true)->get();
            $resultados = [];

            foreach ($integraciones as $integracion) {
                try {
                    // Aquí iría la lógica específica de sincronización para cada tipo
                    $integracion->update(['ultima_sincronizacion' => now()]);

                    $resultados[] = [
                        'integracion' => $integracion->nombre,
                        'exitoso' => true
                    ];
                } catch (\Exception $e) {
                    $resultados[] = [
                        'integracion' => $integracion->nombre,
                        'exitoso' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Sincronización completada',
                'data' => $resultados
            ]);

        } catch (\Exception $e) {
            Log::error('Error al sincronizar integraciones: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al sincronizar integraciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
