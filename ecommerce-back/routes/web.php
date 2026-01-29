<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Models\User;
use App\Models\UserCliente;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use App\Http\Controllers\UsuariosController;
use Illuminate\Support\Facades\Mail;
use App\Mail\WelcomeEmail;
use App\Http\Controllers\EmailVerificationController;
use Illuminate\Support\Facades\Log; 

Route::get('/', function () {
    return view('welcome');
});



// Agrupamos rutas con middleware de autenticación y rol (editado)
Route::middleware(['auth:sanctum', 'role:superadmin,admin'])->group(function () { // <-- agregado grupo middleware
    Route::get('/usuarios', [UsuariosController::class, 'index']); // <-- ruta protegida de usuarios (editado)
});

Route::get('/auth/google', function(){
    try {
        Log::info('=== INICIO REDIRECT GOOGLE ===');
        Log::info('Variables de entorno:', [
            'GOOGLE_CLIENT_ID' => env('GOOGLE_CLIENT_ID') ? 'SET' : 'NOT SET',
            'GOOGLE_CLIENT_SECRET' => env('GOOGLE_CLIENT_SECRET') ? 'SET' : 'NOT SET', 
            'GOOGLE_REDIRECT_URI' => env('GOOGLE_REDIRECT_URI'),
            'APP_URL' => env('APP_URL')
        ]);
        
        $redirect = Socialite::driver('google')->redirect();
        Log::info('Redirect creado exitosamente');
        return $redirect;
        
    } catch (\Exception $e) {
        Log::error('ERROR EN GOOGLE REDIRECT:', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        
        return response()->json(['error' => $e->getMessage()], 500);
    }
})->name('google.login');

Route::get('/auth/google/callback', function() {
    Log::info('=== CALLBACK GOOGLE INICIADO ===');
    
    try {
        Log::info('Obteniendo usuario de Google...');
        $googleUser = Socialite::driver('google')->user();
        Log::info('Usuario obtenido:', ['email' => $googleUser->getEmail()]);

        // Buscar en la tabla user_clientes
        $userCliente = UserCliente::where('email', $googleUser->getEmail())->first();

        $isNewUser = false;
        
        if(!$userCliente) {
            Log::info('Creando nuevo usuario...');
            // Crear nuevo cliente con datos de Google
            $userCliente = UserCliente::create([
                'nombres' => $googleUser->getName() ?: 'Usuario',
                'apellidos' => 'Google',
                'email' => $googleUser->getEmail(),
                'password' => bcrypt(uniqid()),
                'tipo_documento_id' => 1,
                'numero_documento' => 'GOOGLE_' . time(),
                'estado' => true,
                'email_verified_at' => now(), // Google users are pre-verified
                'is_first_google_login' => true,
                'foto' => null,
            ]);
            
            $isNewUser = true;
            Log::info('Usuario creado con ID: ' . $userCliente->id);
        } else {
            Log::info('Usuario existente encontrado: ' . $userCliente->id);
            // Verificar si es el primer login con Google
            if (!$userCliente->email_verified_at) {
                $userCliente->update([
                    'email_verified_at' => now(),
                    'estado' => true
                ]);
                $isNewUser = true;
            }
        }

        // Enviar correo de bienvenida solo si es nuevo usuario o primer login
        if ($isNewUser) {
            Log::info('Enviando email de bienvenida...');
            try {
                Mail::to($userCliente->email)->send(new WelcomeEmail($userCliente));
                Log::info('Email enviado correctamente');
            } catch (Exception $mailError) {
                Log::warning('Error enviando email: ' . $mailError->getMessage());
                // No fallar por el email, continuar con el login
            }
        }

        // Crear token para el cliente
        Log::info('Creando token de autenticación...');
        $token = $userCliente->createToken('auth_token')->plainTextToken;

        // Preparar datos de respuesta
        $userData = [
            'id' => $userCliente->id,
            'nombre_completo' => $userCliente->nombre_completo,
            'email' => $userCliente->email,
            'nombres' => $userCliente->nombres,
            'apellidos' => $userCliente->apellidos,
            'telefono' => $userCliente->telefono,
            'foto' => $userCliente->foto_url,
            'roles' => [],
            'permissions' => [],
            'email_verified_at' => $userCliente->email_verified_at
        ];

        // Construir URL de redirección con datos
        $frontendUrl = env('FRONTEND_URL');
        $redirectUrl = $frontendUrl . '?token=' . $token . '&user=' . urlencode(json_encode($userData)) . '&tipo_usuario=cliente';
        
        Log::info('Redirigiendo al frontend:', ['url' => $redirectUrl]);
        
        return redirect($redirectUrl);

    } catch (Exception $e) {
        Log::error('ERROR EN CALLBACK:', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        
        return redirect(env('FRONTEND_URL') . '/account?error=auth_processing_failed&details=' . urlencode($e->getMessage()));
    }
});

Route::get('/verify-email-link', [EmailVerificationController::class, 'verifyByLink']);


