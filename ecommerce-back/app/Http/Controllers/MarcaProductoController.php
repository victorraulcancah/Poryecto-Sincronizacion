<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MarcaProducto;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

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
            'activo' => 'nullable|in:true,false,1,0',
            // Quitar el logo desde el modal de edicion.
            'quitar_imagen' => 'nullable|in:true,false,1,0',
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
            } elseif (filter_var($request->input('quitar_imagen'), FILTER_VALIDATE_BOOLEAN)) {
                // Quitar el logo: se borra el archivo y la marca queda sin
                // imagen. Sin logo no puede salir en la vitrina de la web, asi
                // que tambien se la saca de ahi.
                if ($marca->imagen) {
                    $rutaImagen = public_path('storage/marcas_productos/' . $marca->imagen);
                    if (file_exists($rutaImagen)) {
                        unlink($rutaImagen);
                    }
                }

                $data['imagen'] = null;
                $data['mostrar_en_vitrina'] = false;
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

    public function marcasPublicas(Request $request)
    {
        try {
            $categoriaId = $request->get('categoria_id', '');

            $marcas = MarcaProducto::activas()
                ->withCount([
                    // El conteo respeta la misma categoría seleccionada en el sidebar (si hay alguna)
                    // y el mismo criterio de "activo" que usa el listado público (sin exigir stock > 0).
                    'productos' => function ($query) use ($categoriaId) {
                        $query->where('activo', true);
                        if ($categoriaId !== '') {
                            $query->where('categoria_id', $categoriaId);
                        }
                    }
                ])
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

    // ==================================================================
    // Vitrina de marcas (pagina publica "Trabajamos con las mejores marcas")
    // ==================================================================

    /** Configuracion de la vitrina; siempre existe la fila 1. */
    private function configVitrina(): object
    {
        return DB::table('vitrina_marcas_config')->find(1) ?? (object) [
            'carrusel' => false,
            'velocidad' => 30,
            'por_fila' => 6,
            'filas' => 0,
        ];
    }

    private function formatearConfig(object $config): array
    {
        return [
            'carrusel' => (bool) $config->carrusel,
            'velocidad' => (int) $config->velocidad,
            'por_fila' => (int) $config->por_fila,
            'filas' => (int) $config->filas,
        ];
    }

    /**
     * Marcas que se muestran en la vitrina publica, ya ordenadas.
     *
     * Se separa de marcasPublicas() a proposito: ese endpoint alimenta el
     * filtro del catalogo, donde tienen que salir todas las marcas activas
     * aunque no esten elegidas para la vitrina.
     */
    public function vitrinaPublica()
    {
        try {
            $marcas = MarcaProducto::activas()
                ->where('mostrar_en_vitrina', true)
                ->whereNotNull('imagen')
                ->withCount(['productos' => fn ($q) => $q->where('activo', true)])
                // Las que no tienen orden asignado van al final, por nombre.
                ->orderByRaw('orden_vitrina IS NULL, orden_vitrina')
                ->orderBy('nombre')
                ->get();

            $marcas->transform(function ($marca) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
                return $marca;
            });

            return response()->json([
                'config' => $this->formatearConfig($this->configVitrina()),
                'marcas' => $marcas,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener la vitrina de marcas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vista de administracion: todas las marcas con logo, elegidas o no, en el
     * orden en que aparecerian. Sin logo no se pueden mostrar en la vitrina.
     */
    public function vitrinaAdmin()
    {
        try {
            $marcas = MarcaProducto::whereNotNull('imagen')
                ->withCount(['productos' => fn ($q) => $q->where('activo', true)])
                ->orderByRaw('orden_vitrina IS NULL, orden_vitrina')
                ->orderBy('nombre')
                ->get();

            $marcas->transform(function ($marca) {
                $marca->imagen_url = asset('storage/marcas_productos/' . $marca->imagen);
                return $marca;
            });

            return response()->json([
                'config' => $this->formatearConfig($this->configVitrina()),
                'marcas' => $marcas,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener la vitrina de marcas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Guarda el orden, que marcas se muestran y como se presentan.
     *
     * El orden llega como la lista completa de ids en su nuevo orden: se
     * renumera de 1 en adelante en vez de confiar en los numeros que mande el
     * front, para que no queden huecos ni repetidos.
     */
    public function guardarVitrina(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'orden' => 'required|array',
            'orden.*' => 'integer|exists:marcas_productos,id',
            'ocultas' => 'nullable|array',
            'ocultas.*' => 'integer|exists:marcas_productos,id',
            'config.carrusel' => 'required|boolean',
            'config.velocidad' => 'required|integer|min:5|max:180',
            'config.por_fila' => 'required|integer|min:1|max:12',
            'config.filas' => 'required|integer|min:0|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validacion incorrectos',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $ocultas = $request->input('ocultas', []);

            foreach ($request->input('orden') as $posicion => $id) {
                MarcaProducto::where('id', $id)->update([
                    'orden_vitrina' => $posicion + 1,
                    'mostrar_en_vitrina' => ! in_array($id, $ocultas),
                ]);
            }

            DB::table('vitrina_marcas_config')->updateOrInsert(
                ['id' => 1],
                [
                    'carrusel' => (bool) $request->input('config.carrusel'),
                    'velocidad' => (int) $request->input('config.velocidad'),
                    'por_fila' => (int) $request->input('config.por_fila'),
                    'filas' => (int) $request->input('config.filas'),
                    'updated_at' => now(),
                ]
            );

            DB::commit();

            return response()->json(['message' => 'Vitrina actualizada']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error al guardar la vitrina',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
