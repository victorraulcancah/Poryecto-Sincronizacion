<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function getRoles()
    {
        $roles = Role::all();
        return response()->json($roles);
    }

    /**
     * Obtener todos los permisos disponibles
     */
    public function getPermissions(): JsonResponse
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    /**
     * Obtener permisos de un rol específico
     */
    public function getRolePermissions($roleId): JsonResponse
    {
        $role = Role::findOrFail($roleId);
        $permissions = $role->permissions;
        return response()->json($permissions);
    }

    /**
     * Actualizar permisos de un rol
     */
    public function updateRolePermissions(Request $request, $roleId): JsonResponse
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);

        $role = Role::findOrFail($roleId);

        // 🆕 NUEVA LÍNEA AGREGADA
        $affectedUserIds = $role->users()->pluck('id')->toArray();
        
        // Sincronizar permisos (elimina los anteriores y asigna los nuevos)
        $role->syncPermissions($request->permissions);

        return response()->json([
            'message' => 'Permisos actualizados correctamente',
            'role' => $role->load('permissions'),
            'affected_users' => $affectedUserIds

        ]);
    }

    /**
     * Crear un nuevo rol
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name'
        ]);

        $role = Role::create([
            'name' => $request->name,
            'guard_name' => 'web'
        ]);

        return response()->json($role, 201);
    }

    /**
     * Eliminar un rol
     */
    public function destroy($roleId): JsonResponse
    {
        $role = Role::findOrFail($roleId);
        
        // Verificar que no sea un rol crítico
        if (in_array($role->name, ['superadmin', 'admin'])) {
            return response()->json([
                'message' => 'No se puede eliminar este rol'
            ], 403);
        }

        $role->delete();

        return response()->json([
            'message' => 'Rol eliminado correctamente'
        ]);
    }

    
}
