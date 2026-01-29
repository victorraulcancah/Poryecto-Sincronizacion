<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductoImagenes7PowerController extends Controller
{
    /**
     * Subir imagen para producto de 7power (se guarda en Magus)
     */
    public function uploadImage(Request $request, $producto7powerId)
    {
        try {
            Log::info('📸 Iniciando subida de imagen', [
                'producto_id' => $producto7powerId,
                'has_file' => $request->hasFile('imagen'),
                'files' => $request->allFiles()
            ]);

            $request->validate([
                'imagen' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            ]);

            $imagen = $request->file('imagen');
            
            Log::info('📸 Archivo recibido', [
                'original_name' => $imagen->getClientOriginalName(),
                'size' => $imagen->getSize(),
                'mime' => $imagen->getMimeType(),
                'extension' => $imagen->getClientOriginalExtension()
            ]);
            
            // Generar nombre único para la imagen
            $nombreArchivo = 'producto_7power_' . $producto7powerId . '_' . time() . '.' . $imagen->getClientOriginalExtension();
            
            Log::info('📸 Intentando guardar', [
                'nombre_archivo' => $nombreArchivo,
                'ruta' => 'public/productos_7power'
            ]);
            
            // ✅ SOLUCIÓN: Usar move() en lugar de storeAs() para Windows
            $destinationPath = storage_path('app/public/productos_7power');
            $moved = $imagen->move($destinationPath, $nombreArchivo);
            
            $path = 'public/productos_7power/' . $nombreArchivo;
            
            Log::info('📸 Resultado de move()', [
                'moved' => $moved !== false,
                'path' => $path
            ]);
            
            // Verificar que se guardó usando la ruta correcta
            $fullPath = $destinationPath . DIRECTORY_SEPARATOR . $nombreArchivo;
            $existsPhysically = file_exists($fullPath);
            
            Log::info('📸 Verificación de archivo', [
                'exists_physically' => $existsPhysically,
                'full_path' => $fullPath,
                'file_size' => $existsPhysically ? filesize($fullPath) : 0
            ]);
            
            // Construir URL completa
            $imagenUrl = url(Storage::url($path));
            
            // Guardar o actualizar en la tabla de mapeo
            $imagenProducto = DB::table('producto_imagenes_7power')
                ->updateOrInsert(
                    ['producto_7power_id' => $producto7powerId],
                    [
                        'imagen' => $nombreArchivo,
                        'imagen_url' => $imagenUrl,
                        'updated_at' => now()
                    ]
                );

            Log::info('✅ Imagen guardada exitosamente', [
                'producto_id' => $producto7powerId,
                'imagen' => $nombreArchivo,
                'url' => $imagenUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Imagen subida correctamente',
                'data' => [
                    'producto_7power_id' => $producto7powerId,
                    'imagen' => $nombreArchivo,
                    'imagen_url' => $imagenUrl
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('❌ Error de validación', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('❌ Error al subir imagen de producto 7power', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al subir imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener imagen de producto de 7power
     */
    public function getImage($producto7powerId)
    {
        try {
            $imagen = DB::table('producto_imagenes_7power')
                ->where('producto_7power_id', $producto7powerId)
                ->first();

            if (!$imagen) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró imagen para este producto'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'producto_7power_id' => $imagen->producto_7power_id,
                    'imagen' => $imagen->imagen,
                    'imagen_url' => $imagen->imagen_url
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener imagen de producto 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar imagen de producto de 7power
     */
    public function deleteImage($producto7powerId)
    {
        try {
            $imagen = DB::table('producto_imagenes_7power')
                ->where('producto_7power_id', $producto7powerId)
                ->first();

            if (!$imagen) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró imagen para este producto'
                ], 404);
            }

            // Eliminar archivo físico
            Storage::delete('public/productos_7power/' . $imagen->imagen);

            // Eliminar registro de la base de datos
            DB::table('producto_imagenes_7power')
                ->where('producto_7power_id', $producto7powerId)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Imagen eliminada correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al eliminar imagen de producto 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todas las imágenes de productos de 7power
     */
    public function getAllImages()
    {
        try {
            $imagenes = DB::table('producto_imagenes_7power')
                ->select('producto_7power_id', 'imagen', 'imagen_url', 'updated_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $imagenes
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener imágenes de productos 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imágenes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener imágenes de múltiples productos (batch)
     */
    public function getBatchImages(Request $request)
    {
        try {
            $productIds = $request->query('product_ids');
            
            if (!$productIds) {
                return response()->json([
                    'success' => false,
                    'message' => 'Se requiere el parámetro product_ids'
                ], 400);
            }

            // Convertir string separado por comas a array
            $productIdsArray = explode(',', $productIds);

            $imagenes = DB::table('producto_imagenes_7power')
                ->whereIn('producto_7power_id', $productIdsArray)
                ->select('producto_7power_id', 'imagen', 'imagen_url', 'updated_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $imagenes
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener imágenes batch de productos 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imágenes',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
