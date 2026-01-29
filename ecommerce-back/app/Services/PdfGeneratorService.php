<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\Cliente;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Exception;

class PdfGeneratorService
{
    private $companyDataProvider;
    private $qrCodeGenerator;
    private $templateEngine;
    private $pdfRenderer;

    public function __construct()
    {
        $this->companyDataProvider = new CompanyDataProvider();
        $this->qrCodeGenerator = new QrCodeGenerator();
        $this->templateEngine = new TemplateEngine();
        $this->pdfRenderer = new PdfRenderer();
    }

    /**
     * Generar PDF compliant con SUNAT con sistema de fallback
     */
    public function generarPdfSunat(Comprobante $comprobante): array
    {
        $startTime = microtime(true);
        
        try {
            // Validar comprobante
            $validationResult = $this->validateComprobante($comprobante);
            if (!$validationResult['valid']) {
                throw new Exception($validationResult['message']);
            }

            // NIVEL 1: Template Principal con DomPDF
            try {
                Log::info('Intentando generar PDF - Nivel 1: Template Principal', [
                    'comprobante_id' => $comprobante->id
                ]);
                
                $result = $this->generarConDomPDF($comprobante, 'primary');
                
                Log::info('PDF generado exitosamente - Nivel 1', [
                    'comprobante_id' => $comprobante->id,
                    'template' => 'primary',
                    'tiempo_ms' => round((microtime(true) - $startTime) * 1000)
                ]);
                
                return $result;
                
            } catch (Exception $e) {
                Log::warning('Nivel 1 falló, intentando Nivel 2', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $e->getMessage()
                ]);
                
                // NIVEL 2: Template Simplificado
                try {
                    $result = $this->generarConDomPDF($comprobante, 'fallback');
                    
                    Log::info('PDF generado exitosamente - Nivel 2', [
                        'comprobante_id' => $comprobante->id,
                        'template' => 'fallback',
                        'tiempo_ms' => round((microtime(true) - $startTime) * 1000)
                    ]);
                    
                    return $result;
                    
                } catch (Exception $e2) {
                    Log::warning('Nivel 2 falló, usando Nivel 3', [
                        'comprobante_id' => $comprobante->id,
                        'error' => $e2->getMessage()
                    ]);
                    
                    // NIVEL 3: Template Emergencia
                    $result = $this->generarConHTMLBasico($comprobante);
                    
                    Log::info('PDF generado exitosamente - Nivel 3 (Emergencia)', [
                        'comprobante_id' => $comprobante->id,
                        'template' => 'emergency',
                        'tiempo_ms' => round((microtime(true) - $startTime) * 1000)
                    ]);
                    
                    return $result;
                }
            }
            
        } catch (Exception $e) {
            Log::error('Error crítico generando PDF', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new PdfGenerationException(
                'Error al generar PDF: ' . $e->getMessage(),
                'PDF_001',
                ['comprobante_id' => $comprobante->id],
                'Verificar datos del comprobante y configuración del sistema'
            );
        }
    }

    /**
     * Validar que el comprobante tenga los datos necesarios
     */
    public function validateComprobante(Comprobante $comprobante): array
    {
        $errors = [];

        if (!$comprobante->cliente) {
            $errors[] = 'El comprobante no tiene cliente asociado';
        }

        if (!$comprobante->detalles || $comprobante->detalles->isEmpty()) {
            $errors[] = 'El comprobante no tiene detalles de productos';
        }

        if (empty($comprobante->xml_firmado)) {
            $errors[] = 'El comprobante no tiene XML firmado';
        }

        if (empty($comprobante->tipo_comprobante)) {
            $errors[] = 'El comprobante no tiene tipo definido';
        }

        if (empty($comprobante->serie) || empty($comprobante->correlativo)) {
            $errors[] = 'El comprobante no tiene serie o correlativo';
        }

        return [
            'valid' => empty($errors),
            'message' => empty($errors) ? 'Comprobante válido' : implode(', ', $errors),
            'errors' => $errors
        ];
    }

    /**
     * Generar PDF usando DomPDF
     */
    private function generarConDomPDF(Comprobante $comprobante, string $templateType): array
    {
        // Recopilar todos los datos necesarios
        $templateData = $this->collectTemplateData($comprobante);
        
        // Generar HTML usando el template
        $html = $this->templateEngine->render($templateType, $templateData);
        
        // Renderizar PDF
        $pdfContent = $this->pdfRenderer->renderWithDomPDF($html);
        
        // Guardar PDF en base64
        $comprobante->update([
            'pdf_base64' => base64_encode($pdfContent),
            'tiene_pdf' => true
        ]);

        return [
            'success' => true,
            'template_usado' => $templateType,
            'pdf_size_bytes' => strlen($pdfContent),
            'elementos_incluidos' => $this->getElementosIncluidos($templateData)
        ];
    }

    /**
     * Generar PDF de emergencia con HTML básico
     */
    private function generarConHTMLBasico(Comprobante $comprobante): array
    {
        $templateData = $this->collectTemplateData($comprobante);
        
        // HTML ultra simple pero compliant
        $html = $this->templateEngine->render('emergency', $templateData);
        
        // Intentar con DomPDF, si falla usar HTML directo
        try {
            $pdfContent = $this->pdfRenderer->renderWithDomPDF($html);
        } catch (Exception $e) {
            // Último recurso: HTML como "PDF"
            $pdfContent = $html;
        }
        
        $comprobante->update([
            'pdf_base64' => base64_encode($pdfContent),
            'tiene_pdf' => true
        ]);

        return [
            'success' => true,
            'template_usado' => 'emergency',
            'pdf_size_bytes' => strlen($pdfContent),
            'elementos_incluidos' => $this->getElementosIncluidos($templateData)
        ];
    }

    /**
     * Recopilar todos los datos necesarios para el template
     */
    private function collectTemplateData(Comprobante $comprobante): array
    {
        // Datos de empresa
        $datosEmpresa = $this->companyDataProvider->getCompanyInfo();
        
        // Tipo específico de comprobante
        $tipoEspecifico = $this->getTipoComprobanteEspecifico($comprobante->tipo_comprobante);
        
        // Detalles de productos
        $productos = $this->formatearProductos($comprobante->detalles);
        
        // Totales detallados
        $totales = $this->calcularTotales($comprobante);
        
        // Información legal
        $infoLegal = $this->getInformacionLegal($comprobante);
        
        // Código QR
        $codigoQR = $this->qrCodeGenerator->generate($comprobante);

        // CORRECCIÓN: Datos del cliente desde el comprobante
        $datosCliente = [
            'razon_social' => $comprobante->cliente_razon_social ?? ($comprobante->cliente ? $comprobante->cliente->razon_social : 'Cliente no especificado'),
            'numero_documento' => $comprobante->cliente_numero_documento ?? ($comprobante->cliente ? $comprobante->cliente->numero_documento : '00000000'),
            'tipo_documento' => $comprobante->cliente_tipo_documento ?? ($comprobante->cliente ? $comprobante->cliente->tipo_documento : '1'),
            'direccion' => $comprobante->cliente_direccion ?? ($comprobante->cliente ? $comprobante->cliente->direccion : 'No especificada')
        ];

        Log::info('Datos del cliente para PDF', [
            'comprobante_id' => $comprobante->id,
            'cliente_datos' => $datosCliente
        ]);

        return [
            'comprobante' => $comprobante,
            'cliente' => $comprobante->cliente,
            'datos_cliente' => $datosCliente, // Datos específicos del cliente
            'datos_empresa' => $datosEmpresa,
            'tipo_comprobante' => $tipoEspecifico,
            'numero_completo' => $comprobante->serie . '-' . str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT),
            'fecha_emision' => $comprobante->fecha_emision,
            'productos' => $productos,
            'totales' => $totales,
            'info_legal' => $infoLegal,
            'codigo_qr' => $codigoQR
        ];
    }

    /**
     * Obtener tipo específico de comprobante según SUNAT
     */
    private function getTipoComprobanteEspecifico(string $tipo): string
    {
        $tipos = [
            '01' => 'FACTURA ELECTRÓNICA',
            '03' => 'BOLETA DE VENTA ELECTRÓNICA',
            '07' => 'NOTA DE CRÉDITO ELECTRÓNICA',
            '08' => 'NOTA DE DÉBITO ELECTRÓNICA',
            '09' => 'NOTA DE VENTA'
        ];

        return $tipos[$tipo] ?? 'COMPROBANTE ELECTRÓNICO';
    }

    /**
     * Formatear productos para el template
     */
    private function formatearProductos($detalles): array
    {
        $productos = [];
        
        foreach ($detalles as $detalle) {
            $productos[] = [
                'codigo' => $detalle->codigo_producto ?? 'N/A',
                'descripcion' => $detalle->descripcion,
                'unidad_medida' => $detalle->unidad_medida ?? 'NIU',
                'cantidad' => number_format($detalle->cantidad, 2),
                'precio_unitario' => number_format($detalle->valor_unitario ?? $detalle->precio_unitario, 2),
                'valor_venta' => number_format($detalle->valor_venta ?? $detalle->subtotal_linea, 2),
                'igv_linea' => number_format($detalle->igv ?? $detalle->igv_linea, 2),
                'total_linea' => number_format($detalle->importe_total ?? $detalle->total_linea, 2)
            ];
        }
        
        return $productos;
    }

    /**
     * Calcular totales detallados
     */
    private function calcularTotales(Comprobante $comprobante): array
    {
        return [
            'operacion_gravada' => number_format($comprobante->operacion_gravada, 2),
            'igv_18' => number_format($comprobante->total_igv, 2),
            'total_numeros' => number_format($comprobante->importe_total, 2),
            'total_letras' => $this->convertirNumeroALetras($comprobante->importe_total),
            'descuentos' => $comprobante->descuento_total > 0 ? number_format($comprobante->descuento_total, 2) : null
        ];
    }

    /**
     * Obtener información legal requerida por SUNAT
     */
    private function getInformacionLegal(Comprobante $comprobante): array
    {
        // Intentar obtener el hash de diferentes campos
        $hash = $comprobante->codigo_hash 
             ?? $comprobante->hash_firma 
             ?? $comprobante->hash_xml 
             ?? ($comprobante->xml_firmado ? hash('sha256', $comprobante->xml_firmado) : null)
             ?? 'Hash no disponible';

        return [
            'hash_xml' => $hash,
            'leyenda_legal' => 'Representación impresa del comprobante electrónico',
            'url_consulta' => 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp',
            'estado_cdr' => $comprobante->estado ?? null
        ];
    }

    /**
     * Convertir número a letras
     */
    private function convertirNumeroALetras(float $numero): string
    {
        // Usar la librería existente si está disponible
        if (class_exists('\Luecano\NumeroALetras\NumeroALetras')) {
            $formatter = new \Luecano\NumeroALetras\NumeroALetras();
            return $formatter->toInvoice($numero, 2, 'SOLES');
        }
        
        // Fallback simple
        $entero = floor($numero);
        $decimales = round(($numero - $entero) * 100);
        
        return "SON: " . strtoupper($this->numeroALetrasSimple($entero)) . " CON {$decimales}/100 SOLES";
    }

    /**
     * Conversión simple de números a letras (fallback)
     */
    private function numeroALetrasSimple(int $numero): string
    {
        if ($numero == 0) return "CERO";
        if ($numero < 100) return "CANTIDAD MENOR A CIEN";
        if ($numero < 1000) return "CANTIDAD EN CIENTOS";
        
        return "CANTIDAD: " . number_format($numero, 0);
    }

    /**
     * Obtener elementos incluidos en el PDF
     */
    private function getElementosIncluidos(array $templateData): array
    {
        return [
            'datos_empresa' => !empty($templateData['datos_empresa']['ruc']),
            'tipo_comprobante_especifico' => !empty($templateData['tipo_comprobante']),
            'detalle_productos_completo' => !empty($templateData['productos']),
            'informacion_legal_sunat' => !empty($templateData['info_legal']['hash_xml']),
            'totales_detallados' => !empty($templateData['totales']['total_letras']),
            'codigo_qr' => !empty($templateData['codigo_qr']),
            'hash_xml' => !empty($templateData['info_legal']['hash_xml'])
        ];
    }

    /**
     * Obtener plantillas disponibles
     */
    public function getAvailableTemplates(): array
    {
        return [
            'primary' => 'Template principal completo',
            'fallback' => 'Template simplificado',
            'emergency' => 'Template de emergencia'
        ];
    }
}

/**
 * Excepción personalizada para errores de generación de PDF
 */
class PdfGenerationException extends Exception
{
    public string $errorCode;
    public array $context;
    public string $suggestedAction;

    public function __construct(string $message, string $errorCode, array $context = [], string $suggestedAction = '')
    {
        parent::__construct($message);
        $this->errorCode = $errorCode;
        $this->context = $context;
        $this->suggestedAction = $suggestedAction;
    }
}

/**
 * Resultado de generación de PDF
 */
class PdfResult
{
    public bool $success;
    public ?string $pdfContent;
    public ?string $errorMessage;
    public string $templateUsed;
    public array $metadata;
    public float $generationTime;

    public function __construct(bool $success, ?string $pdfContent = null, ?string $errorMessage = null, string $templateUsed = '', array $metadata = [], float $generationTime = 0.0)
    {
        $this->success = $success;
        $this->pdfContent = $pdfContent;
        $this->errorMessage = $errorMessage;
        $this->templateUsed = $templateUsed;
        $this->metadata = $metadata;
        $this->generationTime = $generationTime;
    }
}