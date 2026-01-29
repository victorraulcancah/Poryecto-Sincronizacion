<?php

namespace App\Http\Controllers\Facturacion;

use App\Models\EmpresaInfo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;

class EmpresaEmisoraController extends BaseController
{
    /**
     * Obtener configuración de la empresa emisora
     */
    public function show(): JsonResponse
    {
        $empresa = EmpresaInfo::first();
        
        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró información de la empresa'
            ], 404);
        }

        // Ocultar información sensible
        $empresaData = $empresa->toArray();
        unset($empresaData['sol_clave']); // No exponer la clave del SOL

        return response()->json([
            'success' => true,
            'data' => $empresaData
        ]);
    }

    /**
     * Actualizar configuración de la empresa emisora
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'ruc' => 'required|string|size:11',
            'razon_social' => 'required|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'direccion' => 'required|string|max:500',
            'ubigeo' => 'nullable|string|size:6',
            'departamento' => 'nullable|string|max:50',
            'provincia' => 'nullable|string|max:50',
            'distrito' => 'nullable|string|max:50',
            'urbanizacion' => 'nullable|string|max:100',
            'codigo_local' => 'nullable|string|max:4',
            'email' => 'required|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'sol_usuario' => 'required|string|max:50',
            'sol_clave' => 'nullable|string|max:255',
            'sol_endpoint' => 'required|in:beta,prod'
        ]);

        $empresa = EmpresaInfo::first();
        
        if (!$empresa) {
            $empresa = new EmpresaInfo();
        }

        $data = $request->only([
            'ruc', 'razon_social', 'nombre_comercial', 'direccion',
            'ubigeo', 'departamento', 'provincia', 'distrito',
            'urbanizacion', 'codigo_local', 'email', 'telefono',
            'sol_usuario', 'sol_endpoint'
        ]);

        // Si se proporciona una nueva clave, encriptarla (usar encrypt en lugar de hash)
        // Encrypt es reversible, necesario para enviar a SUNAT
        if ($request->filled('sol_clave')) {
            $data['sol_clave'] = encrypt($request->sol_clave);
        }

        $empresa->fill($data);
        $empresa->save();

        // Ocultar información sensible en la respuesta
        $empresaData = $empresa->toArray();
        unset($empresaData['sol_clave']);

        return response()->json([
            'success' => true,
            'data' => $empresaData,
            'message' => 'Configuración de empresa actualizada exitosamente'
        ]);
    }

    /**
     * Validar configuración de la empresa
     */
    public function validar(): JsonResponse
    {
        $empresa = EmpresaInfo::first();
        
        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró información de la empresa',
                'errores' => ['empresa' => 'No configurada']
            ], 400);
        }

        $errores = [];
        $advertencias = [];

        // Validaciones obligatorias
        if (empty($empresa->ruc)) {
            $errores['ruc'] = 'RUC es obligatorio';
        } elseif (strlen($empresa->ruc) !== 11) {
            $errores['ruc'] = 'RUC debe tener 11 dígitos';
        }

        if (empty($empresa->razon_social)) {
            $errores['razon_social'] = 'Razón social es obligatoria';
        }

        if (empty($empresa->direccion)) {
            $errores['direccion'] = 'Dirección es obligatoria';
        }

        if (empty($empresa->email)) {
            $errores['email'] = 'Email es obligatorio';
        } elseif (!filter_var($empresa->email, FILTER_VALIDATE_EMAIL)) {
            $errores['email'] = 'Email no es válido';
        }

        if (empty($empresa->sol_usuario)) {
            $errores['sol_usuario'] = 'Usuario SOL es obligatorio';
        }

        if (empty($empresa->sol_clave)) {
            $errores['sol_clave'] = 'Clave SOL es obligatoria';
        }

        // Advertencias
        if (empty($empresa->ubigeo)) {
            $advertencias['ubigeo'] = 'Ubigeo no configurado';
        }

        if (empty($empresa->telefono)) {
            $advertencias['telefono'] = 'Teléfono no configurado';
        }

        if ($empresa->sol_endpoint === 'beta') {
            $advertencias['sol_endpoint'] = 'Está usando el entorno de pruebas (beta)';
        }

        $tieneErrores = count($errores) > 0;

        return response()->json([
            'success' => !$tieneErrores,
            'message' => $tieneErrores ? 'Configuración incompleta' : 'Configuración válida',
            'errores' => $errores,
            'advertencias' => $advertencias,
            'configuracion_completa' => !$tieneErrores
        ], $tieneErrores ? 400 : 200);
    }

    /**
     * Obtener información pública de la empresa (sin datos sensibles)
     */
    public function infoPublica(): JsonResponse
    {
        $empresa = EmpresaInfo::first();
        
        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró información de la empresa'
            ], 404);
        }

        $data = [
            'ruc' => $empresa->ruc,
            'razon_social' => $empresa->razon_social,
            'nombre_comercial' => $empresa->nombre_comercial,
            'direccion' => $empresa->direccion,
            'departamento' => $empresa->departamento,
            'provincia' => $empresa->provincia,
            'distrito' => $empresa->distrito,
            'email' => $empresa->email,
            'telefono' => $empresa->telefono
        ];

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }
}


