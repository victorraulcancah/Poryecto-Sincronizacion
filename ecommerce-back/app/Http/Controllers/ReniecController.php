<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Consulta de DNI y RUC contra dniruc.apisperu.com.
 *
 * El token sale de `config('services.apisperu.token')` (.env). Antes estaba
 * escrito dentro de este archivo: cuando venció, el buscador de documento dejó
 * de funcionar y no había forma de cambiarlo sin tocar código.
 */
class ReniecController extends Controller
{
    public function buscar($doc)
    {
        $doc = preg_replace('/\D/', '', (string) $doc);

        if (! in_array(strlen($doc), [8, 11], true)) {
            return response()->json([
                'message' => 'El documento debe tener 8 dígitos (DNI) u 11 (RUC)',
            ], 422);
        }

        $esDni = strlen($doc) === 8;
        $token = config('services.apisperu.token');
        $base = rtrim(config('services.apisperu.url'), '/');

        if (! $token) {
            Log::warning('Consulta de documento sin token de apisperu configurado');

            return response()->json([
                'message' => 'La consulta de documentos no está configurada',
            ], 503);
        }

        try {
            $respuesta = Http::withoutVerifying()
                ->timeout(12)
                ->get("{$base}/" . ($esDni ? 'dni' : 'ruc') . "/{$doc}", ['token' => $token]);
        } catch (\Throwable $e) {
            Log::warning('No se pudo consultar el documento', ['doc' => $doc, 'error' => $e->getMessage()]);

            return response()->json([
                'message' => 'No se pudo conectar con el servicio de consulta',
            ], 504);
        }

        $data = $respuesta->json();

        // El servicio responde 200 con `success: false` cuando el documento no
        // existe o el token ya no vale, así que no basta con mirar el estado.
        if (! $respuesta->successful() || ! is_array($data) || ($data['success'] ?? true) === false) {
            return response()->json([
                'message' => $data['message'] ?? 'No se encontraron datos para este documento',
            ], $respuesta->successful() ? 404 : $respuesta->status());
        }

        // `nombre` es lo que usa el front, ya armado: para DNI son los tres
        // campos juntos y para RUC la razón social.
        $data['nombre'] = $esDni
            ? trim(($data['nombres'] ?? '') . ' ' . ($data['apellidoPaterno'] ?? '') . ' ' . ($data['apellidoMaterno'] ?? ''))
            : ($data['razonSocial'] ?? '');

        if ($data['nombre'] === '') {
            return response()->json([
                'message' => 'No se encontraron datos para este documento',
            ], 404);
        }

        return response()->json($data);
    }
}
