<?php

namespace App\Services;

use App\Models\Comprobante;
use Illuminate\Support\Facades\Log;

class QrCodeGenerator
{
    /**
     * Generar código QR para comprobante SUNAT
     */
    public function generate(Comprobante $comprobante): ?string
    {
        try {
            // Datos para el QR según especificaciones SUNAT
            $qrData = $this->buildQrData($comprobante);
            
            // Generar QR usando SimpleSoftwareIO/simple-qrcode si está disponible
            if (class_exists('\SimpleSoftwareIO\QrCode\Facades\QrCode')) {
                return \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')
                    ->size(150)
                    ->margin(1)
                    ->generate($qrData);
            }
            
            // Fallback: usar servicio online
            return $this->generateWithOnlineService($qrData);
            
        } catch (\Exception $e) {
            Log::error('Error generando código QR', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage()
            ]);
            
            // Último recurso: generar QR textual
            return $this->generateTextualQr($qrData);
        }
    }

    /**
     * Construir datos del QR según especificaciones SUNAT
     */
    private function buildQrData(Comprobante $comprobante): string
    {
        $companyData = app(CompanyDataProvider::class)->getCompanyInfo();
        
        // Formato SUNAT para QR: RUC|TIPO|SERIE|NUMERO|IGV|TOTAL|FECHA|TIPODOC|NUMDOC|HASH
        $qrData = implode('|', [
            $companyData['ruc'],                              // RUC emisor
            $comprobante->tipo_comprobante,                   // Tipo comprobante
            $comprobante->serie,                              // Serie
            str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT), // Correlativo
            number_format($comprobante->total_igv, 2, '.', ''),       // IGV
            number_format($comprobante->importe_total, 2, '.', ''),   // Total
            $comprobante->fecha_emision,                      // Fecha emisión
            $comprobante->cliente_tipo_documento,             // Tipo doc cliente
            $comprobante->cliente_numero_documento,           // Número doc cliente
            $comprobante->codigo_hash ?? ''                   // Hash del XML
        ]);
        
        return $qrData;
    }

    /**
     * Obtener URL de verificación SUNAT
     */
    public function getVerificationUrl(Comprobante $comprobante): string
    {
        $companyData = app(CompanyDataProvider::class)->getCompanyInfo();
        
        // URL base de consulta SUNAT
        $baseUrl = 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp';
        
        // Parámetros de consulta
        $params = http_build_query([
            'ruc' => $companyData['ruc'],
            'tipo' => $comprobante->tipo_comprobante,
            'serie' => $comprobante->serie,
            'numero' => $comprobante->correlativo
        ]);
        
        return $baseUrl . '?' . $params;
    }

    /**
     * Generar QR usando servicio online
     */
    private function generateWithOnlineService(string $data): ?string
    {
        try {
            $url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($data);
            
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'method' => 'GET',
                    'user_agent' => 'Mozilla/5.0 (compatible; PDF Generator)'
                ]
            ]);
            
            $qrImage = @file_get_contents($url, false, $context);
            
            if ($qrImage && strlen($qrImage) > 100) {
                Log::info('QR generado con servicio online', [
                    'size' => strlen($qrImage)
                ]);
                return $qrImage;
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::warning('Error usando servicio QR online', [
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Generar QR textual como último recurso
     */
    private function generateTextualQr(string $data): string
    {
        // Crear una imagen simple con texto
        $text = "QR: " . substr($data, 0, 50) . "...";
        
        // Crear SVG simple
        $svg = '<?xml version="1.0" encoding="UTF-8"?>
        <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="150" height="150" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
            <text x="75" y="75" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">
                <tspan x="75" dy="0">Código QR</tspan>
                <tspan x="75" dy="15">SUNAT</tspan>
                <tspan x="75" dy="15">Consulta online</tspan>
            </text>
        </svg>';
        
        return $svg;
    }

    /**
     * Validar que el QR sea válido
     */
    public function validateQrCode(?string $qrCode): bool
    {
        if (empty($qrCode)) {
            return false;
        }
        
        // Verificar que sea una imagen PNG válida
        $imageInfo = @getimagesizefromstring($qrCode);
        
        return $imageInfo !== false && $imageInfo['mime'] === 'image/png';
    }
}