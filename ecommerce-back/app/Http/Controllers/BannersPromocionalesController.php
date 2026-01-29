<?php

namespace App\Http\Controllers;

use App\Models\BannerPromocional;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BannersPromocionalesController extends Controller
{
    /**
     * Obtener todos los banners promocionales (para dashboard)
     */
    public function index()
    {
        try {
            $banners = BannerPromocional::ordenados()->get();
            
            return response()->json([
                'status' => 'success',
                'data' => $banners
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener banners promocionales: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener banners promocionales activos para el público
     */
    public function bannersPromocionalesPublicos()
    {
        try {
            $banners = BannerPromocional::activos()->ordenados()->limit(4)->get()->map(function ($banner) {
                return [
                    'id' => $banner->id,
                    'titulo' => $banner->titulo,
                    'precio' => $banner->precio ? 'S/ ' . number_format($banner->precio, 2) : null,
                    'texto_boton' => $banner->texto_boton,
                    'imagen_url' => $banner->imagen_completa,
                    'enlace_url' => $banner->enlace_url,
                    'animacion_delay' => $banner->animacion_delay,
                    'orden' => $banner->orden,
                    'color_boton' => $banner->color_boton,
                    'color_texto' => $banner->color_texto,
                    'color_badge_nombre' => $banner->color_badge_nombre,
                    'color_badge_precio' => $banner->color_badge_precio
                ];
            });
            
            return response()->json([
                'status' => 'success',
                'data' => $banners
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener banners promocionales públicos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo banner promocional
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'precio' => 'nullable|numeric|min:0',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'enlace_url' => 'required|string|max:255',
            'orden' => 'nullable|integer|min:1',
            'animacion_delay' => 'nullable|integer|min:0|max:3000',
            'color_boton' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_texto' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_badge_nombre' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_badge_precio' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'activo' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->all();
            
            // Manejar la subida de imagen
            if ($request->hasFile('imagen')) {
                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                $rutaImagen = $imagen->storeAs('banners_promocionales', $nombreImagen, 'public');
                $data['imagen_url'] = $rutaImagen;
            }

            // Si no se especifica orden, usar el siguiente disponible
            if (!isset($data['orden'])) {
                $data['orden'] = BannerPromocional::max('orden') + 1;
            }

            // Si no se especifica animacion_delay, calcular automáticamente
            if (!isset($data['animacion_delay'])) {
                $data['animacion_delay'] = 400 + (($data['orden'] - 1) * 200);
            }

            $banner = BannerPromocional::create($data);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Banner promocional creado exitosamente',
                'data' => $banner
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear banner promocional: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar un banner promocional específico
     */
    public function show($id)
    {
        try {
            $banner = BannerPromocional::findOrFail($id);
            
            return response()->json([
                'status' => 'success',
                'data' => $banner
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Banner promocional no encontrado'
            ], 404);
        }
    }

    /**
     * Actualizar un banner promocional
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'precio' => 'nullable|numeric|min:0',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'enlace_url' => 'required|string|max:255',
            'orden' => 'nullable|integer|min:1',
            'animacion_delay' => 'nullable|integer|min:0|max:3000',
            'color_boton' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_texto' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_badge_nombre' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_badge_precio' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'activo' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $banner = BannerPromocional::findOrFail($id);
            $data = $request->all();
            
            // Manejar la subida de nueva imagen
            if ($request->hasFile('imagen')) {
                $banner->eliminarImagenAnterior();
                
                $imagen = $request->file('imagen');
                $nombreImagen = time() . '_' . uniqid() . '.' . $imagen->getClientOriginalExtension();
                $rutaImagen = $imagen->storeAs('banners_promocionales', $nombreImagen, 'public');
                $data['imagen_url'] = $rutaImagen;
            }

            $banner->update($data);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Banner promocional actualizado exitosamente',
                'data' => $banner
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar banner promocional: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un banner promocional
     */
    public function destroy($id)
    {
        try {
            $banner = BannerPromocional::findOrFail($id);
            
            $banner->eliminarImagenAnterior();
            $banner->delete();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Banner promocional eliminado exitosamente'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al eliminar banner promocional: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar el estado activo/inactivo
     */
    public function toggleEstado($id)
    {
        try {
            $banner = BannerPromocional::findOrFail($id);
            $banner->activo = !$banner->activo;
            $banner->save();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Estado del banner promocional actualizado',
                'data' => $banner
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }
}
