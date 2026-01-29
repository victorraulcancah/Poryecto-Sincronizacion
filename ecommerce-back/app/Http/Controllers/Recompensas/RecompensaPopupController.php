<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaPopup;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RecompensaPopupController extends Controller
{
    /**
     * Listar popups de una recompensa
     */
    public function index($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);
            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $popups = RecompensaPopup::where('recompensa_id', $recompensaId)
                ->with('recompensa:id,nombre,tipo,estado')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($popup) {
                    return [
                        'id' => $popup->id,
                        'titulo' => $popup->titulo,
                        'descripcion' => $popup->descripcion,
                        'imagen_popup' => $popup->imagen_popup,
                        'imagen_popup_url' => $popup->imagen_popup ? asset('storage/popups/' . $popup->imagen_popup) : null,
                        'texto_boton' => $popup->texto_boton,
                        'url_destino' => $popup->url_destino,
                        'mostrar_cerrar' => $popup->mostrar_cerrar,
                        'auto_cerrar_segundos' => $popup->auto_cerrar_segundos,
                        'popup_activo' => $popup->popup_activo,
                        'esta_activo' => $popup->estaActivo(),
                        'tiene_auto_cierre' => $popup->tieneAutoCierre(),
                        'recompensa' => [
                            'id' => $popup->recompensa->id,
                            'nombre' => $popup->recompensa->nombre,
                            'tipo' => $popup->recompensa->tipo,
                            'estado' => $popup->recompensa->estado
                        ],
                        'created_at' => $popup->created_at,
                        'updated_at' => $popup->updated_at
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Popups obtenidos exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre,
                        'tipo' => $recompensa->tipo,
                        'estado' => $recompensa->estado
                    ],
                    'popups' => $popups,
                    'total_popups' => $popups->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los popups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear popup para una recompensa
     */
    public function store(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);
            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'titulo' => 'required|string|max:255',
                'descripcion' => 'nullable|string',
                'imagen_popup' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
                'texto_boton' => 'nullable|string|max:100',
                'url_destino' => 'nullable|string|max:500',
                'mostrar_cerrar' => 'boolean',
                'auto_cerrar_segundos' => 'nullable|numeric|min:1|max:300',
                'popup_activo' => 'boolean'
            ], [
                'titulo.required' => 'El título es obligatorio',
                'titulo.max' => 'El título no puede exceder 255 caracteres',
                'imagen_popup.image' => 'El archivo debe ser una imagen válida',
                'imagen_popup.mimes' => 'La imagen debe ser jpeg, png, jpg, gif o webp',
                'imagen_popup.max' => 'La imagen no puede exceder 2MB',
                'texto_boton.max' => 'El texto del botón no puede exceder 100 caracteres',
                'url_destino.max' => 'La URL no puede exceder 500 caracteres',
                'auto_cerrar_segundos.numeric' => 'Los segundos de auto-cierre deben ser un número',
                'auto_cerrar_segundos.min' => 'Los segundos de auto-cierre deben ser al menos 1',
                'auto_cerrar_segundos.max' => 'Los segundos de auto-cierre no pueden exceder 300'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // MÉTODO MANUAL - Manejar imagen directamente en public/storage
            $data = [
                'recompensa_id' => $recompensaId,
                'titulo' => $request->titulo,
                'descripcion' => $request->descripcion,
                'texto_boton' => $request->get('texto_boton', 'Ver más'),
                'url_destino' => $request->get('url_destino', "/recompensas/{$recompensaId}"),
                'mostrar_cerrar' => filter_var($request->get('mostrar_cerrar', true), FILTER_VALIDATE_BOOLEAN),
                'auto_cerrar_segundos' => $request->auto_cerrar_segundos ? (int)$request->auto_cerrar_segundos : null,
                'popup_activo' => filter_var($request->get('popup_activo', false), FILTER_VALIDATE_BOOLEAN)
            ];

            // Manejar imagen del popup
            if ($request->hasFile('imagen_popup')) {
                $imagen = $request->file('imagen_popup');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();

                // Crear directorio si no existe
                $directorioDestino = public_path('storage/popups');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }

                // Mover imagen directamente a public/storage/popups
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen_popup'] = $nombreImagen;
            }

            $popup = RecompensaPopup::create($data);

            DB::commit();

            // Cargar relación para la respuesta
            $popup->load('recompensa:id,nombre,tipo,estado');

            // Agregar URL completa de imagen para la respuesta
            if ($popup->imagen_popup) {
                $popup->imagen_popup_url = asset('storage/popups/' . $popup->imagen_popup);
            }

            return response()->json([
                'success' => true,
                'message' => 'Popup creado exitosamente',
                'data' => [
                    'id' => $popup->id,
                    'titulo' => $popup->titulo,
                    'descripcion' => $popup->descripcion,
                    'imagen_popup' => $popup->imagen_popup,
                    'imagen_popup_url' => $popup->imagen_popup_url,
                    'texto_boton' => $popup->texto_boton,
                    'url_destino' => $popup->url_destino,
                    'mostrar_cerrar' => $popup->mostrar_cerrar,
                    'auto_cerrar_segundos' => $popup->auto_cerrar_segundos,
                    'popup_activo' => $popup->popup_activo,
                    'esta_activo' => $popup->estaActivo(),
                    'tiene_auto_cierre' => $popup->tieneAutoCierre(),
                    'recompensa' => [
                        'id' => $popup->recompensa->id,
                        'nombre' => $popup->recompensa->nombre,
                        'tipo' => $popup->recompensa->tipo,
                        'estado' => $popup->recompensa->estado
                    ],
                    'created_at' => $popup->created_at,
                    'updated_at' => $popup->updated_at
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el popup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de un popup específico
     */
    public function show($recompensaId, $popupId): JsonResponse
    {
        try {
            $popup = RecompensaPopup::where('recompensa_id', $recompensaId)
                ->where('id', $popupId)
                ->with('recompensa:id,nombre,tipo,estado')
                ->first();

            if (!$popup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Popup no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Popup obtenido exitosamente',
                'data' => $popup->getConfiguracionFrontend()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el popup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar popup
     */
    public function update(Request $request, $recompensaId, $popupId): JsonResponse
    {
        try {
            $popup = RecompensaPopup::where('recompensa_id', $recompensaId)
                ->where('id', $popupId)
                ->first();

            if (!$popup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Popup no encontrado'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'titulo' => 'sometimes|required|string|max:255',
                'descripcion' => 'nullable|string',
                'imagen_popup' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
                'texto_boton' => 'nullable|string|max:100',
                'url_destino' => 'nullable|string|max:500',
                'mostrar_cerrar' => 'boolean',
                'auto_cerrar_segundos' => 'nullable|numeric|min:1|max:300',
                'popup_activo' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $data = $request->only([
                'titulo',
                'descripcion',
                'texto_boton',
                'url_destino',
                'mostrar_cerrar',
                'auto_cerrar_segundos',
                'popup_activo'
            ]);

            // MÉTODO MANUAL - Manejar imagen
            if ($request->hasFile('imagen_popup')) {
                // Eliminar imagen anterior si existe
                if ($popup->imagen_popup) {
                    $rutaImagenAnterior = public_path('storage/popups/' . $popup->imagen_popup);
                    if (file_exists($rutaImagenAnterior)) {
                        unlink($rutaImagenAnterior);
                    }
                }

                $imagen = $request->file('imagen_popup');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                
                // Crear directorio si no existe
                $directorioDestino = public_path('storage/popups');
                if (!file_exists($directorioDestino)) {
                    mkdir($directorioDestino, 0755, true);
                }
                
                // Mover imagen directamente a public/storage/popups
                $imagen->move($directorioDestino, $nombreImagen);
                $data['imagen_popup'] = $nombreImagen;
            }

            $popup->update($data);

            DB::commit();

            // Cargar relación para la respuesta
            $popup->load('recompensa:id,nombre,tipo,estado');

            // Agregar URL completa de imagen para la respuesta
            if ($popup->imagen_popup) {
                $popup->imagen_popup_url = asset('storage/popups/' . $popup->imagen_popup);
            }

            return response()->json([
                'success' => true,
                'message' => 'Popup actualizado exitosamente',
                'data' => $popup->getConfiguracionFrontend()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el popup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar popup
     */
    public function destroy($recompensaId, $popupId): JsonResponse
    {
        try {
            $popup = RecompensaPopup::where('recompensa_id', $recompensaId)
                ->where('id', $popupId)
                ->first();

            if (!$popup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Popup no encontrado'
                ], 404);
            }

            DB::beginTransaction();

            $popup->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Popup eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el popup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activar/desactivar popup
     */
    public function toggleActivo(Request $request, $recompensaId, $popupId): JsonResponse
    {
        try {
            $popup = RecompensaPopup::where('recompensa_id', $recompensaId)
                ->where('id', $popupId)
                ->first();

            if (!$popup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Popup no encontrado'
                ], 404);
            }

            DB::beginTransaction();

            $popup->popup_activo = !$popup->popup_activo;
            $popup->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $popup->popup_activo ? 'Popup activado' : 'Popup desactivado',
                'data' => [
                    'id' => $popup->id,
                    'popup_activo' => $popup->popup_activo,
                    'esta_activo' => $popup->estaActivo()
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar estado del popup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de popups
     */
    public function estadisticas($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);
            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $popups = RecompensaPopup::where('recompensa_id', $recompensaId)->get();
            
            $estadisticas = [
                'total_popups' => $popups->count(),
                'popups_activos' => $popups->where('popup_activo', true)->count(),
                'popups_inactivos' => $popups->where('popup_activo', false)->count(),
                'popups_con_auto_cierre' => $popups->filter(function($popup) {
                    return $popup->tieneAutoCierre();
                })->count(),
                'popups_sin_auto_cierre' => $popups->filter(function($popup) {
                    return !$popup->tieneAutoCierre();
                })->count(),
                'distribucion_por_estado' => [
                    'activos' => $popups->where('popup_activo', true)->count(),
                    'inactivos' => $popups->where('popup_activo', false)->count()
                ],
                'configuraciones_comunes' => [
                    'con_imagen' => $popups->whereNotNull('imagen_popup')->count(),
                    'sin_imagen' => $popups->whereNull('imagen_popup')->count(),
                    'con_auto_cierre' => $popups->filter(function($popup) {
                        return $popup->tieneAutoCierre();
                    })->count(),
                    'sin_auto_cierre' => $popups->filter(function($popup) {
                        return !$popup->tieneAutoCierre();
                    })->count()
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de popups obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
