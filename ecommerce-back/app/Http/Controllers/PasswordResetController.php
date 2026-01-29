<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Models\UserCliente;
use Carbon\Carbon;
use App\Models\EmailTemplate;


class PasswordResetController extends Controller
{
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:user_clientes,email'
        ], [
            'email.required' => 'El correo electrónico es requerido',
            'email.email' => 'Debe ser un correo electrónico válido',
            'email.exists' => 'No encontramos una cuenta con este correo electrónico'
        ]);

        // Verificar si el usuario existe y está activo
        $user = UserCliente::where('email', $request->email)
                          ->where('estado', true)
                          ->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'La cuenta asociada a este correo no está activa'
            ], 422);
        }

        // Generar token único
        $token = Str::random(60);

        // Eliminar tokens anteriores para este email
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        // Crear nuevo token
        DB::table('password_reset_tokens')->insert([
            'email' => $request->email,
            'token' => Hash::make($token),
            'created_at' => Carbon::now()
        ]);

        // Enviar correo
        $this->sendResetEmail($user, $token);

        return response()->json([
            'status' => 'success',
            'message' => 'Se ha enviado un enlace de recuperación a tu correo electrónico'
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ], [
            'token.required' => 'Token de recuperación requerido',
            'email.required' => 'Correo electrónico requerido',
            'email.email' => 'Debe ser un correo electrónico válido',
            'password.required' => 'La contraseña es requerida',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden'
        ]);

        // Buscar token en la base de datos
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token de recuperación inválido'
            ], 422);
        }

        // Verificar si el token ha expirado (1 hora)
        if (Carbon::parse($resetRecord->created_at)->addHour()->isPast()) {
            DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->delete();
                
            return response()->json([
                'status' => 'error',
                'message' => 'El token de recuperación ha expirado'
            ], 422);
        }

        // Verificar token
        if (!Hash::check($request->token, $resetRecord->token)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token de recuperación inválido'
            ], 422);
        }

        // Actualizar contraseña del usuario
        $user = UserCliente::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Usuario no encontrado'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Eliminar token usado
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Contraseña restablecida exitosamente'
        ]);
    }

    public function verifyResetToken(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email'
        ]);

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'status' => 'error',
                'valid' => false,
                'message' => 'Token inválido'
            ]);
        }

        // Verificar si ha expirado
        if (Carbon::parse($resetRecord->created_at)->addHour()->isPast()) {
            DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->delete();
                
            return response()->json([
                'status' => 'error',
                'valid' => false,
                'message' => 'Token expirado'
            ]);
        }

        // Verificar token
        if (!Hash::check($request->token, $resetRecord->token)) {
            return response()->json([
                'status' => 'error',
                'valid' => false,
                'message' => 'Token inválido'
            ]);
        }

        return response()->json([
            'status' => 'success',
            'valid' => true
        ]);
    }

    // REEMPLAZAR completamente el método sendResetEmail:
    private function sendResetEmail($user, $token)
    {
        $frontendUrl = config('app.frontend_url');
        
        if (!$frontendUrl) {
            throw new \Exception('FRONTEND_URL no está configurada correctamente');
        }
        
        $resetUrl = $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        
        // Obtener plantilla de reset password
        $template = EmailTemplate::where('name', 'password_reset')->where('is_active', true)->first();
        if (!$template) {
            $template = EmailTemplate::create([
                'name' => 'password_reset',
                'use_default' => true,
                'is_active' => true
            ]);
        }

        Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($user, $resetUrl, $template));
    }

}
