<?php
// app/Http/Controllers/EmpresaValorController.php

namespace App\Http\Controllers;

use App\Models\EmpresaValor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaValorController extends Controller
{
    public function index(): JsonResponse
    {
        $valores = EmpresaValor::orderBy('orden')->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $this->conImagenUrl($valores),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
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

        $data = $request->only(['titulo', 'descripcion', 'orden']);
        $data['activo'] = $request->boolean('activo', true);

        if ($request->hasFile('imagen')) {
            $data['imagen'] = $request->file('imagen')->store('empresa/valores', 'public');
        }

        $valor = EmpresaValor::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Valor creado exitosamente',
            'data' => $this->conImagenUrl($valor),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $valor = EmpresaValor::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
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

        $data = $request->only(['titulo', 'descripcion', 'orden']);
        if ($request->has('activo')) {
            $data['activo'] = $request->boolean('activo');
        }

        if ($request->hasFile('imagen')) {
            if ($valor->imagen && Storage::disk('public')->exists($valor->imagen)) {
                Storage::disk('public')->delete($valor->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('empresa/valores', 'public');
        }

        $valor->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Valor actualizado exitosamente',
            'data' => $this->conImagenUrl($valor),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $valor = EmpresaValor::findOrFail($id);

        if ($valor->imagen && Storage::disk('public')->exists($valor->imagen)) {
            Storage::disk('public')->delete($valor->imagen);
        }

        $valor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Valor eliminado exitosamente',
        ]);
    }

    private function conImagenUrl($valores)
    {
        $mapear = fn ($v) => array_merge($v->toArray(), [
            'imagen_url' => $v->imagen ? url('storage/' . $v->imagen) : null,
        ]);

        return $valores instanceof EmpresaValor
            ? $mapear($valores)
            : $valores->map($mapear);
    }
}
