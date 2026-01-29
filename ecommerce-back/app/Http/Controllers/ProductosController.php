<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\ProductoDetalle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductosController extends Controller
{
    /**
     * Obtener todos los productos
     */
    public function index(Request $request)
    {
        try {
            $query = Producto::with(['categoria.seccion', 'marca'])->orderBy('nombre');
            
            // Filtrar por sección si se proporciona
            if ($request->has('seccion') && $request->seccion !== '') {
                $query->whereHas('categoria', function($q) use ($request) {
                    $q->where('id_seccion', $request->seccion);
                });
            }
            
            $productos = $query->get();

            // Agregar URL completa de imagen
            $productos->transform(function ($producto) {
                if ($producto->imagen) {
                    $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
                }
                return $producto;
            });

            return response()->json($productos);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener productos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear nuevo producto
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'codigo_producto' => 'required|string|max:100|unique:productos,codigo_producto',
            'categoria_id' => 'required|exists:categorias,id',
            'marca_id' => 'nullable|exists:marcas_productos,id', // ✅ AGREGADO
            'precio_compra' => 'required|numeric|min:0',
            'precio_venta' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'stock_minimo' => 'required|integer|min:0',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'boolean',
            'destacado' => 'boolean',
            'mostrar_igv' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->only([
                'nombre',
                'descripcion',
                'codigo_producto',
                'categoria_id',
                'marca_id',         // ✅ AGREGADO
                'precio_compra',
                'precio_venta',
                'stock',
                'stock_minimo',
                'activo',
                'destacado',
                'mostrar_igv'
            ]);

            $data['activo'] = $request->has('activo') ? (bool) $request->activo : true;
            $data['destacado'] = $request->has('destacado') ? (bool) $request->destacado : false;     // <- NUEVA LÍNEA
            $data['mostrar_igv'] = $request->has('mostrar_igv') ? (bool) $request->mostrar_igv : true;

            // MÉTODO MANUAL - Manejar imagen directamente en public/storage
            if ($request->hasFile('imagen')) {
                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();

                // Crear directorio si no existe
                $directorioDestino = public_path('storage/productos');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }

                // Mover imagen directamente a public/storage/productos
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $producto = Producto::create($data);
            $producto->load('categoria');

            // Agregar URL completa de imagen para la respuesta
            if ($producto->imagen) {
                $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
            }

            return response()->json([
                'message' => 'Producto creado exitosamente',
                'producto' => $producto
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener producto específico
     */
    public function show($id)
    {
        try {
            $producto = Producto::with('categoria')->findOrFail($id);

            if ($producto->imagen) {
                $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
            }

            return response()->json($producto);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Producto no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Actualizar producto
     */
   public function update(Request $request, $id)
    {
        // Convertir mostrar_igv a booleano antes de validar
        if ($request->has('mostrar_igv')) {
            $request->merge([
                'mostrar_igv' => filter_var($request->input('mostrar_igv'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
        
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'codigo_producto' => 'required|string|max:100|unique:productos,codigo_producto,' . $id,
            'categoria_id' => 'required|exists:categorias,id',
            'marca_id' => 'nullable|exists:marcas_productos,id',
            'precio_compra' => 'required|numeric|min:0',
            'precio_venta' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'stock_minimo' => 'required|integer|min:0',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'required|in:true,false,1,0',
            'mostrar_igv' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $producto = Producto::findOrFail($id);
            $data = $request->only([
                'nombre', 'descripcion', 'codigo_producto', 'categoria_id', 'marca_id',
                'precio_compra', 'precio_venta', 'stock', 'stock_minimo',
                'destacado',  // <- AGREGAR ESTA LÍNEA
                'mostrar_igv'
            ]);
            
            $data['activo'] = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN);
            $data['destacado'] = filter_var($request->destacado, FILTER_VALIDATE_BOOLEAN);  // <- AGREGAR ESTA LÍNEA

            // MÉTODO MANUAL - Manejar imagen
            if ($request->hasFile('imagen')) {
                // Eliminar imagen anterior si existe
                if ($producto->imagen) {
                    $rutaImagenAnterior = public_path('storage/productos/' . $producto->imagen);
                    if (file_exists($rutaImagenAnterior)) {
                        unlink($rutaImagenAnterior);
                    }
                }

                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/productos');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/productos
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $producto->update($data);
            $producto->load(['categoria', 'marca']);

            // Agregar URL completa de imagen para la respuesta
            if ($producto->imagen) {
                $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
            }

            return response()->json([
                'message' => 'Producto actualizado exitosamente',
                'producto' => $producto
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado del producto (NUEVO ENDPOINT ESPECÍFICO)
     */
    public function toggleEstado(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'activo' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $producto = Producto::findOrFail($id);
            $producto->update(['activo' => (bool) $request->activo]);
            $producto->load('categoria');

            // Agregar URL completa de imagen para la respuesta
            if ($producto->imagen) {
                $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
            }

            return response()->json([
                'message' => 'Estado del producto actualizado exitosamente',
                'producto' => $producto
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar estado del producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar producto
     */
    public function destroy($id)
    {
        try {
            $producto = Producto::findOrFail($id);

            // MÉTODO MANUAL - Eliminar imagen si existe
            if ($producto->imagen) {
                $rutaImagen = public_path('storage/productos/' . $producto->imagen);
                if (file_exists($rutaImagen)) {
                    unlink($rutaImagen);
                }
            }

            $producto->delete();

            return response()->json([
                'message' => 'Producto eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos con stock bajo
     */
    public function stockBajo()
    {
        try {
            $productos = Producto::with('categoria')
                ->stockBajo()
                ->activos()
                ->get();

            // Agregar URL completa de imagen
            $productos->transform(function ($producto) {
                if ($producto->imagen) {
                    $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
                }
                return $producto;
            });

            return response()->json($productos);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener productos con stock bajo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function productosPublicos(Request $request)
    {
        $query = Producto::with(['categoria.seccion'])  
            ->where('activo', true)
            ->where('stock', '>', 0);

        // Filtrar por categoría si se proporciona
        if ($request->has('categoria')) {
            $query->where('categoria_id', $request->categoria);
        }

        // ✅ NUEVO: Filtrar por sección si se proporciona
        if ($request->has('seccion') && $request->seccion !== '' && $request->seccion !== null) {
            $query->whereHas('categoria', function($q) use ($request) {
                $q->where('id_seccion', $request->seccion);
            });
        }

        // Filtrar por búsqueda si se proporciona
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'LIKE', "%{$search}%")
                    ->orWhere('descripcion', 'LIKE', "%{$search}%");
            });
        }

        // Filtro por rango de precios (basado en precio_venta)
        if ($request->has('minPrice')) {
            $query->where('precio_venta', '>=', $request->minPrice);
        }
        if ($request->has('maxPrice')) {
            $query->where('precio_venta', '<=', $request->maxPrice);
        }

        // Filtro por categorías (string de IDs separados por comas)
        if ($request->has('categoryIds')) {
            $categoryIds = explode(',', $request->categoryIds);
            $query->whereIn('categoria_id', $categoryIds);
        }

        // Filtro por marca (marca_id)
        if ($request->has('brand')) {
            $query->where('marca_id', $request->brand);
        }

        // Ordenamiento
        if ($request->has('sortBy')) {
            switch ($request->sortBy) {
                case 'price_asc':
                    $query->orderBy('precio_venta', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('precio_venta', 'desc');
                    break;
                case 'name_asc':
                    $query->orderBy('nombre', 'asc');
                    break;
                case 'popularity_desc':
                    $query->orderBy('stock', 'desc'); // Simulado con stock, ya que no hay popularidad
                    break;
                default:
                    $query->orderBy('nombre', 'asc');
            }
        } else {
            $query->orderBy('nombre', 'asc');
        }

        // ✅ Si no se especifica página, devolver todos los productos (para el index)
        // Si se especifica página, paginar normalmente (para la tienda)
        if (!$request->has('page')) {
            $productos = $query->get();

            // Agregar campos calculados para el frontend
            $productosTransformados = $productos->map(function ($producto) {
                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'descripcion' => $producto->descripcion,
                    'precio' => $producto->precio_venta,
                    'precio_oferta' => null,
                    'stock' => $producto->stock,
                    'imagen_principal' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : '/placeholder-product.jpg',
                    'categoria' => $producto->categoria?->nombre,
                    'categoria_id' => $producto->categoria_id,
                    'rating' => 4.8,
                    'total_reviews' => rand(15, 25) . 'k',
                    'reviews_count' => rand(150, 250),
                    'sold_count' => rand(10, 30),
                    'total_stock' => $producto->stock + rand(10, 30),
                    'is_on_sale' => false,
                    'discount_percentage' => 0,
                    'mostrar_igv' => $producto->mostrar_igv
                ];
            });

            return response()->json([
                'productos' => $productosTransformados,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $productosTransformados->count(),
                    'total' => $productosTransformados->count()
                ]
            ]);
        }

        $productos = $query->paginate(20);

        // Agregar campos calculados para el frontend
        $productos->getCollection()->transform(function ($producto) {
            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'descripcion' => $producto->descripcion,
                'precio' => $producto->precio_venta, // ✅ CORREGIR: usar precio_venta
                'precio_oferta' => null, // Por ahora null, luego puedes agregar este campo
                'stock' => $producto->stock,
                'imagen_principal' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : '/placeholder-product.jpg', // ✅ CORREGIR
                'categoria' => $producto->categoria?->nombre,
                'categoria_id' => $producto->categoria_id,

                // ✅ CAMPOS DE RATING (valores fijos por ahora)
                'rating' => 4.8,
                'total_reviews' => rand(15, 25) . 'k',
                'reviews_count' => rand(150, 250),

                // ✅ CAMPOS ADICIONALES PARA EL FRONTEND
                'sold_count' => rand(10, 30),
                'total_stock' => $producto->stock + rand(10, 30),
                'is_on_sale' => false, // Por ahora false, luego puedes implementar ofertas
                'discount_percentage' => 0,
                'mostrar_igv' => $producto->mostrar_igv
            ];
        });

        return response()->json([
            'productos' => $productos->items(),
            'pagination' => [
                'current_page' => $productos->currentPage(),
                'last_page' => $productos->lastPage(),
                'per_page' => $productos->perPage(),
                'total' => $productos->total()
            ]
        ]);
    }

    // ✅ NUEVO MÉTODO PARA OBTENER CATEGORÍAS PARA EL SIDEBAR
    public function categoriasParaSidebar()
    {
        $categorias = Categoria::withCount([
            'productos' => function ($query) {
                $query->where('activo', true)->where('stock', '>', 0);
            }
        ])
            ->where('activo', true)
            ->orderBy('nombre')
            ->get()
            ->map(function ($categoria) {
                return [
                    'id' => $categoria->id,
                    'nombre' => $categoria->nombre,
                    'productos_count' => $categoria->productos_count
                ];
            });

        return response()->json($categorias);
    }
    
    // Encuentra este método existente:
    public function buscarProductos(Request $request)
    {
        try {
            $termino = $request->get('q', '');
            
            if (strlen($termino) < 2) {
                return response()->json([]);
            }

            // MODIFICAR: Agregar filtro por categoría
            $query = Producto::with(['categoria'])
                ->where('activo', true)
                ->where('stock', '>', 0)
                ->where(function ($query) use ($termino) {
                    $query->where('nombre', 'LIKE', "%{$termino}%")
                        ->orWhere('descripcion', 'LIKE', "%{$termino}%")
                        ->orWhere('codigo_producto', 'LIKE', "%{$termino}%");
                });

            // ✅ NUEVO: Filtrar por categoría si se proporciona
            if ($request->has('categoria') && $request->categoria !== '') {
                $query->where('categoria_id', $request->categoria);
            }

            $productos = $query->limit(10)
                ->get()
                ->map(function ($producto) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'descripcion' => $producto->descripcion,
                        'precio' => $producto->precio_venta,
                        'categoria' => $producto->categoria?->nombre,
                        'categoria_id' => $producto->categoria_id,
                        'imagen_url' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : null,
                        'url' => route('producto.detalle', $producto->id) // Asumiendo que tienes esta ruta
                    ];
                });

            return response()->json($productos);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al buscar productos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de productos para dashboard
     */
    public function estadisticasDashboard()
    {
        try {
            $totalProductos = Producto::count();

            return response()->json([
                'total_productos' => $totalProductos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos con stock crítico
     */
    public function productosStockCritico()
    {
        try {
            $productosStockCritico = Producto::with('categoria')
                ->whereRaw('stock <= stock_minimo')
                ->select('id', 'nombre', 'stock', 'stock_minimo', 'categoria_id')
                ->orderBy('stock', 'asc')
                ->get();

            return response()->json($productosStockCritico);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener productos con stock crítico',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function showPublico($id)
{
    try {
        $producto = Producto::with(['categoria', 'marca'])
            ->where('activo', true)
            ->findOrFail($id);
            
        $detalles = ProductoDetalle::where('producto_id', $id)->first();
        
        $productosRelacionados = Producto::where('categoria_id', $producto->categoria_id)
            ->where('id', '!=', $id)
            ->where('activo', true)
            ->limit(6)
            ->get();
            
        return response()->json([
            'producto' => $producto,
            'detalles' => $detalles,
            'productos_relacionados' => $productosRelacionados
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => 'Producto no encontrado'], 404);
    }
}
    /**
 * Toggle destacado del producto
 */
public function toggleDestacado(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'destacado' => 'required|boolean'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Datos de validación incorrectos',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $producto = Producto::findOrFail($id);
        $producto->update(['destacado' => (bool) $request->destacado]);
        $producto->load(['categoria', 'marca']);

        if ($producto->imagen) {
            $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
        }

        return response()->json([
            'message' => 'Estado destacado actualizado exitosamente',
            'producto' => $producto
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error al actualizar estado destacado',
            'error' => $e->getMessage()
        ], 500);
    }
}
/**
 * Obtener productos destacados
 */
public function productosDestacados()
{
    try {
        $productos = Producto::with(['categoria', 'marca'])
            ->where('destacado', true)
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();

        $productos->transform(function ($producto) {
            if ($producto->imagen) {
                $producto->imagen_url = asset('storage/productos/' . $producto->imagen);
            }
            return $producto;
        });

        return response()->json($productos);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error al obtener productos destacados',
            'error' => $e->getMessage()
        ], 500);
    }
}

}