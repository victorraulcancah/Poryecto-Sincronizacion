<?php

namespace App\Http\Controllers;

use App\Mail\EmailVerificationMail;
use App\Models\EmailTemplate;
use App\Models\User;
use App\Models\UserCliente;
use App\Models\UserMotorizado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    /**
     * Login unificado para usuarios admin y clientes
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $email = $request->email;
        $password = $request->password;

        // PASO 1: Intentar login como ADMIN primero
        if (Auth::guard('web')->attempt(['email' => $email, 'password' => $password])) {
            $user = Auth::guard('web')->user();

            // Verificar que el usuario esté habilitado
            if (! $user->is_enabled) {
                Auth::guard('web')->logout();

                return response()->json([
                    'message' => 'Usuario deshabilitado',
                    'errors' => ['email' => ['Tu cuenta está deshabilitada']],
                ], 401);
            }

            $token = $user->createToken('admin_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Login exitoso',
                'tipo_usuario' => 'admin',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ],
                'token' => $token,
            ]);
        }

        // PASO 2: Si no es admin, intentar login como CLIENTE
        $cliente = UserCliente::where('email', $email)->first();

        if ($cliente && Hash::check($password, $cliente->password)) {
            // Verificar que el cliente esté activo
            if (! $cliente->estado) {
                return response()->json([
                    'message' => 'Cuenta de cliente deshabilitada',
                    'errors' => ['email' => ['Tu cuenta está deshabilitada']],
                ], 401);
            }

            // NUEVO: Verificar si el email está verificado
            if (! $cliente->email_verified_at) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Debes verificar tu correo electrónico antes de iniciar sesión.',
                    'requires_verification' => true,
                ], 403);
            }

            $token = $cliente->createToken('cliente_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Login exitoso',
                'tipo_usuario' => 'cliente',
                'user' => [
                    'id' => $cliente->id,
                    'nombre_completo' => $cliente->nombre_completo,
                    'nombres' => $cliente->nombres,
                    'apellidos' => $cliente->apellidos,
                    'email' => $cliente->email,
                    'telefono' => $cliente->telefono,
                    'numero_documento' => $cliente->numero_documento,
                    'tipo_documento' => $cliente->tipoDocumento?->nombre,
                    'puede_facturar' => $cliente->puedeFacturar(),
                    'foto_url' => $cliente->foto_url,
                    'email_verified_at' => $cliente->email_verified_at,
                ],
                'token' => $token,
            ]);
        }

        // PASO 3: Intentar como MOTORIZADO
        $userMotorizado = UserMotorizado::where('username', $email)->first();

        if ($userMotorizado && Hash::check($password, $userMotorizado->password)) {
            // Verificar que el usuario motorizado esté activo
            if (! $userMotorizado->is_active) {
                return response()->json([
                    'message' => 'Usuario motorizado deshabilitado',
                    'errors' => ['email' => ['Tu usuario está deshabilitado']],
                ], 401);
            }

            // Verificar que el motorizado esté activo
            if (! $userMotorizado->motorizado->estado) {
                return response()->json([
                    'message' => 'Motorizado deshabilitado',
                    'errors' => ['email' => ['Tu cuenta de motorizado está deshabilitada']],
                ], 401);
            }

            // Actualizar último login
            $userMotorizado->actualizarUltimoLogin();

            $token = $userMotorizado->createToken('motorizado_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Login exitoso',
                'tipo_usuario' => 'motorizado',
                'user' => [
                    'id' => $userMotorizado->id,
                    'motorizado_id' => $userMotorizado->motorizado_id,
                    'username' => $userMotorizado->username,
                    'numero_unidad' => $userMotorizado->motorizado->numero_unidad,
                    'nombre_completo' => $userMotorizado->motorizado->nombre_completo,
                    'correo' => $userMotorizado->motorizado->correo,
                    'telefono' => $userMotorizado->motorizado->telefono,
                    'foto_perfil' => $userMotorizado->motorizado->foto_perfil,
                    'vehiculo_placa' => $userMotorizado->motorizado->vehiculo_placa,
                    'roles' => $userMotorizado->getRoleNames(),
                    'permissions' => $userMotorizado->getAllPermissions()->pluck('name'),
                    'estado_actual' => $userMotorizado->estado_actual,
                    'estadisticas' => $userMotorizado->estadisticasDelDia(),
                ],
                'token' => $token,
            ]);
        }

        // PASO 4: Si no encuentra en ninguna tabla
        return response()->json([
            'message' => 'Las credenciales proporcionadas son incorrectas.',
            'errors' => ['email' => ['Las credenciales proporcionadas son incorrectas.']],
        ], 401);
    }

    public function checkEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $emailExists = UserCliente::where('email', $request->email)->exists() ||
                      User::where('email', $request->email)->exists() ||
                      \App\Models\Motorizado::where('correo', $request->email)->exists();

        return response()->json([
            'exists' => $emailExists,
            'message' => $emailExists ? 'Este correo ya está registrado' : 'Correo disponible',
        ]);
    }

    /**
     * Verificar si el número de documento ya existe
     */
    public function checkDocumento(Request $request)
    {
        $request->validate([
            'numero_documento' => 'required|string',
        ]);

        $documentoExists = UserCliente::where('numero_documento', $request->numero_documento)->exists();

        return response()->json([
            'exists' => $documentoExists,
            'message' => $documentoExists ? 'Este número de documento ya está registrado' : 'Documento disponible',
        ]);
    }

    /**
     * Registro de nuevos clientes - FUNCIÓN COMPLETA ACTUALIZADA
     */
    /**
     * Registro de nuevos clientes - FUNCIÓN COMPLETA ACTUALIZADA
     */
    public function register(Request $request)
    {
        // LOG: Datos recibidos inicialmente
        Log::info('AuthController@register - Iniciando registro de cliente', [
            'request_data' => $request->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        Log::info('AuthController@register - Iniciando validación de datos');

        // Validaciones con mensajes personalizados
        $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'email' => 'required|email|unique:user_clientes,email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'telefono' => 'nullable|string|max:20',
            'tipo_documento_id' => 'required|exists:document_types,id',
            'numero_documento' => 'required|string|max:20|unique:user_clientes,numero_documento',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'genero' => 'nullable|in:masculino,femenino,otro',

            // Datos de dirección (opcional)
            'direccion_completa' => 'nullable|string',
            'ubigeo' => 'nullable|string|exists:ubigeo_inei,id_ubigeo',
        ], [
            // Mensajes personalizados
            'email.unique' => 'Este correo electrónico ya está registrado.',
            'numero_documento.unique' => 'Este número de documento ya está registrado.',
            'ubigeo.string' => 'El código de ubicación debe ser válido.',
            'ubigeo.exists' => 'La ubicación seleccionada no es válida.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'email.email' => 'Ingresa un correo electrónico válido.',
            'tipo_documento_id.exists' => 'El tipo de documento seleccionado no es válido.',
        ]);

        Log::info('AuthController@register - Validación exitosa');

        // Convertir ubigeo a string si viene como número
        $ubigeoOriginal = $request->ubigeo;
        $ubigeo = $request->ubigeo ? (string) $request->ubigeo : null;

        Log::debug('AuthController@register - Procesando ubigeo', [
            'ubigeo_original' => $ubigeoOriginal,
            'ubigeo_converted' => $ubigeo,
            'ubigeo_type' => gettype($ubigeo),
        ]);

        Log::info('AuthController@register - Iniciando transacción para crear cliente');

        try {

            $verificationToken = Str::random(60);
            $verificationCode = strtoupper(Str::random(6)); // Generar código de 6 caracteres

            Log::info('AuthController@register - Token de verificación generado', [
                'token_length' => strlen($verificationToken),
                'token_preview' => substr($verificationToken, 0, 10).'...',
            ]);

            Log::info('AuthController@register - Creando cliente en base de datos', [
                'nombres' => $request->nombres,
                'apellidos' => $request->apellidos,
                'email' => $request->email,
                'tipo_documento_id' => $request->tipo_documento_id,
                'numero_documento' => $request->numero_documento,
                'telefono' => $request->telefono,
                'fecha_nacimiento' => $request->fecha_nacimiento,
                'genero' => $request->genero,
                'has_password' => ! empty($request->password),
                'estado' => false,
            ]);

            // Crear cliente (INACTIVO hasta verificar email)
            // Crear cliente (INACTIVO hasta verificar email)
            $cliente = UserCliente::create([
                'nombres' => $request->nombres,
                'apellidos' => $request->apellidos,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'telefono' => $request->telefono,
                'tipo_documento_id' => $request->tipo_documento_id,
                'numero_documento' => $request->numero_documento,
                'fecha_nacimiento' => $request->fecha_nacimiento,
                'genero' => $request->genero,
                'estado' => false, // INACTIVO hasta verificar
                'verification_token' => $verificationToken,
                'verification_code' => $verificationCode, // NUEVO
            ]);

            Log::info('AuthController@register - Cliente creado exitosamente', [
                'cliente_id' => $cliente->id,
                'cliente_email' => $cliente->email,
                'cliente_estado' => $cliente->estado,
                'nombre_completo' => $cliente->nombre_completo,
                'verification_code' => $cliente->verification_code, // <-- aquí lo agregas
            ]);

            // Crear dirección si se proporciona
            if ($request->direccion_completa && $ubigeo) {
                Log::info('AuthController@register - Creando dirección del cliente', [
                    'cliente_id' => $cliente->id,
                    'direccion_completa' => $request->direccion_completa,
                    'id_ubigeo' => $ubigeo,
                    'nombre_destinatario' => $cliente->nombre_completo,
                ]);

                $direccion = $cliente->direcciones()->create([
                    'nombre_destinatario' => $cliente->nombre_completo,
                    'direccion_completa' => $request->direccion_completa,
                    'id_ubigeo' => $ubigeo,
                    'predeterminada' => true,
                    'activa' => true,
                ]);

                Log::info('AuthController@register - Dirección creada exitosamente', [
                    'direccion_id' => $direccion->id,
                    'direccion' => $direccion->toArray(),
                ]);
            } else {
                Log::info('AuthController@register - No se creará dirección', [
                    'has_direccion_completa' => ! empty($request->direccion_completa),
                    'has_ubigeo' => ! empty($ubigeo),
                    'direccion_completa' => $request->direccion_completa,
                    'ubigeo' => $ubigeo,
                ]);
            }

            // Crear URL de verificación
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
            $appUrl = env('APP_URL', 'http://localhost:8000');
            $verificationUrl = rtrim($appUrl, '/')."/api/verify-email-link?token={$verificationToken}&email=".urlencode($cliente->email);

            Log::info('AuthController@register - URL de verificación generada', [
                'frontend_url' => $frontendUrl,
                'verification_url' => $verificationUrl,
                'encoded_email' => urlencode($cliente->email),
            ]);

            Log::info('AuthController@register - Enviando correo de verificación', [
                'destinatario' => $cliente->email,
                'cliente_id' => $cliente->id,
            ]);

            // Obtener plantilla de verificación
            $template = EmailTemplate::where('name', 'verification')->where('is_active', true)->first();
            if (! $template) {
                // Crear plantilla por defecto si no existe
                $template = EmailTemplate::create([
                    'name' => 'verification',
                    'use_default' => true,
                    'is_active' => true,
                ]);
            }

            Mail::to($cliente->email)->send(new EmailVerificationMail($cliente, $verificationUrl, $verificationCode, $template));

            Log::info('AuthController@register - Correo de verificación enviado exitosamente');

            $responseData = [
                'status' => 'success',
                'message' => 'Cliente registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
                'requires_verification' => true,
                'user' => [
                    'id' => $cliente->id,
                    'nombre_completo' => $cliente->nombre_completo,
                    'nombres' => $cliente->nombres,
                    'apellidos' => $cliente->apellidos,
                    'email' => $cliente->email,
                    'telefono' => $cliente->telefono,
                    'numero_documento' => $cliente->numero_documento,
                    'tipo_documento' => $cliente->tipoDocumento?->nombre,
                ],
            ];

            Log::info('AuthController@register - Registro completado exitosamente', [
                'cliente_id' => $cliente->id,
                'response_data' => $responseData,
            ]);

            return response()->json($responseData, 201);

        } catch (\Exception $e) {
            Log::error('AuthController@register - Error durante el registro', [
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'message' => 'Error al registrar cliente',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener información del usuario autenticado (admin o cliente)
     */
    public function user(Request $request)
    {
        $user = $request->user();

        // Verificar si es un usuario admin o cliente
        if ($user instanceof User) {
            // Usuario admin
            return response()->json([
                'status' => 'success',
                'tipo_usuario' => 'admin',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ],
            ]);
        } elseif ($user instanceof UserCliente) {
            // Cliente del e-commerce
            return response()->json([
                'status' => 'success',
                'tipo_usuario' => 'cliente',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->nombre_completo,
                    'nombre_completo' => $user->nombre_completo,
                    'nombres' => $user->nombres,
                    'apellidos' => $user->apellidos,
                    'email' => $user->email,
                    'telefono' => $user->telefono,
                    'numero_documento' => $user->numero_documento,
                    'tipo_documento' => $user->tipoDocumento?->nombre,
                    'puede_facturar' => $user->puedeFacturar(),
                    'foto' => $user->foto,
                    'email_verified_at' => $user->email_verified_at,
                ],
            ]);
        } elseif ($user instanceof UserMotorizado) {
            // Motorizado del sistema de delivery
            return response()->json([
                'status' => 'success',
                'tipo_usuario' => 'motorizado',
                'user' => [
                    'id' => $user->id,
                    'motorizado_id' => $user->motorizado_id,
                    'username' => $user->username,
                    'numero_unidad' => $user->motorizado->numero_unidad,
                    'nombre_completo' => $user->motorizado->nombre_completo,
                    'correo' => $user->motorizado->correo,
                    'telefono' => $user->motorizado->telefono,
                    'foto_perfil' => $user->motorizado->foto_perfil,
                    'vehiculo_placa' => $user->motorizado->vehiculo_placa,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                    'estado_actual' => $user->estado_actual,
                    'estadisticas' => $user->estadisticasDelDia(),
                ],
            ]);
        }

        return response()->json(['message' => 'Usuario no válido'], 401);
    }

    /**
     * Logout unificado
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logout exitoso',
        ]);
    }

    /**
     * Refrescar permisos del usuario autenticado (solo admin)
     */
    public function refreshPermissions(Request $request)
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json(['message' => 'Solo usuarios admin pueden refrescar permisos'], 403);
        }

        $user->load('roles.permissions');

        return response()->json([
            'status' => 'success',
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }
}
