<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Habla con el microservicio propio de WhatsApp (whatsapp-service/, Baileys),
 * nunca con WhatsApp directamente — mismo mecanismo que ya usa "bautista".
 *
 * No usa ninguna API paga (Twilio/Meta): el microservicio se vincula
 * escaneando un QR con el celular de la tienda, como WhatsApp Web.
 *
 * `enviar()` nunca lanza excepción: un fallo de WhatsApp no debe tumbar el
 * flujo que lo llama (el checkout ya respondió, esto va en un Job aparte).
 */
class WhatsAppService
{
    public function enviar(string $telefono, string $mensaje): bool
    {
        if (! config('whatsapp.habilitado')) {
            Log::info('WhatsApp deshabilitado, no se envía.', ['telefono' => $telefono]);
            return false;
        }

        try {
            $response = Http::withHeaders(['X-Token' => config('whatsapp.token')])
                ->timeout((int) config('whatsapp.timeout', 10))
                ->post(rtrim(config('whatsapp.url'), '/') . '/enviar', [
                    'telefono' => $telefono,
                    'mensaje' => $mensaje,
                ]);

            if (! $response->successful()) {
                Log::error('Error al encolar WhatsApp', [
                    'telefono' => $telefono,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Excepción al enviar WhatsApp: ' . $e->getMessage(), ['telefono' => $telefono]);
            return false;
        }
    }

    /** Estado de conexión del microservicio (para un panel de vinculación). */
    public function estado(): array
    {
        try {
            $response = Http::timeout((int) config('whatsapp.timeout', 10))
                ->get(rtrim(config('whatsapp.url'), '/') . '/estado');

            return $response->successful()
                ? $response->json()
                : ['estado' => 'error', 'error' => $response->body()];
        } catch (\Throwable $e) {
            return ['estado' => 'error', 'error' => $e->getMessage()];
        }
    }

    /** Cierra la sesión vinculada y fuerza un QR nuevo. */
    public function desvincular(): bool
    {
        try {
            $response = Http::withHeaders(['X-Token' => config('whatsapp.token')])
                ->timeout((int) config('whatsapp.timeout', 10))
                ->post(rtrim(config('whatsapp.url'), '/') . '/desvincular');

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('Excepción al desvincular WhatsApp: ' . $e->getMessage());
            return false;
        }
    }
}
