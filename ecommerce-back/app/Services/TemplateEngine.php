<?php

namespace App\Services;

use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Log;

class TemplateEngine
{
    private array $templatePaths = [
        'primary' => 'pdf.comprobante-sunat',
        'fallback' => 'pdf.comprobante-simple',
        'emergency' => 'pdf.comprobante-minimo'
    ];

    /**
     * Renderizar template con datos
     */
    public function render(string $templateType, array $data): string
    {
        try {
            $templatePath = $this->getTemplatePath($templateType);
            
            // Verificar si el template existe
            if (!View::exists($templatePath)) {
                Log::warning("Template no encontrado: {$templatePath}, usando fallback");
                
                // Intentar con template de fallback
                if ($templateType !== 'emergency') {
                    return $this->render('emergency', $data);
                }
                
                // Último recurso: HTML básico
                return $this->generateBasicHtml($data);
            }
            
            // Renderizar template
            $html = View::make($templatePath, $data)->render();
            
            // Validar HTML generado
            if (empty($html) || strlen($html) < 100) {
                throw new \Exception('HTML generado está vacío o es muy corto');
            }
            
            return $html;
            
        } catch (\Exception $e) {
            Log::error('Error renderizando template', [
                'template' => $templateType,
                'error' => $e->getMessage()
            ]);
            
            // Fallback a template de emergencia
            if ($templateType !== 'emergency') {
                return $this->render('emergency', $data);
            }
            
            // Último recurso
            return $this->generateBasicHtml($data);
        }
    }

    /**
     * Obtener ruta del template
     */
    public function getTemplatePath(string $templateType): string
    {
        return $this->templatePaths[$templateType] ?? $this->templatePaths['emergency'];
    }

    /**
     * Validar template
     */
    public function validateTemplate(string $templatePath): bool
    {
        return View::exists($templatePath);
    }

    /**
     * Generar HTML básico como último recurso
     */
    private function generateBasicHtml(array $data): string
    {
        $comprobante = $data['comprobante'];
        $cliente = $data['cliente'];
        $datosCliente = $data['datos_cliente'] ?? [];
        $datosEmpresa = $data['datos_empresa'];
        $tipoComprobante = $data['tipo_comprobante'];
        $numeroCompleto = $data['numero_completo'];
        $productos = $data['productos'] ?? [];
        $totales = $data['totales'];
        $infoLegal = $data['info_legal'];
        $codigoQr = $data['codigo_qr'] ?? null;

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>{$tipoComprobante} {$numeroCompleto}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 12px; 
                    margin: 20px;
                    line-height: 1.4;
                }
                .header { 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px;
                }
                .empresa-info {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .comprobante-titulo { 
                    text-align: center; 
                    font-size: 16px; 
                    font-weight: bold; 
                    margin: 15px 0;
                    background-color: #f0f0f0;
                    padding: 10px;
                    border: 1px solid #ccc;
                }
                .cliente-info {
                    margin: 20px 0;
                    padding: 10px;
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                }
                .tabla-productos { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                }
                .tabla-productos th, .tabla-productos td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }
                .tabla-productos th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .totales { 
                    float: right; 
                    width: 300px; 
                    margin-top: 20px;
                }
                .totales table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .totales td {
                    padding: 5px;
                    border-bottom: 1px solid #ddd;
                }
                .total-final {
                    font-weight: bold;
                    font-size: 14px;
                    border-top: 2px solid #333 !important;
                }
                .footer { 
                    margin-top: 50px; 
                    border-top: 1px solid #ccc; 
                    padding-top: 15px; 
                    font-size: 10px;
                    clear: both;
                }
                .info-legal {
                    background-color: #f9f9f9;
                    padding: 10px;
                    border: 1px solid #ddd;
                    margin-top: 10px;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
            </style>
        </head>
        <body>
            <!-- ENCABEZADO -->
            <div class='header'>
                <div class='empresa-info'>
                    <h2>{$datosEmpresa['razon_social']}</h2>
                    <p><strong>RUC:</strong> {$datosEmpresa['ruc']}</p>
                    <p>{$datosEmpresa['direccion_fiscal']}</p>";
        
        if (!empty($datosEmpresa['telefono']) || !empty($datosEmpresa['email'])) {
            $html .= "<p>";
            if (!empty($datosEmpresa['telefono'])) {
                $html .= "Tel: {$datosEmpresa['telefono']} ";
            }
            if (!empty($datosEmpresa['email'])) {
                $html .= "| Email: {$datosEmpresa['email']}";
            }
            $html .= "</p>";
        }
        
        $html .= "
                </div>
            </div>

            <!-- TÍTULO DEL COMPROBANTE -->
            <div class='comprobante-titulo'>
                {$tipoComprobante}<br>
                {$numeroCompleto}
            </div>

            <!-- DATOS DEL CLIENTE -->
            <div class='cliente-info'>
                <strong>Cliente:</strong> " . ($datosCliente['razon_social'] ?? 'Cliente no especificado') . "<br>
                <strong>" . (($datosCliente['tipo_documento'] ?? '1') === '6' ? 'RUC' : 'DNI') . ":</strong> " . ($datosCliente['numero_documento'] ?? 'No especificado') . "<br>
                <strong>Dirección:</strong> " . ($datosCliente['direccion'] ?? 'No especificada') . "<br>
                <strong>Fecha:</strong> {$comprobante->fecha_emision}
            </div>";

        // TABLA DE PRODUCTOS
        if (!empty($productos)) {
            $html .= "
            <table class='tabla-productos'>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>P. Unitario</th>
                        <th>Valor Venta</th>
                        <th>IGV</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>";
            
            foreach ($productos as $producto) {
                $html .= "
                    <tr>
                        <td>{$producto['codigo']}</td>
                        <td>{$producto['descripcion']}</td>
                        <td class='text-center'>{$producto['unidad_medida']}</td>
                        <td class='text-center'>{$producto['cantidad']}</td>
                        <td class='text-right'>S/ {$producto['precio_unitario']}</td>
                        <td class='text-right'>S/ {$producto['valor_venta']}</td>
                        <td class='text-right'>S/ {$producto['igv_linea']}</td>
                        <td class='text-right'>S/ {$producto['total_linea']}</td>
                    </tr>";
            }
            
            $html .= "
                </tbody>
            </table>";
        }

        // TOTALES
        $html .= "
            <div class='totales'>
                <table>
                    <tr>
                        <td><strong>Operación Gravada:</strong></td>
                        <td class='text-right'><strong>S/ {$totales['operacion_gravada']}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>IGV (18%):</strong></td>
                        <td class='text-right'><strong>S/ {$totales['igv_18']}</strong></td>
                    </tr>";
        
        if (!empty($totales['descuentos'])) {
            $html .= "
                    <tr>
                        <td><strong>Descuento:</strong></td>
                        <td class='text-right'><strong>- S/ {$totales['descuentos']}</strong></td>
                    </tr>";
        }
        
        $html .= "
                    <tr class='total-final'>
                        <td><strong>TOTAL:</strong></td>
                        <td class='text-right'><strong>S/ {$totales['total_numeros']}</strong></td>
                    </tr>
                </table>
                <div style='margin-top: 10px; font-size: 10px; font-weight: bold;'>
                    {$totales['total_letras']}
                </div>
            </div>

            <!-- PIE DE PÁGINA -->
            <div class='footer'>
                <div style='float: left; width: 150px; text-align: center;'>";
        
        if (!empty($codigoQr)) {
            if (strpos($codigoQr, '<svg') === 0) {
                $html .= $codigoQr;
            } else {
                $html .= "<img src='data:image/png;base64," . base64_encode($codigoQr) . "' alt='Código QR' style='max-width: 120px; max-height: 120px;'>";
            }
            $html .= "<p style='font-size: 10px; margin: 5px 0;'><strong>Código QR SUNAT</strong></p>";
        } else {
            $html .= "<div style='width: 120px; height: 120px; border: 2px solid #333; line-height: 30px; font-size: 10px; padding: 10px;'>
                        <strong>Código QR</strong><br>SUNAT<br>Consulta online
                      </div>";
        }
        
        $html .= "
                </div>
                <div class='info-legal' style='float: right; width: 400px;'>
                    <strong>{$infoLegal['leyenda_legal']}</strong><br>
                    <strong>Hash:</strong> {$infoLegal['hash_xml']}<br>
                    <strong>Consulte en:</strong> {$infoLegal['url_consulta']}";
        
        if (!empty($infoLegal['estado_cdr'])) {
            $html .= "<br><strong>Estado CDR:</strong> {$infoLegal['estado_cdr']}";
        }
        
        $html .= "
                </div>
                <div style='clear: both;'></div>
            </div>
        </body>
        </html>";

        return $html;
    }

    /**
     * Obtener templates disponibles
     */
    public function getAvailableTemplates(): array
    {
        $templates = [];
        
        foreach ($this->templatePaths as $type => $path) {
            $templates[$type] = [
                'name' => $type,
                'path' => $path,
                'exists' => View::exists($path),
                'description' => $this->getTemplateDescription($type)
            ];
        }
        
        return $templates;
    }

    /**
     * Obtener descripción del template
     */
    private function getTemplateDescription(string $type): string
    {
        $descriptions = [
            'primary' => 'Template principal completo con todos los elementos SUNAT',
            'fallback' => 'Template simplificado pero compliant',
            'emergency' => 'Template de emergencia mínimo'
        ];
        
        return $descriptions[$type] ?? 'Template desconocido';
    }
}