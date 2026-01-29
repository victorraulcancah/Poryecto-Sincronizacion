<?php

namespace App\Http\Controllers;

use App\Models\CookieConfiguracion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CookieConfiguracionController extends Controller
{
    /**
     * Obtener la configuración pública de cookies
     */
    public function getConfiguracionPublica()
    {
        $config = CookieConfiguracion::where('activo', true)->first();

        if (!$config) {
            // Retornar configuración por defecto si no existe
            return response()->json([
                'activo' => false,
                'mensaje' => 'Utilizamos cookies para mejorar tu experiencia en nuestro sitio web.',
                'boton_aceptar_texto' => 'Aceptar',
                'boton_rechazar_texto' => 'Rechazar',
                'boton_configurar_texto' => 'Configurar',
                'link_politica_texto' => 'Política de Cookies',
                'link_politica_url' => '/politica-cookies',
                'mostrar_boton_rechazar' => true,
                'mostrar_boton_configurar' => true,
                'posicion' => 'bottom'
            ]);
        }

        return response()->json($config);
    }

    /**
     * Obtener la configuración actual (admin)
     */
    public function index()
    {
        $config = CookieConfiguracion::first();

        if (!$config) {
            $config = CookieConfiguracion::create([
                'activo' => false,
                'mensaje' => 'Utilizamos cookies para mejorar tu experiencia en nuestro sitio web.',
            ]);
        }

        return response()->json($config);
    }

    /**
     * Actualizar la configuración
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'activo' => 'boolean',
            'mensaje' => 'nullable|string',
            'boton_aceptar_texto' => 'nullable|string|max:50',
            'boton_rechazar_texto' => 'nullable|string|max:50',
            'boton_configurar_texto' => 'nullable|string|max:50',
            'link_politica_texto' => 'nullable|string|max:100',
            'link_politica_url' => 'nullable|string|max:255',
            'mostrar_boton_rechazar' => 'boolean',
            'mostrar_boton_configurar' => 'boolean',
            'posicion' => 'nullable|in:bottom,top'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $config = CookieConfiguracion::first();

        if (!$config) {
            $config = CookieConfiguracion::create($request->all());
        } else {
            $config->update($request->all());
        }

        return response()->json([
            'message' => 'Configuración actualizada correctamente',
            'data' => $config
        ]);
    }
}
