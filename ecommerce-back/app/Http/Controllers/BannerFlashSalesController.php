<?php

namespace App\Http\Controllers;

use App\Models\BannerFlashSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BannerFlashSalesController extends Controller
{
    /**
     * Listar todos los banners flash sales
     */
    public function index()
    {
        $banners = BannerFlashSale::ordenadosPorId()
            ->get();

        return response()->json($banners);
    }

    /**
     * Obtener banners activos para el frontend
     */
    public function activos()
    {
        $banners = BannerFlashSale::activos()
            ->ordenadosPorId()
            ->get();

        return response()->json($banners, 200);
    }

    /**
     * Mostrar un banner específico
     */
    public function show($id)
    {
        $banner = BannerFlashSale::findOrFail($id);
        return response()->json($banner);
    }

    /**
     * Crear nuevo banner
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'color_badge' => 'nullable|string|max:7',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after:fecha_inicio',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'color_boton' => 'nullable|string|max:7',
            'texto_boton' => 'nullable|string|max:100',
            'enlace_url' => 'nullable|string|max:255',
            'activo' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->except('imagen');

        // Manejar la imagen
        if ($request->hasFile('imagen')) {
            $imagen = $request->file('imagen');
            $rutaImagen = $imagen->store('banners_flash_sales', 'public');
            $data['imagen'] = $rutaImagen;
        }

        $banner = BannerFlashSale::create($data);

        return response()->json([
            'message' => 'Banner flash sale creado exitosamente',
            'banner' => $banner
        ], 201);
    }

    /**
     * Actualizar banner existente
     */
    public function update(Request $request, $id)
    {
        $banner = BannerFlashSale::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'color_badge' => 'nullable|string|max:7',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after:fecha_inicio',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'color_boton' => 'nullable|string|max:7',
            'texto_boton' => 'nullable|string|max:100',
            'enlace_url' => 'nullable|string|max:255',
            'activo' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->except('imagen');

        // Manejar la nueva imagen
        if ($request->hasFile('imagen')) {
            // Eliminar imagen anterior si existe
            if ($banner->imagen && Storage::disk('public')->exists($banner->imagen)) {
                Storage::disk('public')->delete($banner->imagen);
            }

            $imagen = $request->file('imagen');
            $rutaImagen = $imagen->store('banners_flash_sales', 'public');
            $data['imagen'] = $rutaImagen;
        }

        $banner->update($data);

        return response()->json([
            'message' => 'Banner flash sale actualizado exitosamente',
            'banner' => $banner
        ]);
    }

    /**
     * Eliminar banner
     */
    public function destroy($id)
    {
        $banner = BannerFlashSale::findOrFail($id);

        // Eliminar imagen si existe
        if ($banner->imagen && Storage::disk('public')->exists($banner->imagen)) {
            Storage::disk('public')->delete($banner->imagen);
        }

        $banner->delete();

        return response()->json([
            'message' => 'Banner flash sale eliminado exitosamente'
        ]);
    }

    /**
     * Activar/Desactivar banner
     */
    public function toggleActivo($id)
    {
        $banner = BannerFlashSale::findOrFail($id);
        $banner->activo = !$banner->activo;
        $banner->save();

        return response()->json([
            'message' => 'Estado actualizado exitosamente',
            'activo' => $banner->activo,
            'banner' => $banner
        ]);
    }
}
