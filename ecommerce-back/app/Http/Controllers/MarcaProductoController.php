<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MarcaProducto;
use Illuminate\Support\Facades\Validator;

class MarcaProductoController extends Controller
{
   
    public function index(Request $request)
    {
        try {
            $query = MarcaProducto::orderBy('nombre');
            
            // Filtrar marcas que tienen productos en la sección especificada
            if ($request->has('seccion') && $request->seccion !== '') {
                $query->whereHas('productos.categoria', function($q) use ($request) {
                    $q->where('id_seccion', $request->seccion);
                });
            }
            
            $marcas = $query->get();

            // Agregar ruta completa de imagen
            $marcas->transform(function ($marca) {
                if ($marca->imagen) {
                    $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
                }
                return $marca;
            });

            return response()->json($marcas);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener marcas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request) 
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255|unique:marcas_productos,nombre',
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'required|in:true,false,1,0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->only(['nombre', 'descripcion']);
            $data['activo'] = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN);

            // Manejar imagen directamente en public/storage
            if ($request->hasFile('imagen')) {
                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/marcas_productos');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/marcas_productos
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $marca = MarcaProducto::create($data);

            // Agregar URL completa de imagen para la respuesta
            if ($marca->imagen) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
            }

            return response()->json([
                'message' => 'Marca creada exitosamente',
                'marca' => $marca
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear marca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $marca = MarcaProducto::findOrFail($id);

            // Agregar ruta completa de imagen
            if ($marca->imagen) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
            }

            return response()->json($marca);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Marca no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        // Validación más flexible para actualización
        $rules = [
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'nullable|in:true,false,1,0'
        ];
        
        // Solo validar nombre si se está enviando
        if ($request->has('nombre') && $request->nombre !== null) {
            $rules['nombre'] = 'required|string|max:255|unique:marcas_productos,nombre,' . $id;
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $marca = MarcaProducto::findOrFail($id);
            
            // Solo actualizar campos que se enviaron
            $data = [];
            if ($request->has('nombre')) {
                $data['nombre'] = $request->nombre;
            }
            if ($request->has('descripcion')) {
                $data['descripcion'] = $request->descripcion;
            }
            if ($request->has('activo')) {
                $data['activo'] = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN);
            }

            // Manejar imagen directamente en public/storage
            if ($request->hasFile('imagen')) {
                // Eliminar imagen anterior si existe
                if ($marca->imagen) {
                    $rutaImagenAnterior = public_path('storage/marcas_productos/' . $marca->imagen);
                    if (file_exists($rutaImagenAnterior)) {
                        unlink($rutaImagenAnterior);
                    }
                }

                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/marcas_productos');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/marcas_productos
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $marca->update($data);

            // Agregar URL completa de imagen para la respuesta
            if ($marca->imagen) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
            }

            return response()->json([
                'message' => 'Marca actualizada exitosamente',
                'marca' => $marca
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar marca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de la marca (NUEVO ENDPOINT ESPECÍFICO)
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
            $marca = MarcaProducto::findOrFail($id);
            $marca->update(['activo' => (bool)$request->activo]);

            // Agregar URL completa de imagen para la respuesta
            if ($marca->imagen) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
            }

            return response()->json([
                'message' => 'Estado de la marca actualizado exitosamente',
                'marca' => $marca
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar estado de la marca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $marca = MarcaProducto::findOrFail($id);

            // Verificar si tiene productos asociados
            if ($marca->productos()->count() > 0) {
                return response()->json([
                    'message' => 'No se puede eliminar la marca porque tiene productos asociados'
                ], 400);
            }

            // Eliminar imagen si existe
            if ($marca->imagen) {
                $rutaImagen = public_path('storage/marcas_productos/' . $marca->imagen);
                if (file_exists($rutaImagen)) {
                    unlink($rutaImagen);
                }
            }

            $marca->delete();

            return response()->json([
                'message' => 'Marca eliminada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar marca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function marcasActivas()
    {
        try {
            $marcas = MarcaProducto::activas()->orderBy('nombre')->get();

            // Agregar ruta completa de imagen
            $marcas->transform(function ($marca) {
                if ($marca->imagen) {
                    $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
                }
                return $marca;
            });

            return response()->json($marcas);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener marcas activas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function marcasPublicas()
    {
        try {
            $marcas = MarcaProducto::activas()
                ->withCount(['productos' => function($query) {
                    $query->where('activo', true)->where('stock', '>', 0);
                }])
                ->orderBy('nombre')
                ->get();

            // Agregar ruta completa de imagen
            $marcas->transform(function ($marca) {
                if ($marca->imagen) {
                    $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
                }
                return $marca;
            });

            return response()->json($marcas);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener marcas públicas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function marcasPorCategoria(Request $request)
{
    $validator = Validator::make($request->all(), [
        'categoria_id' => 'required|exists:categorias,id', // Valida que el ID de categoría sea requerido y exista
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'ID de categoría no válido',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $categoriaId = $request->input('categoria_id');

        // Obtener marcas activas que tienen productos activos y con stock en la categoría especificada
        $marcas = MarcaProducto::activas()
            ->whereHas('productos', function ($query) use ($categoriaId) {
                $query->where('categoria_id', $categoriaId)
                      ->where('activo', true)
                      ->where('stock', '>', 0);
            })
            ->orderBy('nombre')
            ->get();

        // Agregar la URL completa de la imagen para cada marca
        $marcas->transform(function ($marca) {
            if ($marca->imagen) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
            }
            return $marca;
        });

        return response()->json($marcas);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error al obtener marcas por categoría',
            'error' => $e->getMessage()
        ], 500);
    }
}
}