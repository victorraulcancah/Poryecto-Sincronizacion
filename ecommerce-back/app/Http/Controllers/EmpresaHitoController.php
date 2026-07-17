<?php
// app/Http/Controllers/EmpresaHitoController.php

namespace App\Http\Controllers;

use App\Models\EmpresaHito;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaHitoController extends Controller
{
    public function index(): JsonResponse
    {
        $hitos = EmpresaHito::orderBy('orden')->orderBy('anio')->get();

        return response()->json([
            'success' => true,
            'data' => $this->conImagenUrl($hitos),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'anio' => 'required|string|max:10',
            'descripcion' => 'required|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
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

        $data = $request->only(['anio', 'descripcion', 'orden']);
        $data['activo'] = $request->boolean('activo', true);

        if ($request->hasFile('imagen')) {
            $data['imagen'] = $request->file('imagen')->store('empresa/hitos', 'public');
        }

        $hito = EmpresaHito::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Hito creado exitosamente',
            'data' => $this->conImagenUrl($hito),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $hito = EmpresaHito::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'anio' => 'required|string|max:10',
            'descripcion' => 'required|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
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

        $data = $request->only(['anio', 'descripcion', 'orden']);
        if ($request->has('activo')) {
            $data['activo'] = $request->boolean('activo');
        }

        if ($request->hasFile('imagen')) {
            if ($hito->imagen && Storage::disk('public')->exists($hito->imagen)) {
                Storage::disk('public')->delete($hito->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('empresa/hitos', 'public');
        }

        $hito->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Hito actualizado exitosamente',
            'data' => $this->conImagenUrl($hito),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $hito = EmpresaHito::findOrFail($id);

        if ($hito->imagen && Storage::disk('public')->exists($hito->imagen)) {
            Storage::disk('public')->delete($hito->imagen);
        }

        $hito->delete();

        return response()->json([
            'success' => true,
            'message' => 'Hito eliminado exitosamente',
        ]);
    }

    private function conImagenUrl($hitos)
    {
        $mapear = fn ($h) => array_merge($h->toArray(), [
            'imagen_url' => $h->imagen ? url('storage/' . $h->imagen) : null,
        ]);

        return $hitos instanceof EmpresaHito
            ? $mapear($hitos)
            : $hitos->map($mapear);
    }
}
