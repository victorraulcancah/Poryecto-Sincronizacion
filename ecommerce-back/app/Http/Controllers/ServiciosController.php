<?php

namespace App\Http\Controllers;

use App\Models\Servicio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiciosController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Servicio::query();

            if ($request->has('activo')) {
                $query->where('activo', $request->activo);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('codigo_servicio', 'LIKE', "%{$search}%")
                        ->orWhere('nombre', 'LIKE', "%{$search}%")
                        ->orWhere('descripcion', 'LIKE', "%{$search}%");
                });
            }

            $servicios = $query->orderBy('nombre')->paginate(20);

            return response()->json($servicios);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener servicios',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo_servicio' => 'required|string|max:100|unique:servicios,codigo_servicio',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'mostrar_igv' => 'nullable|boolean',
            'unidad_medida' => 'nullable|string|max:10',
            'tipo_afectacion_igv' => 'nullable|string|max:2',
            'activo' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $servicio = Servicio::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Servicio creado exitosamente',
                'data' => $servicio,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear servicio',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $servicio = Servicio::findOrFail($id);
            return response()->json($servicio);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Servicio no encontrado',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'codigo_servicio' => 'sometimes|required|string|max:100|unique:servicios,codigo_servicio,'.$id,
            'nombre' => 'sometimes|required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'sometimes|required|numeric|min:0',
            'mostrar_igv' => 'nullable|boolean',
            'unidad_medida' => 'nullable|string|max:10',
            'tipo_afectacion_igv' => 'nullable|string|max:2',
            'activo' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $servicio = Servicio::findOrFail($id);
            $servicio->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Servicio actualizado exitosamente',
                'data' => $servicio,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar servicio',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $servicio = Servicio::findOrFail($id);
            $servicio->delete();

            return response()->json([
                'success' => true,
                'message' => 'Servicio eliminado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar servicio',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
