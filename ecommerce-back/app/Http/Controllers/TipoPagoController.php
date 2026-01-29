<?php

namespace App\Http\Controllers;

use App\Models\TipoPago;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TipoPagoController extends Controller
{
    // Listar todos los tipos de pago (admin)
    public function index()
    {
        $tiposPago = TipoPago::orderBy('orden')->get();

        return response()->json([
            'status' => 'success',
            'tipos_pago' => $tiposPago
        ]);
    }

    // Listar solo tipos de pago activos (público)
    public function activos()
    {
        $tiposPago = TipoPago::activos()->get();

        return response()->json([
            'status' => 'success',
            'tipos_pago' => $tiposPago
        ]);
    }

    // Crear nuevo tipo de pago
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:50|unique:tipo_pagos,codigo',
            'descripcion' => 'nullable|string',
            'icono' => 'nullable|string|max:100',
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

        $tipoPago = TipoPago::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de pago creado exitosamente',
            'tipo_pago' => $tipoPago
        ], 201);
    }

    // Actualizar tipo de pago
    public function update(Request $request, $id)
    {
        $tipoPago = TipoPago::find($id);

        if (!$tipoPago) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tipo de pago no encontrado'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:50|unique:tipo_pagos,codigo,' . $id,
            'descripcion' => 'nullable|string',
            'icono' => 'nullable|string|max:100',
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

        $tipoPago->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de pago actualizado exitosamente',
            'tipo_pago' => $tipoPago
        ]);
    }

    // Toggle activo/inactivo
    public function toggleEstado($id)
    {
        $tipoPago = TipoPago::find($id);

        if (!$tipoPago) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tipo de pago no encontrado'
            ], 404);
        }

        $tipoPago->activo = !$tipoPago->activo;
        $tipoPago->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Estado actualizado exitosamente',
            'tipo_pago' => $tipoPago
        ]);
    }

    // Eliminar tipo de pago
    public function destroy($id)
    {
        $tipoPago = TipoPago::find($id);

        if (!$tipoPago) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tipo de pago no encontrado'
            ], 404);
        }

        $tipoPago->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de pago eliminado exitosamente'
        ]);
    }
}
