<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\NotaCredito;
use App\Models\NotaDebito;
use Carbon\Carbon;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Sale\Note;
use Greenter\Model\Sale\SaleDetail;
use Illuminate\Support\Facades\Log;

class NotasService
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Enviar Nota de Crédito a SUNAT
     */
    public function enviarNotaCreditoASunat($notaCreditoId)
    {
        try {
            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($notaCreditoId);

            // Validar estados permitidos para envío
            $estadosPermitidos = ['pendiente', 'generado', 'rechazado'];
            if (! in_array($notaCredito->estado, $estadosPermitidos)) {
                throw new \Exception("No se puede enviar la nota en estado '{$notaCredito->estado}'. Estados permitidos: pendiente, generado, rechazado");
            }

            // Obtener comprobante de referencia
            $comprobanteRef = Comprobante::where('serie', $notaCredito->serie_comprobante_ref)
                ->where('correlativo', $notaCredito->numero_comprobante_ref)
                ->first();

            if (! $comprobanteRef) {
                throw new \Exception('No se encontró el comprobante de referencia');
            }

            // Construir documento Greenter
            $note = $this->construirNotaCredito($notaCredito, $comprobanteRef);

            // Obtener instancia de See desde GreenterService
            $see = $this->greenterService->getSee();

            // Enviar a SUNAT
            $result = $see->send($note);

            // Guardar XML firmado
            $xmlFirmado = $see->getFactory()->getLastXml();

            if ($result->isSuccess()) {
                $cdr = $result->getCdrResponse();
                $cdrZip = $result->getCdrZip();
                
                // Verificar que realmente exista un CDR válido
                if (!$cdr || !$cdrZip) {
                    throw new \Exception('SUNAT no devolvió un CDR válido. Esto puede indicar un problema de comunicación.');
                }
                
                // Verificar el código de respuesta del CDR
                $codigoRespuesta = $cdr->getCode();
                $esAceptado = in_array($codigoRespuesta, ['0', '99']); // 0=Aceptado, 99=Observado pero aceptado
                
                $estado = $esAceptado ? 'aceptado' : 'rechazado';
                $mensaje = $cdr->getDescription();

                $notaCredito->update([
                    'estado' => $estado,
                    'xml' => $xmlFirmado,
                    'cdr' => base64_encode($cdrZip),
                    'hash' => hash('sha256', $xmlFirmado),
                    'mensaje_sunat' => $mensaje,
                    'fecha_envio_sunat' => now(),
                ]);

                if ($esAceptado) {
                    // Generar PDF solo si fue aceptado
                    $this->generarPdfNotaCredito($notaCredito);

                    Log::info('Nota de crédito aceptada por SUNAT', [
                        'nota_credito_id' => $notaCredito->id,
                        'numero' => $notaCredito->serie.'-'.$notaCredito->numero,
                    ]);

                    return [
                        'success' => true,
                        'message' => 'Nota de crédito aceptada por SUNAT',
                        'data' => $notaCredito->fresh(),
                    ];
                } else {
                    Log::warning('Nota de crédito rechazada por SUNAT', [
                        'nota_credito_id' => $notaCredito->id,
                        'codigo' => $codigoRespuesta,
                        'mensaje' => $mensaje,
                    ]);

                    return [
                        'success' => false,
                        'message' => 'Nota de crédito rechazada por SUNAT',
                        'error' => $mensaje,
                    ];
                }
            } else {
                $error = $result->getError();

                $notaCredito->update([
                    'estado' => 'rechazado',
                    'xml' => $xmlFirmado,
                    'mensaje_sunat' => $error->getMessage(),
                    'codigo_error_sunat' => $error->getCode(),
                ]);

                Log::error('Nota de crédito rechazada por SUNAT', [
                    'nota_credito_id' => $notaCredito->id,
                    'error' => $error->getMessage(),
                    'codigo' => $error->getCode(),
                ]);

                return [
                    'success' => false,
                    'message' => 'Nota de crédito rechazada por SUNAT',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error enviando nota de crédito a SUNAT', [
                'nota_credito_id' => $notaCreditoId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al enviar nota de crédito',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar Nota de Débito a SUNAT
     */
    public function enviarNotaDebitoASunat($notaDebitoId)
    {
        try {
            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($notaDebitoId);

            // Validar estados permitidos para envío
            $estadosPermitidos = ['pendiente', 'generado', 'rechazado'];
            if (! in_array($notaDebito->estado, $estadosPermitidos)) {
                throw new \Exception("No se puede enviar la nota en estado '{$notaDebito->estado}'. Estados permitidos: pendiente, generado, rechazado");
            }

            // Obtener comprobante de referencia
            $comprobanteRef = Comprobante::where('serie', $notaDebito->serie_comprobante_ref)
                ->where('correlativo', $notaDebito->numero_comprobante_ref)
                ->first();

            if (! $comprobanteRef) {
                throw new \Exception('No se encontró el comprobante de referencia');
            }

            // Construir documento Greenter
            $note = $this->construirNotaDebito($notaDebito, $comprobanteRef);

            // Obtener instancia de See desde GreenterService
            $see = $this->greenterService->getSee();

            // Enviar a SUNAT
            $result = $see->send($note);

            // Guardar XML firmado
            $xmlFirmado = $see->getFactory()->getLastXml();

            if ($result->isSuccess()) {
                $cdr = $result->getCdrResponse();
                $cdrZip = $result->getCdrZip();

                // Verificar que realmente exista un CDR válido
                if (!$cdr || !$cdrZip) {
                    throw new \Exception('SUNAT no devolvió un CDR válido. Esto puede indicar un problema de comunicación.');
                }

                $notaDebito->update([
                    'estado' => 'aceptado',
                    'xml' => $xmlFirmado,
                    'cdr' => base64_encode($cdrZip),
                    'hash' => hash('sha256', $xmlFirmado),
                    'mensaje_sunat' => $cdr->getDescription(),
                    'fecha_envio_sunat' => now(),
                ]);

                // Generar PDF
                $this->generarPdfNotaDebito($notaDebito);

                Log::info('Nota de débito enviada exitosamente', [
                    'nota_debito_id' => $notaDebito->id,
                    'numero' => $notaDebito->serie.'-'.$notaDebito->numero,
                ]);

                return [
                    'success' => true,
                    'message' => 'Nota de débito enviada a SUNAT exitosamente',
                    'data' => $notaDebito->fresh(),
                ];
            } else {
                $error = $result->getError();

                $notaDebito->update([
                    'estado' => 'rechazado',
                    'xml' => $xmlFirmado,
                    'mensaje_sunat' => $error->getMessage(),
                    'codigo_error_sunat' => $error->getCode(),
                ]);

                Log::error('Nota de débito rechazada por SUNAT', [
                    'nota_debito_id' => $notaDebito->id,
                    'error' => $error->getMessage(),
                    'codigo' => $error->getCode(),
                ]);

                return [
                    'success' => false,
                    'message' => 'Nota de débito rechazada por SUNAT',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error enviando nota de débito a SUNAT', [
                'nota_debito_id' => $notaDebitoId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al enviar nota de débito',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Construir Nota de Crédito para Greenter
     */
    private function construirNotaCredito(NotaCredito $notaCredito, Comprobante $comprobanteRef)
    {
        $note = new Note;

        // Datos básicos
        $note->setUblVersion('2.1')
            ->setTipoDoc('07') // Nota de Crédito
            ->setSerie($notaCredito->serie)
            ->setCorrelativo($notaCredito->numero)
            ->setFechaEmision(Carbon::parse($notaCredito->fecha_emision))
            ->setTipDocAfectado($comprobanteRef->tipo_comprobante)
            ->setNumDocfectado($comprobanteRef->serie.'-'.$comprobanteRef->correlativo)
            ->setCodMotivo($notaCredito->tipo_nota_credito ?? '01')
            ->setDesMotivo($notaCredito->motivo)
            ->setTipoMoneda($notaCredito->moneda ?? 'PEN');

        // Empresa
        $company = $this->greenterService->getCompany();
        $note->setCompany($company);

        // Cliente - Validar schemeID según serie y tipo de documento
        $tipoDocCliente = $this->obtenerSchemeID(
            $notaCredito->cliente->tipo_documento,
            $notaCredito->cliente->numero_documento,
            $notaCredito->serie
        );

        $client = new Client;
        $client->setTipoDoc($tipoDocCliente)
            ->setNumDoc(trim($notaCredito->cliente->numero_documento))
            ->setRznSocial(trim($notaCredito->cliente->razon_social));

        if ($notaCredito->cliente->direccion) {
            $client->setAddress(new Address(['direccion' => trim($notaCredito->cliente->direccion)]));
        }

        $note->setClient($client);

        // Detalles - Crear un detalle genérico basado en los totales
        $item = new SaleDetail;
        $valorUnitario = $notaCredito->subtotal;
        $igv = $notaCredito->igv;
        $precioUnitario = $notaCredito->total;

        $item->setCodProducto('NOTA001')
            ->setUnidad('NIU')
            ->setDescripcion(trim($notaCredito->motivo))
            ->setCantidad(1)
            ->setMtoValorUnitario($valorUnitario)
            ->setMtoValorVenta($valorUnitario)
            ->setMtoBaseIgv($valorUnitario)
            ->setPorcentajeIgv(18.00)
            ->setIgv($igv)
            ->setTipAfeIgv('10') // Gravado
            ->setTotalImpuestos($igv)
            ->setMtoPrecioUnitario($precioUnitario);

        $note->setDetails([$item]);

        // Totales
        $note->setMtoOperGravadas($notaCredito->subtotal)
            ->setMtoOperExoneradas(0.00)
            ->setMtoOperInafectas(0.00)
            ->setMtoIGV($notaCredito->igv)
            ->setTotalImpuestos($notaCredito->igv)
            ->setMtoImpVenta($notaCredito->total);

        // Forma de pago (requerido para boletas según error 3257)
        // Indicar que fue al contado
        $legend = new \Greenter\Model\Sale\Legend();
        $montoEnLetras = $this->numeroALetras($notaCredito->total);
        $legend->setCode('1000') // Leyenda: Monto en letras
            ->setValue($montoEnLetras);
        $note->setLegends([$legend]);

        return $note;
    }

    /**
     * Construir Nota de Débito para Greenter
     */
    private function construirNotaDebito(NotaDebito $notaDebito, Comprobante $comprobanteRef)
    {
        $note = new Note;

        // Datos básicos
        $note->setUblVersion('2.1')
            ->setTipoDoc('08') // Nota de Débito
            ->setSerie($notaDebito->serie)
            ->setCorrelativo($notaDebito->numero)
            ->setFechaEmision(Carbon::parse($notaDebito->fecha_emision))
            ->setTipDocAfectado($comprobanteRef->tipo_comprobante)
            ->setNumDocfectado($comprobanteRef->serie.'-'.$comprobanteRef->correlativo)
            ->setCodMotivo($notaDebito->tipo_nota_debito ?? '01')
            ->setDesMotivo($notaDebito->motivo)
            ->setTipoMoneda($notaDebito->moneda ?? 'PEN');

        // Empresa
        $company = $this->greenterService->getCompany();
        $note->setCompany($company);

        // Cliente - Validar schemeID según serie y tipo de documento
        $tipoDocCliente = $this->obtenerSchemeID(
            $notaDebito->cliente->tipo_documento,
            $notaDebito->cliente->numero_documento,
            $notaDebito->serie
        );

        $client = new Client;
        $client->setTipoDoc($tipoDocCliente)
            ->setNumDoc(trim($notaDebito->cliente->numero_documento))
            ->setRznSocial(trim($notaDebito->cliente->razon_social));

        if ($notaDebito->cliente->direccion) {
            $client->setAddress(new Address(['direccion' => trim($notaDebito->cliente->direccion)]));
        }

        $note->setClient($client);

        // Detalles - Crear un detalle genérico basado en los totales
        $item = new SaleDetail;
        $valorUnitario = $notaDebito->subtotal;
        $igv = $notaDebito->igv;
        $precioUnitario = $notaDebito->total;

        $item->setCodProducto('NOTA001')
            ->setUnidad('NIU')
            ->setDescripcion(trim($notaDebito->motivo))
            ->setCantidad(1)
            ->setMtoValorUnitario($valorUnitario)
            ->setMtoValorVenta($valorUnitario)
            ->setMtoBaseIgv($valorUnitario)
            ->setPorcentajeIgv(18.00)
            ->setIgv($igv)
            ->setTipAfeIgv('10') // Gravado
            ->setTotalImpuestos($igv)
            ->setMtoPrecioUnitario($precioUnitario);

        $note->setDetails([$item]);

        // Totales
        $note->setMtoOperGravadas($notaDebito->subtotal)
            ->setMtoOperExoneradas(0.00)
            ->setMtoOperInafectas(0.00)
            ->setMtoIGV($notaDebito->igv)
            ->setTotalImpuestos($notaDebito->igv)
            ->setMtoImpVenta($notaDebito->total);

        return $note;
    }

    /**
     * Generar PDF para Nota de Crédito
     */
    private function generarPdfNotaCredito(NotaCredito $notaCredito)
    {
        try {
            // Usar CompanyDataProvider para obtener datos desde .env
            $companyDataProvider = new \App\Services\CompanyDataProvider;
            $datosEmpresa = $companyDataProvider->getCompanyInfo();

            $html = view('pdf.nota-credito', [
                'nota' => $notaCredito,
                'cliente' => $notaCredito->cliente,
                'empresa' => $datosEmpresa,
                'datos_empresa' => $datosEmpresa, // Para compatibilidad con el template
            ])->render();

            // Usar DomPDF si está disponible
            if (class_exists('\Dompdf\Dompdf')) {
                $dompdf = new \Dompdf\Dompdf;
                $dompdf->loadHtml($html);
                $dompdf->setPaper('A4', 'portrait');
                $dompdf->render();
                $pdfContent = $dompdf->output();
            } else {
                // Fallback: guardar HTML como PDF
                $pdfContent = $html;
            }

            $notaCredito->update([
                'pdf' => base64_encode($pdfContent),
            ]);

            Log::info('PDF de nota de crédito generado', [
                'nota_credito_id' => $notaCredito->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Error generando PDF de nota de crédito', [
                'nota_credito_id' => $notaCredito->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generar PDF para Nota de Débito
     */
    private function generarPdfNotaDebito(NotaDebito $notaDebito)
    {
        try {
            // Usar CompanyDataProvider para obtener datos desde .env
            $companyDataProvider = new \App\Services\CompanyDataProvider;
            $datosEmpresa = $companyDataProvider->getCompanyInfo();

            $html = view('pdf.nota-debito', [
                'nota' => $notaDebito,
                'cliente' => $notaDebito->cliente,
                'empresa' => $datosEmpresa,
                'datos_empresa' => $datosEmpresa, // Para compatibilidad con el template
            ])->render();

            // Usar DomPDF si está disponible
            if (class_exists('\Dompdf\Dompdf')) {
                $dompdf = new \Dompdf\Dompdf;
                $dompdf->loadHtml($html);
                $dompdf->setPaper('A4', 'portrait');
                $dompdf->render();
                $pdfContent = $dompdf->output();
            } else {
                // Fallback: guardar HTML como PDF
                $pdfContent = $html;
            }

            $notaDebito->update([
                'pdf' => base64_encode($pdfContent),
            ]);

            Log::info('PDF de nota de débito generado', [
                'nota_debito_id' => $notaDebito->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Error generando PDF de nota de débito', [
                'nota_debito_id' => $notaDebito->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generar XML de Nota de Crédito (sin enviar a SUNAT)
     */
    public function generarXmlNotaCredito($notaCreditoId)
    {
        try {
            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($notaCreditoId);

            if ($notaCredito->estado !== 'pendiente') {
                throw new \Exception('Solo se puede generar XML para notas pendientes');
            }

            // Obtener comprobante de referencia
            $comprobanteRef = Comprobante::where('serie', $notaCredito->serie_comprobante_ref)
                ->where('correlativo', $notaCredito->numero_comprobante_ref)
                ->first();

            if (! $comprobanteRef) {
                throw new \Exception('No se encontró el comprobante de referencia');
            }

            // Construir documento Greenter
            $note = $this->construirNotaCredito($notaCredito, $comprobanteRef);

            // Obtener instancia de See desde GreenterService
            $see = $this->greenterService->getSee();

            // Generar XML firmado (sin enviar)
            $xmlFirmado = $see->getXmlSigned($note);

            // Guardar XML
            $notaCredito->update([
                'estado' => 'generado',
                'xml' => $xmlFirmado,
                'hash' => hash('sha256', $xmlFirmado),
            ]);

            // Generar PDF
            $this->generarPdfNotaCredito($notaCredito);

            Log::info('XML de nota de crédito generado', [
                'nota_credito_id' => $notaCredito->id,
                'numero' => $notaCredito->serie.'-'.$notaCredito->numero,
            ]);

            return [
                'success' => true,
                'message' => 'XML generado exitosamente',
                'data' => $notaCredito->fresh(),
            ];

        } catch (\Exception $e) {
            Log::error('Error generando XML de nota de crédito', [
                'nota_credito_id' => $notaCreditoId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al generar XML',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Generar XML de Nota de Débito (sin enviar a SUNAT)
     */
    public function generarXmlNotaDebito($notaDebitoId)
    {
        try {
            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($notaDebitoId);

            if ($notaDebito->estado !== 'pendiente') {
                throw new \Exception('Solo se puede generar XML para notas pendientes');
            }

            // Obtener comprobante de referencia
            $comprobanteRef = Comprobante::where('serie', $notaDebito->serie_comprobante_ref)
                ->where('correlativo', $notaDebito->numero_comprobante_ref)
                ->first();

            if (! $comprobanteRef) {
                throw new \Exception('No se encontró el comprobante de referencia');
            }

            // Construir documento Greenter
            $note = $this->construirNotaDebito($notaDebito, $comprobanteRef);

            // Obtener instancia de See desde GreenterService
            $see = $this->greenterService->getSee();

            // Generar XML firmado (sin enviar)
            $xmlFirmado = $see->getXmlSigned($note);

            // Guardar XML
            $notaDebito->update([
                'estado' => 'generado',
                'xml' => $xmlFirmado,
                'hash' => hash('sha256', $xmlFirmado),
            ]);

            // Generar PDF
            $this->generarPdfNotaDebito($notaDebito);

            Log::info('XML de nota de débito generado', [
                'nota_debito_id' => $notaDebito->id,
                'numero' => $notaDebito->serie.'-'.$notaDebito->numero,
            ]);

            return [
                'success' => true,
                'message' => 'XML generado exitosamente',
                'data' => $notaDebito->fresh(),
            ];

        } catch (\Exception $e) {
            Log::error('Error generando XML de nota de débito', [
                'nota_debito_id' => $notaDebitoId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al generar XML',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Consultar estado de nota de crédito en SUNAT
     */
    public function consultarEstadoNotaCredito($notaCreditoId)
    {
        try {
            $notaCredito = NotaCredito::findOrFail($notaCreditoId);

            if (!$notaCredito->xml) {
                throw new \Exception('La nota no tiene XML generado');
            }

            // Obtener instancia de See
            $see = $this->greenterService->getSee();

            // Consultar estado
            $result = $see->getStatus(
                $notaCredito->serie . '-' . $notaCredito->numero,
                '07' // Tipo: Nota de Crédito
            );

            if ($result->isSuccess()) {
                $cdr = $result->getCdrResponse();
                
                return [
                    'success' => true,
                    'message' => 'Consulta exitosa',
                    'data' => [
                        'codigo' => $cdr->getCode(),
                        'descripcion' => $cdr->getDescription(),
                        'estado' => $notaCredito->estado,
                    ],
                ];
            } else {
                $error = $result->getError();
                
                return [
                    'success' => false,
                    'message' => 'Error en la consulta',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error consultando estado de nota de crédito', [
                'nota_credito_id' => $notaCreditoId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al consultar estado',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obtener schemeID correcto según tipo de documento y serie
     */
    private function obtenerSchemeID($tipoDocumento, $numeroDocumento, $serie)
    {
        // Limpiar el número de documento
        $numeroDocumento = trim($numeroDocumento);
        $longitudDoc = strlen($numeroDocumento);
        
        // Determinar si es boleta o factura según la serie
        $esBoleta = substr($serie, 0, 1) === 'B';
        
        // Primero validar por longitud del documento (más confiable)
        if ($longitudDoc == 8) {
            return '1'; // DNI
        } elseif ($longitudDoc == 11) {
            return '6'; // RUC
        } elseif ($longitudDoc == 12) {
            return '4'; // Carnet de extranjería
        } elseif ($longitudDoc == 15) {
            return '7'; // Pasaporte
        }
        
        // Si el tipo de documento ya es un código válido, usarlo
        if (in_array($tipoDocumento, ['1', '4', '6', '7', 'A'], true)) {
            return $tipoDocumento;
        }
        
        // Si es boleta y no se pudo determinar, forzar DNI
        if ($esBoleta) {
            Log::warning('Boleta sin tipo de documento válido, forzando DNI', [
                'serie' => $serie,
                'tipo_documento' => $tipoDocumento,
                'numero_documento' => $numeroDocumento,
                'longitud' => $longitudDoc,
            ]);
            return '1'; // Forzar DNI para boletas
        }
        
        // Por defecto, usar DNI y registrar advertencia
        Log::warning('Tipo de documento no reconocido, usando DNI por defecto', [
            'serie' => $serie,
            'tipo_documento' => $tipoDocumento,
            'numero_documento' => $numeroDocumento,
            'longitud' => $longitudDoc,
        ]);
        return '1';
    }

    /**
     * Convertir número a letras
     */
    private function numeroALetras($numero)
    {
        $entero = floor($numero);
        $decimales = round(($numero - $entero) * 100);
        
        return strtoupper($this->convertirEntero($entero)) . ' CON ' . str_pad($decimales, 2, '0', STR_PAD_LEFT) . '/100 SOLES';
    }

    private function convertirEntero($numero)
    {
        $unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        $decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        $especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        
        if ($numero == 0) return 'CERO';
        if ($numero < 10) return $unidades[$numero];
        if ($numero >= 10 && $numero < 20) return $especiales[$numero - 10];
        if ($numero >= 20 && $numero < 100) {
            $dec = floor($numero / 10);
            $uni = $numero % 10;
            return $decenas[$dec] . ($uni > 0 ? ' Y ' . $unidades[$uni] : '');
        }
        if ($numero >= 100 && $numero < 1000) {
            $cen = floor($numero / 100);
            $resto = $numero % 100;
            $centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
            if ($numero == 100) return 'CIEN';
            return $centenas[$cen] . ($resto > 0 ? ' ' . $this->convertirEntero($resto) : '');
        }
        if ($numero >= 1000) {
            $mil = floor($numero / 1000);
            $resto = $numero % 1000;
            $textoMil = $mil == 1 ? 'MIL' : $this->convertirEntero($mil) . ' MIL';
            return $textoMil . ($resto > 0 ? ' ' . $this->convertirEntero($resto) : '');
        }
        
        return '';
    }
}
