<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // ELIMINADO: if (!$user || !$user->role) - ya no usamos relación role
        if (!$user) { // ← MODIFICADO: solo verificar que usuario exista
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // ELIMINADO: if (!in_array($user->role->nombre, $roles))
        // NUEVO: usar método de Spatie
        if (!$user->hasAnyRole($roles)) { // ← NUEVO: usar hasAnyRole de Spatie
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return $next($request);
    }
}
