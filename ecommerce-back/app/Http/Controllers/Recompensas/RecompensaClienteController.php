<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaCliente;
use App\Models\RecompensaProducto;
use App\Models\RecompensaHistorial;
use App\Models\UserCliente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class RecompensaClienteController extends Controller
{
    /**
     * Ver recompensas activas que aplican al cliente autenticado
     */
    public function recompensasActivas(Request $request): JsonResponse
    {
        try {
            // Obtener cliente autenticado
            $cliente = Auth::guard('cliente')->user();
            
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no autenticado'
                ], 401);
            }

            // Obtener recompensas activas y vigentes
            $recompensasQuery = Recompensa::with([
                'clientes',
                'productos.producto:id,nombre,codigo_producto,precio_venta',
                'productos.categoria:id,nombre',
                'puntos',
                'descuentos',
                'envios',
                'regalos.producto:id,nombre,codigo_producto,precio_venta'
            ])
            ->activas()
            ->vigentes();

            // Filtrar por tipo si se especifica
            if ($request->has('tipo') && !empty($request->tipo)) {
                $recompensasQuery->porTipo($request->tipo);
            }

            $todasLasRecompensas = $recompensasQuery->get();
            $recompensasAplicables = [];

            foreach ($todasLasRecompensas as $recompensa) {
                $aplicaAlCliente = $this->verificarSiAplicaAlCliente($recompensa, $cliente);
                
                if ($aplicaAlCliente) {
                    $recompensasAplicables[] = [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre,
                        'descripcion' => $recompensa->descripcion,
                        'tipo' => $recompensa->tipo,
                        'tipo_nombre' => $recompensa->tipo_nombre,
                        'fecha_inicio' => $recompensa->fecha_inicio,
                        'fecha_fin' => $recompensa->fecha_fin,
                        'dias_restantes' => $recompensa->fecha_fin->diffInDays(now()),
                        'configuracion' => $this->obtenerConfiguracionParaCliente($recompensa),
                        'productos_aplicables' => $this->obtenerProductosAplicables($recompensa),
                        'como_obtener' => $this->generarInstruccionesParaCliente($recompensa)
                    ];
                }
            }

            // Ordenar por fecha de fin (más próximas a vencer primero)
            usort($recompensasAplicables, function($a, $b) {
                return $a['dias_restantes'] <=> $b['dias_restantes'];
            });

            return response()->json([
                'success' => true,
                'message' => 'Recompensas activas obtenidas exitosamente',
                'data' => [
                    'cliente' => [
                        'id' => $cliente->id,
                        'nombre_completo' => $cliente->nombres . ' ' . $cliente->apellidos,
                        'segmento_actual' => $cliente->getSegmentoCliente()
                    ],
                    'total_recompensas' => count($recompensasAplicables),
                    'recompensas' => $recompensasAplicables
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las recompensas activas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Consultar historial de recompensas recibidas por el cliente
     */
    public function historialRecompensas(Request $request): JsonResponse
    {
        try {
            // Obtener cliente autenticado
            $cliente = Auth::guard('cliente')->user();
            
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no autenticado'
                ], 401);
            }

            $query = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->with([
                    'recompensa:id,nombre,tipo',
                    'pedido:id,codigo_pedido,total,fecha_pedido'
                ]);

            // Filtros
            if ($request->has('tipo_recompensa') && !empty($request->tipo_recompensa)) {
                $query->whereHas('recompensa', function($q) use ($request) {
                    $q->where('tipo', $request->tipo_recompensa);
                });
            }

            if ($request->has('fecha_desde') && $request->has('fecha_hasta')) {
                $query->whereBetween('fecha_aplicacion', [
                    $request->fecha_desde,
                    $request->fecha_hasta
                ]);
            }

            if ($request->has('con_puntos') && $request->con_puntos) {
                $query->where('puntos_otorgados', '>', 0);
            }

            // Ordenamiento
            $orderBy = $request->get('order_by', 'fecha_aplicacion');
            $orderDirection = $request->get('order_direction', 'desc');
            $query->orderBy($orderBy, $orderDirection);

            // Paginación
            $perPage = $request->get('per_page', 15);
            $historial = $query->paginate($perPage);

            // Formatear datos
            $historial->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'recompensa' => [
                        'id' => $item->recompensa->id,
                        'nombre' => $item->recompensa->nombre,
                        'tipo' => $item->recompensa->tipo,
                        'tipo_nombre' => $item->recompensa->tipo_nombre ?? ucfirst($item->recompensa->tipo)
                    ],
                    'pedido' => $item->pedido ? [
                        'id' => $item->pedido->id,
                        'codigo' => $item->pedido->codigo_pedido,
                        'total' => $item->pedido->total,
                        'fecha' => $item->pedido->fecha_pedido
                    ] : null,
                    'puntos_otorgados' => $item->puntos_otorgados,
                    'beneficio_aplicado' => $item->beneficio_aplicado,
                    'fecha_aplicacion' => $item->fecha_aplicacion,
                    'tiempo_transcurrido' => $item->tiempo_transcurrido,
                    'descripcion' => $item->descripcion_completa
                ];
            });

            // Estadísticas del historial
            $estadisticas = [
                'total_recompensas_recibidas' => RecompensaHistorial::where('cliente_id', $cliente->id)->count(),
                'total_puntos_ganados' => RecompensaHistorial::where('cliente_id', $cliente->id)->sum('puntos_otorgados'),
                'recompensas_este_mes' => RecompensaHistorial::where('cliente_id', $cliente->id)
                    ->whereMonth('fecha_aplicacion', now()->month)
                    ->whereYear('fecha_aplicacion', now()->year)
                    ->count(),
                'puntos_este_mes' => RecompensaHistorial::where('cliente_id', $cliente->id)
                    ->whereMonth('fecha_aplicacion', now()->month)
                    ->whereYear('fecha_aplicacion', now()->year)
                    ->sum('puntos_otorgados'),
                'primera_recompensa' => RecompensaHistorial::where('cliente_id', $cliente->id)
                    ->orderBy('fecha_aplicacion')
                    ->first()?->fecha_aplicacion,
                'ultima_recompensa' => RecompensaHistorial::where('cliente_id', $cliente->id)
                    ->orderBy('fecha_aplicacion', 'desc')
                    ->first()?->fecha_aplicacion
            ];

            return response()->json([
                'success' => true,
                'message' => 'Historial de recompensas obtenido exitosamente',
                'data' => [
                    'cliente' => [
                        'id' => $cliente->id,
                        'nombre_completo' => $cliente->nombres . ' ' . $cliente->apellidos
                    ],
                    'estadisticas' => $estadisticas,
                    'historial' => $historial
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el historial de recompensas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Consultar puntos acumulados del cliente
     */
    public function puntosAcumulados(Request $request): JsonResponse
    {
        try {
            // Obtener cliente autenticado
            $cliente = Auth::guard('cliente')->user();
            
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no autenticado'
                ], 401);
            }

            // Calcular puntos totales
            $puntosTotal = $cliente->getTotalPuntosGanados();
            
            // Puntos por período
            $puntosEsteMes = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->whereMonth('fecha_aplicacion', now()->month)
                ->whereYear('fecha_aplicacion', now()->year)
                ->sum('puntos_otorgados');

            $puntosEsteAno = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->whereYear('fecha_aplicacion', now()->year)
                ->sum('puntos_otorgados');

            // Historial de puntos por mes (últimos 12 meses) - OPTIMIZADO
            $historialMensual = $this->obtenerHistorialMensualOptimizado($cliente->id);

            // Desglose por tipo de recompensa
            $puntosPorTipo = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->join('recompensas', 'recompensas_historial.recompensa_id', '=', 'recompensas.id')
                ->selectRaw('recompensas.tipo, SUM(puntos_otorgados) as total_puntos, COUNT(*) as cantidad_recompensas')
                ->groupBy('recompensas.tipo')
                ->get()
                ->map(function($item) {
                    $nombres = [
                        'puntos' => 'Sistema de Puntos',
                        'descuento' => 'Descuentos',
                        'envio_gratis' => 'Envío Gratuito',
                        'regalo' => 'Productos de Regalo',
                        'nivel_cliente' => 'Nivel de Cliente'
                    ];

                    return [
                        'tipo' => $item->tipo,
                        'tipo_nombre' => $nombres[$item->tipo] ?? ucfirst($item->tipo),
                        'total_puntos' => $item->total_puntos,
                        'cantidad_recompensas' => $item->cantidad_recompensas
                    ];
                });

            // Últimas transacciones de puntos
            $ultimasTransacciones = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->where('puntos_otorgados', '>', 0)
                ->with(['recompensa:id,nombre,tipo', 'pedido:id,codigo_pedido'])
                ->orderBy('fecha_aplicacion', 'desc')
                ->limit(10)
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'puntos' => $item->puntos_otorgados,
                        'recompensa' => $item->recompensa->nombre,
                        'tipo_recompensa' => $item->recompensa->tipo,
                        'pedido_codigo' => $item->pedido?->codigo_pedido,
                        'fecha' => $item->fecha_aplicacion,
                        'tiempo_transcurrido' => $item->tiempo_transcurrido
                    ];
                });

            // Proyección de puntos (estimación basada en promedio mensual)
            $promedioMensual = $puntosEsteAno > 0 ? $puntosEsteAno / now()->month : 0;
            $proyeccionAnual = $promedioMensual * 12;

            $resumen = [
                'puntos_actuales' => [
                    'total' => $puntosTotal,
                    'este_mes' => $puntosEsteMes,
                    'este_ano' => $puntosEsteAno
                ],
                'estadisticas' => [
                    'promedio_mensual' => round($promedioMensual, 2),
                    'proyeccion_anual' => round($proyeccionAnual, 2),
                    'mejor_mes' => collect($historialMensual)->sortByDesc('puntos')->first(),
                    'total_transacciones' => RecompensaHistorial::where('cliente_id', $cliente->id)
                        ->where('puntos_otorgados', '>', 0)->count()
                ],
                'desglose_por_tipo' => $puntosPorTipo,
                'historial_mensual' => $historialMensual,
                'ultimas_transacciones' => $ultimasTransacciones,
                'cliente_info' => [
                    'id' => $cliente->id,
                    'nombre_completo' => $cliente->nombres . ' ' . $cliente->apellidos,
                    'segmento_actual' => $cliente->getSegmentoCliente(),
                    'es_cliente_nuevo' => $cliente->esClienteNuevo(),
                    'es_cliente_recurrente' => $cliente->esClienteRecurrente(),
                    'es_cliente_vip' => $cliente->esClienteVip()
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Puntos acumulados obtenidos exitosamente',
                'data' => $resumen
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los puntos acumulados',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener detalle de una recompensa específica para el cliente
     */
    public function detalleRecompensa($recompensaId): JsonResponse
    {
        try {
            // Obtener cliente autenticado
            $cliente = Auth::guard('cliente')->user();
            
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no autenticado'
                ], 401);
            }

            $recompensa = Recompensa::with([
                'clientes',
                'productos.producto:id,nombre,codigo_producto,precio_venta,imagen',
                'productos.categoria:id,nombre',
                'puntos',
                'descuentos',
                'envios',
                'regalos.producto:id,nombre,codigo_producto,precio_venta,imagen'
            ])->find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar si la recompensa aplica al cliente
            $aplicaAlCliente = $this->verificarSiAplicaAlCliente($recompensa, $cliente);

            if (!$aplicaAlCliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no aplica para tu perfil de cliente'
                ], 403);
            }

            // Verificar si el cliente ya ha recibido esta recompensa
            $yaRecibida = RecompensaHistorial::where('cliente_id', $cliente->id)
                ->where('recompensa_id', $recompensaId)
                ->exists();

            $detalle = [
                'recompensa' => [
                    'id' => $recompensa->id,
                    'nombre' => $recompensa->nombre,
                    'descripcion' => $recompensa->descripcion,
                    'tipo' => $recompensa->tipo,
                    'tipo_nombre' => $recompensa->tipo_nombre,
                    'fecha_inicio' => $recompensa->fecha_inicio,
                    'fecha_fin' => $recompensa->fecha_fin,
                    'dias_restantes' => $recompensa->fecha_fin->diffInDays(now()),
                    'es_vigente' => $recompensa->es_vigente,
                    'ya_recibida' => $yaRecibida
                ],
                'configuracion' => $this->obtenerConfiguracionParaCliente($recompensa),
                'productos_aplicables' => $this->obtenerProductosAplicables($recompensa),
                'como_obtener' => $this->generarInstruccionesParaCliente($recompensa),
                'historial_cliente' => $yaRecibida ? RecompensaHistorial::where('cliente_id', $cliente->id)
                    ->where('recompensa_id', $recompensaId)
                    ->orderBy('fecha_aplicacion', 'desc')
                    ->get()
                    ->map(function($item) {
                        return [
                            'puntos_otorgados' => $item->puntos_otorgados,
                            'beneficio_aplicado' => $item->beneficio_aplicado,
                            'fecha_aplicacion' => $item->fecha_aplicacion,
                            'pedido_codigo' => $item->pedido?->codigo_pedido
                        ];
                    }) : []
            ];

            return response()->json([
                'success' => true,
                'message' => 'Detalle de recompensa obtenido exitosamente',
                'data' => $detalle
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el detalle de la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Métodos auxiliares privados

    /**
     * Verificar si una recompensa aplica a un cliente específico
     */
    private function verificarSiAplicaAlCliente(Recompensa $recompensa, UserCliente $cliente): bool
    {
        $segmentosRecompensa = $recompensa->clientes;
        
        if ($segmentosRecompensa->isEmpty()) {
            return true; // Si no hay segmentos configurados, aplica a todos
        }

        foreach ($segmentosRecompensa as $segmento) {
            if ($segmento->clienteCumpleSegmento($cliente)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Obtener configuración específica para mostrar al cliente
     */
    private function obtenerConfiguracionParaCliente(Recompensa $recompensa): array
    {
        $configuracion = [];

        switch ($recompensa->tipo) {
            case Recompensa::TIPO_PUNTOS:
                $puntos = $recompensa->puntos->first();
                if ($puntos) {
                    $configuracion = [
                        'tipo' => 'puntos',
                        'descripcion' => $puntos->descripcion_configuracion,
                        'detalles' => $puntos->getResumenConfiguracion()
                    ];
                }
                break;

            case Recompensa::TIPO_DESCUENTO:
                $descuento = $recompensa->descuentos->first();
                if ($descuento) {
                    $configuracion = [
                        'tipo' => 'descuento',
                        'descripcion' => $descuento->descripcion_descuento,
                        'detalles' => $descuento->getResumenConfiguracion()
                    ];
                }
                break;

            case Recompensa::TIPO_ENVIO_GRATIS:
                $envio = $recompensa->envios->first();
                if ($envio) {
                    $configuracion = [
                        'tipo' => 'envio_gratis',
                        'descripcion' => $envio->descripcion_envio,
                        'detalles' => $envio->getResumenConfiguracion()
                    ];
                }
                break;

            case Recompensa::TIPO_REGALO:
                $regalos = $recompensa->regalos;
                if ($regalos->isNotEmpty()) {
                    $configuracion = [
                        'tipo' => 'regalo',
                        'descripcion' => 'Productos de regalo incluidos',
                        'regalos' => $regalos->map(function($regalo) {
                            return [
                                'producto' => $regalo->producto->nombre,
                                'cantidad' => $regalo->cantidad,
                                'valor' => $regalo->valor_total_regalo,
                                'descripcion' => $regalo->descripcion_regalo
                            ];
                        })
                    ];
                }
                break;
        }

        return $configuracion;
    }

    /**
     * Obtener productos aplicables para mostrar al cliente
     */
    private function obtenerProductosAplicables(Recompensa $recompensa): array
    {
        $productosAplicables = [];
        
        foreach ($recompensa->productos as $recompensaProducto) {
            $productos = $recompensaProducto->getProductosAplicables();
            
            foreach ($productos as $producto) {
                $productosAplicables[] = [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'codigo_producto' => $producto->codigo_producto,
                    'precio_venta' => $producto->precio_venta,
                    'imagen_url' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : null
                ];
            }
        }

        // Eliminar duplicados
        $productosUnicos = collect($productosAplicables)->unique('id')->values()->all();
        
        return $productosUnicos;
    }

    /**
     * Generar instrucciones para que el cliente obtenga la recompensa
     */
    private function generarInstruccionesParaCliente(Recompensa $recompensa): array
    {
        $instrucciones = [];

        switch ($recompensa->tipo) {
            case Recompensa::TIPO_PUNTOS:
                $instrucciones = [
                    'titulo' => '¿Cómo ganar puntos?',
                    'pasos' => [
                        'Realiza compras en nuestra tienda',
                        'Los puntos se acreditarán automáticamente',
                        'Revisa tu historial de puntos en tu perfil'
                    ]
                ];
                break;

            case Recompensa::TIPO_DESCUENTO:
                $descuento = $recompensa->descuentos->first();
                $instrucciones = [
                    'titulo' => '¿Cómo obtener el descuento?',
                    'pasos' => [
                        'Agrega productos aplicables a tu carrito',
                        $descuento && $descuento->tiene_compra_minima ? 
                            "Asegúrate de que tu compra sea de al menos S/ {$descuento->compra_minima}" : 
                            'No hay monto mínimo requerido',
                        'El descuento se aplicará automáticamente al finalizar la compra'
                    ]
                ];
                break;

            case Recompensa::TIPO_ENVIO_GRATIS:
                $envio = $recompensa->envios->first();
                $instrucciones = [
                    'titulo' => '¿Cómo obtener envío gratis?',
                    'pasos' => [
                        $envio && $envio->tiene_monto_minimo ? 
                            "Realiza una compra de al menos S/ {$envio->minimo_compra}" : 
                            'No hay monto mínimo requerido',
                        $envio && $envio->tiene_zonas_especificas ? 
                            'Verifica que tu zona de entrega esté incluida' : 
                            'Aplica para todas las zonas de entrega',
                        'El envío gratis se aplicará automáticamente'
                    ]
                ];
                break;

            case Recompensa::TIPO_REGALO:
                $instrucciones = [
                    'titulo' => '¿Cómo obtener tu regalo?',
                    'pasos' => [
                        'Cumple con los requisitos de la promoción',
                        'Los productos de regalo se agregarán automáticamente',
                        'Revisa tu pedido antes de confirmar la compra'
                    ]
                ];
                break;

            default:
                $instrucciones = [
                    'titulo' => '¿Cómo obtener esta recompensa?',
                    'pasos' => [
                        'Revisa los términos y condiciones',
                        'Cumple con los requisitos especificados',
                        'La recompensa se aplicará automáticamente'
                    ]
                ];
        }

        return $instrucciones;
    }

    /**
     * Obtener historial mensual optimizado con una sola consulta
     */
    private function obtenerHistorialMensualOptimizado($clienteId): array
    {
        // Generar fechas de los últimos 12 meses
        $meses = [];
        for ($i = 11; $i >= 0; $i--) {
            $fecha = now()->subMonths($i);
            $meses[$fecha->format('Y-m')] = [
                'mes' => $fecha->format('Y-m'),
                'mes_nombre' => $fecha->format('F Y'),
                'puntos' => 0
            ];
        }

        // Obtener todos los puntos de los últimos 12 meses en una sola consulta
        $inicio12Meses = now()->subMonths(11)->startOfMonth();
        $finMesActual = now()->endOfMonth();

        $puntosObtenidos = RecompensaHistorial::where('cliente_id', $clienteId)
            ->whereBetween('fecha_aplicacion', [$inicio12Meses, $finMesActual])
            ->selectRaw('
                DATE_FORMAT(fecha_aplicacion, "%Y-%m") as mes,
                COALESCE(SUM(puntos_otorgados), 0) as total_puntos
            ')
            ->groupBy('mes')
            ->pluck('total_puntos', 'mes');

        // Combinar con el array de meses (llenando los meses sin datos con 0)
        foreach ($puntosObtenidos as $mes => $puntos) {
            if (isset($meses[$mes])) {
                $meses[$mes]['puntos'] = (int) $puntos;
            }
        }

        return array_values($meses);
    }

    /**
     * Obtener recompensas para clientes no registrados (públicas)
     */
    public function recompensasPublicas(Request $request): JsonResponse
    {
        try {
            // Obtener recompensas activas y vigentes para clientes no registrados
            $recompensasQuery = Recompensa::with([
                'clientes' => function($query) {
                    $query->where('segmento', 'no_registrados');
                },
                'productos.producto:id,nombre,codigo_producto,precio_venta',
                'productos.categoria:id,nombre',
                'puntos',
                'descuentos',
                'envios',
                'regalos.producto:id,nombre,codigo_producto,precio_venta'
            ])
            ->activas()
            ->vigentes();

            // Filtrar por tipo si se especifica
            if ($request->has('tipo') && !empty($request->tipo)) {
                $recompensasQuery->porTipo($request->tipo);
            }

            $recompensas = $recompensasQuery->get();

            $recompensasPublicas = [];

            foreach ($recompensas as $recompensa) {
                // Verificar si tiene segmentación para no registrados
                $tieneSegmentoNoRegistrados = $recompensa->clientes->contains('segmento', 'no_registrados');
                $tieneSegmentoTodos = $recompensa->clientes->contains('segmento', 'todos');

                if ($tieneSegmentoNoRegistrados || $tieneSegmentoTodos) {
                    $recompensasPublicas[] = [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre,
                        'descripcion' => $recompensa->descripcion,
                        'tipo' => $recompensa->tipo,
                        'tipo_nombre' => $recompensa->tipo_nombre,
                        'fecha_inicio' => $recompensa->fecha_inicio,
                        'fecha_fin' => $recompensa->fecha_fin,
                        'dias_restantes' => $recompensa->fecha_fin->diffInDays(now()),
                        'configuracion' => $this->obtenerConfiguracionPublica($recompensa),
                        'productos_aplicables' => $this->obtenerProductosAplicables($recompensa),
                        'como_obtener' => $this->generarInstruccionesPublicas($recompensa),
                        'requiere_registro' => $this->verificarSiRequiereRegistro($recompensa)
                    ];
                }
            }

            // Ordenar por fecha de fin (más próximas a vencer primero)
            usort($recompensasPublicas, function($a, $b) {
                return $a['dias_restantes'] <=> $b['dias_restantes'];
            });

            return response()->json([
                'success' => true,
                'message' => 'Recompensas públicas obtenidas exitosamente',
                'data' => [
                    'total_recompensas' => count($recompensasPublicas),
                    'recompensas' => $recompensasPublicas,
                    'mensaje_bienvenida' => '¡Descubre nuestras recompensas especiales! Regístrate para obtener más beneficios.'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las recompensas públicas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener configuración pública de la recompensa
     */
    private function obtenerConfiguracionPublica($recompensa): array
    {
        $configuracion = [];

        switch ($recompensa->tipo) {
            case 'puntos':
                if ($recompensa->puntos->count() > 0) {
                    $puntos = $recompensa->puntos->first();
                    $configuracion = [
                        'tipo' => 'puntos',
                        'puntos_por_compra' => $puntos->puntos_por_compra,
                        'puntos_por_monto' => $puntos->puntos_por_monto,
                        'puntos_registro' => $puntos->puntos_registro,
                        'descripcion' => "Gana {$puntos->puntos_por_compra} puntos por cada compra"
                    ];
                }
                break;

            case 'descuento':
                if ($recompensa->descuentos->count() > 0) {
                    $descuento = $recompensa->descuentos->first();
                    $configuracion = [
                        'tipo' => 'descuento',
                        'tipo_descuento' => $descuento->tipo_descuento,
                        'valor_descuento' => $descuento->valor_descuento,
                        'compra_minima' => $descuento->compra_minima,
                        'descripcion' => $descuento->tipo_descuento === 'porcentaje' 
                            ? "Descuento del {$descuento->valor_descuento}%"
                            : "Descuento de S/ {$descuento->valor_descuento}"
                    ];
                }
                break;

            case 'envio_gratis':
                if ($recompensa->envios->count() > 0) {
                    $envio = $recompensa->envios->first();
                    $configuracion = [
                        'tipo' => 'envio_gratis',
                        'minimo_compra' => $envio->minimo_compra,
                        'descripcion' => "Envío gratis en compras desde S/ {$envio->minimo_compra}"
                    ];
                }
                break;

            case 'regalo':
                if ($recompensa->regalos->count() > 0) {
                    $regalos = $recompensa->regalos->map(function($regalo) {
                        return [
                            'producto' => $regalo->producto->nombre,
                            'cantidad' => $regalo->cantidad
                        ];
                    });
                    $configuracion = [
                        'tipo' => 'regalo',
                        'regalos' => $regalos,
                        'descripcion' => "Recibe productos de regalo con tu compra"
                    ];
                }
                break;
        }

        return $configuracion;
    }

    /**
     * Generar instrucciones públicas para obtener la recompensa
     */
    private function generarInstruccionesPublicas($recompensa): array
    {
        $instrucciones = [];

        switch ($recompensa->tipo) {
            case 'puntos':
                $instrucciones = [
                    'titulo' => '¿Cómo ganar puntos?',
                    'pasos' => [
                        'Regístrate en nuestra plataforma',
                        'Realiza tu primera compra',
                        'Los puntos se acreditarán automáticamente',
                        'Canjea tus puntos por descuentos'
                    ],
                    'beneficio_adicional' => '¡Regístrate ahora y obtén puntos de bienvenida!'
                ];
                break;

            case 'descuento':
                $instrucciones = [
                    'titulo' => '¿Cómo obtener el descuento?',
                    'pasos' => [
                        'Regístrate en nuestra plataforma',
                        'Agrega productos al carrito',
                        'El descuento se aplicará automáticamente',
                        'Disfruta de tu compra con descuento'
                    ],
                    'beneficio_adicional' => '¡Descuento especial para nuevos usuarios!'
                ];
                break;

            case 'envio_gratis':
                $instrucciones = [
                    'titulo' => '¿Cómo obtener envío gratis?',
                    'pasos' => [
                        'Regístrate en nuestra plataforma',
                        'Agrega productos por el monto mínimo',
                        'El envío gratis se aplicará automáticamente',
                        'Recibe tu pedido sin costo de envío'
                    ],
                    'beneficio_adicional' => '¡Envío gratis para nuevos usuarios!'
                ];
                break;

            case 'regalo':
                $instrucciones = [
                    'titulo' => '¿Cómo obtener productos de regalo?',
                    'pasos' => [
                        'Regístrate en nuestra plataforma',
                        'Realiza una compra',
                        'Los productos de regalo se incluirán automáticamente',
                        'Recibe tu pedido con regalos incluidos'
                    ],
                    'beneficio_adicional' => '¡Regalos especiales para nuevos usuarios!'
                ];
                break;

            default:
                $instrucciones = [
                    'titulo' => '¿Cómo obtener esta recompensa?',
                    'pasos' => [
                        'Regístrate en nuestra plataforma',
                        'Cumple con los requisitos especificados',
                        'La recompensa se aplicará automáticamente'
                    ],
                    'beneficio_adicional' => '¡Únete a nosotros y disfruta de beneficios exclusivos!'
                ];
        }

        return $instrucciones;
    }

    /**
     * Verificar si la recompensa requiere registro
     */
    private function verificarSiRequiereRegistro($recompensa): bool
    {
        // Todas las recompensas públicas requieren registro para ser utilizadas
        return true;
    }
}