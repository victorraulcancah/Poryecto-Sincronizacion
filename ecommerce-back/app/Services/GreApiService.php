<?php

namespace App\Services;

use App\Models\GuiaRemision;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GreApiService
{
    private $baseUrl;

    private $username;

    private $password;

    public function __construct()
    {
        // Configuración de PRODUCCIÓN para Guías de Remisión Electrónica
        $this->baseUrl = 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem';
        $this->username = env('GREENTER_FE_USER');
        $this->password = env('GREENTER_FE_PASSWORD');

        if (empty($this->username) || empty($this->password)) {
            throw new \Exception('Las credenciales SOL no están configuradas');
        }

        Log::info('GreApiService configurado', [
            'base_url' => $this->baseUrl,
            'usuario' => $this->username,
        ]);
    }

    /**
     * Obtener token de autenticación OAuth2
     */
    private function getToken()
    {
        $cacheKey = 'gre_api_token_'.$this->username;

        // Intentar obtener del caché
        $token = Cache::get($cacheKey);
        if ($token) {
            Log::info('Token GRE obtenido del caché');

            return $token;
        }

        // Obtener nuevo token de SUNAT
        try {
            $tokenUrl = str_replace('/gem', '', $this->baseUrl).'/token';

            $response = Http::asForm()->post($tokenUrl, [
                'grant_type' => 'password',
                'client_id' => env('GREENTER_CLIENT_ID', $this->username),
                'client_secret' => env('GREENTER_CLIENT_SECRET', $this->password),
                'username' => $this->username,
                'password' => $this->password,
                'scope' => '',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $token = $data['access_token'] ?? null;

                if ($token) {
                    // Guardar en caché por 55 minutos (los tokens duran 1 hora)
                    Cache::put($cacheKey, $token, now()->addMinutes(55));
                    Log::info('Token GRE obtenido exitosamente del servidor');

                    return $token;
                }
            }

            Log::error('Error obteniendo token GRE', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            throw new \Exception('No se pudo obtener el token de autenticación: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Excepción obteniendo token GRE', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Enviar guía de remisión a SUNAT
     */
    public function enviarGuia(GuiaRemision $guia)
    {
        try {
            // Obtener token
            $token = $this->getToken();

            // Generar XML firmado
            $greenterService = app(GuiaRemisionService::class);
            $despatch = $greenterService->construirDocumentoGreenterPublic($guia);
            $see = $greenterService->getSee();
            $xml = $see->getXmlSigned($despatch);

            // Preparar datos para envío
            $filename = $guia->serie.'-'.$guia->correlativo.'.xml';
            $zipContent = $this->crearZip($filename, $xml);

            // Enviar a SUNAT
            $response = Http::withToken($token)
                ->attach('file', $zipContent, $filename.'.zip')
                ->post($this->baseUrl.'/comprobantes');

            Log::info('Respuesta de SUNAT GRE', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if ($response->successful()) {
                $data = $response->json();

                $guia->update([
                    'estado' => GuiaRemision::ESTADO_ACEPTADO,
                    'mensaje_sunat' => $data['mensaje'] ?? 'Guía aceptada por SUNAT',
                    'codigo_hash' => $data['hash'] ?? null,
                    'xml_firmado' => base64_encode($xml),
                    'xml_respuesta_sunat' => isset($data['cdr']) ? base64_encode($data['cdr']) : null,
                    'fecha_aceptacion' => now(),
                ]);

                // Generar PDF
                $greenterService->generarPdf($guia, $despatch);

                return [
                    'success' => true,
                    'mensaje' => 'Guía enviada exitosamente a SUNAT',
                    'data' => $guia->fresh(),
                ];
            } else {
                $errorData = $response->json();
                $errorMsg = $errorData['message'] ?? $errorData['msg'] ?? 'Error desconocido';

                $guia->update([
                    'estado' => GuiaRemision::ESTADO_RECHAZADO,
                    'mensaje_sunat' => $errorMsg,
                    'errores_sunat' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => $errorMsg,
                    'detalles' => $response->body(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error enviando guía a SUNAT (API REST)', [
                'guia_id' => $guia->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Crear archivo ZIP con el XML
     */
    private function crearZip($filename, $xmlContent)
    {
        $zip = new \ZipArchive;
        $zipFilename = sys_get_temp_dir().'/'.uniqid().'.zip';

        if ($zip->open($zipFilename, \ZipArchive::CREATE) === true) {
            $zip->addFromString($filename, $xmlContent);
            $zip->close();

            $content = file_get_contents($zipFilename);
            unlink($zipFilename);

            return $content;
        }

        throw new \Exception('No se pudo crear el archivo ZIP');
    }

    /**
     * Consultar estado de guía
     */
    public function consultarEstado(GuiaRemision $guia)
    {
        try {
            $token = $this->getToken();

            $response = Http::withToken($token)
                ->get($this->baseUrl.'/comprobantes/'.$guia->serie.'-'.$guia->correlativo);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error' => $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
