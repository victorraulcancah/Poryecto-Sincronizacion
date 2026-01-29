<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserPermissionsController extends Controller
{
    /**
     * Obtener permisos del usuario autenticado
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'Usuario no autenticado'
            ], 401);
        }

        // Obtener todos los permisos del usuario (directos + de roles)
        $permissions = $user->getAllPermissions()->pluck('name')->sort()->values();

        // Obtener roles del usuario
        $roles = $user->getRoleNames();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'roles' => $roles,
            'permissions' => $permissions,
            'total_permissions' => $permissions->count(),
        ]);
    }

    /**
     * Verificar si el usuario tiene un permiso específico
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function check(Request $request)
    {
        $request->validate([
            'permission' => 'required|string'
        ]);

        $user = $request->user();
        $permission = $request->permission;

        $hasPermission = $user->can($permission);

        return response()->json([
            'permission' => $permission,
            'has_permission' => $hasPermission,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
            ]
        ]);
    }

    /**
     * Listar todos los permisos disponibles en el sistema
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function available()
    {
        $permissions = \Spatie\Permission\Models\Permission::where('guard_name', 'api')
            ->orderBy('name')
            ->get()
            ->groupBy(function ($permission) {
                // Agrupar por módulo (primera parte del nombre)
                $parts = explode('.', $permission->name);
                return $parts[0] ?? 'otros';
            });

        return response()->json([
            'permissions_by_module' => $permissions,
            'total_permissions' => \Spatie\Permission\Models\Permission::where('guard_name', 'api')->count(),
        ]);
    }
}
