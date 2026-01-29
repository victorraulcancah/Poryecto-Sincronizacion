<?php

namespace App\Http\Controllers;

use App\Models\PasoEnvio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PasoEnvioController extends Controller
{
    use AuthorizesRequests;
    /**
     * Obtener todos los pasos de envío (público)
     */
    public function index()
    {
        try {
            $pasos = PasoEnvio::activos()
                ->ordenados()
                ->get()
                ->map(function ($paso) {
                    return [
                        'id' => $paso->id,
                        'orden' => $paso->orden,
                        'titulo' => $paso->titulo,
                        'descripcion' => $paso->descripcion,
                        'imagen' => $paso->imagen_url,
                        'activo' => $paso->activo,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $pasos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los pasos de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los pasos (admin - incluye inactivos)
     */
    public function indexAdmin()
    {
        try {
            $this->authorize('pasos_envio.edit');

            $pasos = PasoEnvio::ordenados()
                ->get()
                ->map(function ($paso) {
                    return [
                        'id' => $paso->id,
                        'orden' => $paso->orden,
                        'titulo' => $paso->titulo,
                        'descripcion' => $paso->descripcion,
                        'imagen' => $paso->imagen_url,
                        'activo' => $paso->activo,
                        'created_at' => $paso->created_at,
                        'updated_at' => $paso->updated_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $pasos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los pasos de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo paso de envío
     */
    public function store(Request $request)
    {
        try {
            $this->authorize('pasos_envio.edit');

            // Validar sin la imagen primero
            $validator = Validator::make($request->only(['orden', 'titulo', 'descripcion', 'activo']), [
                'orden' => 'required|integer|min:1',
                'titulo' => 'required|string|max:255',
                'descripcion' => 'nullable|string',
                'activo' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->only(['orden', 'titulo', 'descripcion', 'activo']);

            // Manejar la imagen si se proporciona - usando $_FILES directamente
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
                try {
                    $tmpName = $_FILES['imagen']['tmp_name'];
                    $originalName = $_FILES['imagen']['name'];
                    
                    // Obtener extensión
                    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
                    $filename = 'paso_' . time() . '_' . uniqid() . '.' . $extension;
                    $destinationPath = public_path('storage/pasos-envio');
                    
                    // Crear directorio si no existe
                    if (!file_exists($destinationPath)) {
                        mkdir($destinationPath, 0777, true);
                    }
                    
                    // Leer contenido y escribir directamente (evita problemas con tmp)
                    $content = file_get_contents($tmpName);
                    $fullPath = $destinationPath . '/' . $filename;
                    
                    if (file_put_contents($fullPath, $content)) {
                        $data['imagen'] = 'pasos-envio/' . $filename;
                        \Log::info('Imagen guardada exitosamente: ' . $filename);
                    } else {
                        \Log::error('No se pudo escribir el archivo');
                    }
                    
                } catch (\Exception $e) {
                    // Continuar sin imagen si falla
                    \Log::error('Error al subir imagen: ' . $e->getMessage());
                }
            } elseif (isset($_FILES['imagen'])) {
                \Log::error('Error en upload de imagen. Error code: ' . $_FILES['imagen']['error']);
            }

            $paso = PasoEnvio::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Paso de envío creado exitosamente',
                'data' => [
                    'id' => $paso->id,
                    'orden' => $paso->orden,
                    'titulo' => $paso->titulo,
                    'descripcion' => $paso->descripcion,
                    'imagen' => $paso->imagen_url,
                    'activo' => $paso->activo,
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el paso de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar un paso específico
     */
    public function show($id)
    {
        try {
            $this->authorize('pasos_envio.edit');

            $paso = PasoEnvio::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $paso->id,
                    'orden' => $paso->orden,
                    'titulo' => $paso->titulo,
                    'descripcion' => $paso->descripcion,
                    'imagen' => $paso->imagen_url,
                    'activo' => $paso->activo,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Paso de envío no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Actualizar un paso de envío
     */
    public function update(Request $request, $id)
    {
        try {
            $this->authorize('pasos_envio.edit');

            $paso = PasoEnvio::findOrFail($id);

            // Validar sin la imagen primero
            $validator = Validator::make($request->only(['orden', 'titulo', 'descripcion', 'activo']), [
                'orden' => 'sometimes|required|integer|min:1',
                'titulo' => 'sometimes|required|string|max:255',
                'descripcion' => 'nullable|string',
                'activo' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->only(['orden', 'titulo', 'descripcion', 'activo']);

            // Manejar la imagen si se proporciona - usando $_FILES directamente
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
                try {
                    $tmpName = $_FILES['imagen']['tmp_name'];
                    $originalName = $_FILES['imagen']['name'];
                    
                    // Eliminar imagen anterior si existe
                    if ($paso->imagen) {
                        $oldImagePath = public_path('storage/' . $paso->imagen);
                        if (file_exists($oldImagePath)) {
                            unlink($oldImagePath);
                        }
                    }
                    
                    // Obtener extensión
                    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
                    $filename = 'paso_' . time() . '_' . uniqid() . '.' . $extension;
                    $destinationPath = public_path('storage/pasos-envio');
                    
                    // Crear directorio si no existe
                    if (!file_exists($destinationPath)) {
                        mkdir($destinationPath, 0777, true);
                    }
                    
                    // Leer contenido y escribir directamente (evita problemas con tmp)
                    $content = file_get_contents($tmpName);
                    $fullPath = $destinationPath . '/' . $filename;
                    
                    if (file_put_contents($fullPath, $content)) {
                        $data['imagen'] = 'pasos-envio/' . $filename;
                        \Log::info('Imagen actualizada exitosamente: ' . $filename);
                    } else {
                        \Log::error('No se pudo escribir el archivo');
                    }
                    
                } catch (\Exception $e) {
                    // Continuar sin imagen si falla
                    \Log::error('Error al actualizar imagen: ' . $e->getMessage());
                }
            } elseif (isset($_FILES['imagen'])) {
                \Log::error('Error en upload de imagen. Error code: ' . $_FILES['imagen']['error']);
            }

            $paso->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Paso de envío actualizado exitosamente',
                'data' => [
                    'id' => $paso->id,
                    'orden' => $paso->orden,
                    'titulo' => $paso->titulo,
                    'descripcion' => $paso->descripcion,
                    'imagen' => $paso->imagen_url,
                    'activo' => $paso->activo,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el paso de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un paso de envío
     */
    public function destroy($id)
    {
        try {
            $this->authorize('pasos_envio.edit');

            $paso = PasoEnvio::findOrFail($id);

            // Eliminar imagen si existe
            if ($paso->imagen) {
                Storage::disk('public')->delete($paso->imagen);
            }

            $paso->delete();

            return response()->json([
                'success' => true,
                'message' => 'Paso de envío eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el paso de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar la imagen de un paso
     */
    public function deleteImage($id)
    {
        try {
            $this->authorize('pasos_envio.edit');

            $paso = PasoEnvio::findOrFail($id);

            if ($paso->imagen) {
                Storage::disk('public')->delete($paso->imagen);
                $paso->imagen = null;
                $paso->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Imagen eliminada exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'El paso no tiene imagen'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
