<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use App\Models\DocumentType;

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
     * Guarda/actualiza el DNI del cliente para poder pedir Boleta.
     * Algunos clientes se registran solo con RUC (cuenta empresarial); si luego
     * quieren Boleta, deben poder registrar y guardar su DNI aquí mismo.
     */
    public function actualizarDocumentoBoleta(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'numero_documento' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
        ], [
            'numero_documento.regex' => 'Ingresa un DNI válido de 8 dígitos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $tipoDocumentoDni = DocumentType::where('nombre', 'DNI')->first();

        $user->update([
            'numero_documento' => $request->numero_documento,
            'tipo_documento_id' => $tipoDocumentoDni?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'DNI guardado correctamente',
            'numero_documento' => $user->numero_documento,
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
