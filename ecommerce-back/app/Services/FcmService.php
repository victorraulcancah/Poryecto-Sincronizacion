<?php

namespace App\Services;

use App\Models\DispositivoCliente;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Notificaciones push a los teléfonos de los clientes con Firebase Cloud
 * Messaging (API HTTP v1).
 *
 * Se configura con la "cuenta de servicio" del proyecto de Firebase: un archivo
 * JSON cuya ruta se indica en `FCM_CREDENTIALS` (.env). Sin ese archivo el
 * servicio no hace nada, y el resto del sistema sigue igual.
 */
class FcmService
{
    private const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const CACHE_KEY = 'fcm.access_token';

    /** @var array{client_email: string, private_key: string, project_id: string}|null|false */
    private $credenciales = false;

    /** Hay una cuenta de servicio válida configurada. */
    public function configurado(): bool
    {
        return $this->credenciales() !== null;
    }

    /**
     * Manda la notificación a todos los teléfonos del cliente.
     *
     * @param  array<string, scalar>  $data  Datos para que el app sepa qué abrir.
     * @return int Cuántos teléfonos la recibieron.
     */
    public function enviarACliente(int $clienteId, string $titulo, string $cuerpo, array $data = []): int
    {
        if (! $this->configurado()) {
            return 0;
        }

        $enviados = 0;
        foreach (DispositivoCliente::where('user_cliente_id', $clienteId)->get() as $dispositivo) {
            if ($this->enviar($dispositivo, $titulo, $cuerpo, $data)) {
                $enviados++;
            }
        }

        return $enviados;
    }

    private function enviar(DispositivoCliente $dispositivo, string $titulo, string $cuerpo, array $data): bool
    {
        $accessToken = $this->accessToken();
        if ($accessToken === null) {
            return false;
        }

        $mensaje = [
            'token' => $dispositivo->token,
            'notification' => ['title' => $titulo, 'body' => $cuerpo],
            // Firebase solo acepta textos en `data`.
            'data' => array_map('strval', $data),
            'android' => ['priority' => 'HIGH'],
        ];

        try {
            $respuesta = Http::withToken($accessToken)->timeout(10)->post(
                'https://fcm.googleapis.com/v1/projects/'.$this->credenciales()['project_id'].'/messages:send',
                ['message' => $mensaje],
            );
        } catch (\Throwable $e) {
            Log::warning('FCM: no se pudo enviar: '.$e->getMessage());

            return false;
        }

        if ($respuesta->successful()) {
            return true;
        }

        // El teléfono ya no existe (se desinstaló el app o venció el token): se
        // olvida para no seguir intentando.
        $estado = $respuesta->json('error.status');
        if ($respuesta->status() === 404 || $estado === 'NOT_FOUND' || $estado === 'UNREGISTERED') {
            $dispositivo->delete();
        } else {
            Log::warning('FCM: respuesta inesperada', ['status' => $respuesta->status(), 'body' => $respuesta->body()]);
        }

        return false;
    }

    /** Token de acceso de Google para llamar a FCM (dura una hora; se reutiliza). */
    private function accessToken(): ?string
    {
        $guardado = Cache::get(self::CACHE_KEY);
        if (is_string($guardado) && $guardado !== '') {
            return $guardado;
        }

        $jwt = $this->firmarJwt();
        if ($jwt === null) {
            return null;
        }

        try {
            $respuesta = Http::asForm()->timeout(10)->post(self::TOKEN_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);
        } catch (\Throwable $e) {
            Log::warning('FCM: no se pudo obtener el token de acceso: '.$e->getMessage());

            return null;
        }

        $token = $respuesta->json('access_token');
        if (! $respuesta->successful() || ! is_string($token)) {
            Log::warning('FCM: Google rechazó la cuenta de servicio', ['status' => $respuesta->status()]);

            return null;
        }

        // Se guarda un poco menos de lo que dura, para no usarlo vencido.
        Cache::put(self::CACHE_KEY, $token, max(60, ((int) $respuesta->json('expires_in', 3600)) - 300));

        return $token;
    }

    /** El JWT (RS256) con el que la cuenta de servicio pide su token de acceso. */
    private function firmarJwt(): ?string
    {
        $c = $this->credenciales();
        if ($c === null) {
            return null;
        }

        $ahora = time();
        $partes = [
            $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->base64Url(json_encode([
                'iss' => $c['client_email'],
                'scope' => self::SCOPE,
                'aud' => self::TOKEN_URL,
                'iat' => $ahora,
                'exp' => $ahora + 3600,
            ])),
        ];

        $firma = '';
        if (! openssl_sign(implode('.', $partes), $firma, $c['private_key'], OPENSSL_ALGO_SHA256)) {
            Log::warning('FCM: la llave privada de la cuenta de servicio no sirve.');

            return null;
        }

        return implode('.', $partes).'.'.$this->base64Url($firma);
    }

    private function base64Url(string $datos): string
    {
        return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
    }

    /** @return array{client_email: string, private_key: string, project_id: string}|null */
    private function credenciales(): ?array
    {
        if ($this->credenciales !== false) {
            return $this->credenciales;
        }

        $ruta = config('services.fcm.credentials');
        $json = is_string($ruta) && $ruta !== '' && is_file($ruta)
            ? json_decode((string) file_get_contents($ruta), true)
            : null;

        $this->credenciales = is_array($json)
            && ! empty($json['client_email'])
            && ! empty($json['private_key'])
            && ! empty($json['project_id'])
            ? [
                'client_email' => $json['client_email'],
                'private_key' => $json['private_key'],
                'project_id' => $json['project_id'],
            ]
            : null;

        return $this->credenciales;
    }
}
