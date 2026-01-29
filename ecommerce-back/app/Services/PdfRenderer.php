<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Exception;

class PdfRenderer
{
    /**
     * Renderizar HTML a PDF usando DomPDF
     */
    public function renderWithDomPDF(string $html): string
    {
        try {
            // Verificar si DomPDF está disponible
            if (!class_exists('\Dompdf\Dompdf')) {
                throw new Exception('DomPDF no está instalado');
            }

            $dompdf = new \Dompdf\Dompdf();
            
            // Configurar opciones
            $dompdf->getOptions()->set([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'Arial',
                'dpi' => 96,
                'fontHeightRatio' => 1.1,
                'isPhpEnabled' => false
            ]);

            // Cargar HTML
            $dompdf->loadHtml($html);
            
            // Configurar papel
            $dompdf->setPaper('A4', 'portrait');
            
            // Renderizar
            $dompdf->render();
            
            // Obtener contenido PDF
            $pdfContent = $dompdf->output();
            
            if (empty($pdfContent)) {
                throw new Exception('DomPDF generó contenido vacío');
            }
            
            Log::info('PDF generado exitosamente con DomPDF', [
                'size_bytes' => strlen($pdfContent)
            ]);
            
            return $pdfContent;
            
        } catch (Exception $e) {
            Log::error('Error con DomPDF', [
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Renderizar HTML a PDF usando HTML2PDF (fallback)
     */
    public function renderWithHTML2PDF(string $html): string
    {
        try {
            // Verificar si HTML2PDF está disponible
            if (!class_exists('\Spipu\Html2Pdf\Html2Pdf')) {
                throw new Exception('HTML2PDF no está instalado');
            }

            $html2pdf = new \Spipu\Html2Pdf\Html2Pdf('P', 'A4', 'es');
            $html2pdf->writeHTML($html);
            
            $pdfContent = $html2pdf->output('', 'S');
            
            if (empty($pdfContent)) {
                throw new Exception('HTML2PDF generó contenido vacío');
            }
            
            Log::info('PDF generado exitosamente con HTML2PDF', [
                'size_bytes' => strlen($pdfContent)
            ]);
            
            return $pdfContent;
            
        } catch (Exception $e) {
            Log::error('Error con HTML2PDF', [
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Verificar qué motores PDF están disponibles
     */
    public function getAvailableEngines(): array
    {
        $engines = [];
        
        // Verificar DomPDF
        if (class_exists('\Dompdf\Dompdf')) {
            $engines['dompdf'] = [
                'name' => 'DomPDF',
                'available' => true,
                'version' => $this->getDomPDFVersion()
            ];
        } else {
            $engines['dompdf'] = [
                'name' => 'DomPDF',
                'available' => false,
                'error' => 'No instalado'
            ];
        }
        
        // Verificar HTML2PDF
        if (class_exists('\Spipu\Html2Pdf\Html2Pdf')) {
            $engines['html2pdf'] = [
                'name' => 'HTML2PDF',
                'available' => true,
                'version' => 'Disponible'
            ];
        } else {
            $engines['html2pdf'] = [
                'name' => 'HTML2PDF',
                'available' => false,
                'error' => 'No instalado'
            ];
        }
        
        return $engines;
    }

    /**
     * Obtener versión de DomPDF
     */
    private function getDomPDFVersion(): string
    {
        try {
            if (defined('\Dompdf\Dompdf::VERSION')) {
                return \Dompdf\Dompdf::VERSION;
            }
            return 'Versión desconocida';
        } catch (Exception $e) {
            return 'No disponible';
        }
    }

    /**
     * Validar que el PDF generado sea válido
     */
    public function validatePdf(string $pdfContent): array
    {
        $validation = [
            'valid' => false,
            'size_bytes' => strlen($pdfContent),
            'errors' => []
        ];
        
        // Verificar que no esté vacío
        if (empty($pdfContent)) {
            $validation['errors'][] = 'Contenido PDF vacío';
            return $validation;
        }
        
        // Verificar tamaño mínimo
        if (strlen($pdfContent) < 1000) {
            $validation['errors'][] = 'PDF muy pequeño (posiblemente corrupto)';
        }
        
        // Verificar header PDF
        if (substr($pdfContent, 0, 4) !== '%PDF') {
            $validation['errors'][] = 'Header PDF inválido';
        }
        
        // Verificar footer PDF
        if (strpos($pdfContent, '%%EOF') === false) {
            $validation['errors'][] = 'Footer PDF faltante';
        }
        
        $validation['valid'] = empty($validation['errors']);
        
        return $validation;
    }

    /**
     * Obtener información del motor de renderizado
     */
    public function getEngineInfo(): array
    {
        return [
            'engines_available' => $this->getAvailableEngines(),
            'recommended_engine' => 'dompdf',
            'fallback_order' => ['dompdf', 'html2pdf', 'html_basic']
        ];
    }

    /**
     * Verificar si hay al menos un motor disponible
     */
    public function isAvailable(): bool
    {
        $engines = $this->getAvailableEngines();
        
        foreach ($engines as $engine) {
            if ($engine['available']) {
                return true;
            }
        }
        
        return false;
    }
}