<?php

namespace App\Http\Controllers;

use App\Models\BannerOferta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BannerOfertaController extends Controller
{
    /**
     * Listar todos los banners ofertas
     */
    public function index()
    {
        $banners = BannerOferta::with(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio_venta', 'imagen', 'codigo_producto', 'stock');
        }])
            ->ordenadosPorPrioridad()
            ->get();

        // Transformar para compatibilidad con frontend
        $banners->each(function ($banner) {
            $banner->productos->transform(function ($producto) {
                $descuento = $producto->pivot->descuento_porcentaje;
                $producto->descuento_porcentaje = $descuento;
                $producto->precio = $producto->precio_venta;
                $producto->precio_con_descuento = $producto->precio_venta - ($producto->precio_venta * $descuento / 100);
                $producto->imagen_principal = $producto->imagen ? url('storage/productos/'.$producto->imagen) : null;

                return $producto;
            });
        });

        return response()->json($banners);
    }

    /**
     * Obtener el banner activo para mostrar en el index
     */
    public function getBannerActivo()
    {
        $banner = BannerOferta::with(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio_venta', 'imagen', 'codigo_producto', 'stock', 'categoria_id', 'marca_id')
                ->with(['categoria:id,nombre', 'marca:id,nombre']);
        }])
            ->activos()
            ->ordenadosPorPrioridad()
            ->first();

        if (! $banner) {
            return response()->json(['message' => 'No hay banner activo'], 404);
        }

        // Agregar descuento y precio con descuento a cada producto
        $banner->productos->transform(function ($producto) {
            $descuento = $producto->pivot->descuento_porcentaje;
            $producto->descuento_porcentaje = $descuento;
            $producto->precio = $producto->precio_venta;
            $producto->precio_con_descuento = $producto->precio_venta - ($producto->precio_venta * $descuento / 100);
            $producto->imagen_principal = $producto->imagen ? url('storage/productos/'.$producto->imagen) : null;

            // Agregar información de categoría y marca
            $producto->categoria_nombre = $producto->categoria ? $producto->categoria->nombre : null;
            $producto->marca_nombre = $producto->marca ? $producto->marca->nombre : null;

            // Limpiar relaciones innecesarias del JSON
            unset($producto->categoria);
            unset($producto->marca);

            return $producto;
        });

        return response()->json($banner);
    }

    /**
     * Obtener el banner activo de la semana (público)
     * Endpoint para mostrar ofertas de la semana en la página principal
     */
    public function getBannerActivoSemana()
    {
        $banner = BannerOferta::with(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio_venta', 'imagen', 'codigo_producto', 'stock', 'categoria_id', 'marca_id')
                ->with(['categoria:id,nombre', 'marca:id,nombre']);
        }])
            ->activos()
            ->ordenadosPorPrioridad()
            ->first();

        if (! $banner) {
            return response()->json(['message' => 'No hay banner activo'], 404);
        }

        // Agregar descuento y precio con descuento a cada producto
        $banner->productos->transform(function ($producto) {
            $descuento = $producto->pivot->descuento_porcentaje;
            $producto->descuento_porcentaje = $descuento;
            $producto->precio = $producto->precio_venta;
            $producto->precio_con_descuento = $producto->precio_venta - ($producto->precio_venta * $descuento / 100);
            $producto->imagen_principal = $producto->imagen ? url('storage/productos/'.$producto->imagen) : null;

            // Agregar información de categoría y marca
            $producto->categoria_nombre = $producto->categoria ? $producto->categoria->nombre : null;
            $producto->marca_nombre = $producto->marca ? $producto->marca->nombre : null;

            // Limpiar relaciones innecesarias del JSON
            unset($producto->categoria);
            unset($producto->marca);

            return $producto;
        });

        return response()->json($banner);
    }

    /**
     * Crear un nuevo banner
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'imagen' => 'required|image|mimes:jpeg,png,jpg,webp,gif|max:2048',
            'activo' => 'boolean',
            'prioridad' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['activo', 'prioridad']);

        // Subir imagen
        if ($request->hasFile('imagen')) {
            $imagen = $request->file('imagen');
            $path = $imagen->store('banners-ofertas', 'public');
            $data['imagen'] = $path;
        }

        $banner = BannerOferta::create($data);

        return response()->json($banner, 201);
    }

    /**
     * Mostrar un banner específico
     */
    public function show($id)
    {
        $banner = BannerOferta::with(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio_venta', 'imagen', 'codigo_producto', 'stock');
        }])->findOrFail($id);

        // Agregar precio e imagen_principal para compatibilidad con el frontend
        $banner->productos->transform(function ($producto) {
            $descuento = $producto->pivot->descuento_porcentaje;
            $producto->descuento_porcentaje = $descuento;
            $producto->precio = $producto->precio_venta;
            $producto->precio_con_descuento = $producto->precio_venta - ($producto->precio_venta * $descuento / 100);
            $producto->imagen_principal = $producto->imagen ? url('storage/productos/'.$producto->imagen) : null;

            return $producto;
        });

        return response()->json($banner);
    }

    /**
     * Actualizar un banner
     */
    public function update(Request $request, $id)
    {
        $banner = BannerOferta::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:2048',
            'activo' => 'boolean',
            'prioridad' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['activo', 'prioridad']);

        // Actualizar imagen si se proporciona una nueva
        if ($request->hasFile('imagen')) {
            // Eliminar imagen anterior
            if ($banner->imagen) {
                Storage::disk('public')->delete($banner->imagen);
            }

            $imagen = $request->file('imagen');
            $path = $imagen->store('banners-ofertas', 'public');
            $data['imagen'] = $path;
        }

        $banner->update($data);

        return response()->json($banner);
    }

    /**
     * Eliminar un banner
     */
    public function destroy($id)
    {
        $banner = BannerOferta::findOrFail($id);

        // Eliminar imagen
        if ($banner->imagen) {
            Storage::disk('public')->delete($banner->imagen);
        }

        $banner->delete();

        return response()->json(['message' => 'Banner eliminado correctamente']);
    }

    /**
     * Agregar productos al banner
     */
    public function agregarProductos(Request $request, $id)
    {
        $banner = BannerOferta::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'productos' => 'required|array',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.descuento_porcentaje' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->productos as $productoData) {
            $banner->productos()->syncWithoutDetaching([
                $productoData['producto_id'] => [
                    'descuento_porcentaje' => $productoData['descuento_porcentaje'],
                ],
            ]);
        }

        $banner->load(['productos' => function ($query) {
            $query->select('productos.id', 'nombre', 'precio_venta', 'imagen', 'codigo_producto', 'stock');
        }]);

        // Transformar productos para compatibilidad con frontend
        $banner->productos->transform(function ($producto) {
            $descuento = $producto->pivot->descuento_porcentaje;
            $producto->descuento_porcentaje = $descuento;
            $producto->precio = $producto->precio_venta;
            $producto->precio_con_descuento = $producto->precio_venta - ($producto->precio_venta * $descuento / 100);
            $producto->imagen_principal = $producto->imagen ? url('storage/productos/'.$producto->imagen) : null;

            return $producto;
        });

        return response()->json($banner);
    }

    /**
     * Quitar un producto del banner
     */
    public function quitarProducto($bannerId, $productoId)
    {
        $banner = BannerOferta::findOrFail($bannerId);
        $banner->productos()->detach($productoId);

        return response()->json(['message' => 'Producto eliminado del banner']);
    }

    /**
     * Actualizar descuento de un producto en el banner
     */
    public function actualizarDescuentoProducto(Request $request, $bannerId, $productoId)
    {
        $banner = BannerOferta::findOrFail($bannerId);

        $validator = Validator::make($request->all(), [
            'descuento_porcentaje' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $banner->productos()->updateExistingPivot($productoId, [
            'descuento_porcentaje' => $request->descuento_porcentaje,
        ]);

        return response()->json(['message' => 'Descuento actualizado correctamente']);
    }
}
