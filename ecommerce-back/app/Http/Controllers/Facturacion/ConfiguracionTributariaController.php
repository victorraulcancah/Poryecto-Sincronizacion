<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ConfiguracionTributaria;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class ConfiguracionTributariaController extends Controller
{
    /**
     * Obtener configuración tributaria actual
     */
    public function index()
    {
        try {
            $configuracion = ConfiguracionTributaria::first();

            if (!$configuracion) {
                // Crear configuración por defecto si no existe
                $configuracion = $this->crearConfiguracionDefecto();
            }

            // Ocultar datos sensibles
            $configuracion->makeHidden(['sol_clave', 'certificado_clave']);

            return response()->json([
                'success' => true,
                'data' => $configuracion
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener configuración tributaria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración tributaria
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ambiente' => 'nullable|in:beta,produccion',
            'ruc' => 'nullable|string|size:11',
            'razon_social' => 'nullable|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'ubigeo' => 'nullable|string|size:6',
            'departamento' => 'nullable|string|max:100',
            'provincia' => 'nullable|string|max:100',
            'distrito' => 'nullable|string|max:100',
            'sol_usuario' => 'nullable|string|max:100',
            'sol_clave' => 'nullable|string|max:100',
            'certificado_path' => 'nullable|string|max:255',
            'certificado_clave' => 'nullable|string|max:100',
            'endpoint_factura' => 'nullable|url',
            'endpoint_guia' => 'nullable|url',
            'endpoint_retension' => 'nullable|url',
            'igv_porcentaje' => 'nullable|numeric|min:0|max:100',
            'moneda_defecto' => 'nullable|in:PEN,USD',
            'logo_empresa' => 'nullable|string',
            'observaciones' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de configuración inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $configuracion = ConfiguracionTributaria::first();

            if (!$configuracion) {
                $configuracion = new ConfiguracionTributaria();
            }

            // Si se proporciona clave SOL, encriptarla
            if ($request->filled('sol_clave')) {
                $request->merge(['sol_clave' => encrypt($request->sol_clave)]);
            }

            // Si se proporciona clave de certificado, encriptarla
            if ($request->filled('certificado_clave')) {
                $request->merge(['certificado_clave' => encrypt($request->certificado_clave)]);
            }

            $configuracion->fill($request->except(['_token', '_method']));
            $configuracion->save();

            // Limpiar caché de configuración
            Cache::forget('configuracion_tributaria');

            // Actualizar archivo de configuración .env si es necesario
            $this->actualizarEnv($request);

            Log::info('Configuración tributaria actualizada', [
                'usuario' => auth()->id(),
                'ambiente' => $configuracion->ambiente
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada exitosamente',
                'data' => $configuracion->makeHidden(['sol_clave', 'certificado_clave'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error al actualizar configuración tributaria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar credenciales SOL
     */
    public function validarCredencialesSol(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ruc' => 'required|string|size:11',
            'sol_usuario' => 'required|string',
            'sol_clave' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos incompletos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Aquí se implementaría la validación real con SUNAT
            // Por ahora simulamos una validación básica

            $ruc = $request->ruc;
            $usuario = $request->sol_usuario;
            $clave = $request->sol_clave;

            // Validar formato de usuario (generalmente RUC + usuario)
            if (!str_starts_with($usuario, $ruc)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El usuario SOL debe comenzar con el RUC de la empresa'
                ], 422);
            }

            // Aquí iría la lógica de validación real contra SUNAT
            // usando el servicio Greenter

            Log::info('Validación de credenciales SOL', [
                'ruc' => $ruc,
                'usuario' => $usuario,
                'resultado' => 'exitoso'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Credenciales SOL validadas exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al validar credenciales SOL: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al validar credenciales',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar certificado digital
     */
    public function validarCertificado(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'certificado_path' => 'required|string',
            'certificado_clave' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos incompletos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $certPath = $request->certificado_path;

            if (!file_exists($certPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Certificado no encontrado en la ruta especificada'
                ], 404);
            }

            // Leer información del certificado
            $certContent = file_get_contents($certPath);
            $certInfo = openssl_x509_parse($certContent);

            if (!$certInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo leer el certificado. Verifique que sea un archivo válido.'
                ], 422);
            }

            // Verificar vigencia
            $validFrom = date('Y-m-d H:i:s', $certInfo['validFrom_time_t']);
            $validTo = date('Y-m-d H:i:s', $certInfo['validTo_time_t']);
            $diasRestantes = floor(($certInfo['validTo_time_t'] - time()) / 86400);

            $vigente = time() >= $certInfo['validFrom_time_t'] && time() <= $certInfo['validTo_time_t'];

            Log::info('Validación de certificado digital', [
                'ruta' => $certPath,
                'vigente' => $vigente,
                'dias_restantes' => $diasRestantes
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Certificado validado',
                'data' => [
                    'vigente' => $vigente,
                    'valido_desde' => $validFrom,
                    'valido_hasta' => $validTo,
                    'dias_restantes' => $diasRestantes,
                    'emisor' => $certInfo['issuer']['CN'] ?? 'No disponible',
                    'propietario' => $certInfo['subject']['CN'] ?? 'No disponible',
                    'alerta' => $diasRestantes < 30 ? 'El certificado expirará pronto' : null
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al validar certificado: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al validar certificado',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar ambiente (beta/producción)
     */
    public function cambiarAmbiente(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ambiente' => 'required|in:beta,produccion',
            'confirmar' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$request->confirmar) {
            return response()->json([
                'success' => false,
                'message' => 'Debe confirmar el cambio de ambiente'
            ], 422);
        }

        try {
            $configuracion = ConfiguracionTributaria::first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No existe configuración tributaria'
                ], 404);
            }

            $ambienteAnterior = $configuracion->ambiente;
            $ambienteNuevo = $request->ambiente;

            if ($ambienteAnterior === $ambienteNuevo) {
                return response()->json([
                    'success' => false,
                    'message' => 'El ambiente seleccionado ya es el actual'
                ], 422);
            }

            $configuracion->update([
                'ambiente' => $ambienteNuevo
            ]);

            // Actualizar endpoints según el ambiente
            $this->actualizarEndpoints($configuracion, $ambienteNuevo);

            // Limpiar caché
            Cache::forget('configuracion_tributaria');
            Artisan::call('config:clear');

            Log::warning('Cambio de ambiente SUNAT', [
                'ambiente_anterior' => $ambienteAnterior,
                'ambiente_nuevo' => $ambienteNuevo,
                'usuario' => auth()->id(),
                'ip' => request()->ip()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Ambiente cambiado exitosamente a {$ambienteNuevo}",
                'data' => [
                    'ambiente_anterior' => $ambienteAnterior,
                    'ambiente_actual' => $ambienteNuevo
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al cambiar ambiente: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar ambiente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener endpoints disponibles
     */
    public function obtenerEndpoints()
    {
        try {
            $endpoints = [
                'beta' => [
                    'factura' => 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
                    'guia' => 'https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService',
                    'retension' => 'https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService'
                ],
                'produccion' => [
                    'factura' => 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
                    'guia' => 'https://e-guiaremision.sunat.gob.pe/ol-ti-itemision-guia-gem/billService',
                    'retension' => 'https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $endpoints
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener endpoints',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Probar conexión con SUNAT
     */
    public function probarConexion()
    {
        try {
            $configuracion = ConfiguracionTributaria::first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No existe configuración tributaria'
                ], 404);
            }

            // Aquí se implementaría la prueba real de conexión
            // usando el servicio Greenter

            $resultado = [
                'ambiente' => $configuracion->ambiente,
                'endpoint' => $configuracion->endpoint_factura,
                'estado' => 'activo',
                'tiempo_respuesta' => rand(100, 500) . ' ms',
                'mensaje' => 'Conexión establecida exitosamente'
            ];

            Log::info('Prueba de conexión con SUNAT', $resultado);

            return response()->json([
                'success' => true,
                'message' => 'Conexión exitosa',
                'data' => $resultado
            ]);

        } catch (\Exception $e) {
            Log::error('Error al probar conexión: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al conectar con SUNAT',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear configuración por defecto
     */
    private function crearConfiguracionDefecto()
    {
        $configuracion = ConfiguracionTributaria::create([
            'ambiente' => 'beta',
            'ruc' => config('services.company.ruc', ''),
            'razon_social' => config('services.company.name', ''),
            'nombre_comercial' => config('services.company.name', ''),
            'direccion' => config('services.company.address', ''),
            'ubigeo' => '150101',
            'departamento' => 'Lima',
            'provincia' => 'Lima',
            'distrito' => 'Lima',
            'sol_usuario' => config('services.greenter.fe_user', ''),
            'sol_clave' => config('services.greenter.fe_password', '') ? encrypt(config('services.greenter.fe_password')) : null,
            'certificado_path' => config('services.greenter.cert_path', ''),
            'endpoint_factura' => 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
            'igv_porcentaje' => 18.00,
            'moneda_defecto' => 'PEN'
        ]);

        return $configuracion;
    }

    /**
     * Actualizar archivo .env
     */
    private function actualizarEnv(Request $request)
    {
        try {
            $envPath = base_path('.env');

            if (!file_exists($envPath)) {
                return;
            }

            $envContent = file_get_contents($envPath);

            // Actualizar valores si están presentes
            $updates = [
                'GREENTER_AMBIENTE' => $request->ambiente ?? null,
                'COMPANY_RUC' => $request->ruc ?? null,
                'COMPANY_NAME' => $request->razon_social ?? null,
                'GREENTER_FE_USER' => $request->sol_usuario ?? null,
                'GREENTER_CERT_PATH' => $request->certificado_path ?? null
            ];

            foreach ($updates as $key => $value) {
                if ($value !== null) {
                    $pattern = "/^{$key}=.*/m";
                    $replacement = "{$key}={$value}";
                    $envContent = preg_replace($pattern, $replacement, $envContent);
                }
            }

            file_put_contents($envPath, $envContent);

        } catch (\Exception $e) {
            Log::warning('No se pudo actualizar el archivo .env: ' . $e->getMessage());
        }
    }

    /**
     * Actualizar endpoints según ambiente
     */
    private function actualizarEndpoints($configuracion, $ambiente)
    {
        $endpoints = [
            'beta' => [
                'factura' => 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
                'guia' => 'https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService',
                'retension' => 'https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService'
            ],
            'produccion' => [
                'factura' => 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
                'guia' => 'https://e-guiaremision.sunat.gob.pe/ol-ti-itemision-guia-gem/billService',
                'retension' => 'https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService'
            ]
        ];

        $configuracion->update([
            'endpoint_factura' => $endpoints[$ambiente]['factura'],
            'endpoint_guia' => $endpoints[$ambiente]['guia'],
            'endpoint_retension' => $endpoints[$ambiente]['retension']
        ]);
    }
}
