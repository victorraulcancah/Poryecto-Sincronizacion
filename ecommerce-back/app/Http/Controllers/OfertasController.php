<?php

namespace App\Http\Controllers;

use App\Models\Oferta;
use App\Models\TipoOferta;
use App\Models\Cupon;
use App\Models\OfertaProducto;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class OfertasController extends Controller
{
    // ==================== MÉTODOS PÚBLICOS ====================

    public function ofertasPublicas()
    {
        $ofertas = Oferta::with(['tipoOferta', 'productos.producto'])
            ->activas()
            ->orderBy('prioridad', 'desc')
            ->get()
            ->map(function ($oferta) {
                return [
                    'id' => $oferta->id,
                    'titulo' => $oferta->titulo,
                    'subtitulo' => $oferta->subtitulo,
                    'descripcion' => $oferta->descripcion,
                    'tipo_descuento' => $oferta->tipo_descuento,
                    'valor_descuento' => $oferta->valor_descuento,
                    'fecha_inicio' => $oferta->fecha_inicio ? Carbon::parse($oferta->fecha_inicio)->toISOString() : null,
                    'fecha_fin' => $oferta->fecha_fin ? Carbon::parse($oferta->fecha_fin)->toISOString() : null,
                    'imagen_url' => $oferta->imagen_url,
                    'color_fondo' => $oferta->color_fondo,
                    'texto_boton' => $oferta->texto_boton,
                    'enlace_url' => $oferta->enlace_url,
                    'es_oferta_principal' => $oferta->es_oferta_principal,
                    'es_oferta_semana' => $oferta->es_oferta_semana,
                    'timestamp_servidor' => Carbon::now()->toISOString(),
                    'productos' => $oferta->productos->map(function ($productoOferta) use ($oferta) {
                        $producto = $productoOferta->producto;
                        return [
                            'id' => $producto->id,
                            'nombre' => $producto->nombre,
                            'precio_original' => $producto->precio_venta,
                            'precio_oferta' => $productoOferta->precio_oferta ?? $oferta->calcularPrecioOferta($producto->precio_venta),
                            'stock_oferta' => $productoOferta->stock_oferta,
                            'vendidos_oferta' => $productoOferta->vendidos_oferta,
                            'imagen_url' => $producto->imagen_url,
                        ];
                    })
                ];
            });

        return response()->json($ofertas);
    }

    // ✅ NUEVO ENDPOINT: Obtener oferta principal del día
    public function ofertaPrincipalDelDia()
    {
        $ofertaPrincipal = Oferta::obtenerOfertaPrincipalActiva();

        if (!$ofertaPrincipal) {
            return response()->json([
                'oferta_principal' => null,
                'productos' => [],
                'mensaje' => 'No hay oferta principal activa'
            ]);
        }

        $productos = $ofertaPrincipal->productos->map(function ($productoOferta) use ($ofertaPrincipal) {
            $producto = $productoOferta->producto;
            $precioOferta = $productoOferta->precio_oferta ?? $ofertaPrincipal->calcularPrecioOferta($producto->precio_venta);
            $descuentoPorcentaje = round((($producto->precio_venta - $precioOferta) / $producto->precio_venta) * 100);

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'precio_original' => $producto->precio_venta,
                'precio_oferta' => $precioOferta,
                'descuento_porcentaje' => $descuentoPorcentaje,
                'stock_oferta' => $productoOferta->stock_oferta,
                'vendidos_oferta' => $productoOferta->vendidos_oferta,
                'stock_disponible' => $productoOferta->stock_oferta - $productoOferta->vendidos_oferta,
                'imagen_url' => $producto->imagen_url,
                'categoria' => $producto->categoria->nombre ?? null,
                'marca' => $producto->marca->nombre ?? null,
            ];
        });

        return response()->json([
            'oferta_principal' => [
                'id' => $ofertaPrincipal->id,
                'titulo' => $ofertaPrincipal->titulo,
                'subtitulo' => $ofertaPrincipal->subtitulo,
                'descripcion' => $ofertaPrincipal->descripcion,
                'tipo_descuento' => $ofertaPrincipal->tipo_descuento,
                'valor_descuento' => $ofertaPrincipal->valor_descuento,
                'fecha_inicio' => $ofertaPrincipal->fecha_inicio ? Carbon::parse($ofertaPrincipal->fecha_inicio)->toISOString() : null,
                'fecha_fin' => $ofertaPrincipal->fecha_fin ? Carbon::parse($ofertaPrincipal->fecha_fin)->toISOString() : null,
                'imagen_url' => $ofertaPrincipal->imagen_url,
                'color_fondo' => $ofertaPrincipal->color_fondo,
                'texto_boton' => $ofertaPrincipal->texto_boton,
                'enlace_url' => $ofertaPrincipal->enlace_url,
                'timestamp_servidor' => Carbon::now()->toISOString(),
            ],
            'productos' => $productos
        ]);
    }
    // ✅ NUEVO ENDPOINT: Obtener oferta de la semana
    public function ofertaSemanaActiva()
    {
        $ofertaSemana = Oferta::obtenerOfertaSemanaActiva();

        if (!$ofertaSemana) {
            return response()->json([
                'oferta_semana' => null,
                'productos' => [],
                'mensaje' => 'No hay oferta de la semana activa'
            ]);
        }

        $productos = $ofertaSemana->productos->map(function ($productoOferta) use ($ofertaSemana) {
            $producto = $productoOferta->producto;
            $precioOferta = $productoOferta->precio_oferta ?? $ofertaSemana->calcularPrecioOferta($producto->precio_venta);
            $descuentoPorcentaje = round((($producto->precio_venta - $precioOferta) / $producto->precio_venta) * 100);

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'precio_original' => $producto->precio_venta,
                'precio_oferta' => $precioOferta,
                'descuento_porcentaje' => $descuentoPorcentaje,
                'stock_oferta' => $productoOferta->stock_oferta,
                'vendidos_oferta' => $productoOferta->vendidos_oferta,
                'stock_disponible' => $productoOferta->stock_oferta - $productoOferta->vendidos_oferta,
                'imagen_url' => $producto->imagen_url,
                'categoria' => $producto->categoria->nombre ?? null,
                'marca' => $producto->marca->nombre ?? null,
            ];
        });

        return response()->json([
            'oferta_semana' => [
                'id' => $ofertaSemana->id,
                'titulo' => $ofertaSemana->titulo,
                'subtitulo' => $ofertaSemana->subtitulo,
                'descripcion' => $ofertaSemana->descripcion,
                'tipo_descuento' => $ofertaSemana->tipo_descuento,
                'valor_descuento' => $ofertaSemana->valor_descuento,
                'fecha_inicio' => $ofertaSemana->fecha_inicio ? Carbon::parse($ofertaSemana->fecha_inicio)->toISOString() : null,
                'fecha_fin' => $ofertaSemana->fecha_fin ? Carbon::parse($ofertaSemana->fecha_fin)->toISOString() : null,
                'imagen_url' => $ofertaSemana->imagen_url,
                'color_fondo' => $ofertaSemana->color_fondo,
                'texto_boton' => $ofertaSemana->texto_boton,
                'enlace_url' => $ofertaSemana->enlace_url,
                'timestamp_servidor' => Carbon::now()->toISOString(),
            ],
            'productos' => $productos
        ]);
    }

    public function productosEnOferta()
    {
        $productos = OfertaProducto::with(['producto.categoria', 'producto.marca', 'oferta'])
            ->whereHas('oferta', function ($query) {
                $query->activas();
            })
            ->get()
            ->map(function ($productoOferta) {
                $producto = $productoOferta->producto;
                $oferta = $productoOferta->oferta;

                $precioOferta = $productoOferta->precio_oferta ?? $oferta->calcularPrecioOferta($producto->precio_venta);
                $descuentoPorcentaje = round((($producto->precio_venta - $precioOferta) / $producto->precio_venta) * 100);

                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'precio_original' => $producto->precio_venta,
                    'precio_oferta' => $precioOferta,
                    'descuento_porcentaje' => $descuentoPorcentaje,
                    'stock_oferta' => $productoOferta->stock_oferta,
                    'vendidos_oferta' => $productoOferta->vendidos_oferta,
                    'imagen_url' => $producto->imagen_url,
                    'fecha_fin_oferta' => $oferta->fecha_fin ? Carbon::parse($oferta->fecha_fin)->toISOString() : null,
                    'categoria' => $producto->categoria->nombre ?? null,
                    'marca' => $producto->marca->nombre ?? null,
                    'timestamp_servidor' => Carbon::now()->toISOString(),
                ];
            });

        return response()->json($productos);
    }

    public function validarCupon(Request $request)
    {
        $request->validate([
            'codigo' => 'required|string',
            'total' => 'required|numeric|min:0'
        ]);

        $codigo = $request->input('codigo');
        $total = $request->input('total', 0);

        $cupon = Cupon::where('codigo', $codigo)
            ->disponibles()
            ->first();

        if (!$cupon) {
            return response()->json([
                'valido' => false,
                'mensaje' => 'Cupón no válido o expirado'
            ]);
        }

        if (!$cupon->puedeUsarse($total)) {
            if ($cupon->compra_minima && $total < $cupon->compra_minima) {
                return response()->json([
                    'valido' => false,
                    'mensaje' => "Compra mínima requerida: $" . number_format($cupon->compra_minima, 2)
                ]);
            }

            return response()->json([
                'valido' => false,
                'mensaje' => 'Cupón no disponible'
            ]);
        }

        $descuento = $cupon->calcularDescuento($total);

        return response()->json([
            'valido' => true,
            'cupon' => [
                'id' => $cupon->id,
                'codigo' => $cupon->codigo,
                'titulo' => $cupon->titulo,
                'tipo_descuento' => $cupon->tipo_descuento,
                'valor_descuento' => $cupon->valor_descuento
            ],
            'descuento' => $descuento,
            'total_con_descuento' => $total - $descuento
        ]);
    }

    // ==================== MÉTODOS ADMINISTRATIVOS ====================

    public function index()
    {
        $ofertas = Oferta::with(['tipoOferta', 'productos'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($ofertas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'titulo' => 'required|string|max:255',
            'tipo_descuento' => 'required|in:porcentaje,cantidad_fija',
            'valor_descuento' => 'required|numeric|min:0',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after:fecha_inicio',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'es_oferta_principal' => 'boolean',
            'es_oferta_semana' => 'boolean'
        ]);

        $data = $request->all();

        // Manejar subida de imagen
        if ($request->hasFile('imagen')) {
            $data['imagen'] = $request->file('imagen')->store('ofertas', 'public');
        }

        $oferta = Oferta::create($data);

        // ✅ Si se marca como oferta principal, quitar el estado de las demás
        $esOfertaPrincipal = $this->convertirABoolean($request->input('es_oferta_principal'));
        if ($esOfertaPrincipal) {
            $oferta->marcarComoPrincipal();
        }
        
        $esOfertaSemana = $this->convertirABoolean($request->input('es_oferta_semana'));
        if ($esOfertaSemana) {
            $oferta->marcarComoOfertaSemana();
        }

        return response()->json($oferta->load('tipoOferta'), 201);
    }

    public function show($id)
    {
        $oferta = Oferta::with(['tipoOferta', 'productos.producto'])
            ->findOrFail($id);

        return response()->json($oferta);
    }

    public function update(Request $request, $id)
    {
        $oferta = Oferta::findOrFail($id);

        $request->validate([
            'titulo' => 'required|string|max:255',
            'tipo_descuento' => 'required|in:porcentaje,cantidad_fija',
            'valor_descuento' => 'required|numeric|min:0',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after:fecha_inicio',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'es_oferta_principal' => 'boolean',
            'es_oferta_semana' => 'boolean'
        ]);

        $data = $request->all();

        // ✅ ELIMINAR los campos booleanos especiales antes de la actualización masiva
        unset($data['es_oferta_principal']);
        unset($data['es_oferta_semana']);

        // Manejar subida de imagen
        if ($request->hasFile('imagen')) {
            // Eliminar imagen anterior
            if ($oferta->imagen) {
                Storage::disk('public')->delete($oferta->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('ofertas', 'public');
        }

        // ✅ PRIMERO: Manejar estados booleanos especiales ANTES de la actualización masiva
        $esOfertaPrincipal = $this->convertirABoolean($request->input('es_oferta_principal'));
        \Log::info('🔄 Controller - Procesando es_oferta_principal', [
            'valor_recibido' => $request->input('es_oferta_principal'),
            'valor_convertido' => $esOfertaPrincipal,
            'has_campo' => $request->has('es_oferta_principal')
        ]);
        
        if ($request->has('es_oferta_principal')) {
            if ($esOfertaPrincipal) {
                \Log::info('🔄 Controller - Ejecutando marcarComoPrincipal() para oferta ID: ' . $oferta->id);
                $oferta->marcarComoPrincipal();
            } else {
                \Log::info('🔄 Controller - Ejecutando quitarEstadoPrincipal() para oferta ID: ' . $oferta->id);
                $oferta->quitarEstadoPrincipal();
            }
        }

        $esOfertaSemana = $this->convertirABoolean($request->input('es_oferta_semana'));
        if ($request->has('es_oferta_semana')) {
            if ($esOfertaSemana) {
                $oferta->marcarComoOfertaSemana();
            } else {
                $oferta->quitarEstadoOfertaSemana();
            }
        }

        // ✅ DESPUÉS: Actualizar campos normales (esto NO debe afectar los booleanos especiales)
        \Log::info('🔄 Controller - Actualizando campos normales DESPUÉS de manejar estados especiales');
        \Log::info('🔍 Controller - Contenido de $data antes de update()', [
            'data_keys' => array_keys($data),
            'tiene_es_oferta_principal' => array_key_exists('es_oferta_principal', $data),
            'tiene_es_oferta_semana' => array_key_exists('es_oferta_semana', $data),
            'es_oferta_principal_value' => $data['es_oferta_principal'] ?? 'NO_EXISTE',
            'es_oferta_semana_value' => $data['es_oferta_semana'] ?? 'NO_EXISTE'
        ]);
        $oferta->update($data);

        return response()->json($oferta->load('tipoOferta'));
    }

    // ✅ NUEVO ENDPOINT: Marcar/desmarcar como oferta principal
    public function toggleOfertaPrincipal($id)
    {
        $oferta = Oferta::findOrFail($id);

        if ($oferta->es_oferta_principal) {
            $oferta->quitarEstadoPrincipal();
            $mensaje = 'Oferta desmarcada como principal';
        } else {
            $oferta->marcarComoPrincipal();
            $mensaje = 'Oferta marcada como principal del día';
        }

        return response()->json([
            'message' => $mensaje,
            'oferta' => $oferta->fresh()
        ]);
    }
    public function toggleOfertaSemana($id)
{
    $oferta = Oferta::findOrFail($id);

    if ($oferta->es_oferta_semana) {
        $oferta->quitarEstadoOfertaSemana();
        $mensaje = 'Oferta desmarcada como oferta de la semana';
    } else {
        $oferta->marcarComoOfertaSemana();
        $mensaje = 'Oferta marcada como oferta de la semana';
    }

    return response()->json([
        'message' => $mensaje,
        'oferta' => $oferta->fresh()
    ]);
}

    public function destroy($id)
    {
        $oferta = Oferta::findOrFail($id);

        // Eliminar imagen
        if ($oferta->imagen) {
            Storage::disk('public')->delete($oferta->imagen);
        }

        $oferta->delete();

        return response()->json(['message' => 'Oferta eliminada correctamente']);
    }

    public function tiposOfertas()
    {
        $tipos = TipoOferta::activos()->get();
        return response()->json($tipos);
    }

    // ==================== GESTIÓN DE PRODUCTOS EN OFERTAS ====================

    /**
     * Obtener productos disponibles para agregar a una oferta
     */
    public function productosDisponibles(Request $request)
    {
        $query = Producto::where('activo', true);

        // Filtrar por búsqueda
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                    ->orWhere('codigo_producto', 'like', "%{$search}%");
            });
        }

        // Filtrar por categoría
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->get('categoria_id'));
        }

        $productos = $query->with(['categoria', 'marca'])
            ->select('id', 'nombre', 'codigo_producto', 'precio_venta', 'stock', 'imagen', 'categoria_id', 'marca_id')
            ->paginate(20);

        // Transformar los datos para incluir imagen_url
        $productos->getCollection()->transform(function ($producto) {
            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'codigo' => $producto->codigo_producto, // Mapear para el frontend
                'precio_venta' => $producto->precio_venta,
                'stock' => $producto->stock,
                'imagen_url' => $producto->imagen_url, // Usar el accessor del modelo
                'categoria' => $producto->categoria,
                'marca' => $producto->marca,
            ];
        });

        return response()->json($productos);
    }

    /**
     * Obtener productos de una oferta específica
     */
    public function productosOferta($ofertaId)
    {
        $productos = OfertaProducto::with(['producto.categoria', 'producto.marca'])
            ->where('oferta_id', $ofertaId)
            ->get()
            ->map(function ($productoOferta) {
                $producto = $productoOferta->producto;
                return [
                    'id' => $productoOferta->id,
                    'producto_id' => $producto->id,
                    'nombre' => $producto->nombre,
                    'codigo' => $producto->codigo_producto, // Mapear para el frontend
                    'precio_original' => $producto->precio_venta,
                    'precio_oferta' => $productoOferta->precio_oferta,
                    'stock_original' => $producto->stock,
                    'stock_oferta' => $productoOferta->stock_oferta,
                    'vendidos_oferta' => $productoOferta->vendidos_oferta,
                    'imagen_url' => $producto->imagen_url, // Usar el accessor del modelos
                    'categoria' => $producto->categoria->nombre ?? null,
                    'marca' => $producto->marca->nombre ?? null,
                ];
            });

        return response()->json($productos);
    }

    /**
     * Agregar producto a una oferta
     */
    public function agregarProducto(Request $request, $ofertaId)
    {
        $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'precio_oferta' => 'nullable|numeric|min:0',
            'stock_oferta' => 'required|integer|min:1'
        ]);

        $oferta = Oferta::findOrFail($ofertaId);
        $producto = Producto::findOrFail($request->producto_id);

        // Verificar que el producto no esté ya en la oferta
        $existe = OfertaProducto::where('oferta_id', $ofertaId)
            ->where('producto_id', $request->producto_id)
            ->exists();

        if ($existe) {
            return response()->json([
                'message' => 'El producto ya está en esta oferta'
            ], 422);
        }

        // Calcular precio de oferta si no se proporciona
        $precioOferta = $request->precio_oferta ?? $oferta->calcularPrecioOferta($producto->precio_venta);

        // Verificar que el stock de oferta no exceda el stock del producto
        if ($request->stock_oferta > $producto->stock) {
            return response()->json([
                'message' => 'El stock de oferta no puede ser mayor al stock disponible del producto'
            ], 422);
        }

        $productoOferta = OfertaProducto::create([
            'oferta_id' => $ofertaId,
            'producto_id' => $request->producto_id,
            'precio_oferta' => $precioOferta,
            'stock_oferta' => $request->stock_oferta,
            'vendidos_oferta' => 0
        ]);

        return response()->json([
            'message' => 'Producto agregado a la oferta correctamente',
            'producto_oferta' => $productoOferta->load('producto')
        ], 201);
    }

    /**
     * Actualizar producto en oferta
     */
    public function actualizarProducto(Request $request, $ofertaId, $productoOfertaId)
    {
        $request->validate([
            'precio_oferta' => 'required|numeric|min:0',
            'stock_oferta' => 'required|integer|min:1'
        ]);

        $productoOferta = OfertaProducto::where('oferta_id', $ofertaId)
            ->where('id', $productoOfertaId)
            ->firstOrFail();

        // Verificar que el stock de oferta no exceda el stock del producto
        if ($request->stock_oferta > $productoOferta->producto->stock) {
            return response()->json([
                'message' => 'El stock de oferta no puede ser mayor al stock disponible del producto'
            ], 422);
        }

        $productoOferta->update([
            'precio_oferta' => $request->precio_oferta,
            'stock_oferta' => $request->stock_oferta
        ]);

        return response()->json([
            'message' => 'Producto actualizado correctamente',
            'producto_oferta' => $productoOferta->load('producto')
        ]);
    }

    /**
     * Eliminar producto de oferta
     */
    public function eliminarProducto($ofertaId, $productoOfertaId)
    {
        $productoOferta = OfertaProducto::where('oferta_id', $ofertaId)
            ->where('id', $productoOfertaId)
            ->firstOrFail();

        $productoOferta->delete();

        return response()->json([
            'message' => 'Producto eliminado de la oferta correctamente'
        ]);
    }

    // ✅ Método helper para convertir valores a boolean de forma robusta
    private function convertirABoolean($value)
    {
        if (is_null($value)) {
            return false;
        }
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            return in_array(strtolower($value), ['true', '1', 'yes', 'on']);
        }
        if (is_numeric($value)) {
            return (int)$value === 1;
        }
        return (bool)$value;
    }
}