<?php

namespace App\Http\Controllers;

use App\Models\Seccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SeccionController extends Controller
{
    /**
     * Obtener todas las secciones
     */
    public function index()
    {
        try {
            $secciones = Seccion::withCount('categorias')->orderBy('nombre')->get();
            return response()->json($secciones);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener secciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear nueva sección
     */
    public function store(Request $request)
    {
        // Validar límite de 3 secciones
        $totalSecciones = Seccion::count();
        if ($totalSecciones >= 3) {
            return response()->json([
                'message' => 'No se pueden crear más de 3 secciones'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100|unique:secciones,nombre',
            'descripcion' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $seccion = Seccion::create($request->only(['nombre', 'descripcion']));

            return response()->json([
                'message' => 'Sección creada exitosamente',
                'seccion' => $seccion
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear sección',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener sección específica
     */
    public function show($id)
    {
        try {
            $seccion = Seccion::withCount('categorias')->findOrFail($id);
            return response()->json($seccion);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sección no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Actualizar sección
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100|unique:secciones,nombre,' . $id,
            'descripcion' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $seccion = Seccion::findOrFail($id);
            $seccion->update($request->only(['nombre', 'descripcion']));

            return response()->json([
                'message' => 'Sección actualizada exitosamente',
                'seccion' => $seccion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar sección',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar sección
     */
    public function destroy($id)
    {
        try {
            $seccion = Seccion::findOrFail($id);

            // Verificar si tiene categorías asociadas
            if ($seccion->categorias()->count() > 0) {
                return response()->json([
                    'message' => 'No se puede eliminar la sección porque tiene categorías asociadas'
                ], 400);
            }

            $seccion->delete();

            return response()->json([
                'message' => 'Sección eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar sección',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Migrar categoría a otra sección
     */
    public function migrarCategoria(Request $request, $categoriaId)
    {
        $validator = Validator::make($request->all(), [
            'nueva_seccion_id' => 'required|exists:secciones,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $categoria = \App\Models\Categoria::findOrFail($categoriaId);
            $categoria->update(['id_seccion' => $request->nueva_seccion_id]);

            return response()->json([
                'message' => 'Categoría migrada exitosamente',
                'categoria' => $categoria->load('seccion')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al migrar categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
