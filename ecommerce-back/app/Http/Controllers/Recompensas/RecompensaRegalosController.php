<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaRegalo;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaRegalosController extends Controller
{
    /**
     * Obtener configuración de regalos de una recompensa
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

            // Verificar que sea una recompensa de tipo regalo
            if ($recompensa->tipo !== Recompensa::TIPO_REGALO) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo regalo'
                ], 422);
            }

            $configuraciones = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->with('producto:id,nombre,codigo_producto,precio_venta,stock,activo')
                ->get()
                ->map(function($config) {
                    return [
                        'id' => $config->id,
                        'producto_id' => $config->producto_id,
                        'cantidad' => $config->cantidad,
                        'es_regalo_multiple' => $config->es_regalo_multiple,
                        'valor_total_regalo' => $config->valor_total_regalo,
                        'tiene_stock_suficiente' => $config->tiene_stock_suficiente,
                        'stock_disponible' => $config->stock_disponible,
                        'puede_ser_otorgado' => $config->puedeSerOtorgado(),
                        'descripcion' => $config->descripcion_regalo,
                        'producto' => $config->producto ? [
                            'id' => $config->producto->id,
                            'nombre' => $config->producto->nombre,
                            'codigo_producto' => $config->producto->codigo_producto,
                            'precio_venta' => $config->producto->precio_venta,
                            'stock' => $config->producto->stock,
                            'activo' => $config->producto->activo
                        ] : null,
                        'resumen' => $config->getResumenConfiguracion()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Configuración de regalos obtenida exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre,
                        'tipo' => $recompensa->tipo
                    ],
                    'configuraciones' => $configuraciones
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la configuración de regalos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear configuración de regalo
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

            // Verificar que sea una recompensa de tipo regalo
            if ($recompensa->tipo !== Recompensa::TIPO_REGALO) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo regalo'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'producto_id' => 'required|exists:productos,id',
                'cantidad' => 'required|integer|min:1|max:100'
            ], [
                'producto_id.required' => 'El producto es obligatorio',
                'producto_id.exists' => 'El producto seleccionado no existe',
                'cantidad.required' => 'La cantidad es obligatoria',
                'cantidad.integer' => 'La cantidad debe ser un número entero',
                'cantidad.min' => 'La cantidad debe ser al menos 1',
                'cantidad.max' => 'La cantidad no puede exceder 100 unidades'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar que el producto esté activo
            $producto = Producto::find($request->producto_id);
            if (!$producto->activo) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede configurar un producto inactivo como regalo'
                ], 422);
            }

            // Verificar que haya stock suficiente
            if ($producto->stock < $request->cantidad) {
                return response()->json([
                    'success' => false,
                    'message' => "Stock insuficiente. Disponible: {$producto->stock}, Requerido: {$request->cantidad}"
                ], 422);
            }

            // Verificar que no exista ya el mismo producto como regalo
            $existeRegalo = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->where('producto_id', $request->producto_id)
                ->exists();

            if ($existeRegalo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este producto ya está configurado como regalo para esta recompensa'
                ], 422);
            }

            DB::beginTransaction();

            $configuracion = RecompensaRegalo::create([
                'recompensa_id' => $recompensaId,
                'producto_id' => $request->producto_id,
                'cantidad' => $request->cantidad
            ]);

            DB::commit();

            // Cargar relaciones para la respuesta
            $configuracion->load('producto:id,nombre,codigo_producto,precio_venta,stock,activo');

            $data = [
                'id' => $configuracion->id,
                'producto_id' => $configuracion->producto_id,
                'cantidad' => $configuracion->cantidad,
                'es_regalo_multiple' => $configuracion->es_regalo_multiple,
                'valor_total_regalo' => $configuracion->valor_total_regalo,
                'tiene_stock_suficiente' => $configuracion->tiene_stock_suficiente,
                'stock_disponible' => $configuracion->stock_disponible,
                'puede_ser_otorgado' => $configuracion->puedeSerOtorgado(),
                'descripcion' => $configuracion->descripcion_regalo,
                'producto' => [
                    'id' => $configuracion->producto->id,
                    'nombre' => $configuracion->producto->nombre,
                    'codigo_producto' => $configuracion->producto->codigo_producto,
                    'precio_venta' => $configuracion->producto->precio_venta,
                    'stock' => $configuracion->producto->stock,
                    'activo' => $configuracion->producto->activo
                ],
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de regalo creada exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la configuración de regalo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración de regalo
     */
    public function update(Request $request, $recompensaId, $configId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->with('producto')
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de regalo no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'producto_id' => 'sometimes|exists:productos,id',
                'cantidad' => 'sometimes|integer|min:1|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Si se está cambiando el producto, verificar que esté activo
            if ($request->has('producto_id') && $request->producto_id != $configuracion->producto_id) {
                $nuevoProducto = Producto::find($request->producto_id);
                if (!$nuevoProducto->activo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se puede configurar un producto inactivo como regalo'
                    ], 422);
                }

                // Verificar que no exista ya el nuevo producto como regalo
                $existeRegalo = RecompensaRegalo::where('recompensa_id', $recompensaId)
                    ->where('producto_id', $request->producto_id)
                    ->where('id', '!=', $configId)
                    ->exists();

                if ($existeRegalo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Este producto ya está configurado como regalo para esta recompensa'
                    ], 422);
                }
            }

            // Verificar stock si se está cambiando la cantidad o el producto
            $productoId = $request->get('producto_id', $configuracion->producto_id);
            $cantidad = $request->get('cantidad', $configuracion->cantidad);
            $producto = Producto::find($productoId);

            if ($producto->stock < $cantidad) {
                return response()->json([
                    'success' => false,
                    'message' => "Stock insuficiente. Disponible: {$producto->stock}, Requerido: {$cantidad}"
                ], 422);
            }

            DB::beginTransaction();

            $configuracion->update($request->only([
                'producto_id',
                'cantidad'
            ]));

            DB::commit();

            // Recargar relaciones
            $configuracion->load('producto:id,nombre,codigo_producto,precio_venta,stock,activo');

            $data = [
                'id' => $configuracion->id,
                'producto_id' => $configuracion->producto_id,
                'cantidad' => $configuracion->cantidad,
                'es_regalo_multiple' => $configuracion->es_regalo_multiple,
                'valor_total_regalo' => $configuracion->valor_total_regalo,
                'tiene_stock_suficiente' => $configuracion->tiene_stock_suficiente,
                'stock_disponible' => $configuracion->stock_disponible,
                'puede_ser_otorgado' => $configuracion->puedeSerOtorgado(),
                'descripcion' => $configuracion->descripcion_regalo,
                'producto' => [
                    'id' => $configuracion->producto->id,
                    'nombre' => $configuracion->producto->nombre,
                    'codigo_producto' => $configuracion->producto->codigo_producto,
                    'precio_venta' => $configuracion->producto->precio_venta,
                    'stock' => $configuracion->producto->stock,
                    'activo' => $configuracion->producto->activo
                ],
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de regalo actualizada exitosamente',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la configuración de regalo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar configuración de regalo
     */
    public function destroy($recompensaId, $configId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de regalo no encontrada'
                ], 404);
            }

            DB::beginTransaction();

            $configuracion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración de regalo eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la configuración de regalo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar productos para configurar como regalo
     */
    public function buscarProductos(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'buscar' => 'required|string|min:2',
                'limite' => 'nullable|integer|min:1|max:50',
                'categoria_id' => 'nullable|exists:categorias,id',
                'solo_activos' => 'nullable|boolean',
                'con_stock' => 'nullable|boolean'
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
            $soloActivos = $request->get('solo_activos', true);
            $conStock = $request->get('con_stock', true);

            $query = Producto::with('categoria:id,nombre')
                ->where(function($q) use ($buscar) {
                    $q->where('nombre', 'like', "%{$buscar}%")
                      ->orWhere('codigo_producto', 'like', "%{$buscar}%");
                });

            if ($soloActivos) {
                $query->where('activo', true);
            }

            if ($conStock) {
                $query->where('stock', '>', 0);
            }

            if ($request->categoria_id) {
                $query->where('categoria_id', $request->categoria_id);
            }

            $productos = $query->limit($limite)
                ->get(['id', 'nombre', 'codigo_producto', 'precio_venta', 'stock', 'activo', 'categoria_id'])
                ->map(function($producto) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'codigo_producto' => $producto->codigo_producto,
                        'precio_venta' => $producto->precio_venta,
                        'stock' => $producto->stock,
                        'activo' => $producto->activo,
                        'puede_ser_regalo' => $producto->activo && $producto->stock > 0,
                        'categoria' => $producto->categoria ? [
                            'id' => $producto->categoria->id,
                            'nombre' => $producto->categoria->nombre
                        ] : null
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Productos encontrados exitosamente',
                'data' => $productos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar productos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar disponibilidad de stock para múltiples regalos
     */
    public function verificarDisponibilidad(Request $request, $recompensaId, $configId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->with('producto')
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de regalo no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'cantidad_regalos' => 'required|integer|min:1|max:1000'
            ], [
                'cantidad_regalos.required' => 'La cantidad de regalos es obligatoria',
                'cantidad_regalos.integer' => 'La cantidad de regalos debe ser un número entero',
                'cantidad_regalos.min' => 'La cantidad de regalos debe ser al menos 1',
                'cantidad_regalos.max' => 'La cantidad de regalos no puede exceder 1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $cantidadRegalos = $request->cantidad_regalos;
            $disponibilidad = $configuracion->verificarDisponibilidadMultiple($cantidadRegalos);

            $resultado = [
                'configuracion_regalo' => [
                    'producto' => [
                        'id' => $configuracion->producto->id,
                        'nombre' => $configuracion->producto->nombre,
                        'codigo_producto' => $configuracion->producto->codigo_producto
                    ],
                    'cantidad_por_regalo' => $configuracion->cantidad,
                    'valor_unitario_regalo' => $configuracion->valor_total_regalo
                ],
                'solicitud' => [
                    'cantidad_regalos_solicitados' => $cantidadRegalos,
                    'stock_total_requerido' => $disponibilidad['stock_requerido'],
                    'valor_total_regalos' => $configuracion->valor_total_regalo * $cantidadRegalos
                ],
                'disponibilidad' => $disponibilidad,
                'recomendaciones' => []
            ];

            // Agregar recomendaciones
            if (!$disponibilidad['puede_otorgar']) {
                $resultado['recomendaciones'][] = "Stock insuficiente. Máximo posible: {$disponibilidad['cantidad_maxima_regalos']} regalos";
            }

            if ($disponibilidad['cantidad_maxima_regalos'] < $cantidadRegalos && $disponibilidad['cantidad_maxima_regalos'] > 0) {
                $resultado['recomendaciones'][] = "Considere reducir la cantidad a {$disponibilidad['cantidad_maxima_regalos']} regalos";
            }

            if ($configuracion->stock_disponible < 10) {
                $resultado['recomendaciones'][] = 'Stock bajo. Considere reabastecer el producto';
            }

            return response()->json([
                'success' => true,
                'message' => 'Verificación de disponibilidad completada exitosamente',
                'data' => $resultado
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar la disponibilidad',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Simular otorgamiento de regalo (sin afectar stock)
     */
    public function simular(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuraciones = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->with('producto')
                ->get();

            if ($configuraciones->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuraciones de regalo para esta recompensa'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'cantidad_aplicaciones' => 'nullable|integer|min:1|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $cantidadAplicaciones = $request->get('cantidad_aplicaciones', 1);
            $simulaciones = [];
            $valorTotalRegalos = 0;
            $stockTotalRequerido = 0;

            foreach ($configuraciones as $configuracion) {
                $disponibilidad = $configuracion->verificarDisponibilidadMultiple($cantidadAplicaciones);
                $valorTotal = $configuracion->valor_total_regalo * $cantidadAplicaciones;
                
                $simulacion = [
                    'producto' => [
                        'id' => $configuracion->producto->id,
                        'nombre' => $configuracion->producto->nombre,
                        'codigo_producto' => $configuracion->producto->codigo_producto
                    ],
                    'configuracion' => [
                        'cantidad_por_regalo' => $configuracion->cantidad,
                        'valor_unitario' => $configuracion->valor_total_regalo
                    ],
                    'simulacion' => [
                        'cantidad_aplicaciones' => $cantidadAplicaciones,
                        'stock_requerido' => $disponibilidad['stock_requerido'],
                        'valor_total' => $valorTotal,
                        'puede_otorgar' => $disponibilidad['puede_otorgar'],
                        'cantidad_maxima_posible' => $disponibilidad['cantidad_maxima_regalos']
                    ]
                ];

                $simulaciones[] = $simulacion;
                $valorTotalRegalos += $valorTotal;
                $stockTotalRequerido += $disponibilidad['stock_requerido'];
            }

            $resumen = [
                'cantidad_aplicaciones_solicitadas' => $cantidadAplicaciones,
                'total_configuraciones' => $configuraciones->count(),
                'valor_total_todos_regalos' => $valorTotalRegalos,
                'stock_total_requerido' => $stockTotalRequerido,
                'todas_disponibles' => collect($simulaciones)->every(function($sim) {
                    return $sim['simulacion']['puede_otorgar'];
                }),
                'configuraciones_disponibles' => collect($simulaciones)->where('simulacion.puede_otorgar', true)->count()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Simulación de regalos completada exitosamente',
                'data' => [
                    'resumen' => $resumen,
                    'simulaciones' => $simulaciones
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al simular el otorgamiento de regalos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de regalos para una recompensa
     */
    public function estadisticas($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuraciones = RecompensaRegalo::where('recompensa_id', $recompensaId)
                ->with('producto')
                ->get();

            $estadisticas = [
                'total_configuraciones' => $configuraciones->count(),
                'valor_total_regalos' => $configuraciones->sum('valor_total_regalo'),
                'stock_total_disponible' => $configuraciones->sum('stock_disponible'),
                'configuraciones_disponibles' => $configuraciones->where('tiene_stock_suficiente', true)->count(),
                'configuraciones_sin_stock' => $configuraciones->where('tiene_stock_suficiente', false)->count(),
                'productos_activos' => $configuraciones->filter(function($config) {
                    return $config->producto && $config->producto->activo;
                })->count(),
                'por_producto' => $configuraciones->map(function($config) {
                    return [
                        'producto' => [
                            'id' => $config->producto->id,
                            'nombre' => $config->producto->nombre,
                            'codigo_producto' => $config->producto->codigo_producto
                        ],
                        'cantidad_regalo' => $config->cantidad,
                        'valor_regalo' => $config->valor_total_regalo,
                        'stock_disponible' => $config->stock_disponible,
                        'puede_otorgar' => $config->puedeSerOtorgado(),
                        'regalos_posibles' => $config->cantidad > 0 ? intval($config->stock_disponible / $config->cantidad) : 0
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de regalos obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas de regalos',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}