<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\ArmaPcConfiguracion;
use App\Models\CategoriaCompatibilidad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
class CategoriasController extends Controller
{
    /**
     * Obtener todas las categorías
     */
    public function index(Request $request)
    {
        try {
            $query = Categoria::with('seccion')->orderBy('nombre');
            
            if ($request->has('seccion') && $request->seccion !== '' && $request->seccion !== null) {
                $query->where('id_seccion', $request->seccion);
            }
            
            $categorias = $query->get();
            
            // Agregar ruta completa de imagen
            $categorias->transform(function ($categoria) {
                if ($categoria->imagen) {
                    $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
                }
                return $categoria;
            });

            return response()->json($categorias);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Crear nueva categoría
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255|unique:categorias,nombre',
            'id_seccion' => 'required|exists:secciones,id',
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->only(['nombre', 'id_seccion', 'descripcion', 'activo']);
            $data['activo'] = $request->has('activo') ? (bool)$request->activo : true;

           // Manejar imagen directamente en public/storage
            if ($request->hasFile('imagen')) {
                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/categorias');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/categorias
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $categoria = Categoria::create($data);

            // Agregar URL completa de imagen para la respuesta
            if ($categoria->imagen) {
                $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
            }

            return response()->json([
                'message' => 'Categoría creada exitosamente',
                'categoria' => $categoria
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener categoría específica
     */
    public function show($id)
    {
        try {
            $categoria = Categoria::findOrFail($id);
            
            if ($categoria->imagen) {
                $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
            }

            return response()->json($categoria);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Categoría no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Actualizar categoría
     */
   public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255|unique:categorias,nombre,' . $id,
            'descripcion' => 'nullable|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'activo' => 'required|in:true,false,1,0',
            'id_seccion' => 'required|exists:secciones,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $categoria = Categoria::findOrFail($id);
            $data = $request->only(['nombre', 'descripcion']);
            $data['activo'] = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN);

            // MÉTODO MANUAL - Manejar imagen
            if ($request->hasFile('imagen')) {
                // Eliminar imagen anterior si existe
                if ($categoria->imagen) {
                    $rutaImagenAnterior = public_path('storage/categorias/' . $categoria->imagen);
                    if (file_exists($rutaImagenAnterior)) {
                        unlink($rutaImagenAnterior);
                    }
                }

                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/categorias');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/categorias
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen'] = $nombreImagen;
            }

            $categoria->update($data);

            // Agregar URL completa de imagen para la respuesta
            if ($categoria->imagen) {
                $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
            }

            return response()->json([
                'message' => 'Categoría actualizada exitosamente',
                'categoria' => $categoria
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Cambiar estado de la categoría (NUEVO ENDPOINT ESPECÍFICO)
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
            $categoria = Categoria::findOrFail($id);
            $categoria->update(['activo' => (bool)$request->activo]);

            // Agregar URL completa de imagen para la respuesta
            if ($categoria->imagen) {
                $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
            }

            return response()->json([
                'message' => 'Estado de la categoría actualizado exitosamente',
                'categoria' => $categoria
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar estado de la categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar categoría
     */
    public function destroy($id)
    {
        try {
            $categoria = Categoria::findOrFail($id);

            // Verificar si tiene productos asociados
            if ($categoria->productos()->count() > 0) {
                return response()->json([
                    'message' => 'No se puede eliminar la categoría porque tiene productos asociados'
                ], 400);
            }

            // MÉTODO MANUAL - Eliminar imagen si existe
            if ($categoria->imagen) {
                $rutaImagen = public_path('storage/categorias/' . $categoria->imagen);
                if (file_exists($rutaImagen)) {
                    unlink($rutaImagen);
                }
            }

            $categoria->delete();

            return response()->json([
                'message' => 'Categoría eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    
    // ✅ MÉTODO MODIFICADO: Ahora acepta parámetro de sección
    public function categoriasPublicas(Request $request)
    {
        try {

            // ✅ CORREGIDO: Obtener la sección antes de crear el query
            $seccion = null;
            if ($request->has('seccion') && $request->seccion !== '' && $request->seccion !== null) {
                $seccion = $request->seccion;
            }

            $query = Categoria::activas()
            ->withCount(['productos' => function($q) {
                $q->where('activo', true)->where('stock', '>', 0);
            }])
            ->orderBy('nombre');
            
            
            // ✅ NUEVO: Filtrar por sección si se proporciona
            if ($seccion) {
                $query->where('id_seccion', $seccion);
            }
            
            $categorias = $query->get(['id', 'nombre', 'descripcion', 'imagen']);
            

            
            // Agregar ruta completa de imagen
            $categorias->transform(function ($categoria) {
                if ($categoria->imagen) {
                    $imagen_url = asset('storage/categorias/' . $categoria->imagen);
                    $categoria->imagen_url = $imagen_url;
                }
                return $categoria;
            });


            return response()->json($categorias);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener categorías públicas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ====================================
    // ✅ NUEVOS MÉTODOS PARA ARMA TU PC
    // ====================================

    /**
     * Obtener categorías públicas configuradas para Arma tu PC
     * Ruta pública: GET /api/arma-pc/categorias
     */
    public function categoriasArmaPc()
    {
        try {
            $categorias = ArmaPcConfiguracion::getCategoriasConfiguradas();

            return response()->json($categorias);
            
        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Error al obtener categorías de Arma tu PC',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener configuración actual de Arma tu PC (para administradores)
     * Ruta protegida: GET /api/arma-pc/configuracion
     */
    public function configuracionArmaPc()
    {
        try {

            // Obtener configuraciones actuales con sus categorías
            $configuraciones = ArmaPcConfiguracion::with(['categoria' => function($query) {
                $query->withCount(['productos' => function($q) {
                    $q->where('activo', true)->where('stock', '>', 0);
                }]);
            }])
            ->ordenado()
            ->get();

            // Transformar datos para el frontend
            $categorias = $configuraciones->map(function($config) {
                $categoria = $config->categoria;
                if ($categoria) {
                    return [
                        'id' => $categoria->id,
                        'nombre' => $categoria->nombre,
                        'img' => $categoria->imagen ? asset('storage/categorias/' . $categoria->imagen) : null,
                        'productos_count' => $categoria->productos_count,
                        'orden' => $config->orden,
                        'activo' => $config->activo
                    ];
                }
                return null;
            })->filter()->values();

            return response()->json([
                'success' => true,
                'message' => 'Configuración obtenida exitosamente',
                'categorias' => $categorias
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuración de Arma tu PC',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Guardar configuración de Arma tu PC (para administradores)
     * Ruta protegida: POST /api/arma-pc/configuracion
     */
    public function guardarConfiguracionArmaPc(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'categorias' => 'required|array|min:1',
            'categorias.*.id' => 'required|integer|exists:categorias,id',
            'categorias.*.orden' => 'required|integer|min:1',
            'categorias.*.activo' => 'boolean',
            'categorias.*.nombre_paso' => 'nullable|string|max:255',
            'categorias.*.descripcion_paso' => 'nullable|string',
            'categorias.*.es_requerido' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {

            // Usar transacción para asegurar consistencia
            \DB::transaction(function() use ($request) {
                // Eliminar configuraciones existentes (usar delete en lugar de truncate)
                ArmaPcConfiguracion::query()->delete();

                // Crear nuevas configuraciones
                foreach ($request->categorias as $categoriaData) {
                    ArmaPcConfiguracion::create([
                        'categoria_id' => $categoriaData['id'],
                        'orden' => $categoriaData['orden'],
                        'activo' => $categoriaData['activo'] ?? true,
                        'nombre_paso' => $categoriaData['nombre_paso'] ?? "Paso {$categoriaData['orden']}",
                        'descripcion_paso' => $categoriaData['descripcion_paso'] ?? 'Selecciona un componente de esta categoría',
                        'es_requerido' => $categoriaData['es_requerido'] ?? true
                    ]);
                }
            });


            return response()->json([
                'success' => true,
                'message' => 'Configuración de Arma tu PC guardada exitosamente'
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al guardar configuración de Arma tu PC',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar orden de categorías en Arma tu PC (para administradores)
     * Ruta protegida: PUT /api/arma-pc/configuracion/orden
     */
    public function actualizarOrdenArmaPc(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'categorias' => 'required|array|min:1',
            'categorias.*.id' => 'required|integer',
            'categorias.*.orden' => 'required|integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {

            foreach ($request->categorias as $categoriaData) {
                ArmaPcConfiguracion::where('categoria_id', $categoriaData['id'])
                    ->update(['orden' => $categoriaData['orden']]);
            }


            return response()->json([
                'success' => true,
                'message' => 'Orden de categorías actualizado exitosamente'
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar orden de categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ====================================
    // ✅ NUEVOS MÉTODOS PARA COMPATIBILIDADES
    // ====================================

    /**
     * Obtener categorías compatibles con una categoría específica
     * Ruta pública: GET /api/categorias/{id}/compatibles
     */
    public function getCategoriasCompatibles($id)
    {
        try {
            $categoria = Categoria::findOrFail($id);
            $compatibles = $categoria->getCategoriasCompatibles();

            // Agregar URLs de imagen
            $compatibles->transform(function ($categoria) {
                if ($categoria->imagen) {
                    $categoria->imagen_url = asset('storage/categorias/' . $categoria->imagen);
                }
                return $categoria;
            });

            return response()->json([
                'success' => true,
                'categoria' => $categoria->nombre,
                'compatibles' => $compatibles
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categorías compatibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gestionar compatibilidades entre categorías (para administradores)
     * Ruta protegida: POST /api/arma-pc/compatibilidades
     */
    public function gestionarCompatibilidades(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'categoria_principal_id' => 'required|integer|exists:categorias,id',
            'categorias_compatibles' => 'required|array',
            'categorias_compatibles.*' => 'integer|exists:categorias,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $categoriaPrincipalId = $request->categoria_principal_id;
            $categoriasCompatibles = $request->categorias_compatibles;


            \DB::transaction(function() use ($categoriaPrincipalId, $categoriasCompatibles) {
                // Eliminar compatibilidades existentes de esta categoría
                CategoriaCompatibilidad::where('categoria_principal_id', $categoriaPrincipalId)->delete();

                // Crear nuevas compatibilidades
                foreach ($categoriasCompatibles as $categoriaCompatibleId) {
                    // Evitar que una categoría sea compatible consigo misma
                    if ($categoriaPrincipalId != $categoriaCompatibleId) {
                        CategoriaCompatibilidad::create([
                            'categoria_principal_id' => $categoriaPrincipalId,
                            'categoria_compatible_id' => $categoriaCompatibleId
                        ]);
                    }
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Compatibilidades actualizadas exitosamente'
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al gestionar compatibilidades',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener configuración completa de compatibilidades (para administradores)
     * Ruta protegida: GET /api/arma-pc/compatibilidades
     */
    public function obtenerCompatibilidades()
    {
        try {
            // Obtener todas las categorías en arma PC con sus compatibilidades
            $configuraciones = ArmaPcConfiguracion::with(['categoria', 'compatibilidadesPrincipales.categoriaCompatible'])
                ->ordenado()
                ->get();

            $result = $configuraciones->map(function($config) {
                $categoria = $config->categoria;
                if ($categoria) {
                    return [
                        'id' => $categoria->id,
                        'nombre' => $categoria->nombre,
                        'orden' => $config->orden,
                        'nombre_paso' => $config->nombre_paso,
                        'compatibles' => $config->compatibilidadesPrincipales->map(function($comp) {
                            return [
                                'id' => $comp->categoriaCompatible->id,
                                'nombre' => $comp->categoriaCompatible->nombre
                            ];
                        })
                    ];
                }
                return null;
            })->filter();

            return response()->json([
                'success' => true,
                'compatibilidades' => $result
            ]);
            
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener compatibilidades',
                'error' => $e->getMessage()
            ], 500);
        }
    }
        
}