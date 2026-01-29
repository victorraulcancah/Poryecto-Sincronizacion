<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SunatLog;
use App\Models\Comprobante;
use Illuminate\Support\Facades\Log;

class HistorialEnviosController extends Controller
{
    /**
     * Listar historial de envíos a SUNAT
     */
    public function index(Request $request)
    {
        try {
            $query = SunatLog::with(['comprobante']);

            // Filtros
            if ($request->filled('comprobante_id')) {
                $query->where('comprobante_id', $request->comprobante_id);
            }

            if ($request->filled('estado')) {
                $query->where('estado_respuesta', $request->estado);
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('created_at', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('created_at', '<=', $request->fecha_hasta);
            }

            if ($request->filled('ticket')) {
                $query->where('ticket', 'LIKE', "%{$request->ticket}%");
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('ticket', 'LIKE', "%{$search}%")
                      ->orWhereHas('comprobante', function ($q) use ($search) {
                          $q->where('numero_completo', 'LIKE', "%{$search}%");
                      });
                });
            }

            $historial = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $historial
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener historial de envíos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener historial de envíos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de un envío
     */
    public function show($id)
    {
        try {
            $envio = SunatLog::with(['comprobante.cliente'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $envio
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Envío no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Obtener historial de envíos de un comprobante específico
     */
    public function historialPorComprobante($comprobanteId)
    {
        try {
            $comprobante = Comprobante::findOrFail($comprobanteId);
            $historial = SunatLog::where('comprobante_id', $comprobanteId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'comprobante' => [
                        'id' => $comprobante->id,
                        'tipo' => $comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta',
                        'numero' => $comprobante->serie . '-' . $comprobante->correlativo,
                        'estado_actual' => $comprobante->estado,
                        'cliente' => $comprobante->cliente_razon_social
                    ],
                    'historial' => $historial->map(function ($log) {
                        return [
                            'id' => $log->id,
                            'fecha' => $log->created_at->format('Y-m-d H:i:s'),
                            'tipo_operacion' => $log->tipo_operacion,
                            'estado' => $log->estado_respuesta,
                            'ticket' => $log->ticket,
                            'codigo_sunat' => $log->codigo_sunat,
                            'mensaje' => $log->mensaje_sunat,
                            'tiempo_respuesta' => $log->tiempo_respuesta_ms ? $log->tiempo_respuesta_ms . ' ms' : 'N/A',
                            'usuario' => $log->user_id,
                            'ip' => $log->ip_origen
                        ];
                    }),
                    'resumen' => [
                        'total_intentos' => $historial->count(),
                        'exitosos' => $historial->where('estado_respuesta', 'ACEPTADO')->count(),
                        'fallidos' => $historial->where('estado_respuesta', 'RECHAZADO')->count(),
                        'pendientes' => $historial->where('estado_respuesta', 'PENDIENTE')->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener historial del comprobante',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estadísticas de envíos a SUNAT
     */
    public function estadisticas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $envios = SunatLog::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();

            $estadisticas = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_envios' => $envios->count(),
                    'exitosos' => $envios->where('estado_respuesta', 'ACEPTADO')->count(),
                    'fallidos' => $envios->where('estado_respuesta', 'RECHAZADO')->count(),
                    'pendientes' => $envios->where('estado_respuesta', 'PENDIENTE')->count(),
                    'tasa_exito' => $envios->count() > 0 ?
                        round(($envios->where('estado_respuesta', 'ACEPTADO')->count() / $envios->count()) * 100, 2) : 0
                ],
                'por_tipo_operacion' => $envios->groupBy('tipo_operacion')->map(function ($grupo) {
                    return [
                        'total' => $grupo->count(),
                        'exitosos' => $grupo->where('estado_respuesta', 'ACEPTADO')->count(),
                        'fallidos' => $grupo->where('estado_respuesta', 'RECHAZADO')->count()
                    ];
                }),
                'tiempos_respuesta' => [
                    'promedio' => round($envios->where('estado_respuesta', 'ACEPTADO')->avg('tiempo_respuesta_ms'), 2),
                    'minimo' => $envios->where('estado_respuesta', 'ACEPTADO')->min('tiempo_respuesta_ms'),
                    'maximo' => $envios->where('estado_respuesta', 'ACEPTADO')->max('tiempo_respuesta_ms')
                ],
                'errores_frecuentes' => $envios->where('estado_respuesta', 'RECHAZADO')
                    ->groupBy('codigo_sunat')
                    ->map(function ($grupo) {
                        return [
                            'cantidad' => $grupo->count(),
                            'codigo' => $grupo->first()->codigo_sunat,
                            'mensaje' => $grupo->first()->mensaje_sunat
                        ];
                    })
                    ->sortByDesc('cantidad')
                    ->take(5)
                    ->values()
            ];

            return response()->json([
                'success' => true,
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener estadísticas de envíos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reenviar comprobante a SUNAT
     */
    public function reenviar($comprobanteId)
    {
        try {
            $comprobante = Comprobante::findOrFail($comprobanteId);

            if (!in_array($comprobante->estado, ['PENDIENTE', 'RECHAZADO'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'El comprobante no puede ser reenviado. Estado actual: ' . $comprobante->estado
                ], 422);
            }

            // Aquí iría la lógica de reenvío usando GreenterService
            // Por ahora solo registramos el intento

            $log = SunatLog::create([
                'comprobante_id' => $comprobante->id,
                'tipo_operacion' => 'REENVIO',
                'estado_respuesta' => 'PENDIENTE',
                'user_id' => auth()->id() ?? 1,
                'ip_origen' => request()->ip()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reenvío iniciado',
                'data' => [
                    'comprobante_id' => $comprobante->id,
                    'log_id' => $log->id
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al reenviar comprobante: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al reenviar comprobante',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Consultar ticket de resumen/baja en SUNAT
     */
    public function consultarTicket(Request $request)
    {
        $request->validate([
            'ticket' => 'required|string'
        ]);

        try {
            // Buscar el log con ese ticket
            $log = SunatLog::where('ticket', $request->ticket)->first();

            if (!$log) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ticket no encontrado'
                ], 404);
            }

            // Aquí iría la lógica para consultar el ticket en SUNAT usando GreenterService
            // Por ahora solo retornamos la información del log

            return response()->json([
                'success' => true,
                'data' => [
                    'ticket' => $log->ticket,
                    'estado' => $log->estado_respuesta,
                    'comprobante_id' => $log->comprobante_id,
                    'mensaje' => $log->mensaje_sunat,
                    'fecha_envio' => $log->created_at->format('Y-m-d H:i:s')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al consultar ticket: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al consultar ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener XML de envío
     */
    public function obtenerXml($id)
    {
        try {
            $log = SunatLog::findOrFail($id);

            if (!$log->xml_enviado) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible para este envío'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'xml' => $log->xml_enviado,
                    'comprobante_id' => $log->comprobante_id,
                    'fecha_envio' => $log->created_at->format('Y-m-d H:i:s')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener XML',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener CDR (Constancia de Recepción) de SUNAT
     */
    public function obtenerCdr($id)
    {
        try {
            $log = SunatLog::findOrFail($id);

            if (!$log->cdr_sunat) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible para este envío'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'cdr' => $log->cdr_sunat,
                    'codigo_sunat' => $log->codigo_sunat,
                    'mensaje_sunat' => $log->mensaje_sunat,
                    'comprobante_id' => $log->comprobante_id,
                    'fecha_respuesta' => $log->updated_at->format('Y-m-d H:i:s')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener CDR',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Limpiar logs antiguos
     */
    public function limpiarLogsAntiguos(Request $request)
    {
        $request->validate([
            'dias' => 'required|integer|min:1|max:365'
        ]);

        try {
            $fechaLimite = now()->subDays($request->dias);

            $logsEliminados = SunatLog::where('created_at', '<', $fechaLimite)
                ->whereIn('estado_respuesta', ['ACEPTADO'])
                ->delete();

            Log::info('Logs antiguos eliminados', [
                'cantidad' => $logsEliminados,
                'fecha_limite' => $fechaLimite->format('Y-m-d'),
                'usuario' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Se eliminaron {$logsEliminados} registros de logs antiguos",
                'data' => [
                    'logs_eliminados' => $logsEliminados,
                    'fecha_limite' => $fechaLimite->format('Y-m-d')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al limpiar logs antiguos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al limpiar logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
