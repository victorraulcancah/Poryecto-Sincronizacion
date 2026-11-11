<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use App\Models\UserCliente;
use App\Support\SesionUnica;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * "Continuar con Google" desde el app móvil.
 *
 * La web usa un redirect (Socialite) que el app no puede seguir. Aquí el app
 * inicia sesión con Google en el teléfono, recibe un `id_token` y lo manda a
 * este endpoint; el servidor lo valida con Google, busca o crea al cliente
 * (igual que el callback de la web) y devuelve la misma respuesta que `/login`.
 */
class GoogleMobileAuthController extends Controller
{
    private const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

    public function login(Request $request): JsonResponse
    {
        $request->validate(['id_token' => 'required|string|max:4096']);

        $google = $this->validarToken($request->string('id_token')->toString());
        if ($google === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'No pudimos validar tu cuenta de Google. Intenta de nuevo.',
            ], 401);
        }

        $email = strtolower($google['email']);
        $cliente = UserCliente::where('email', $email)->first();
        $esNuevo = false;

        if (! $cliente) {
            $cliente = UserCliente::create([
                'nombres' => $google['name'] ?? 'Usuario',
                'apellidos' => 'Google',
                'email' => $email,
                'password' => bcrypt(bin2hex(random_bytes(16))),
                'tipo_documento_id' => 1,
                'numero_documento' => 'GOOGLE_'.time(),
                'estado' => true,
                'email_verified_at' => now(), // Google ya verificó el correo
                'is_first_google_login' => true,
                'foto' => null,
            ]);
            $esNuevo = true;
        } elseif (! $cliente->email_verified_at) {
            // Un correo que Google confirma queda verificado.
            $cliente->update(['email_verified_at' => now()]);
            $esNuevo = true;
        }

        if (! $cliente->estado) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cuenta de cliente deshabilitada',
                'errors' => ['email' => ['Tu cuenta está deshabilitada']],
            ], 401);
        }

        if ($esNuevo) {
            try {
                Mail::to($cliente->email)->send(new WelcomeEmail($cliente));
            } catch (\Throwable $e) {
                // El correo de bienvenida no debe impedir entrar.
                Log::warning('Google móvil: no se envió el correo de bienvenida: '.$e->getMessage());
            }
        }

        $token = SesionUnica::abrir($cliente, 'cliente_token');

        return response()->json([
            'status' => 'success',
            'message' => 'Login exitoso',
            'tipo_usuario' => 'cliente',
            'es_nuevo' => $esNuevo,
            'user' => [
                'id' => $cliente->id,
                'nombre_completo' => $cliente->nombre_completo,
                'nombres' => $cliente->nombres,
                'apellidos' => $cliente->apellidos,
                'email' => $cliente->email,
                'telefono' => $cliente->telefono,
                'numero_documento' => $cliente->numero_documento,
                'tipo_documento' => $cliente->tipoDocumento?->nombre,
                'foto_url' => $cliente->foto_url,
                'email_verified_at' => $cliente->email_verified_at,
                'codigo_erp' => $cliente->codigo_erp,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Valida el `id_token` con Google y devuelve sus datos (email, nombre...), o
     * null si no es válido: firma o vencimiento incorrectos, otra aplicación o un
     * correo que Google no verificó.
     *
     * @return array{email: string, name?: string}|null
     */
    private function validarToken(string $idToken): ?array
    {
        try {
            $respuesta = Http::timeout(8)->get(self::TOKENINFO_URL, ['id_token' => $idToken]);
        } catch (\Throwable $e) {
            Log::warning('Google móvil: no se pudo consultar tokeninfo: '.$e->getMessage());

            return null;
        }

        if (! $respuesta->successful()) {
            return null;
        }

        $datos = $respuesta->json();
        $emisor = $datos['iss'] ?? '';

        $valido = in_array($emisor, ['accounts.google.com', 'https://accounts.google.com'], true)
            && in_array($datos['aud'] ?? null, $this->audienciasPermitidas(), true)
            && filter_var($datos['email'] ?? null, FILTER_VALIDATE_EMAIL)
            && filter_var($datos['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)
            && (int) ($datos['exp'] ?? 0) > time();

        return $valido ? $datos : null;
    }

    /**
     * Las aplicaciones de Google a las que se les acepta el token: el cliente
     * "web" que ya usa el login de la web y, si se configuran, los de las apps.
     *
     * @return list<string>
     */
    private function audienciasPermitidas(): array
    {
        return array_values(array_filter([
            config('services.google.client_id'),
            ...(config('services.google.mobile_client_ids') ?? []),
        ]));
    }
}
