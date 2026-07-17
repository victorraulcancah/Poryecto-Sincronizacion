<?php
// app/Http/Controllers/EmpresaMetodoPagoController.php

namespace App\Http\Controllers;

use App\Models\EmpresaMetodoPago;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaMetodoPagoController extends Controller
{
    public function index(): JsonResponse
    {
        $metodos = EmpresaMetodoPago::orderBy('orden')->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $this->conImagenUrl($metodos),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'imagen' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
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

        $data = $request->only(['nombre', 'orden']);
        $data['activo'] = $request->boolean('activo', true);
        $data['imagen'] = $request->file('imagen')->store('empresa/metodos-pago', 'public');

        $metodo = EmpresaMetodoPago::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Método de pago creado exitosamente',
            'data' => $this->conImagenUrl($metodo),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $metodo = EmpresaMetodoPago::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
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

        $data = $request->only(['nombre', 'orden']);
        if ($request->has('activo')) {
            $data['activo'] = $request->boolean('activo');
        }

        if ($request->hasFile('imagen')) {
            if ($metodo->imagen && Storage::disk('public')->exists($metodo->imagen)) {
                Storage::disk('public')->delete($metodo->imagen);
            }
            $data['imagen'] = $request->file('imagen')->store('empresa/metodos-pago', 'public');
        }

        $metodo->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Método de pago actualizado exitosamente',
            'data' => $this->conImagenUrl($metodo),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $metodo = EmpresaMetodoPago::findOrFail($id);

        if ($metodo->imagen && Storage::disk('public')->exists($metodo->imagen)) {
            Storage::disk('public')->delete($metodo->imagen);
        }

        $metodo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Método de pago eliminado exitosamente',
        ]);
    }

    private function conImagenUrl($metodos)
    {
        $mapear = fn ($m) => array_merge($m->toArray(), [
            'imagen_url' => $m->imagen ? url('storage/' . $m->imagen) : null,
        ]);

        return $metodos instanceof EmpresaMetodoPago
            ? $mapear($metodos)
            : $metodos->map($mapear);
    }
}
