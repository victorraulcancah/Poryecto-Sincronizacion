<?php

namespace App\Http\Controllers;

use App\Models\DispositivoCliente;
use App\Models\UserCliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * El app móvil registra aquí el token de notificaciones push de su teléfono.
 */
class DispositivoClienteController extends Controller
{
    /** Guarda (o reasigna al cliente actual) el token de este teléfono. */
    public function registrar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'token' => 'required|string|max:512',
            'plataforma' => 'nullable|string|in:android,ios',
        ]);

        $cliente = $request->user();
        if (! $cliente instanceof UserCliente) {
            return response()->json(['status' => 'error', 'message' => 'Solo para clientes.'], 403);
        }

        // Un token es de un solo cliente: si otro inició sesión en este teléfono,
        // las notificaciones pasan a ser del nuevo dueño.
        DispositivoCliente::updateOrCreate(
            ['token' => $datos['token']],
            [
                'user_cliente_id' => $cliente->id,
                'plataforma' => $datos['plataforma'] ?? 'android',
                'ultimo_uso_at' => now(),
            ],
        );

        return response()->json(['status' => 'success']);
    }

    /** Quita el token de este teléfono (al cerrar sesión). */
    public function quitar(Request $request): JsonResponse
    {
        $token = $request->validate(['token' => 'required|string|max:512'])['token'];

        // Solo se borra el que es del cliente que lo pide.
        DispositivoCliente::where('token', $token)
            ->where('user_cliente_id', $request->user()?->id)
            ->delete();

        return response()->json(['status' => 'success']);
    }
}
