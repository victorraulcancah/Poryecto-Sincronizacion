<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaProducto;
use App\Models\Producto;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaProductoController extends Controller
{
    /**
     * Listar productos/categorías asignados a una recompensa
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

            $productos = RecompensaProducto::where('recompensa_id', $recompensaId)
                ->with([
                    'producto:id,nombre,codigo_producto,precio_venta,stock,activo',
                    'categoria:id,nombre,activo'
                ])
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'tipo_elemento' => $item->tipo_elemento,
                        'nombre_elemento' => $item->nombre_elemento,
                        'producto' => $item->producto ? [
                            'id' => $item->producto->id,
                            'nombre' => $item->producto->nombre,
                            'codigo_producto' => $item->producto->codigo_producto,
                            'precio_venta' => $item->producto->precio_venta,
                            'stock' => $item->producto->stock,
                            'activo' => $item->producto->activo
                        ] : null,
                        'categoria' => $item->categoria ? [
                            'id' => $item->categoria->id,
                            'nombre' => $item->categoria->nombre,
                            'activo' => $item->categoria->activo,
                            'productos_count' => $item->categoria->productos()->count()
                        ] : null,
                        'productos_aplicables_count' => $item->getProductosAplicables()->count()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Productos/categorías obtenidos exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre
                    ],
                    'productos' => $productos
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los productos/categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Asignar un producto o categoría a una recompensa
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
                'tipo' => 'required|in:producto,categoria',
                'producto_id' => 'required_if:tipo,producto|exists:productos,id',
                'categoria_id' => 'required_if:tipo,categoria|exists:categorias,id'
            ], [
                'tipo.required' => 'El tipo es obligatorio',
                'tipo.in' => 'El tipo debe ser producto o categoría',
                'producto_id.required_if' => 'El producto es obligatorio cuando el tipo es producto',
                'producto_id.exists' => 'El producto seleccionado no existe',
                'categoria_id.required_if' => 'La categoría es obligatoria cuando el tipo es categoría',
                'categoria_id.exists' => 'La categoría seleccionada no existe'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validar que no exista ya la misma asignación
            $existeAsignacion = RecompensaProducto::where('recompensa_id', $recompensaId)
                ->when($request->tipo === 'producto', function($query) use ($request) {
                    return $query->where('producto_id', $request->producto_id);
                })
                ->when($request->tipo === 'categoria', function($query) use ($request) {
                    return $query->where('categoria_id', $request->categoria_id);
                })
                ->exists();

            if ($existeAsignacion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este ' . $request->tipo . ' ya está asignado a la recompensa'
                ], 422);
            }

            // Validar que el producto/categoría esté activo
            if ($request->tipo === 'producto') {
                $producto = Producto::find($request->producto_id);
                if (!$producto->activo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se puede asignar un producto inactivo'
                    ], 422);
                }
            } else {
                $categoria = Categoria::find($request->categoria_id);
                if (!$categoria->activo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se puede asignar una categoría inactiva'
                    ], 422);
                }
            }

            DB::beginTransaction();

            $asignacion = RecompensaProducto::create([
                'recompensa_id' => $recompensaId,
                'producto_id' => $request->tipo === 'producto' ? $request->producto_id : null,
                'categoria_id' => $request->tipo === 'categoria' ? $request->categoria_id : null
            ]);

            DB::commit();

            // Cargar relaciones para la respuesta
            $asignacion->load(['producto:id,nombre,codigo_producto,precio_venta,stock,activo', 'categoria:id,nombre,activo']);

            $data = [
                'id' => $asignacion->id,
                'tipo_elemento' => $asignacion->tipo_elemento,
                'nombre_elemento' => $asignacion->nombre_elemento,
                'producto' => $asignacion->producto ? [
                    'id' => $asignacion->producto->id,
                    'nombre' => $asignacion->producto->nombre,
                    'codigo_producto' => $asignacion->producto->codigo_producto,
                    'precio_venta' => $asignacion->producto->precio_venta,
                    'stock' => $asignacion->producto->stock,
                    'activo' => $asignacion->producto->activo
                ] : null,
                'categoria' => $asignacion->categoria ? [
                    'id' => $asignacion->categoria->id,
                    'nombre' => $asignacion->categoria->nombre,
                    'activo' => $asignacion->categoria->activo,
                    'productos_count' => $asignacion->categoria->productos()->count()
                ] : null,
                'productos_aplicables_count' => $asignacion->getProductosAplicables()->count()
            ];

            return response()->json([
                'success' => true,
                'message' => ucfirst($request->tipo) . ' asignado exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al asignar el ' . ($request->tipo ?? 'elemento'),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una asignación de producto/categoría
     */
    public function destroy($recompensaId, $asignacionId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $asignacion = RecompensaProducto::where('recompensa_id', $recompensaId)
                ->where('id', $asignacionId)
                ->first();

            if (!$asignacion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asignación no encontrada'
                ], 404);
            }

            DB::beginTransaction();

            $tipoElemento = $asignacion->tipo_elemento;
            $asignacion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $tipoElemento . ' eliminado exitosamente de la recompensa'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la asignación',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar productos para asignación
     */
    public function buscarProductos(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'buscar' => 'required|string|min:2',
                'limite' => 'nullable|integer|min:1|max:50',
                'categoria_id' => 'nullable|exists:categorias,id',
                'solo_activos' => 'nullable|boolean'
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

            $query = Producto::with('categoria:id,nombre')
                ->where(function($q) use ($buscar) {
                    $q->where('nombre', 'like', "%{$buscar}%")
                      ->orWhere('codigo_producto', 'like', "%{$buscar}%");
                });

            if ($soloActivos) {
                $query->where('activo', true);
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
     * Buscar categorías para asignación
     */
    public function buscarCategorias(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'buscar' => 'nullable|string|min:2',
                'limite' => 'nullable|integer|min:1|max:50',
                'solo_activas' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $buscar = $request->get('buscar', '');
            $limite = $request->get('limite', 20);
            $soloActivas = $request->get('solo_activas', true);

            $query = Categoria::withCount('productos');

            if (!empty($buscar)) {
                $query->where('nombre', 'like', "%{$buscar}%");
            }

            if ($soloActivas) {
                $query->where('activo', true);
            }

            $categorias = $query->limit($limite)
                ->get(['id', 'nombre', 'descripcion', 'activo'])
                ->map(function($categoria) {
                    return [
                        'id' => $categoria->id,
                        'nombre' => $categoria->nombre,
                        'descripcion' => $categoria->descripcion,
                        'activo' => $categoria->activo,
                        'productos_count' => $categoria->productos_count
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Categorías encontradas exitosamente',
                'data' => $categorias
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos aplicables para una recompensa
     */
    public function productosAplicables($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $asignaciones = RecompensaProducto::where('recompensa_id', $recompensaId)->get();
            $productosAplicables = collect();

            foreach ($asignaciones as $asignacion) {
                $productos = $asignacion->getProductosAplicables();
                $productosAplicables = $productosAplicables->merge($productos);
            }

            // Eliminar duplicados y formatear
            $productosUnicos = $productosAplicables->unique('id')->map(function($producto) {
                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'codigo_producto' => $producto->codigo_producto,
                    'precio_venta' => $producto->precio_venta,
                    'stock' => $producto->stock,
                    'activo' => $producto->activo,
                    'categoria' => [
                        'id' => $producto->categoria_id,
                        'nombre' => $producto->categoria->nombre ?? 'Sin categoría'
                    ]
                ];
            })->values();

            return response()->json([
                'success' => true,
                'message' => 'Productos aplicables obtenidos exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre
                    ],
                    'total_productos' => $productosUnicos->count(),
                    'productos' => $productosUnicos
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los productos aplicables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar si un producto específico aplica para una recompensa
     */
    public function validarProducto(Request $request, $recompensaId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'producto_id' => 'required|exists:productos,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $recompensa = Recompensa::find($recompensaId);
            $producto = Producto::with('categoria')->find($request->producto_id);

            if (!$recompensa || !$producto) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa o producto no encontrado'
                ], 404);
            }

            $asignaciones = RecompensaProducto::where('recompensa_id', $recompensaId)->get();
            $aplicaRecompensa = false;
            $asignacionesAplicables = [];

            foreach ($asignaciones as $asignacion) {
                $aplica = $asignacion->productoAplica($producto);
                if ($aplica) {
                    $aplicaRecompensa = true;
                    $asignacionesAplicables[] = [
                        'id' => $asignacion->id,
                        'tipo_elemento' => $asignacion->tipo_elemento,
                        'nombre_elemento' => $asignacion->nombre_elemento
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Validación completada exitosamente',
                'data' => [
                    'producto' => [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'codigo_producto' => $producto->codigo_producto,
                        'categoria' => $producto->categoria ? [
                            'id' => $producto->categoria->id,
                            'nombre' => $producto->categoria->nombre
                        ] : null
                    ],
                    'aplica_recompensa' => $aplicaRecompensa,
                    'asignaciones_aplicables' => $asignacionesAplicables,
                    'total_asignaciones_configuradas' => $asignaciones->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al validar el producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de productos/categorías para una recompensa
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

            $asignaciones = RecompensaProducto::where('recompensa_id', $recompensaId)
                ->with(['producto', 'categoria'])
                ->get();

            $estadisticas = [
                'total_asignaciones' => $asignaciones->count(),
                'productos_especificos' => $asignaciones->whereNotNull('producto_id')->count(),
                'categorias_completas' => $asignaciones->whereNotNull('categoria_id')->count(),
                'productos_aplicables_total' => 0,
                'valor_total_productos' => 0,
                'por_categoria' => []
            ];

            $todosLosProductos = collect();
            $categorias = [];

            foreach ($asignaciones as $asignacion) {
                $productos = $asignacion->getProductosAplicables();
                $todosLosProductos = $todosLosProductos->merge($productos);

                if ($asignacion->categoria) {
                    $categorias[$asignacion->categoria->id] = [
                        'nombre' => $asignacion->categoria->nombre,
                        'productos_count' => $productos->count(),
                        'valor_total' => $productos->sum('precio_venta')
                    ];
                }
            }

            $productosUnicos = $todosLosProductos->unique('id');
            $estadisticas['productos_aplicables_total'] = $productosUnicos->count();
            $estadisticas['valor_total_productos'] = $productosUnicos->sum('precio_venta');
            $estadisticas['por_categoria'] = array_values($categorias);

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}