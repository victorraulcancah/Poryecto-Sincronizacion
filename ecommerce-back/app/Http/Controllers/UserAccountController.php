<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class UserAccountController extends Controller
{
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'La contraseña actual es incorrecta',
                'errors' => ['current_password' => ['La contraseña actual es incorrecta']],
            ], 422);
        }

        $user->update(['password' => $request->new_password]);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada correctamente',
        ]);
    }

    public function actualizarTelefono(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'telefono' => ['required', 'string', 'regex:/^9[0-9]{8}$/'],
        ], [
            'telefono.regex' => 'Ingresa un celular peruano válido (9 dígitos, empieza con 9).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $user->update(['telefono' => $request->telefono]);

        return response()->json([
            'success' => true,
            'message' => 'Celular actualizado correctamente',
            'telefono' => $user->telefono,
        ]);
    }
}
