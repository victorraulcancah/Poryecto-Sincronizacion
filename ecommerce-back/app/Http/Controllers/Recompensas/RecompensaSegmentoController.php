<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaCliente;
use App\Models\UserCliente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaSegmentoController extends Controller
{
    /**
     * Listar segmentos/clientes asignados a una recompensa
     */
    public function index($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $segmentos = RecompensaCliente::where('recompensa_id', $recompensaId)
                ->with('cliente:id,nombres,apellidos,email')
                ->get()
                ->map(function($segmento) {
                    return [
                        'id' => $segmento->id,
                        'segmento' => $segmento->segmento,
                        'segmento_nombre' => $segmento->segmento_nombre,
                        'cliente_id' => $segmento->cliente_id,
                        'cliente' => $segmento->cliente ? [
                            'id' => $segmento->cliente->id,
                            'nombre_completo' => $segmento->cliente->nombres . ' ' . $segmento->cliente->apellidos,
                            'email' => $segmento->cliente->email
                        ] : null,
                        'es_cliente_especifico' => $segmento->es_cliente_especifico
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Segmentos obtenidos exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre
                    ],
                    'segmentos' => $segmentos
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los segmentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Asignar un segmento o cliente específico a una recompensa
     */
    public function store(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'segmento' => 'required|in:' . implode(',', RecompensaCliente::getSegmentos()),
                'cliente_id' => 'nullable|exists:user_clientes,id'
            ], [
                'segmento.required' => 'El segmento es obligatorio',
                'segmento.in' => 'El segmento seleccionado no es válido',
                'cliente_id.exists' => 'El cliente seleccionado no existe'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validar que no exista ya la misma configuración
            $existeSegmento = RecompensaCliente::where('recompensa_id', $recompensaId)
                ->where('segmento', $request->segmento)
                ->when($request->cliente_id, function($query) use ($request) {
                    return $query->where('cliente_id', $request->cliente_id);
                }, function($query) {
                    return $query->whereNull('cliente_id');
                })
                ->exists();

            if ($existeSegmento) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta configuración de segmento ya existe para la recompensa'
                ], 422);
            }

            DB::beginTransaction();

            $segmento = RecompensaCliente::create([
                'recompensa_id' => $recompensaId,
                'segmento' => $request->segmento,
                'cliente_id' => $request->cliente_id
            ]);

            DB::commit();

            // Cargar relaciones para la respuesta
            $segmento->load('cliente:id,nombres,apellidos,email');

            $data = [
                'id' => $segmento->id,
                'segmento' => $segmento->segmento,
                'segmento_nombre' => $segmento->segmento_nombre,
                'cliente_id' => $segmento->cliente_id,
                'cliente' => $segmento->cliente ? [
                    'id' => $segmento->cliente->id,
                    'nombre_completo' => $segmento->cliente->nombres . ' ' . $segmento->cliente->apellidos,
                    'email' => $segmento->cliente->email
                ] : null,
                'es_cliente_especifico' => $segmento->es_cliente_especifico
            ];

            return response()->json([
                'success' => true,
                'message' => 'Segmento asignado exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al asignar el segmento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un segmento/cliente asignado
     */
    public function destroy($recompensaId, $segmentoId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $segmento = RecompensaCliente::where('recompensa_id', $recompensaId)
                ->where('id', $segmentoId)
                ->first();

            if (!$segmento) {
                return response()->json([
                    'success' => false,
                    'message' => 'Segmento no encontrado'
                ], 404);
            }

            DB::beginTransaction();

            $segmento->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Segmento eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el segmento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener segmentos disponibles
     */
    public function segmentosDisponibles(): JsonResponse
    {
        try {
            $segmentos = collect(RecompensaCliente::getSegmentos())->map(function($segmento) {
                $nombres = [
                    'todos' => 'Todos los clientes',
                    'nuevos' => 'Clientes nuevos (últimos 30 días)',
                    'recurrentes' => 'Clientes recurrentes (más de 1 compra)',
                    'vip' => 'Clientes VIP (compras > S/ 1000)',
                    'no_registrados' => 'Clientes no registrados (captación)'
                ];

                return [
                    'value' => $segmento,
                    'label' => $nombres[$segmento] ?? ucfirst($segmento),
                    'descripcion' => $nombres[$segmento] ?? ''
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Segmentos disponibles obtenidos exitosamente',
                'data' => $segmentos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los segmentos disponibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar clientes para asignación específica
     */
    public function buscarClientes(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'buscar' => 'required|string|min:2',
                'limite' => 'nullable|integer|min:1|max:50'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $buscar = $request->buscar;
            $limite = $request->get('limite', 20);

            $clientes = UserCliente::where(function($query) use ($buscar) {
                    $query->where('nombres', 'like', "%{$buscar}%")
                          ->orWhere('apellidos', 'like', "%{$buscar}%")
                          ->orWhere('email', 'like', "%{$buscar}%")
                          ->orWhere('numero_documento', 'like', "%{$buscar}%");
                })
                ->where('estado', true)
                ->limit($limite)
                ->get(['id', 'nombres', 'apellidos', 'email', 'numero_documento'])
                ->map(function($cliente) {
                    return [
                        'id' => $cliente->id,
                        'nombre_completo' => $cliente->nombres . ' ' . $cliente->apellidos,
                        'email' => $cliente->email,
                        'numero_documento' => $cliente->numero_documento,
                        'segmento_actual' => $cliente->getSegmentoCliente()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Clientes encontrados exitosamente',
                'data' => $clientes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar clientes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de segmentación para una recompensa
     */
    public function estadisticasSegmentacion($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $segmentos = RecompensaCliente::where('recompensa_id', $recompensaId)->get();
            
            $estadisticas = [
                'total_segmentos_configurados' => $segmentos->count(),
                'clientes_especificos' => $segmentos->whereNotNull('cliente_id')->count(),
                'segmentos_generales' => $segmentos->whereNull('cliente_id')->count(),
                'por_segmento' => $segmentos->groupBy('segmento')->map(function($grupo, $segmento) {
                    return [
                        'segmento' => $segmento,
                        'cantidad' => $grupo->count(),
                        'clientes_especificos' => $grupo->whereNotNull('cliente_id')->count()
                    ];
                })->values(),
                'clientes_potenciales' => $this->calcularClientesPotenciales(),
                'distribucion_por_segmento' => $this->getDistribucionSegmentos(),
                'efectividad_segmentos' => $this->calcularEfectividadSegmentos($recompensaId)
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de segmentación obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas de segmentación',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar si un cliente cumple con los segmentos de una recompensa
     */
    public function validarCliente(Request $request, $recompensaId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'cliente_id' => 'required|exists:user_clientes,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $recompensa = Recompensa::find($recompensaId);
            $cliente = UserCliente::find($request->cliente_id);

            if (!$recompensa || !$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa o cliente no encontrado'
                ], 404);
            }

            $segmentos = RecompensaCliente::where('recompensa_id', $recompensaId)->get();
            $cumpleAlgunSegmento = false;
            $segmentosCumplidos = [];

            foreach ($segmentos as $segmento) {
                $cumple = $segmento->clienteCumpleSegmento($cliente);
                if ($cumple) {
                    $cumpleAlgunSegmento = true;
                    $segmentosCumplidos[] = [
                        'segmento' => $segmento->segmento,
                        'segmento_nombre' => $segmento->segmento_nombre
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Validación completada exitosamente',
                'data' => [
                    'cliente' => [
                        'id' => $cliente->id,
                        'nombre_completo' => $cliente->nombres . ' ' . $cliente->apellidos,
                        'segmento_actual' => $cliente->getSegmentoCliente()
                    ],
                    'cumple_recompensa' => $cumpleAlgunSegmento,
                    'segmentos_cumplidos' => $segmentosCumplidos,
                    'total_segmentos_configurados' => $segmentos->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al validar el cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calcular clientes potenciales con lógica mejorada
     */
    private function calcularClientesPotenciales(): array
    {
        // Fechas para cálculos
        $hace30Dias = now()->subDays(30);
        $hace365Dias = now()->subDays(365);
        
        // Consulta optimizada para obtener todos los segmentos
        $clientesStats = DB::table('user_clientes as uc')
            ->leftJoin('pedidos as p', 'uc.id', '=', 'p.cliente_id')
            ->select([
                'uc.id',
                'uc.created_at',
                'uc.estado',
                DB::raw('COUNT(p.id) as total_pedidos'),
                DB::raw('COALESCE(SUM(p.total), 0) as total_gastado'),
                DB::raw('MAX(p.created_at) as ultima_compra'),
                DB::raw('MIN(p.created_at) as primera_compra')
            ])
            ->where('uc.estado', true)
            ->groupBy('uc.id', 'uc.created_at', 'uc.estado')
            ->get();

        $totales = [
            'todos' => $clientesStats->count(),
            'nuevos' => 0,
            'regulares' => 0,
            'vip' => 0,
            'inactivos' => 0
        ];

        foreach ($clientesStats as $cliente) {
            $diasRegistrado = now()->diffInDays($cliente->created_at);
            $ultimaCompra = $cliente->ultima_compra ? now()->diffInDays($cliente->ultima_compra) : null;
            
            // Nuevos: menos de 30 días registrado
            if ($diasRegistrado < 30) {
                $totales['nuevos']++;
            }
            // VIP: más de 365 días, más de 5 pedidos, más de $1000 gastado, compra reciente
            elseif ($diasRegistrado > 365 && 
                    $cliente->total_pedidos > 5 && 
                    $cliente->total_gastado > 1000 && 
                    $ultimaCompra !== null && 
                    $ultimaCompra < 90) {
                $totales['vip']++;
            }
            // Regulares: entre 30-365 días O clientes antiguos que no califican como VIP
            elseif ($diasRegistrado >= 30) {
                $totales['regulares']++;
            }

            // Inactivos: sin compras en los últimos 180 días (y que tengan al menos una compra)
            if ($cliente->total_pedidos > 0 && $ultimaCompra !== null && $ultimaCompra > 180) {
                $totales['inactivos']++;
            }
        }

        return [
            'todos' => $totales['todos'],
            'nuevos' => $totales['nuevos'],
            'regulares' => $totales['regulares'],
            'vip' => $totales['vip'],
            'inactivos' => $totales['inactivos'],
            'distribuciones' => [
                'nuevos_porcentaje' => $totales['todos'] > 0 ? round(($totales['nuevos'] / $totales['todos']) * 100, 2) : 0,
                'regulares_porcentaje' => $totales['todos'] > 0 ? round(($totales['regulares'] / $totales['todos']) * 100, 2) : 0,
                'vip_porcentaje' => $totales['todos'] > 0 ? round(($totales['vip'] / $totales['todos']) * 100, 2) : 0,
                'inactivos_porcentaje' => $totales['todos'] > 0 ? round(($totales['inactivos'] / $totales['todos']) * 100, 2) : 0
            ]
        ];
    }

    /**
     * Obtener distribución detallada por segmentos
     */
    private function getDistribucionSegmentos(): array
    {
        $segmentos = RecompensaCliente::getSegmentos();
        $distribucion = [];

        foreach ($segmentos as $segmento) {
            $count = RecompensaCliente::where('segmento', $segmento)
                ->whereNull('cliente_id') // Solo segmentos generales, no clientes específicos
                ->distinct('recompensa_id')
                ->count();

            $distribucion[] = [
                'segmento' => $segmento,
                'segmento_nombre' => $this->getNombreSegmento($segmento),
                'recompensas_asignadas' => $count,
                'descripcion' => $this->getDescripcionSegmento($segmento)
            ];
        }

        return $distribucion;
    }

    /**
     * Calcular efectividad de segmentos para una recompensa
     */
    private function calcularEfectividadSegmentos($recompensaId): array
    {
        $segmentos = RecompensaCliente::where('recompensa_id', $recompensaId)->get();
        $efectividad = [];

        foreach ($segmentos as $segmento) {
            // Obtener aplicaciones de esta recompensa
            $aplicaciones = DB::table('recompensas_historial as rh')
                ->join('user_clientes as uc', 'rh.cliente_id', '=', 'uc.id')
                ->where('rh.recompensa_id', $recompensaId)
                ->when($segmento->cliente_id, function($query) use ($segmento) {
                    // Cliente específico
                    return $query->where('uc.id', $segmento->cliente_id);
                }, function($query) use ($segmento) {
                    // Segmento general - aplicar lógica de segmentación
                    return $this->aplicarFiltroSegmento($query, $segmento->segmento);
                })
                ->selectRaw('
                    COUNT(*) as total_aplicaciones,
                    COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                    COALESCE(SUM(rh.puntos_otorgados), 0) as puntos_totales
                ')
                ->first();

            $efectividad[] = [
                'segmento' => $segmento->segmento,
                'segmento_nombre' => $segmento->cliente_id ? 'Cliente Específico' : $this->getNombreSegmento($segmento->segmento),
                'cliente_especifico' => $segmento->cliente_id ? [
                    'id' => $segmento->cliente_id,
                    'nombre' => $segmento->cliente ? $segmento->cliente->nombres . ' ' . $segmento->cliente->apellidos : 'Cliente no encontrado'
                ] : null,
                'metricas' => [
                    'aplicaciones_totales' => (int) $aplicaciones->total_aplicaciones,
                    'clientes_unicos' => (int) $aplicaciones->clientes_unicos,
                    'puntos_otorgados' => (int) $aplicaciones->puntos_totales,
                    'promedio_aplicaciones_por_cliente' => $aplicaciones->clientes_unicos > 0 
                        ? round($aplicaciones->total_aplicaciones / $aplicaciones->clientes_unicos, 2)
                        : 0,
                    'promedio_puntos_por_aplicacion' => $aplicaciones->total_aplicaciones > 0
                        ? round($aplicaciones->puntos_totales / $aplicaciones->total_aplicaciones, 2)
                        : 0
                ]
            ];
        }

        return $efectividad;
    }

    /**
     * Aplicar filtro de segmento a query
     */
    private function aplicarFiltroSegmento($query, $segmento)
    {
        switch ($segmento) {
            case 'nuevos':
                return $query->where('uc.created_at', '>=', now()->subDays(30));
            case 'regulares':
                return $query->where('uc.created_at', '<', now()->subDays(30))
                           ->where('uc.created_at', '>=', now()->subDays(365));
            case 'vip':
                return $query->where('uc.created_at', '<', now()->subDays(365))
                           ->whereExists(function($subquery) {
                               $subquery->select(DB::raw(1))
                                       ->from('pedidos')
                                       ->whereColumn('pedidos.cliente_id', 'uc.id')
                                       ->havingRaw('COUNT(*) > 5 AND SUM(total) > 1000');
                           });
            case 'todos':
            default:
                return $query; // Sin filtro adicional
        }
    }

    /**
     * Obtener nombre legible del segmento
     */
    private function getNombreSegmento($segmento): string
    {
        $nombres = [
            'todos' => 'Todos los Clientes',
            'nuevos' => 'Clientes Nuevos',
            'regulares' => 'Clientes Regulares',
            'vip' => 'Clientes VIP'
        ];

        return $nombres[$segmento] ?? $segmento;
    }

    /**
     * Obtener descripción del segmento
     */
    private function getDescripcionSegmento($segmento): string
    {
        $descripciones = [
            'todos' => 'Todos los clientes activos del sistema',
            'nuevos' => 'Clientes registrados en los últimos 30 días',
            'regulares' => 'Clientes con 30-365 días de antigüedad',
            'vip' => 'Clientes con más de 365 días, +5 pedidos, +$1000 gastado y compra reciente'
        ];

        return $descripciones[$segmento] ?? 'Segmento personalizado';
    }
}