<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\ProductoDetalle;
use App\Support\MedidaDeCategoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductosController extends Controller
{
    // Precio y moneda por producto: un producto puede estar cotizado solo en
    // soles, solo en dolares o en las dos.
    use \App\Http\Controllers\Concerns\ResuelvePreciosPorMoneda;

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
            'manual_pdf' => 'nullable|file|mimes:pdf,png,jpg,jpeg,doc,docx|max:10240',
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

            // MÉTODO MANUAL - Manejar manual en PDF (mismo patrón que la imagen)
            if ($request->hasFile('manual_pdf')) {
                $manual = $request->file('manual_pdf');
                $nombreManual = time() . '_' . uniqid() . '.' . $manual->getClientOriginalExtension();

                $directorioManuales = public_path('storage/productos/manuales');
                if (!file_exists($directorioManuales)) {
                    mkdir($directorioManuales, 0755, true);
                }

                $manual->move($directorioManuales, $nombreManual);
                $data['manual_pdf'] = $nombreManual;
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
            'manual_pdf' => 'nullable|file|mimes:pdf,png,jpg,jpeg,doc,docx|max:10240',
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

            // MÉTODO MANUAL - Manejar manual en PDF (mismo patrón que la imagen)
            if ($request->hasFile('manual_pdf')) {
                if ($producto->manual_pdf) {
                    $rutaManualAnterior = public_path('storage/productos/manuales/' . $producto->manual_pdf);
                    if (file_exists($rutaManualAnterior)) {
                        unlink($rutaManualAnterior);
                    }
                }

                $manual = $request->file('manual_pdf');
                $nombreManual = time() . '_' . uniqid() . '.' . $manual->getClientOriginalExtension();

                $directorioManuales = public_path('storage/productos/manuales');
                if (!file_exists($directorioManuales)) {
                    mkdir($directorioManuales, 0755, true);
                }

                $manual->move($directorioManuales, $nombreManual);
                $data['manual_pdf'] = $nombreManual;
            } elseif ($request->boolean('eliminar_manual_pdf')) {
                if ($producto->manual_pdf) {
                    $rutaManualAnterior = public_path('storage/productos/manuales/' . $producto->manual_pdf);
                    if (file_exists($rutaManualAnterior)) {
                        unlink($rutaManualAnterior);
                    }
                }
                $data['manual_pdf'] = null;
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
        // Todas las listas aplicables (soles primero). El precio y la moneda
        // se resuelven por producto, porque uno cotizado solo en dólares debe
        // mostrar su precio en dólares y no "S/ 0.00".
        $listas = $this->listasPrecioAplicables();
        // Hay precio si existe AL MENOS una lista, sea soles o dólares. Antes
        // dependía solo de la de soles, así que un cliente con lista únicamente
        // en dólares veía el aviso de "inicia sesión para ver el precio".
        $precioVisible = !empty($listas);

        // Se muestran todos los productos activos, incluidos los que no
        // tienen stock (se marcan como "Agotado" en el catálogo en vez de
        // ocultarse, para que coincida con el conteo de "Activos" del admin).
        $query = Producto::with(['categoria.seccion', 'precios', 'marca'])
            ->where('activo', true);

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

        // Filtrar por búsqueda si se proporciona.
        //
        // Mismos campos que el desplegable del header (buscarProductos): código,
        // marca y categoría además del nombre. Antes solo miraba nombre y
        // descripción, y como `descripcion` es el "Producto <nombre>" que genera
        // la sincronización, buscar "amplificador" traía únicamente los productos
        // con esa palabra en el nombre y dejaba fuera toda la categoría.
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'LIKE', "%{$search}%")
                    ->orWhere('descripcion', 'LIKE', "%{$search}%")
                    ->orWhere('codigo_producto', 'LIKE', "%{$search}%")
                    ->orWhereHas('marca', fn ($m) => $m->where('nombre', 'LIKE', "%{$search}%"))
                    ->orWhereHas('categoria', fn ($c) => $c->where('nombre', 'LIKE', "%{$search}%"));
            });
        }

        // Filtro por categorías (string de IDs separados por comas)
        if ($request->filled('categoryIds')) {
            $categoryIds = array_filter(explode(',', $request->categoryIds));
            $query->whereIn('categoria_id', $categoryIds);
        }

        // Filtro por marca (marca_id)
        if ($request->has('brand')) {
            $query->where('marca_id', $request->brand);
        }

        // Filtro por varias marcas (string de IDs separados por comas), para el
        // filtro del catálogo que permite marcar más de una a la vez.
        if ($request->filled('brandIds')) {
            $brandIds = array_filter(explode(',', $request->brandIds));
            $query->whereIn('marca_id', $brandIds);
        }

        // Filtro por medida. No hay columna: la medida se escribe a mano dentro
        // del nombre del producto, y qué se mide depende de la categoría —
        // canales en amplificadores, bobina en drivers, metros en cables,
        // pulgadas en parlantes (ver App\Support\MedidaDeCategoria).
        //
        // La categoría manda: el mismo "2" significa 2 canales en un
        // amplificador y 2 pulgadas en un parlante.
        if ($request->filled('sizes')) {
            $sizes = array_filter(explode(',', $request->sizes));

            $categorias = $request->filled('categoryIds')
                ? array_filter(explode(',', $request->categoryIds))
                : ($request->filled('categoria') ? [$request->categoria] : []);

            $tipo = count($categorias) === 1
                ? MedidaDeCategoria::tipoDe(
                    \DB::table('categorias')->where('id', reset($categorias))->value('nombre')
                )
                : null;

            if ($tipo) {
                $query->where(function ($q) use ($sizes, $tipo) {
                    foreach ($sizes as $size) {
                        [$sql, $bindings] = MedidaDeCategoria::condicionSql($tipo, $size);
                        $q->orWhereRaw($sql, $bindings);
                    }
                });
            } else {
                // Sin una categoría única no se sabe qué unidad es: se mantiene
                // el comportamiento de siempre, buscar pulgadas.
                $query->where(function ($q) use ($sizes) {
                    foreach ($sizes as $size) {
                        // 1) La medida con la marca de pulgadas: "6.5''", '10"'.
                        $q->orWhereRaw('nombre REGEXP ?', [$this->regexTamano($size)]);

                        // 2) La medida al principio del nombre y sin marca
                        //    ("6.5 PARLANTE 2 VIAS"). Solo cuenta si el nombre es
                        //    de un producto que se mide en pulgadas: si no,
                        //    "4 SENSORES DE RETROCESO" o "3.30 M ... RCA" saldrían
                        //    como medidas.
                        $q->orWhere(function ($qq) use ($size) {
                            $qq->whereRaw('nombre REGEXP ?', [$this->regexTamanoAlInicio($size)])
                                ->whereRaw('nombre REGEXP ?', [self::PALABRAS_MEDIDA_SQL]);
                        });
                    }
                });
            }
        }

        // El precio que ve el cliente sale de su lista de precios, no de la
        // columna `precio_venta` (que en este catálogo está en 0 para todos).
        // Por eso tanto los topes del deslizador como el filtro trabajan sobre
        // `producto_precios`, limitado a las listas que le aplican.
        $idsListas = array_column($listas, 'tipo_precio_id');

        // Límites del resultado ANTES de aplicar el rango elegido: son los
        // topes del deslizador, así que no pueden depender de él.
        $limites = null;
        if (! empty($idsListas)) {
            $limites = (clone $query)->reorder()->toBase()
                ->joinSub(
                    \DB::table('producto_precios')
                        ->select('producto_id')
                        ->selectRaw('MIN(precio) as minimo, MAX(precio) as maximo')
                        ->whereIn('tipo_precio_id', $idsListas)
                        ->where('precio', '>', 0)
                        ->groupBy('producto_id'),
                    'pp',
                    'pp.producto_id',
                    '=',
                    'productos.id'
                )
                ->selectRaw('MIN(pp.minimo) as minimo, MAX(pp.maximo) as maximo')
                ->first();
        }

        // Filtro por rango de precios sobre la lista del cliente.
        if (! empty($idsListas) && ($request->filled('minPrice') || $request->filled('maxPrice'))) {
            $min = $request->filled('minPrice') ? (float) $request->minPrice : null;
            $max = $request->filled('maxPrice') ? (float) $request->maxPrice : null;

            $query->whereHas('precios', function ($q) use ($idsListas, $min, $max) {
                $q->whereIn('tipo_precio_id', $idsListas)->where('precio', '>', 0);
                if ($min !== null) {
                    $q->where('precio', '>=', $min);
                }
                if ($max !== null) {
                    $q->where('precio', '<=', $max);
                }
            });
        }

        // Los agotados van al final, sea cual sea el orden elegido: el cliente
        // ve primero lo que puede comprar. Va antes que el resto de criterios
        // para que mande sobre ellos.
        $query->orderByRaw('CASE WHEN stock > 0 THEN 0 ELSE 1 END');

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
            $productosTransformados = $productos->map(function ($producto) use ($listas, $precioVisible) {
                $pm = $this->precioYMonedaProducto($producto, $listas);
                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'descripcion' => $producto->descripcion,
                    'precio' => $precioVisible ? $pm['precio'] : null,
                    'precio_visible' => $precioVisible,
                    'moneda' => $pm['moneda'],
                    'precio_oferta' => null,
                    'stock' => $producto->stock,
                    'imagen_principal' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : '/placeholder-product.jpg',
                    'categoria' => $producto->categoria?->nombre,
                    'categoria_id' => $producto->categoria_id,
                    'marca' => $producto->marca?->nombre,
                    'rating' => 4.8,
                    'total_reviews' => rand(15, 25) . 'k',
                    'reviews_count' => rand(150, 250),
                    'sold_count' => rand(10, 30),
                    'total_stock' => $producto->stock + rand(10, 30),
                    'is_on_sale' => false,
                    'discount_percentage' => 0,
                    'mostrar_igv' => $producto->mostrar_igv,
                    'codigo_producto' => $producto->codigo_producto
                ];
            });

            return response()->json([
                'productos' => $productosTransformados,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $productosTransformados->count(),
                    'total' => $productosTransformados->count()
                ],
                // Topes para el deslizador de precio del filtro del catálogo.
                'precio_min' => $limites?->minimo !== null ? (float) $limites->minimo : null,
                'precio_max' => $limites?->maximo !== null ? (float) $limites->maximo : null,
            ]);
        }

        $productos = $query->paginate(20);

        // Agregar campos calculados para el frontend
        $productos->getCollection()->transform(function ($producto) use ($listas, $precioVisible) {
            $pm = $this->precioYMonedaProducto($producto, $listas);
            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'descripcion' => $producto->descripcion,
                'precio' => $precioVisible ? $pm['precio'] : null,
                'precio_visible' => $precioVisible,
                'moneda' => $pm['moneda'],
                'precio_oferta' => null, // Por ahora null, luego puedes agregar este campo
                'stock' => $producto->stock,
                'imagen_principal' => $producto->imagen ? asset('storage/productos/' . $producto->imagen) : '/placeholder-product.jpg', // ✅ CORREGIR
                'categoria' => $producto->categoria?->nombre,
                'categoria_id' => $producto->categoria_id,
                'marca' => $producto->marca?->nombre,

                // ✅ CAMPOS DE RATING (valores fijos por ahora)
                'rating' => 4.8,
                'total_reviews' => rand(15, 25) . 'k',
                'reviews_count' => rand(150, 250),

                // ✅ CAMPOS ADICIONALES PARA EL FRONTEND
                'sold_count' => rand(10, 30),
                'total_stock' => $producto->stock + rand(10, 30),
                'is_on_sale' => false, // Por ahora false, luego puedes implementar ofertas
                'discount_percentage' => 0,
                'mostrar_igv' => $producto->mostrar_igv,
                'codigo_producto' => $producto->codigo_producto
            ];
        });

        return response()->json([
            'productos' => $productos->items(),
            'pagination' => [
                'current_page' => $productos->currentPage(),
                'last_page' => $productos->lastPage(),
                'per_page' => $productos->perPage(),
                'total' => $productos->total()
            ],
            // Topes para el deslizador de precio del filtro del catálogo.
            'precio_min' => $limites?->minimo !== null ? (float) $limites->minimo : null,
            'precio_max' => $limites?->maximo !== null ? (float) $limites->maximo : null,
        ]);
    }

    /**
     * Expresión para encontrar una medida dentro del nombre del producto.
     *
     * El "1.5" tiene que ir precedido de algo que no sea número ni punto (si
     * no, "11.5" también daría positivo) y seguido de la marca de pulgadas,
     * que en los nombres aparece como dos apóstrofes o como comilla doble.
     */
    private function regexTamano(string $size): string
    {
        // La marca de pulgadas se escribe como dos apóstrofes o comilla doble.
        return "(^|[^0-9.])" . $this->numeroRegex($size) . "[[:space:]]*(''|\"|”|″)";
    }

    /** La medida escrita al principio del nombre, sin marca de pulgadas. */
    private function regexTamanoAlInicio(string $size): string
    {
        return "^[[:space:]]*" . $this->numeroRegex($size) . "[[:space:]]";
    }

    private function numeroRegex(string $size): string
    {
        return str_replace('.', '[.]', preg_replace('/[^0-9.]/', '', $size));
    }

    /**
     * Productos cuya medida se da en pulgadas. Sirve para no confundir el
     * número inicial del nombre con metros, centímetros o cantidades.
     */
    private const PALABRAS_MEDIDA = '/(PARLANTE|SUBWOOFER|SUB WOOFER|TWEETER|DRIVER|WOOFER|MEDIO RANGO|MID ?BASS|MIDRANGE|COMPONENTE|CORNETA|BOCINA|PANTALLA|RECEPTOR|MONITOR)/iu';

    private const PALABRAS_MEDIDA_SQL = '(PARLANTE|SUBWOOFER|SUB WOOFER|TWEETER|DRIVER|WOOFER|MEDIO RANGO|MID ?BASS|MIDRANGE|COMPONENTE|CORNETA|BOCINA|PANTALLA|RECEPTOR|MONITOR)';

    /**
     * Opciones del filtro de medida del catálogo.
     *
     * Lo que se mide depende de la categoría elegida: canales en amplificadores,
     * bobina en drivers, metros en cables y pulgadas en parlantes (ver
     * App\Support\MedidaDeCategoria). Sin categoría, o con una que no tiene
     * medida definida, se devuelve la lista vacía y el sidebar oculta el filtro:
     * antes se ofrecían siempre pulgadas y en Amplificadores no daba resultados.
     */
    public function tamanosPublicos(Request $request)
    {
        $categoriaId = $request->query('categoria');

        $categoria = $categoriaId
            ? \DB::table('categorias')->where('id', $categoriaId)->first()
            : null;

        $tipo = MedidaDeCategoria::tipoDe($categoria->nombre ?? null);

        if (! $tipo) {
            return response()->json([
                'tipo' => null,
                'titulo' => MedidaDeCategoria::titulo(null),
                'opciones' => [],
            ]);
        }

        $nombres = Producto::where('activo', true)
            ->where('categoria_id', $categoria->id)
            ->pluck('nombre');

        // Un nombre puede traer varias medidas ("4CH * 120 + 1CH * 320"), y el
        // producto cuenta en todas: es lo mismo que hace el filtro.
        $conteo = [];
        foreach ($nombres as $nombre) {
            foreach (MedidaDeCategoria::leerDe($tipo, $nombre) as $medida) {
                $conteo[$medida] = ($conteo[$medida] ?? 0) + 1;
            }
        }

        // De menor a mayor, que es como se leen estas listas.
        uksort($conteo, fn ($a, $b) => (float) $a <=> (float) $b);

        $opciones = [];
        foreach ($conteo as $medida => $total) {
            $opciones[] = [
                'valor' => (string) $medida,
                'etiqueta' => MedidaDeCategoria::etiqueta($tipo, (string) $medida),
                'productos_count' => $total,
            ];
        }

        return response()->json([
            'tipo' => $tipo,
            'titulo' => MedidaDeCategoria::titulo($tipo),
            'opciones' => $opciones,
        ]);
    }

    // ✅ NUEVO MÉTODO PARA OBTENER CATEGORÍAS PARA EL SIDEBAR
    public function categoriasParaSidebar(Request $request)
    {
        $marcaId = $request->get('marca_id', '');

        $categorias = Categoria::withCount([
            // El conteo respeta la misma marca seleccionada en el sidebar (si hay alguna)
            // y el mismo criterio de "activo" que usa el listado público (sin exigir stock > 0).
            'productos' => function ($query) use ($marcaId) {
                $query->where('activo', true);
                if ($marcaId !== '') {
                    $query->where('marca_id', $marcaId);
                }
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
            $termino = trim($request->get('q', ''));
            $categoriaId = $request->get('categoria', '');
            $hayTermino = strlen($termino) >= 2;
            $hayCategoria = $categoriaId !== '' && $categoriaId !== null;

            // Antes se exigía texto siempre; ahora también se permite listar
            // solo por categoría (sin escribir nada) para el dropdown del header.
            if (!$hayTermino && !$hayCategoria) {
                return response()->json([]);
            }

            // Se listan también los agotados (igual que el catálogo, que los
            // marca como "Agotado" en vez de esconderlos); van al final.
            $query = Producto::with(['categoria', 'marca'])
                ->where('activo', true)
                ->orderByRaw('CASE WHEN stock > 0 THEN 0 ELSE 1 END');

            if ($hayTermino) {
                // También busca por marca y por categoría: escribir "pioneer"
                // o "amplificador" tiene que traer sus productos aunque el
                // nombre del producto no incluya esa palabra.
                $query->where(function ($query) use ($termino) {
                    $query->where('nombre', 'LIKE', "%{$termino}%")
                        ->orWhere('descripcion', 'LIKE', "%{$termino}%")
                        ->orWhere('codigo_producto', 'LIKE', "%{$termino}%")
                        ->orWhereHas('marca', fn ($q) => $q->where('nombre', 'LIKE', "%{$termino}%"))
                        ->orWhereHas('categoria', fn ($q) => $q->where('nombre', 'LIKE', "%{$termino}%"));
                });
            }

            if ($hayCategoria) {
                $query->where('categoria_id', $categoriaId);
            }

            if ($hayTermino) {
                // Orden por relevancia:
                //   1) nombre que empieza por el término
                //   2) nombre que contiene el término
                //   3) código que coincide
                //   4) descripción que contiene el término
                //   Empate -> alfabético por nombre.
                $query->orderByRaw('
                    CASE
                        WHEN nombre LIKE ? THEN 1
                        WHEN nombre LIKE ? THEN 2
                        WHEN codigo_producto LIKE ? THEN 3
                        WHEN descripcion LIKE ? THEN 4
                        ELSE 5
                    END
                ', ["{$termino}%", "%{$termino}%", "%{$termino}%", "%{$termino}%"])
                ->orderBy('nombre', 'asc');
            } else {
                $query->orderBy('nombre', 'asc');
            }

            // Precio y moneda por producto (ver listasPrecioAplicables).
            $listas = $this->listasPrecioAplicables();
            $precioVisible = !empty($listas);

            $productos = $query->with('precios')->limit(10)
                ->get()
                ->map(function ($producto) use ($listas, $precioVisible) {
                    $pm = $this->precioYMonedaProducto($producto, $listas);
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre,
                        'descripcion' => $producto->descripcion,
                        'precio' => $precioVisible ? $pm['precio'] : 0,
                        'precio_visible' => $precioVisible,
                        'moneda' => $pm['moneda'],
                        'categoria' => $producto->categoria?->nombre,
                        'categoria_id' => $producto->categoria_id,
                        // Datos extra para la lista de sugerencias del buscador.
                        'marca' => $producto->marca?->nombre,
                        'codigo_producto' => $producto->codigo_producto,
                        'stock' => $producto->stock,
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
    public function showPublico(Request $request, $id)
{
    try {
        // Precio y moneda por producto (ver listasPrecioAplicables).
        $listas = $this->listasPrecioAplicables();
        $precioVisible = !empty($listas);

        $producto = Producto::with(['categoria', 'marca', 'precios'])
            ->where('activo', true)
            ->findOrFail($id);

        // El stock se lee de Novik en el momento: es una sola consulta y es la
        // pantalla donde el cliente decide comprar. El catálogo sigue usando la
        // copia de `productos.stock` (leer en vivo un listado de 40 productos
        // haría una consulta cruzada por página, y ahí el dato de la última
        // sincronización alcanza). Si Novik no responde, queda la copia.
        // `sincronizar` ademas lo guarda en `productos.stock`: asi el catalogo,
        // el buscador y el carrito quedan con el mismo dato sin esperar al cron.
        $stockEnVivo = \App\Support\StockEnVivo::sincronizar($producto->id);
        if ($stockEnVivo !== null) {
            $producto->stock = $stockEnVivo;
        }

        // Invitado sin ninguna lista de "Clientes visitantes" configurada:
        // no ve precio (login requerido). Si hay al menos una configurada
        // (o está logueado), se resuelve el precio normalmente.
        $pm = $this->precioYMonedaProducto($producto, $listas);
        $producto->precio_venta = $precioVisible ? $pm['precio'] : 0;
        $producto->precio_visible = $precioVisible;
        $producto->moneda = $pm['moneda'];
        $moneda = $pm['moneda'];

        // Si el producto tiene precio en más de una moneda, se mandan todas
        // para el selector S/ / US$ del detalle (sin volver a pedir al
        // backend). Aplica tanto a invitados como a clientes logueados: antes
        // solo se enviaba a invitados, así que un cliente con lista en soles y
        // en dólares no podía elegir la moneda.
        $monedaOpciones = collect($listas)->map(function ($op) use ($producto) {
            return [
                'moneda' => $op['moneda'],
                'tipo_precio_id' => $op['tipo_precio_id'],
                'precio_venta' => $producto->precioPara($op['tipo_precio_id']),
            ];
        })->filter(fn ($op) => $op['precio_venta'] !== null && $op['precio_venta'] > 0)
          ->values()->all();

        $detalles = ProductoDetalle::where('producto_id', $id)->first();

        $productosRelacionados = Producto::with('precios')
            ->where('categoria_id', $producto->categoria_id)
            ->where('id', '!=', $id)
            ->where('activo', true)
            ->limit(6)
            ->get()
            ->map(function ($p) use ($listas, $precioVisible) {
                $pmRel = $this->precioYMonedaProducto($p, $listas);
                $p->precio_venta = $precioVisible ? $pmRel['precio'] : 0;
                $p->precio_visible = $precioVisible;
                $p->moneda = $pmRel['moneda'];
                return $p;
            });

        return response()->json([
            'producto' => $producto,
            'detalles' => $detalles,
            'productos_relacionados' => $productosRelacionados,
            'precio_visible' => $precioVisible,
            'moneda' => $moneda,
            'moneda_opciones' => $monedaOpciones,
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