<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\Request;

class ProveedoresController extends Controller
{
    public function index(Request $request)
    {
        $query = Proveedor::query();

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('razon_social', 'like', "%{$request->search}%")
                    ->orWhere('numero_documento', 'like', "%{$request->search}%");
            });
        }

        if ($request->activo !== null) {
            $query->where('activo', $request->activo);
        }

        $proveedores = $query->orderBy('razon_social')->paginate(20);

        return response()->json($proveedores);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tipo_documento' => 'required|in:RUC,DNI',
            'numero_documento' => 'required|string|unique:proveedores',
            'razon_social' => 'required|string|max:200',
            'direccion' => 'nullable|string',
            'telefono' => 'nullable|string',
            'email' => 'nullable|email',
            'dias_credito' => 'integer|min:0',
            'limite_credito' => 'numeric|min:0'
        ]);

        $proveedor = Proveedor::create($request->all());

        return response()->json($proveedor, 201);
    }

    public function show($id)
    {
        $proveedor = Proveedor::with(['cuentasPorPagar', 'compras'])->findOrFail($id);
        return response()->json($proveedor);
    }

    public function update(Request $request, $id)
    {
        $proveedor = Proveedor::findOrFail($id);

        $request->validate([
            'razon_social' => 'string|max:200',
            'direccion' => 'nullable|string',
            'telefono' => 'nullable|string',
            'email' => 'nullable|email',
            'dias_credito' => 'integer|min:0',
            'limite_credito' => 'numeric|min:0'
        ]);

        $proveedor->update($request->all());

        return response()->json($proveedor);
    }

    public function destroy($id)
    {
        $proveedor = Proveedor::findOrFail($id);
        
        // Verificar si tiene cuentas por pagar pendientes
        $cuentasPendientes = $proveedor->cuentasPorPagar()
            ->whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->count();

        if ($cuentasPendientes > 0) {
            return response()->json([
                'error' => 'No se puede eliminar el proveedor porque tiene cuentas por pagar pendientes'
            ], 400);
        }

        $proveedor->delete();

        return response()->json(['message' => 'Proveedor eliminado correctamente']);
    }

    public function desactivar($id)
    {
        $proveedor = Proveedor::findOrFail($id);
        $proveedor->update(['activo' => false]);

        return response()->json(['message' => 'Proveedor desactivado correctamente']);
    }

    public function activar($id)
    {
        $proveedor = Proveedor::findOrFail($id);
        $proveedor->update(['activo' => true]);

        return response()->json(['message' => 'Proveedor activado correctamente']);
    }
}
