<?php

namespace App\Http\Controllers;

use App\Models\FormaEnvio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FormaEnvioController extends Controller
{
    // Listar todas las formas de envío (admin)
    public function index()
    {
        $formasEnvio = FormaEnvio::orderBy('orden')->get();

        return response()->json([
            'status' => 'success',
            'formas_envio' => $formasEnvio
        ]);
    }

    // Listar solo formas de envío activas (público)
    public function activas()
    {
        $formasEnvio = FormaEnvio::activas()->get();

        return response()->json([
            'status' => 'success',
            'formas_envio' => $formasEnvio
        ]);
    }

    // Crear nueva forma de envío
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:50|unique:forma_envios,codigo',
            'descripcion' => 'nullable|string',
            'costo' => 'required|numeric|min:0',
            'activo' => 'boolean',
            'orden' => 'integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $formaEnvio = FormaEnvio::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Forma de envío creada exitosamente',
            'forma_envio' => $formaEnvio
        ], 201);
    }

    // Actualizar forma de envío
    public function update(Request $request, $id)
    {
        $formaEnvio = FormaEnvio::find($id);

        if (!$formaEnvio) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forma de envío no encontrada'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:50|unique:forma_envios,codigo,' . $id,
            'descripcion' => 'nullable|string',
            'costo' => 'required|numeric|min:0',
            'activo' => 'boolean',
            'orden' => 'integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $formaEnvio->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Forma de envío actualizada exitosamente',
            'forma_envio' => $formaEnvio
        ]);
    }

    // Toggle activo/inactivo
    public function toggleEstado($id)
    {
        $formaEnvio = FormaEnvio::find($id);

        if (!$formaEnvio) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forma de envío no encontrada'
            ], 404);
        }

        $formaEnvio->activo = !$formaEnvio->activo;
        $formaEnvio->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Estado actualizado exitosamente',
            'forma_envio' => $formaEnvio
        ]);
    }

    // Eliminar forma de envío
    public function destroy($id)
    {
        $formaEnvio = FormaEnvio::find($id);

        if (!$formaEnvio) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forma de envío no encontrada'
            ], 404);
        }

        $formaEnvio->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Forma de envío eliminada exitosamente'
        ]);
    }
}
