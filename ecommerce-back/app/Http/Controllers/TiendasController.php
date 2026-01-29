<?php

namespace App\Http\Controllers;

use App\Models\Tienda;
use Illuminate\Http\Request;

class TiendasController extends Controller
{
    public function index()
    {
        $tiendas = Tienda::orderBy('nombre')->get();
        return response()->json($tiendas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string',
            'logo' => 'nullable|string|max:255',
            'estado' => 'sometimes|in:ACTIVA,INACTIVA'
        ]);

        $tienda = Tienda::create([
            'nombre' => $request->nombre,
            'descripcion' => $request->descripcion,
            'logo' => $request->logo,
            'estado' => $request->estado ?? 'ACTIVA'
        ]);

        return response()->json($tienda, 201);
    }

    public function show($id)
    {
        $tienda = Tienda::findOrFail($id);
        return response()->json($tienda);
    }

    public function update(Request $request, $id)
    {
        $tienda = Tienda::findOrFail($id);

        $request->validate([
            'nombre' => 'sometimes|string|max:100',
            'descripcion' => 'nullable|string',
            'logo' => 'nullable|string|max:255',
            'estado' => 'sometimes|in:ACTIVA,INACTIVA'
        ]);

        $tienda->update($request->only(['nombre', 'descripcion', 'logo', 'estado']));

        return response()->json($tienda);
    }

    public function destroy($id)
    {
        $tienda = Tienda::findOrFail($id);
        
        // Verificar si tiene cajas asociadas
        if ($tienda->cajas()->exists()) {
            return response()->json([
                'error' => 'No se puede eliminar la tienda porque tiene cajas asociadas'
            ], 400);
        }

        $tienda->delete();

        return response()->json(['message' => 'Tienda eliminada correctamente']);
    }
}
