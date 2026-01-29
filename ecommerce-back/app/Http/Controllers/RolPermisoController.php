<?php

namespace App\Http\Controllers;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\Request;

class RolPermisoController extends Controller
{
    
    public function index()
    {
        return response()->json([
            'roles' => Role::where('name', '!=', 'superadmin')->get(), // ← Modificado: filtrar superadmin
            'permisos' => Permission::all()
        ]);
    }

    public function update(Request $request, $roleId)
    {
        $role = Role::findOrFail($roleId);
        // ← NUEVO: Proteger el rol superadmin de modificaciones
        if ($role->name === 'superadmin') {
            return response()->json(['error' => 'No se puede modificar el rol superadmin'], 403);
        }
        $role->syncPermissions($request->permisos); // array de permisos desde el front

        return response()->json(['message' => 'Permisos actualizados']);
    }
}
