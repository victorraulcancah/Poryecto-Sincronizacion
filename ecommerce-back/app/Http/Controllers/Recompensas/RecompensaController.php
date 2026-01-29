<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class RecompensaController extends Controller
{
    /**
     * Listar todas las recompensas con filtros
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Recompensa::with([
                'creador:id,name'
            ])->withCount([
                'clientes',
                'productos', 
                'puntos',
                'descuentos',
                'envios',
                'regalos'
            ]);

            // Filtros
            if ($request->has('tipo') && !empty($request->tipo)) {
                $query->porTipo($request->tipo);
            }

            if ($request->has('estado') && !empty($request->estado)) {
                $query->where('estado', $request->estado);
            }

            if ($request->has('vigente') && $request->vigente) {
                $query->vigentes();
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_inicio', [$request->fecha_inicio, $request->fecha_fin]);
            }

            // Búsqueda por nombre
            if ($request->has('buscar') && !empty($request->buscar)) {
                $query->where('nombre', 'like', '%' . $request->buscar . '%');
            }

            // Ordenamiento
            $orderBy = $request->get('order_by', 'created_at');
            $orderDirection = $request->get('order_direction', 'desc');
            $query->orderBy($orderBy, $orderDirection);

            // Paginación
            $perPage = $request->get('per_page', 15);
            $recompensas = $query->paginate($perPage);

            // Agregar información adicional a cada recompensa
            $recompensas->getCollection()->transform(function ($recompensa) {
                return [
                    'id' => $recompensa->id,
                    'nombre' => $recompensa->nombre,
                    'descripcion' => $recompensa->descripcion,
                    'tipo' => $recompensa->tipo,
                    'tipo_nombre' => $recompensa->tipo_nombre,
                    'fecha_inicio' => $recompensa->fecha_inicio,
                    'fecha_fin' => $recompensa->fecha_fin,
                    'estado' => $recompensa->estado,
                    'estado_nombre' => $recompensa->estado_nombre,
                    'es_vigente' => $recompensa->es_vigente,
                    'total_aplicaciones' => $recompensa->total_aplicaciones,
                    'creador' => $recompensa->creador,
                    'created_at' => $recompensa->created_at,
                    'updated_at' => $recompensa->updated_at,
                    // Campos requeridos por la documentación
                    'total_clientes' => $recompensa->clientes_count,
                    'total_productos' => $recompensa->productos_count,
                    'valor_total_recompensa' => $this->calcularValorTotalRecompensa($recompensa),
                    // Contadores de configuraciones (optimizado con withCount)
                    'tiene_clientes' => $recompensa->clientes_count > 0,
                    'tiene_productos' => $recompensa->productos_count > 0,
                    'tiene_configuracion' => (
                        $recompensa->puntos_count > 0 ||
                        $recompensa->descuentos_count > 0 ||
                        $recompensa->envios_count > 0 ||
                        $recompensa->regalos_count > 0
                    )
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Recompensas obtenidas exitosamente',
                'data' => $recompensas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las recompensas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva recompensa
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nombre' => 'required|string|max:255',
                'descripcion' => 'nullable|string',
                'tipo' => 'required|in:' . implode(',', Recompensa::getTipos()),
                'fecha_inicio' => 'required|date',
                'fecha_fin' => 'required|date|after:fecha_inicio',
                'estado' => 'sometimes|in:' . implode(',', Recompensa::getEstados())
            ], [
                'nombre.required' => 'El nombre es obligatorio',
                'tipo.required' => 'El tipo de recompensa es obligatorio',
                'tipo.in' => 'El tipo de recompensa no es válido',
                'fecha_inicio.required' => 'La fecha de inicio es obligatoria',
                'fecha_fin.required' => 'La fecha de fin es obligatoria',
                'fecha_fin.after' => 'La fecha de fin debe ser posterior a la fecha de inicio',
                'estado.in' => 'El estado de recompensa no es válido'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Aplicar lógica automática de estados (normalizando a inicio de día y respetando timezone de la app)
            $timezone = config('app.timezone');
            $fechaInicio = Carbon::parse($request->fecha_inicio, $timezone)->startOfDay();
            $fechaActual = now($timezone)->startOfDay();
            $estadoAutomatico = '';

            if ($fechaInicio->isSameDay($fechaActual)) {
                // Fecha de inicio = HOY
                $estadoAutomatico = $request->get('estado', Recompensa::ESTADO_ACTIVA);
                // Validar que el estado sea válido para hoy
                if (!in_array($estadoAutomatico, [Recompensa::ESTADO_ACTIVA, Recompensa::ESTADO_PAUSADA])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Para fechas de hoy, el estado debe ser "activa" o "pausada"',
                        'errors' => ['estado' => ['Estado no válido para fecha de hoy']]
                    ], 422);
                }
            } elseif ($fechaInicio->isFuture()) {
                // Fecha de inicio = FUTURO
                $estadoAutomatico = Recompensa::ESTADO_PROGRAMADA;
                if ($request->has('estado') && $request->estado !== Recompensa::ESTADO_PROGRAMADA) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Para fechas futuras, el estado debe ser "programada"',
                        'errors' => ['estado' => ['Estado no válido para fecha futura']]
                    ], 422);
                }
            } else {
                // Fecha de inicio = PASADO
                $estadoAutomatico = $request->get('estado', Recompensa::ESTADO_EXPIRADA);
                // Validar que el estado sea válido para fechas pasadas
                if (!in_array($estadoAutomatico, [Recompensa::ESTADO_EXPIRADA, Recompensa::ESTADO_CANCELADA])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Para fechas pasadas, el estado debe ser "expirada" o "cancelada"',
                        'errors' => ['estado' => ['Estado no válido para fecha pasada']]
                    ], 422);
                }
            }

            DB::beginTransaction();

            $recompensa = Recompensa::create([
                'nombre' => $request->nombre,
                'descripcion' => $request->descripcion,
                'tipo' => $request->tipo,
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin' => $request->fecha_fin,
                'estado' => $estadoAutomatico,
                'creado_por' => Auth::id()
            ]);

            DB::commit();

            // Cargar relaciones para la respuesta
            $recompensa->load('creador:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Recompensa creada exitosamente',
                'data' => [
                    'recompensa' => $recompensa,
                    'estado_aplicado' => $estadoAutomatico,
                    'estado_nombre' => $recompensa->estado_nombre,
                    'logica_aplicada' => [
                        'fecha_inicio' => $fechaInicio->format('Y-m-d'),
                        'fecha_actual' => $fechaActual->format('Y-m-d'),
                        'es_fecha_hoy' => $fechaInicio->isSameDay($fechaActual),
                        'es_fecha_futura' => $fechaInicio->isFuture(),
                        'es_fecha_pasada' => $fechaInicio->isPast()
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de una recompensa específica
     */
    public function show($id): JsonResponse
    {
        try {
            $recompensa = Recompensa::with([
                'creador:id,name',
                'clientes.cliente:id,nombres,apellidos,email',
                'productos.producto:id,nombre,codigo_producto',
                'productos.categoria:id,nombre',
                'puntos',
                'descuentos',
                'envios',
                'regalos.producto:id,nombre,codigo_producto,precio_venta,stock',
                'historial' => function($query) {
                    $query->with('cliente:id,nombres,apellidos')
                          ->orderBy('fecha_aplicacion', 'desc')
                          ->limit(10);
                }
            ])->find($id);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Preparar datos detallados
            $data = [
                'recompensa' => [
                    'id' => $recompensa->id,
                    'nombre' => $recompensa->nombre,
                    'descripcion' => $recompensa->descripcion,
                    'tipo' => $recompensa->tipo,
                    'tipo_nombre' => $recompensa->tipo_nombre,
                    'fecha_inicio' => $recompensa->fecha_inicio,
                    'fecha_fin' => $recompensa->fecha_fin,
                    'estado' => $recompensa->estado,
                    'estado_nombre' => $recompensa->estado_nombre,
                    'es_vigente' => $recompensa->es_vigente,
                    'total_aplicaciones' => $recompensa->total_aplicaciones,
                    'creador' => $recompensa->creador,
                    'created_at' => $recompensa->created_at,
                    'updated_at' => $recompensa->updated_at
                ],
                'configuracion' => [
                    'clientes' => $recompensa->clientes->map(function($cliente) {
                        $result = [
                            'id' => $cliente->id,
                            'segmento' => $cliente->segmento,
                            'segmento_nombre' => $cliente->segmento_nombre,
                            'es_cliente_especifico' => $cliente->es_cliente_especifico
                        ];

                        // Solo incluir cliente si es específico y existe
                        if ($cliente->es_cliente_especifico && $cliente->cliente) {
                            $result['cliente'] = [
                                'id' => $cliente->cliente->id,
                                'nombre_completo' => trim($cliente->cliente->nombres . ' ' . $cliente->cliente->apellidos),
                                'email' => $cliente->cliente->email
                            ];
                        } else {
                            $result['cliente'] = null;
                        }

                        return $result;
                    }),
                    'productos' => $recompensa->productos->map(function($producto) {
                        $result = [
                            'id' => $producto->id,
                            'tipo_elemento' => strtolower($producto->tipo_elemento)
                        ];

                        // Incluir producto si es tipo producto
                        if ($producto->es_producto_especifico && $producto->producto) {
                            $result['producto'] = [
                                'id' => $producto->producto->id,
                                'nombre' => $producto->producto->nombre,
                                'precio' => $producto->producto->precio_venta ?? 0
                            ];
                            $result['categoria'] = null;
                        }
                        // Incluir categoría si es tipo categoría
                        elseif ($producto->es_categoria_especifica && $producto->categoria) {
                            $result['producto'] = null;
                            $result['categoria'] = [
                                'id' => $producto->categoria->id,
                                'nombre' => $producto->categoria->nombre
                            ];
                        }
                        else {
                            $result['producto'] = null;
                            $result['categoria'] = null;
                        }

                        return $result;
                    }),
                    'puntos' => $recompensa->puntos->map(function($punto) {
                        return [
                            'id' => $punto->id,
                            'tipo_calculo' => $punto->tipo_calculo ?? 'porcentaje',
                            'valor' => $punto->puntos_por_compra ?? 0,
                            'minimo_compra' => $punto->compra_minima ?? 0,
                            'maximo_puntos' => $punto->maximo_puntos ?? null,
                            'multiplicador_nivel' => $punto->multiplicador_nivel ?? 1
                        ];
                    }),
                    'descuentos' => $recompensa->descuentos->map(function($descuento) {
                        return [
                            'id' => $descuento->id,
                            'tipo_calculo' => $descuento->tipo_descuento ?? 'porcentaje',
                            'valor' => $descuento->valor_descuento ?? 0,
                            'minimo_compra' => $descuento->compra_minima ?? 0
                        ];
                    }),
                    'envios' => $recompensa->envios->map(function($envio) {
                        return [
                            'id' => $envio->id,
                            'minimo_compra' => $envio->compra_minima ?? 0,
                            'zonas_aplicables' => $envio->zonas_aplicables ?? []
                        ];
                    }),
                    'regalos' => $recompensa->regalos->map(function($regalo) {
                        return [
                            'id' => $regalo->id,
                            'producto_id' => $regalo->producto_id ?? null,
                            'cantidad' => $regalo->cantidad ?? 1,
                            'minimo_compra' => $regalo->compra_minima ?? 0
                        ];
                    })
                ],
                'historial_reciente' => $recompensa->historial->map(function($historial) {
                    return [
                        'id' => $historial->id,
                        'cliente' => $historial->nombre_cliente,
                        'puntos_otorgados' => $historial->puntos_otorgados,
                        'beneficio_aplicado' => $historial->beneficio_aplicado,
                        'fecha_aplicacion' => $historial->fecha_aplicacion,
                        'tiempo_transcurrido' => $historial->tiempo_transcurrido
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'message' => 'Detalle de recompensa obtenido exitosamente',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el detalle de la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una recompensa existente
     * Si no se especifica estado, se pausa automáticamente
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($id);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'nombre' => 'sometimes|required|string|max:255',
                'descripcion' => 'nullable|string',
                'tipo' => 'sometimes|required|in:' . implode(',', Recompensa::getTipos()),
                'fecha_inicio' => 'sometimes|required|date',
                'fecha_fin' => 'sometimes|required|date|after:fecha_inicio',
                'estado' => 'sometimes|in:' . implode(',', Recompensa::getEstados())
            ], [
                'nombre.required' => 'El nombre es obligatorio',
                'tipo.required' => 'El tipo de recompensa es obligatorio',
                'tipo.in' => 'El tipo de recompensa no es válido',
                'fecha_inicio.required' => 'La fecha de inicio es obligatoria',
                'fecha_fin.required' => 'La fecha de fin es obligatoria',
                'fecha_fin.after' => 'La fecha de fin debe ser posterior a la fecha de inicio',
                'estado.in' => 'El estado de recompensa no es válido'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Preparar datos para actualizar
            $updateData = $request->only([
                'nombre',
                'descripcion',
                'tipo',
                'fecha_inicio',
                'fecha_fin'
            ]);

            // Si no se especifica estado, pausar automáticamente
            if ($request->has('estado')) {
                $updateData['estado'] = $request->estado;
            } else {
                // Si la recompensa está activa, pausarla al actualizar
                if ($recompensa->estado === Recompensa::ESTADO_ACTIVA) {
                    $updateData['estado'] = Recompensa::ESTADO_PAUSADA;
                }
            }

            $recompensa->update($updateData);

            DB::commit();

            // Cargar relaciones para la respuesta
            $recompensa->load('creador:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Recompensa actualizada exitosamente',
                'data' => $recompensa
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar una recompensa (soft delete)
     */
    public function destroy($id): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($id);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar si puede cancelar
            if (!$recompensa->puedeCancelar()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede cancelar la recompensa desde el estado actual: ' . $recompensa->estado_nombre
                ], 422);
            }

            DB::beginTransaction();

            // Usar el método del modelo para cancelar
            $cancelada = $recompensa->cancelar();

            if (!$cancelada) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo cancelar la recompensa'
                ], 422);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Recompensa cancelada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al cancelar la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pausar una recompensa
     */
    public function pause($id): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($id);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar si puede pausar
            if (!$recompensa->puedePausar()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede pausar la recompensa desde el estado actual: ' . $recompensa->estado_nombre
                ], 422);
            }

            DB::beginTransaction();

            // Usar el método del modelo para pausar
            $pausada = $recompensa->pausar();

            if (!$pausada) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo pausar la recompensa'
                ], 422);
            }

            DB::commit();

            // Cargar relaciones para la respuesta
            $recompensa->load('creador:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Recompensa pausada exitosamente',
                'data' => $recompensa
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al pausar la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activar una recompensa
     */
    public function activate($id): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($id);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar si puede activar
            if (!$recompensa->puedeActivar()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede activar la recompensa desde el estado actual: ' . $recompensa->estado_nombre
                ], 422);
            }

            DB::beginTransaction();

            // Usar el método del modelo para activar
            $activada = $recompensa->activar();

            if (!$activada) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo activar la recompensa'
                ], 422);
            }

            DB::commit();

            // Cargar relaciones para la respuesta
            $recompensa->load('creador:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Recompensa activada exitosamente',
                'data' => $recompensa
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al activar la recompensa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de recompensas
     */
    public function estadisticas(): JsonResponse
    {
        try {
            // Obtener fechas para comparación
            $mesActual = now()->format('Y-m');
            $mesAnterior = now()->subMonth()->format('Y-m');
            $inicioMesActual = now()->startOfMonth();
            $finMesActual = now()->endOfMonth();
            $inicioMesAnterior = now()->subMonth()->startOfMonth();
            $finMesAnterior = now()->subMonth()->endOfMonth();

            // Estadísticas básicas con una sola consulta optimizada
            $estadisticasBasicas = Recompensa::selectRaw('
                COUNT(*) as total_recompensas,
                SUM(CASE WHEN estado = "activa" THEN 1 ELSE 0 END) as recompensas_activas,
                SUM(CASE WHEN estado = "activa" AND fecha_inicio <= CURDATE() AND fecha_fin >= CURDATE() THEN 1 ELSE 0 END) as recompensas_vigentes
            ')->first();

            // Estadísticas por tipo
            $porTipo = Recompensa::selectRaw('tipo, COUNT(*) as total, SUM(CASE WHEN estado = "activa" THEN 1 ELSE 0 END) as activas')
                ->groupBy('tipo')
                ->get()
                ->keyBy('tipo')
                ->map(function($item) {
                    return [
                        'total' => $item->total,
                        'activas' => $item->activas
                    ];
                });

            // Estadísticas de historial optimizadas (mes actual vs anterior)
            $historialStats = DB::table('recompensas_historial')
                ->selectRaw('
                    DATE_FORMAT(fecha_aplicacion, "%Y-%m") as mes,
                    COUNT(*) as aplicaciones,
                    COALESCE(SUM(puntos_otorgados), 0) as puntos_otorgados,
                    COUNT(DISTINCT cliente_id) as clientes_beneficiados
                ')
                ->whereBetween('fecha_aplicacion', [$inicioMesAnterior, $finMesActual])
                ->groupBy('mes')
                ->get()
                ->keyBy('mes');

            $mesActualData = $historialStats->get($mesActual, (object)[
                'aplicaciones' => 0,
                'puntos_otorgados' => 0,
                'clientes_beneficiados' => 0
            ]);

            $mesAnteriorData = $historialStats->get($mesAnterior, (object)[
                'aplicaciones' => 0,
                'puntos_otorgados' => 0,
                'clientes_beneficiados' => 0
            ]);

            // Cálculo de tendencias
            $tendencias = [
                'aplicaciones' => $this->calcularTendencia($mesAnteriorData->aplicaciones, $mesActualData->aplicaciones),
                'puntos' => $this->calcularTendencia($mesAnteriorData->puntos_otorgados, $mesActualData->puntos_otorgados),
                'clientes' => $this->calcularTendencia($mesAnteriorData->clientes_beneficiados, $mesActualData->clientes_beneficiados)
            ];

            // Top 5 recompensas más utilizadas este mes
            $topRecompensas = DB::table('recompensas_historial as rh')
                ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
                ->selectRaw('
                    r.id,
                    r.nombre,
                    r.tipo,
                    COUNT(*) as total_aplicaciones,
                    COUNT(DISTINCT rh.cliente_id) as clientes_unicos
                ')
                ->whereBetween('rh.fecha_aplicacion', [$inicioMesActual, $finMesActual])
                ->groupBy('r.id', 'r.nombre', 'r.tipo')
                ->orderByDesc('total_aplicaciones')
                ->limit(5)
                ->get();

            $estadisticas = [
                'resumen' => [
                    'total_recompensas' => (int) $estadisticasBasicas->total_recompensas,
                    'recompensas_activas' => (int) $estadisticasBasicas->recompensas_activas,
                    'recompensas_vigentes' => (int) $estadisticasBasicas->recompensas_vigentes,
                    'tasa_activacion' => $estadisticasBasicas->total_recompensas > 0 
                        ? round(($estadisticasBasicas->recompensas_activas / $estadisticasBasicas->total_recompensas) * 100, 2)
                        : 0
                ],
                'por_tipo' => $porTipo,
                'mes_actual' => [
                    'aplicaciones' => (int) $mesActualData->aplicaciones,
                    'puntos_otorgados' => (int) $mesActualData->puntos_otorgados,
                    'clientes_beneficiados' => (int) $mesActualData->clientes_beneficiados,
                    'promedio_puntos_por_aplicacion' => $mesActualData->aplicaciones > 0 
                        ? round($mesActualData->puntos_otorgados / $mesActualData->aplicaciones, 2)
                        : 0
                ],
                'comparativa_mes_anterior' => [
                    'aplicaciones' => [
                        'actual' => (int) $mesActualData->aplicaciones,
                        'anterior' => (int) $mesAnteriorData->aplicaciones,
                        'tendencia' => $tendencias['aplicaciones']
                    ],
                    'puntos_otorgados' => [
                        'actual' => (int) $mesActualData->puntos_otorgados,
                        'anterior' => (int) $mesAnteriorData->puntos_otorgados,
                        'tendencia' => $tendencias['puntos']
                    ],
                    'clientes_beneficiados' => [
                        'actual' => (int) $mesActualData->clientes_beneficiados,
                        'anterior' => (int) $mesAnteriorData->clientes_beneficiados,
                        'tendencia' => $tendencias['clientes']
                    ]
                ],
                'top_recompensas_mes' => $topRecompensas,
                'metadata' => [
                    'generado_en' => now()->toISOString(),
                    'periodo_analisis' => [
                        'mes_actual' => $mesActual,
                        'mes_anterior' => $mesAnterior
                    ],
                    'cache_valido_hasta' => now()->addHours(2)->toISOString()
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Calcular valor total de la recompensa
     */
    private function calcularValorTotalRecompensa($recompensa): float
    {
        $valorTotal = 0.0;
        
        // Sumar valor de puntos
        if ($recompensa->puntos_count > 0) {
            $puntos = $recompensa->puntos()->get();
            foreach ($puntos as $punto) {
                $valorTotal += $punto->puntos_por_compra * $punto->valor_por_punto;
            }
        }
        
        // Sumar valor de descuentos
        if ($recompensa->descuentos_count > 0) {
            $descuentos = $recompensa->descuentos()->get();
            foreach ($descuentos as $descuento) {
                $valorTotal += $descuento->porcentaje_descuento * 10; // Aproximación
            }
        }
        
        // Sumar valor de envíos
        if ($recompensa->envios_count > 0) {
            $envios = $recompensa->envios()->get();
            foreach ($envios as $envio) {
                $valorTotal += $envio->costo_envio ?? 0;
            }
        }
        
        // Sumar valor de regalos
        if ($recompensa->regalos_count > 0) {
            $regalos = $recompensa->regalos()->get();
            foreach ($regalos as $regalo) {
                $valorTotal += $regalo->producto->precio_venta ?? 0;
            }
        }
        
        return round($valorTotal, 2);
    }

    /**
     * Calcular tendencia entre dos valores
     */
    private function calcularTendencia($valorAnterior, $valorActual): array
    {
        if ($valorAnterior == 0 && $valorActual == 0) {
            return [
                'porcentaje' => 0,
                'direccion' => 'estable',
                'diferencia' => 0
            ];
        }

        if ($valorAnterior == 0) {
            return [
                'porcentaje' => 100,
                'direccion' => 'subida',
                'diferencia' => $valorActual
            ];
        }

        $porcentaje = (($valorActual - $valorAnterior) / $valorAnterior) * 100;
        $direccion = $porcentaje > 0 ? 'subida' : ($porcentaje < 0 ? 'bajada' : 'estable');

        return [
            'porcentaje' => round(abs($porcentaje), 2),
            'direccion' => $direccion,
            'diferencia' => $valorActual - $valorAnterior
        ];
    }

    /**
     * Obtener tipos de recompensas disponibles
     */
    public function tipos(): JsonResponse
    {
        try {
            $tipos = collect(Recompensa::getTipos())->map(function($tipo) {
                $nombres = [
                    'puntos' => 'Sistema de Puntos',
                    'descuento' => 'Descuentos',
                    'envio_gratis' => 'Envío Gratuito',
                    'regalo' => 'Productos de Regalo',
                    'nivel_cliente' => 'Nivel de Cliente'
                ];

                return [
                    'value' => $tipo,
                    'label' => $nombres[$tipo] ?? ucfirst($tipo)
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Tipos de recompensas obtenidos exitosamente',
                'data' => $tipos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los tipos de recompensas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar recompensas para popups (solo activas, programadas y pausadas)
     */
    public function indexPopups(Request $request): JsonResponse
    {
        try {
            $query = Recompensa::with([
                'creador:id,name'
            ])->withCount([
                'clientes',
                'productos', 
                'puntos',
                'descuentos',
                'envios',
                'regalos',
                'popup'
            ]);

            // Filtro específico para popups: solo activas, programadas y pausadas
            $query->whereIn('estado', ['activa', 'programada', 'pausada']);

            // Filtros adicionales
            if ($request->has('tipo') && !empty($request->tipo) && $request->tipo !== 'todos') {
                $query->porTipo($request->tipo);
            }

            if ($request->has('vigente') && $request->vigente) {
                $query->vigentes();
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_inicio', [$request->fecha_inicio, $request->fecha_fin]);
            }

            // Búsqueda por nombre
            if ($request->has('nombre') && !empty($request->nombre)) {
                $query->where('nombre', 'like', '%' . $request->nombre . '%');
            }

            // Ordenamiento
            $orderBy = $request->get('order_by', 'created_at');
            $orderDirection = $request->get('order_direction', 'desc');
            $query->orderBy($orderBy, $orderDirection);

            // Paginación
            $perPage = $request->get('per_page', 12);
            $recompensas = $query->paginate($perPage);

            // Agregar información adicional a cada recompensa
            $recompensas->getCollection()->transform(function ($recompensa) {
                return [
                    'id' => $recompensa->id,
                    'nombre' => $recompensa->nombre,
                    'descripcion' => $recompensa->descripcion,
                    'tipo' => $recompensa->tipo,
                    'tipo_nombre' => $recompensa->tipo_nombre,
                    'fecha_inicio' => $recompensa->fecha_inicio,
                    'fecha_fin' => $recompensa->fecha_fin,
                    'estado' => $recompensa->estado,
                    'estado_nombre' => $recompensa->estado_nombre,
                    'es_vigente' => $recompensa->es_vigente,
                    'total_aplicaciones' => $recompensa->total_aplicaciones,
                    'creador' => $recompensa->creador,
                    'created_at' => $recompensa->created_at,
                    'updated_at' => $recompensa->updated_at,
                    // Campos requeridos por la documentación
                    'total_clientes' => $recompensa->clientes_count,
                    'total_productos' => $recompensa->productos_count,
                    'valor_total_recompensa' => $this->calcularValorTotalRecompensa($recompensa),
                    // Contadores de configuraciones (optimizado con withCount)
                    'tiene_clientes' => $recompensa->clientes_count > 0,
                    'tiene_productos' => $recompensa->productos_count > 0,
                    'tiene_configuracion' => (
                        $recompensa->puntos_count > 0 ||
                        $recompensa->descuentos_count > 0 ||
                        $recompensa->envios_count > 0 ||
                        $recompensa->regalos_count > 0
                    ),
                    // Información específica de popups
                    'tiene_popup' => $recompensa->popup_count > 0,
                    'total_popups' => $recompensa->popup_count
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Recompensas para popups obtenidas exitosamente',
                'data' => $recompensas->items(),
                'total' => $recompensas->total(),
                'current_page' => $recompensas->currentPage(),
                'last_page' => $recompensas->lastPage(),
                'per_page' => $recompensas->perPage()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las recompensas para popups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estados disponibles según la fecha de inicio
     */
    public function estadosDisponibles(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'fecha_inicio' => 'required|date'
            ], [
                'fecha_inicio.required' => 'La fecha de inicio es obligatoria',
                'fecha_inicio.date' => 'La fecha de inicio debe ser una fecha válida'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $timezone = config('app.timezone');
            $fechaInicio = Carbon::parse($request->fecha_inicio, $timezone)->startOfDay();
            $fechaActual = now($timezone)->startOfDay();
            
            $estadosDisponibles = [];
            $estadoPorDefecto = '';
            $mensaje = '';

            // Lógica de estados según la fecha
            if ($fechaInicio->isSameDay($fechaActual)) {
                // Fecha de inicio = HOY
                $estadosDisponibles = [
                    [
                        'value' => Recompensa::ESTADO_ACTIVA,
                        'label' => 'Activa',
                        'description' => 'La recompensa estará activa inmediatamente'
                    ],
                    [
                        'value' => Recompensa::ESTADO_PAUSADA,
                        'label' => 'Pausada',
                        'description' => 'La recompensa estará pausada y requerirá activación manual'
                    ]
                ];
                $estadoPorDefecto = Recompensa::ESTADO_ACTIVA;
                $mensaje = 'Para fechas de hoy, la recompensa puede estar activa o pausada';
                
            } elseif ($fechaInicio->isFuture()) {
                // Fecha de inicio = FUTURO
                $estadosDisponibles = [
                    [
                        'value' => Recompensa::ESTADO_PROGRAMADA,
                        'label' => 'Programada',
                        'description' => 'La recompensa se activará automáticamente en la fecha de inicio'
                    ]
                ];
                $estadoPorDefecto = Recompensa::ESTADO_PROGRAMADA;
                $mensaje = 'Para fechas futuras, la recompensa debe estar programada';
                
            } else {
                // Fecha de inicio = PASADO
                $estadosDisponibles = [
                    [
                        'value' => Recompensa::ESTADO_EXPIRADA,
                        'label' => 'Expirada',
                        'description' => 'La recompensa ya expiró por fecha de inicio pasada'
                    ],
                    [
                        'value' => Recompensa::ESTADO_CANCELADA,
                        'label' => 'Cancelada',
                        'description' => 'La recompensa se marca como cancelada'
                    ]
                ];
                $estadoPorDefecto = Recompensa::ESTADO_EXPIRADA;
                $mensaje = 'Para fechas pasadas, la recompensa debe estar expirada o cancelada';
            }

            return response()->json([
                'success' => true,
                'message' => 'Estados disponibles obtenidos exitosamente',
                'data' => [
                    'estados_disponibles' => $estadosDisponibles,
                    'estado_por_defecto' => $estadoPorDefecto,
                    'mensaje' => $mensaje,
                    'fecha_inicio' => $fechaInicio->format('Y-m-d'),
                    'fecha_actual' => $fechaActual->format('Y-m-d'),
                    'es_fecha_pasada' => $fechaInicio->isPast(),
                    'es_fecha_hoy' => $fechaInicio->isSameDay($fechaActual),
                    'es_fecha_futura' => $fechaInicio->isFuture()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los estados disponibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}