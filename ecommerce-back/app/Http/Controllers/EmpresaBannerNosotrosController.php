<?php
// app/Http/Controllers/EmpresaBannerNosotrosController.php

namespace App\Http\Controllers;

use App\Models\EmpresaBannerNosotros;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaBannerNosotrosController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = EmpresaBannerNosotros::orderBy('orden')->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $this->conImagenUrl($banners),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'imagen' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'titulo' => 'nullable|string|max:255',
            'subtitulo' => 'nullable|string|max:255',
            'orden' => 'nullable|integer|min:0',
            'activo' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['titulo', 'subtitulo', 'orden']);
        $data['activo'] = $request->boolean('activo', true);
        $data['imagen'] = $request->file('imagen')->store('empresa/banners-nosotros', 'public');

        $banner = EmpresaBannerNosotros::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Banner creado exitosamente',
            'data' => $this->conImagenUrl($banner),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $banner = EmpresaBannerNosotros::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'titulo' => 'nullable|string|max:255',
            'subtitulo' => 'nullable|string|max:255',
            'orden' => 'nullable|integer|min:0',
            'activo' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['titulo', 'subtitulo', 'orden']);
        if ($request->has('activo')) {
            $data['activo'] = $request->boolean('activo');
        }

        if ($request->hasFile('imagen')) {
            if ($banner->imagen && Storage::disk('public')->exists($banner->imagen)) {
                Storage::disk('public')->delete($banner->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('empresa/banners-nosotros', 'public');
        }

        $banner->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Banner actualizado exitosamente',
            'data' => $this->conImagenUrl($banner),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $banner = EmpresaBannerNosotros::findOrFail($id);

        if ($banner->imagen && Storage::disk('public')->exists($banner->imagen)) {
            Storage::disk('public')->delete($banner->imagen);
        }

        $banner->delete();

        return response()->json([
            'success' => true,
            'message' => 'Banner eliminado exitosamente',
        ]);
    }

    private function conImagenUrl($banners)
    {
        $mapear = fn ($b) => array_merge($b->toArray(), [
            'imagen_url' => $b->imagen ? url('storage/' . $b->imagen) : null,
        ]);

        return $banners instanceof EmpresaBannerNosotros
            ? $mapear($banners)
            : $banners->map($mapear);
    }
}
