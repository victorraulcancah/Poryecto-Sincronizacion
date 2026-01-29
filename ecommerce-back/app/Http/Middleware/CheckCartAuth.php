<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckCartAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verificar si el usuario está autenticado en cualquiera de los dos guardias
        if (Auth::guard('web')->check() || Auth::guard('cliente')->check()) {
            return $next($request);
        }
        
        return response()->json(['message' => 'Usuario no autenticado.'], 401);
    }
}
