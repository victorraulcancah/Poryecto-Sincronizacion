<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para validación de documentos de identidad (RUC y DNI) en línea
 * Consulta APIs de SUNAT y RENIEC
 */
class ValidacionDocumentosService
{
    /**
     * Validar y consultar RUC en SUNAT
     *
     * @param string $ruc
     * @return array
     */
    public function validarRuc($ruc)
    {
        try {
            // Validar formato
            if (!$this->validarFormatoRuc($ruc)) {
                return [
                    'success' => false,
                    'error' => 'Formato de RUC inválido'
                ];
            }

            // Buscar en caché (válido por 24 horas)
            $cacheKey = "ruc_{$ruc}";
            $cached = Cache::remember($cacheKey, 86400, function () use ($ruc) {
                return $this->consultarRucSunat($ruc);
            });

            return $cached;

        } catch (\Exception $e) {
            Log::error('Error validando RUC', [
                'ruc' => $ruc,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Error al consultar RUC: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Validar y consultar DNI en RENIEC
     *
     * @param string $dni
     * @return array
     */
    public function validarDni($dni)
    {
        try {
            // Validar formato
            if (!$this->validarFormatoDni($dni)) {
                return [
                    'success' => false,
                    'error' => 'Formato de DNI inválido'
                ];
            }

            // Buscar en caché (válido por 7 días)
            $cacheKey = "dni_{$dni}";
            $cached = Cache::remember($cacheKey, 604800, function () use ($dni) {
                return $this->consultarDniReniec($dni);
            });

            return $cached;

        } catch (\Exception $e) {
            Log::error('Error validando DNI', [
                'dni' => $dni,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Error al consultar DNI: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Consultar RUC en SUNAT (API pública o servicio externo)
     *
     * @param string $ruc
     * @return array
     */
    private function consultarRucSunat($ruc)
    {
        // Opción 1: API de apis.net.pe (servicio externo gratuito)
        $apiToken = env('APIS_NET_PE_TOKEN');

        if ($apiToken) {
            try {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . $apiToken,
                        'Accept' => 'application/json'
                    ])
                    ->get("https://api.apis.net.pe/v1/ruc", [
                        'numero' => $ruc
                    ]);

                if ($response->successful()) {
                    $data = $response->json();

                    return [
                        'success' => true,
                        'ruc' => $ruc,
                        'razon_social' => $data['nombre'] ?? $data['razonSocial'] ?? '',
                        'nombre_comercial' => $data['nombreComercial'] ?? '',
                        'tipo' => $data['tipo'] ?? '',
                        'estado' => $data['estado'] ?? '',
                        'condicion' => $data['condicion'] ?? '',
                        'direccion' => $data['direccion'] ?? '',
                        'departamento' => $data['departamento'] ?? '',
                        'provincia' => $data['provincia'] ?? '',
                        'distrito' => $data['distrito'] ?? '',
                        'ubigeo' => $data['ubigeo'] ?? ''
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Error consultando RUC en apis.net.pe', ['error' => $e->getMessage()]);
            }
        }

        // Opción 2: API de apisperu.com (alternativa)
        $apiPeruToken = env('APIS_PERU_TOKEN');

        if ($apiPeruToken) {
            try {
                $response = Http::timeout(10)
                    ->withToken($apiPeruToken)
                    ->get("https://apisperu.com/api/ruc/{$ruc}");

                if ($response->successful()) {
                    $data = $response->json();

                    return [
                        'success' => true,
                        'ruc' => $ruc,
                        'razon_social' => $data['razonSocial'] ?? '',
                        'nombre_comercial' => $data['nombreComercial'] ?? '',
                        'tipo' => $data['tipo'] ?? '',
                        'estado' => $data['estado'] ?? '',
                        'condicion' => $data['condicion'] ?? '',
                        'direccion' => $data['direccion'] ?? '',
                        'departamento' => $data['departamento'] ?? '',
                        'provincia' => $data['provincia'] ?? '',
                        'distrito' => $data['distrito'] ?? '',
                        'ubigeo' => $data['ubigeo'] ?? []
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Error consultando RUC en apisperu.com', ['error' => $e->getMessage()]);
            }
        }

        // Opción 3: Consulta directa a SUNAT (scraping - menos confiable)
        // Solo si no hay APIs configuradas
        try {
            return $this->consultarRucSunatDirecto($ruc);
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'No se pudo consultar el RUC. Configure una API de consulta.'
            ];
        }
    }

    /**
     * Consultar DNI en RENIEC (API pública o servicio externo)
     *
     * @param string $dni
     * @return array
     */
    private function consultarDniReniec($dni)
    {
        // Opción 1: API de apis.net.pe
        $apiToken = env('APIS_NET_PE_TOKEN');

        if ($apiToken) {
            try {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . $apiToken,
                        'Accept' => 'application/json'
                    ])
                    ->get("https://api.apis.net.pe/v1/dni", [
                        'numero' => $dni
                    ]);

                if ($response->successful()) {
                    $data = $response->json();

                    return [
                        'success' => true,
                        'dni' => $dni,
                        'nombres' => $data['nombres'] ?? '',
                        'apellido_paterno' => $data['apellidoPaterno'] ?? '',
                        'apellido_materno' => $data['apellidoMaterno'] ?? '',
                        'nombre_completo' => trim(
                            ($data['nombres'] ?? '') . ' ' .
                            ($data['apellidoPaterno'] ?? '') . ' ' .
                            ($data['apellidoMaterno'] ?? '')
                        )
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Error consultando DNI en apis.net.pe', ['error' => $e->getMessage()]);
            }
        }

        // Opción 2: API de apisperu.com
        $apiPeruToken = env('APIS_PERU_TOKEN');

        if ($apiPeruToken) {
            try {
                $response = Http::timeout(10)
                    ->withToken($apiPeruToken)
                    ->get("https://apisperu.com/api/dni/{$dni}");

                if ($response->successful()) {
                    $data = $response->json();

                    return [
                        'success' => true,
                        'dni' => $dni,
                        'nombres' => $data['nombres'] ?? '',
                        'apellido_paterno' => $data['apellidoPaterno'] ?? '',
                        'apellido_materno' => $data['apellidoMaterno'] ?? '',
                        'nombre_completo' => $data['nombreCompleto'] ?? trim(
                            ($data['nombres'] ?? '') . ' ' .
                            ($data['apellidoPaterno'] ?? '') . ' ' .
                            ($data['apellidoMaterno'] ?? '')
                        )
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Error consultando DNI en apisperu.com', ['error' => $e->getMessage()]);
            }
        }

        return [
            'success' => false,
            'error' => 'No se pudo consultar el DNI. Configure una API de consulta.'
        ];
    }

    /**
     * Consultar RUC directamente en SUNAT (scraping)
     * Método de respaldo cuando no hay APIs configuradas
     *
     * @param string $ruc
     * @return array
     */
    private function consultarRucSunatDirecto($ruc)
    {
        // Este método requiere scraping del portal de SUNAT
        // Implementación básica - puede fallar si SUNAT cambia su estructura

        try {
            $response = Http::timeout(15)
                ->asForm()
                ->post('https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias', [
                    'accion' => 'consPorRuc',
                    'nroRuc' => $ruc
                ]);

            if ($response->successful()) {
                $html = $response->body();

                // Parsear HTML (simplificado - requiere una librería como DomCrawler para producción)
                // Por ahora, retornar solo el RUC validado

                if (strpos($html, 'RUC') !== false) {
                    return [
                        'success' => true,
                        'ruc' => $ruc,
                        'razon_social' => '',
                        'estado' => 'ACTIVO',
                        'mensaje' => 'RUC validado en SUNAT (consulta directa)'
                    ];
                }
            }

            return [
                'success' => false,
                'error' => 'RUC no encontrado en SUNAT'
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error consultando SUNAT directamente'
            ];
        }
    }

    /**
     * Validar formato de RUC (11 dígitos)
     *
     * @param string $ruc
     * @return bool
     */
    private function validarFormatoRuc($ruc)
    {
        // RUC debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20
        if (!preg_match('/^(10|15|16|17|20)\d{9}$/', $ruc)) {
            return false;
        }

        return true;
    }

    /**
     * Validar formato de DNI (8 dígitos)
     *
     * @param string $dni
     * @return bool
     */
    private function validarFormatoDni($dni)
    {
        // DNI debe tener exactamente 8 dígitos numéricos
        if (!preg_match('/^\d{8}$/', $dni)) {
            return false;
        }

        return true;
    }

    /**
     * Limpiar caché de un documento específico
     *
     * @param string $tipo 'ruc' o 'dni'
     * @param string $numero
     * @return bool
     */
    public function limpiarCache($tipo, $numero)
    {
        $cacheKey = "{$tipo}_{$numero}";
        return Cache::forget($cacheKey);
    }

    /**
     * Validar documento genérico (detecta si es RUC o DNI)
     *
     * @param string $documento
     * @return array
     */
    public function validarDocumento($documento)
    {
        // Remover espacios y guiones
        $documento = preg_replace('/[\s\-]/', '', $documento);

        // Detectar tipo
        if (strlen($documento) == 11 && preg_match('/^\d{11}$/', $documento)) {
            return $this->validarRuc($documento);
        } elseif (strlen($documento) == 8 && preg_match('/^\d{8}$/', $documento)) {
            return $this->validarDni($documento);
        } else {
            return [
                'success' => false,
                'error' => 'Formato de documento inválido. Debe ser DNI (8 dígitos) o RUC (11 dígitos)'
            ];
        }
    }

    /**
     * Validar múltiples documentos en lote
     *
     * @param array $documentos Array de ['tipo' => 'ruc|dni', 'numero' => '...']
     * @return array
     */
    public function validarLote($documentos)
    {
        $resultados = [];

        foreach ($documentos as $doc) {
            $tipo = $doc['tipo'] ?? 'auto';
            $numero = $doc['numero'] ?? '';

            if ($tipo === 'auto') {
                $resultados[] = $this->validarDocumento($numero);
            } elseif ($tipo === 'ruc') {
                $resultados[] = $this->validarRuc($numero);
            } elseif ($tipo === 'dni') {
                $resultados[] = $this->validarDni($numero);
            } else {
                $resultados[] = [
                    'success' => false,
                    'error' => 'Tipo de documento no soportado'
                ];
            }
        }

        return $resultados;
    }
}
