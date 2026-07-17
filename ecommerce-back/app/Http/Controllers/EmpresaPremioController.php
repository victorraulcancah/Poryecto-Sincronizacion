<?php
// app/Http/Controllers/EmpresaPremioController.php

namespace App\Http\Controllers;

use App\Models\EmpresaPremio;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaPremioController extends Controller
{
    public function index(): JsonResponse
    {
        $premios = EmpresaPremio::orderBy('orden')->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $this->conImagenUrl($premios),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'anio' => 'nullable|string|max:10',
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

        $data = $request->only(['titulo', 'anio', 'orden']);
        $data['activo'] = $request->boolean('activo', true);

        if ($request->hasFile('imagen')) {
            $data['imagen'] = $request->file('imagen')->store('empresa/premios', 'public');
        }

        $premio = EmpresaPremio::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Premio creado exitosamente',
            'data' => $this->conImagenUrl($premio),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $premio = EmpresaPremio::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'anio' => 'nullable|string|max:10',
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

        $data = $request->only(['titulo', 'anio', 'orden']);
        if ($request->has('activo')) {
            $data['activo'] = $request->boolean('activo');
        }

        if ($request->hasFile('imagen')) {
            if ($premio->imagen && Storage::disk('public')->exists($premio->imagen)) {
                Storage::disk('public')->delete($premio->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('empresa/premios', 'public');
        }

        $premio->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Premio actualizado exitosamente',
            'data' => $this->conImagenUrl($premio),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $premio = EmpresaPremio::findOrFail($id);

        if ($premio->imagen && Storage::disk('public')->exists($premio->imagen)) {
            Storage::disk('public')->delete($premio->imagen);
        }

        $premio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Premio eliminado exitosamente',
        ]);
    }

    private function conImagenUrl($premios)
    {
        $mapear = fn ($p) => array_merge($p->toArray(), [
            'imagen_url' => $p->imagen ? url('storage/' . $p->imagen) : null,
        ]);

        return $premios instanceof EmpresaPremio
            ? $mapear($premios)
            : $premios->map($mapear);
    }
}
