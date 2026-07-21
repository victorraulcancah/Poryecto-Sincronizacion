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

    /**
     * Guarda/actualiza el RUC y razón social del cliente para poder pedir Factura.
     * Se guarda por separado del DNI (numero_documento), ya que un mismo cliente
     * puede pedir Boleta (con su DNI) o Factura (con su RUC) según le convenga.
     */
    public function actualizarFacturacion(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ruc' => ['required', 'string', 'regex:/^[0-9]{11}$/'],
            'razon_social' => ['required', 'string', 'max:255'],
        ], [
            'ruc.regex' => 'Ingresa un RUC válido de 11 dígitos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if ($user->cliente_facturacion_id) {
            $user->clienteFacturacion->update([
                'tipo_documento' => '6',
                'numero_documento' => $request->ruc,
                'razon_social' => $request->razon_social,
            ]);
            $clienteFacturacion = $user->clienteFacturacion->fresh();
        } else {
            $clienteFacturacion = $user->crearClienteFacturacion([
                'tipo_documento' => '6',
                'numero_documento' => $request->ruc,
                'razon_social' => $request->razon_social,
                'direccion' => optional($user->direccionPredeterminada)->direccion_completa ?? '',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos de facturación guardados correctamente',
            'ruc' => $clienteFacturacion->numero_documento,
            'razon_social' => $clienteFacturacion->razon_social,
        ]);
    }
}
