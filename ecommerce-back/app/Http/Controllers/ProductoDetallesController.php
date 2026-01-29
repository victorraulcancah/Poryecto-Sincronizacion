<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\ProductoDetalle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProductoDetallesController extends Controller
{
    public function show($id)
    {
        try {
            $producto = Producto::findOrFail($id);
            $detalles = ProductoDetalle::where('producto_id', $id)->first();
            
            if ($detalles) {
                // Procesar imágenes para URLs completas
                $imagenes = $detalles->imagenes ? json_decode($detalles->imagenes, true) : [];
                $imagenesUrl = [];
                
                foreach ($imagenes as $imagen) {
                    if (Storage::disk('public')->exists('productos/detalles/' . $imagen)) {
                        $imagenesUrl[] = asset('storage/productos/detalles/' . $imagen);
                    }
                }
                
                $detalles->imagenes_url = $imagenesUrl;
            }
            
            return response()->json([
                'success' => true,
                'producto' => $producto,
                'detalles' => $detalles
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener detalles del producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request, $id)
    {
        try {
            $producto = Producto::findOrFail($id);
            
            // Validación simplificada
            $validator = Validator::make($request->all(), [
                'descripcion_detallada' => 'nullable|string',
                'instrucciones_uso' => 'nullable|string',
                'garantia' => 'nullable|string',
                'politicas_devolucion' => 'nullable|string',
                'especificaciones' => 'nullable|string', // Recibimos como string JSON
                'caracteristicas_tecnicas' => 'nullable|string', // Recibimos como string JSON
                'dimensiones' => 'nullable|string', // Recibimos como string JSON
                'videos' => 'nullable|string', // Recibimos como string JSON
                'imagenes.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de validación incorrectos',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Procesar datos JSON
            $especificaciones = $this->processJsonField($request->input('especificaciones'));
            $caracteristicasTecnicas = $this->processJsonField($request->input('caracteristicas_tecnicas'));
            $dimensiones = $this->processJsonField($request->input('dimensiones'));
            $videos = $this->processJsonField($request->input('videos'));

            // Obtener detalles existentes para manejar imágenes
            $detallesExistentes = ProductoDetalle::where('producto_id', $id)->first();

            // Procesar imágenes - AGREGAR a las existentes, no reemplazar
            $imagenesFinales = [];

            // Obtener imágenes existentes
            if ($detallesExistentes && $detallesExistentes->imagenes) {
                $imagenesExistentes = is_string($detallesExistentes->imagenes)
                    ? json_decode($detallesExistentes->imagenes, true)
                    : $detallesExistentes->imagenes;
                $imagenesFinales = is_array($imagenesExistentes) ? $imagenesExistentes : [];
            }

            // Agregar nuevas imágenes a las existentes
            if ($request->hasFile('imagenes')) {
                foreach ($request->file('imagenes') as $imagen) {
                    $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                    $rutaImagen = $imagen->storeAs('productos/detalles', $nombreImagen, 'public');
                    $imagenesFinales[] = $nombreImagen;
                }
            }

            // Buscar o crear detalles
            $detalles = ProductoDetalle::updateOrCreate(
                ['producto_id' => $id],
                [
                    'descripcion_detallada' => $request->input('descripcion_detallada'),
                    'instrucciones_uso' => $request->input('instrucciones_uso'),
                    'garantia' => $request->input('garantia'),
                    'politicas_devolucion' => $request->input('politicas_devolucion'),
                    'especificaciones' => $especificaciones,
                    'caracteristicas_tecnicas' => $caracteristicasTecnicas,
                    'dimensiones' => $dimensiones,
                    'videos' => $videos,
                    'imagenes' => !empty($imagenesFinales) ? json_encode($imagenesFinales) : null
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Detalles guardados exitosamente',
                'detalles' => $detalles
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar detalles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function agregarImagenes(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'imagenes.*' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Imágenes inválidas',
                    'errors' => $validator->errors()
                ], 422);
            }

            $detalles = ProductoDetalle::where('producto_id', $id)->first();
            if (!$detalles) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron detalles del producto'
                ], 404);
            }

            $imagenesExistentes = $detalles->imagenes ? json_decode($detalles->imagenes, true) : [];
            $imagenesNuevas = [];

            foreach ($request->file('imagenes') as $imagen) {
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                $imagen->storeAs('productos/detalles', $nombreImagen, 'public');
                $imagenesNuevas[] = $nombreImagen;
            }

            $todasLasImagenes = array_merge($imagenesExistentes, $imagenesNuevas);
            $detalles->update(['imagenes' => json_encode($todasLasImagenes)]);

            return response()->json([
                'success' => true,
                'message' => 'Imágenes agregadas exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar imágenes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function eliminarImagen(Request $request, $id)
    {
        try {
            $imagenIndex = $request->input('imagen_index');
            
            $detalles = ProductoDetalle::where('producto_id', $id)->first();
            if (!$detalles) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron detalles del producto'
                ], 404);
            }

            $imagenes = $detalles->imagenes ? json_decode($detalles->imagenes, true) : [];
            
            if (isset($imagenes[$imagenIndex])) {
                // Eliminar archivo físico
                Storage::disk('public')->delete('productos/detalles/' . $imagenes[$imagenIndex]);
                
                // Remover de array
                unset($imagenes[$imagenIndex]);
                $imagenes = array_values($imagenes); // Reindexar array
                
                $detalles->update(['imagenes' => json_encode($imagenes)]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Imagen eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Procesa campos JSON desde string
     */
    private function processJsonField($jsonString)
    {
        if (empty($jsonString) || $jsonString === 'null') {
            return null;
        }

        try {
            $decoded = json_decode($jsonString, true);
            
            // Si es un array vacío o solo contiene elementos vacíos, retornar null
            if (is_array($decoded)) {
                $filtered = array_filter($decoded, function($item) {
                    if (is_array($item)) {
                        return !empty(array_filter($item));
                    }
                    return !empty(trim($item));
                });
                
                return !empty($filtered) ? json_encode(array_values($filtered)) : null;
            }
            
            return json_encode($decoded);
            
        } catch (\Exception $e) {
            return null;
        }
    }

}