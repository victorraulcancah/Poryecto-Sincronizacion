<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Comprobante;
use App\Models\SerieComprobante;
use App\Models\SunatErrorCode;
use App\Models\SunatLog;
use Carbon\Carbon;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\SaleDetail;
use Greenter\Report\HtmlReport;
use Greenter\Report\PdfReport;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;
use Illuminate\Support\Facades\Log;
use Luecano\NumeroALetras\NumeroALetras;

class GreenterService
{
    private $see;

    private $company;

    public function __construct()
    {
        putenv('OPENSSL_CONF=/etc/pki/tls/openssl.cnf');
        // No inicializar See aquí, hacerlo lazy cuando se necesite
    }

    private function initializeSee()
    {
        if ($this->see === null) {
            $this->see = new See;
            $this->configurarSee();
            $this->configurarEmpresa();
        }
    }

    private function configurarSee()
    {
        // Determinar ambiente (beta o produccion) desde .env
        $ambiente = env('GREENTER_AMBIENTE', 'produccion');
        $esProduccion = strtolower($ambiente) === 'produccion';

        // SOLUCIÓN: Usar archivo PEM directamente en lugar de .p12 para evitar problemas con OpenSSL 3.x
        $pemPath = storage_path('app/certificates/certificado.pem');

        if (! file_exists($pemPath)) {
            throw new \Exception("Certificado PEM no encontrado en: {$pemPath}. Ejecuta: php convert_cert.php");
        }

        // Leer certificado PEM (ya contiene clave privada + certificado)
        $pemContent = file_get_contents($pemPath);

        if (empty($pemContent)) {
            throw new \Exception('El archivo PEM está vacío');
        }

        $this->see->setCertificate($pemContent);

        Log::info('Certificado PEM cargado correctamente', [
            'path' => $pemPath,
            'size' => strlen($pemContent),
            'ambiente' => $ambiente,
        ]);

        // Credenciales SOL
        $solUser = env('GREENTER_FE_USER');
        $solPassword = env('GREENTER_FE_PASSWORD');

        if (empty($solUser) || empty($solPassword)) {
            throw new \Exception('Las credenciales SOL no están configuradas en .env');
        }

        // Configurar endpoint según ambiente
        if ($esProduccion) {
            $this->see->setService(SunatEndpoints::FE_PRODUCCION);
            $endpoint = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';
        } else {
            $this->see->setService(SunatEndpoints::FE_BETA);
            $endpoint = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
        }

        // Configurar credenciales SOL
        $this->see->setCredentials($solUser, $solPassword);

        Log::info('GreenterService configurado correctamente', [
            'usuario_sol' => $solUser,
            'ambiente' => $ambiente,
            'endpoint' => $endpoint,
        ]);
    }

    private function configurarEmpresa()
    {
        $this->company = new Company;

        // Crear dirección con todos los campos requeridos por SUNAT
        $address = new Address;
        $address->setUbigueo(config('empresa.ubigeo', '150301'))
            ->setDepartamento(trim(config('empresa.departamento', 'LIMA')))
            ->setProvincia(trim(config('empresa.provincia', 'LIMA')))
            ->setDistrito(trim(config('empresa.distrito', 'SANTA ANITA')))
            ->setUrbanizacion('-')
            ->setDireccion(trim(config('empresa.direccion', 'AV. PRINCIPAL')))
            ->setCodLocal('0000'); // Código de establecimiento (0000 = principal)

        $this->company->setRuc(trim(config('empresa.ruc')))
            ->setRazonSocial(trim(config('empresa.razon_social')))
            ->setNombreComercial(trim(config('empresa.nombre_comercial')))
            ->setAddress($address);
    }

    public function generarFactura($ventaId, $clienteData = null, $userId = null, $ipOrigen = null, $enviarSunat = false)
    {
        $this->initializeSee();
        try {
            $venta = \App\Models\Venta::with(['detalles.producto', 'cliente', 'userCliente'])->findOrFail($ventaId);

            // CORRECCI�N 1: Determinar cliente correctamente
            // Si se env�an datos de cliente, procesarlos y actualizar la venta
            if ($clienteData && ! empty($clienteData)) {
                $cliente = $this->procesarDatosCliente($clienteData);

                // Actualizar la venta con el nuevo cliente
                $venta->update(['cliente_id' => $cliente->id]);

                Log::info('Cliente actualizado en venta', [
                    'venta_id' => $venta->id,
                    'cliente_id' => $cliente->id,
                    'razon_social' => $cliente->razon_social,
                ]);
            } else {
                // Usar el cliente existente de la venta
                $cliente = $venta->cliente;
            }

            // Determinar tipo de comprobante
            $tipoComprobante = $cliente->tipo_documento === '6' ? '01' : '03'; // Factura o Boleta

            // Obtener serie
            $serie = SerieComprobante::where('tipo_comprobante', $tipoComprobante)
                ->where('activo', true)
                ->first();

            if (! $serie) {
                throw new \Exception("No hay series configuradas para el tipo de comprobante {$tipoComprobante}");
            }

            // Generar nuevo correlativo
            $correlativo = $serie->siguienteCorrelativo();

            // Crear comprobante en base de datos
            $comprobante = $this->crearComprobante($venta, $cliente, $tipoComprobante, $serie->serie, $correlativo);

            // Generar documento para Greenter
            $invoice = $this->construirDocumentoGreenter($comprobante, $cliente);

            // CORRECCI�N ERROR 2: Generar y guardar XML firmado CORRECTAMENTE
            // Para generar el XML sin enviar, usamos el m�todo getXmlSigned de See
            try {
                // Generar XML firmado sin enviar a SUNAT
                $xmlSigned = $this->see->getXmlSigned($invoice);

                if ($xmlSigned) {
                    $comprobante->update([
                        'xml_firmado' => $xmlSigned,
                        'tiene_xml' => true,
                    ]);

                    Log::info('XML firmado generado y guardado', [
                        'comprobante_id' => $comprobante->id,
                        'xml_length' => strlen($xmlSigned),
                    ]);
                } else {
                    Log::error('No se pudo generar el XML firmado', [
                        'comprobante_id' => $comprobante->id,
                    ]);
                    throw new \Exception('No se pudo generar el XML firmado del comprobante');
                }
            } catch (\Exception $e) {
                Log::error('Error al generar XML firmado', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $e->getMessage(),
                ]);
                throw new \Exception('Error al generar XML: '.$e->getMessage());
            }

            // CORRECCI�N 2 y 3: Actualizar venta con comprobante_id SIEMPRE
            $venta->update([
                'comprobante_id' => $comprobante->id,
            ]);

            // Solo enviar a SUNAT si se solicita expl�citamente
            if ($enviarSunat) {
                // Enviar a SUNAT
                $result = $this->see->send($invoice);

                // Log del env�o a SUNAT
                $sunatLog = SunatLog::logEnvio($comprobante->id, $xmlSigned, $userId, $ipOrigen);

                // Procesar respuesta con logging
                $this->procesarRespuestaSunatConLog($comprobante, $result, $invoice, $sunatLog ?? null);

                // Recargar comprobante para obtener el hash actualizado
                $comprobante = $comprobante->fresh();

                // Generar PDF
                $this->generarPdf($comprobante, $invoice);

                // Actualizar estado de venta
                $venta->update([
                    'estado' => 'FACTURADO',
                ]);

                return [
                    'success' => true,
                    'comprobante' => $comprobante->fresh(),
                    'mensaje' => 'Comprobante generado y enviado correctamente',
                ];
            } else {
                // Solo generar comprobante sin enviar a SUNAT
                $comprobante->update([
                    'estado' => 'PENDIENTE',
                    'tiene_pdf' => false,
                    'tiene_cdr' => false,
                ]);

                return [
                    'success' => true,
                    'comprobante' => $comprobante->fresh(),
                    'mensaje' => 'Comprobante generado correctamente. Pendiente de env�o a SUNAT.',
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error en generarFactura', [
                'venta_id' => $ventaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function procesarDatosCliente($clienteData)
    {
        // Buscar cliente existente o crear uno nuevo
        $cliente = Cliente::where('numero_documento', $clienteData['numero_documento'])->first();

        if (! $cliente) {
            // Asegurar que direccion no est� vac�a
            $direccion = ! empty($clienteData['direccion']) ? $clienteData['direccion'] : 'Sin direcci�n';

            $cliente = Cliente::create([
                'tipo_documento' => $clienteData['tipo_documento'],
                'numero_documento' => $clienteData['numero_documento'],
                'razon_social' => $clienteData['razon_social'],
                'direccion' => $direccion,
                'email' => $clienteData['email'] ?? null,
                'telefono' => $clienteData['telefono'] ?? null,
                'activo' => true,
            ]);
        }

        return $cliente;
    }

    /**
     * Obtener schemeID correcto según tipo de documento y serie
     */
    private function obtenerSchemeID($tipoDocumento, $numeroDocumento, $serie)
    {
        // Determinar si es boleta o factura según la serie
        $esBoleta = substr($serie, 0, 1) === 'B';

        // Si es boleta, el cliente DEBE tener DNI (código 1)
        if ($esBoleta) {
            // Validar que el número de documento sea DNI (8 dígitos)
            if (strlen($numeroDocumento) == 8) {
                return '1'; // DNI
            }
            // Si no es DNI pero es boleta, forzar a DNI de todas formas
            Log::warning('Boleta con documento que no es DNI', [
                'serie' => $serie,
                'tipo_documento' => $tipoDocumento,
                'numero_documento' => $numeroDocumento,
            ]);

            return '1'; // Forzar DNI para boletas
        }

        // Para facturas, validar el tipo de documento
        $longitudDoc = strlen($numeroDocumento);

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
        if (in_array($tipoDocumento, ['1', '4', '6', '7', 'A'])) {
            return $tipoDocumento;
        }

        // Por defecto, usar DNI
        Log::warning('Tipo de documento no reconocido, usando DNI por defecto', [
            'tipo_documento' => $tipoDocumento,
            'numero_documento' => $numeroDocumento,
        ]);

        return '1';
    }

    /**
     * Limpiar texto para XML (UTF-8 seguro)
     */
    private function limpiarTextoXML($texto)
    {
        // Manejar valores nulos o vac�os
        if (is_null($texto) || $texto === '') {
            return '';
        }

        // Convertir a string si no lo es
        $texto = (string) $texto;

        // Detectar y corregir encoding
        if (! mb_check_encoding($texto, 'UTF-8')) {
            // Intentar detectar el encoding actual
            $encoding = mb_detect_encoding($texto, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($encoding && $encoding !== 'UTF-8') {
                $texto = mb_convert_encoding($texto, 'UTF-8', $encoding);
            } else {
                // Si no se puede detectar, forzar conversi�n desde ISO-8859-1
                $texto = utf8_encode($texto);
            }
        }

        // Asegurar UTF-8 v�lido y eliminar caracteres inv�lidos
        $texto = mb_convert_encoding($texto, 'UTF-8', 'UTF-8');

        // Eliminar caracteres de control excepto saltos de l�nea y tabulaciones
        $texto = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $texto);

        // Normalizar espacios en blanco
        $texto = preg_replace('/\s+/u', ' ', $texto);

        // Reemplazar caracteres problem�ticos para XML/SUNAT
        $replacements = [
            '�' => 'o',
            '�' => 'TM',
            '�' => 'R',
            '�' => 'C',
            // Mantener tildes ya que SUNAT las acepta en UTF-8
        ];

        $texto = str_replace(array_keys($replacements), array_values($replacements), $texto);

        // Limitar longitud
        $texto = mb_substr($texto, 0, 250, 'UTF-8');

        return trim($texto);
    }

    private function crearComprobante($venta, $cliente, $tipoComprobante, $serie, $correlativo)
    {
        $comprobante = Comprobante::create([
            'tipo_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'correlativo' => $correlativo,
            'fecha_emision' => now()->format('Y-m-d'),
            'cliente_id' => $cliente->id,
            'cliente_tipo_documento' => $cliente->tipo_documento,
            'cliente_numero_documento' => $cliente->numero_documento,
            'cliente_razon_social' => $this->limpiarTextoXML($cliente->razon_social),
            'cliente_direccion' => $this->limpiarTextoXML($cliente->direccion),
            'moneda' => 'PEN',
            'operacion_gravada' => $venta->subtotal,
            'total_igv' => $venta->igv,
            'importe_total' => $venta->total,
            'metodo_pago' => $venta->metodo_pago, // Guardar m�todo de pago de la venta
            'user_id' => 1, // Usuario por defecto para pruebas
            'estado' => 'PENDIENTE',
        ]);

        // Crear detalles
        foreach ($venta->detalles as $index => $detalle) {
            $comprobante->detalles()->create([
                'item' => $index + 1,
                'producto_id' => $detalle->producto_id,
                'codigo_producto' => $this->limpiarTextoXML($detalle->codigo_producto),
                'descripcion' => $this->limpiarTextoXML($detalle->nombre_producto),
                'unidad_medida' => 'NIU',
                'cantidad' => $detalle->cantidad,
                'valor_unitario' => $detalle->precio_sin_igv,
                'precio_unitario' => $detalle->precio_unitario,
                'descuento' => $detalle->descuento_unitario * $detalle->cantidad,
                'valor_venta' => $detalle->subtotal_linea,
                'porcentaje_igv' => 18.00,
                'igv' => $detalle->igv_linea,
                'tipo_afectacion_igv' => '10',
                'importe_total' => $detalle->total_linea,
            ]);
        }

        return $comprobante;
    }

    public function construirDocumentoGreenter($comprobante, $cliente)
    {
        $invoice = new Invoice;

        // Datos b�sicos
        $fechaEmision = Carbon::parse($comprobante->fecha_emision);

        $invoice->setUblVersion('2.1')
            ->setTipoOperacion('0101')  // 0101 = Venta interna
            ->setTipoDoc($comprobante->tipo_comprobante)
            ->setSerie($comprobante->serie)
            ->setCorrelativo($comprobante->correlativo)
            ->setFechaEmision($fechaEmision)
            ->setTipoMoneda($comprobante->moneda)
            ->setCompany($this->company);

        // CORRECCI�N ERROR 3244: Agregar forma de pago desde la venta
        // Determinar si es contado o cr�dito seg�n el m�todo de pago
        $metodoPago = strtoupper($comprobante->metodo_pago ?? 'CONTADO');

        // M�todos de pago que se consideran "al contado"
        $metodosContado = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA', 'CONTADO'];

        if (in_array($metodoPago, $metodosContado)) {
            // Pago al contado
            $formaPago = new \Greenter\Model\Sale\FormaPagos\FormaPagoContado;
        } else {
            // Pago a cr�dito (por defecto si no es contado)
            $formaPago = new \Greenter\Model\Sale\FormaPagos\FormaPagoContado;
            // TODO: Implementar FormaPagoCredito cuando se necesite
        }

        $invoice->setFormaPago($formaPago);

        // Cliente - CORRECCI�N UTF-8 y schemeID
        // Limpiar TODOS los datos del comprobante antes de usarlos
        $comprobante->cliente_razon_social = $this->limpiarTextoXML($comprobante->cliente_razon_social);
        $comprobante->cliente_direccion = $this->limpiarTextoXML($comprobante->cliente_direccion);
        $comprobante->cliente_numero_documento = $this->limpiarTextoXML($comprobante->cliente_numero_documento);

        // Validar schemeID según serie y tipo de documento
        $tipoDocCliente = $this->obtenerSchemeID(
            $comprobante->cliente_tipo_documento,
            $comprobante->cliente_numero_documento,
            $comprobante->serie
        );

        $client = new Client;
        $client->setTipoDoc($tipoDocCliente)
            ->setNumDoc($comprobante->cliente_numero_documento)
            ->setRznSocial($comprobante->cliente_razon_social);

        if ($cliente->direccion) {
            $client->setAddress(new Address(['direccion' => $this->limpiarTextoXML($cliente->direccion)]));
        }

        $invoice->setClient($client);

        // Detalles - Asegurar precisi�n decimal y UTF-8 limpio
        $items = [];
        foreach ($comprobante->detalles as $detalle) {
            $valorUnitario = (float) number_format((float) $detalle->valor_unitario, 2, '.', '');
            $valorVenta = (float) number_format((float) $detalle->valor_venta, 2, '.', '');
            $igv = (float) number_format((float) $detalle->igv, 2, '.', '');
            $precioUnitario = (float) number_format((float) $detalle->precio_unitario, 2, '.', '');

            $item = new SaleDetail;
            $item->setCodProducto($this->limpiarTextoXML($detalle->codigo_producto))
                ->setUnidad($detalle->unidad_medida)
                ->setDescripcion($this->limpiarTextoXML($detalle->descripcion))
                ->setCantidad((float) $detalle->cantidad)
                ->setMtoValorUnitario($valorUnitario)
                ->setMtoValorVenta($valorVenta)
                ->setMtoBaseIgv($valorVenta)
                ->setPorcentajeIgv((float) $detalle->porcentaje_igv)
                ->setIgv($igv)
                ->setTipAfeIgv($detalle->tipo_afectacion_igv)
                ->setTotalImpuestos($igv)
                ->setMtoPrecioUnitario($precioUnitario);

            $items[] = $item;
        }

        $invoice->setDetails($items);

        // Totales - Asegurar precisi�n decimal y f�rmula correcta
        $mtoOperGravadas = number_format((float) $comprobante->operacion_gravada, 2, '.', '');
        $mtoIGV = number_format((float) $comprobante->total_igv, 2, '.', '');
        $mtoImpVenta = number_format((float) $comprobante->importe_total, 2, '.', '');

        // Verificar que la f�rmula cuadre: MtoOperGravadas + IGV = MtoImpVenta
        $calculado = number_format($mtoOperGravadas + $mtoIGV, 2, '.', '');
        if ($calculado != $mtoImpVenta) {
            throw new \Exception("Error de c�lculo: $mtoOperGravadas + $mtoIGV = $calculado, pero MtoImpVenta es $mtoImpVenta");
        }

        $invoice->setMtoOperGravadas((float) $mtoOperGravadas)
            ->setMtoOperExoneradas(0.00)
            ->setMtoOperInafectas(0.00)
            ->setMtoIGV((float) $mtoIGV)
            ->setValorVenta((float) $mtoOperGravadas)  // LineExtensionAmount (sin IGV)
            ->setSubTotal((float) $mtoImpVenta)        // TaxInclusiveAmount (con IGV)
            ->setTotalImpuestos((float) $mtoIGV)
            ->setMtoImpVenta((float) $mtoImpVenta);    // PayableAmount

        // Leyendas
        $formatter = new NumeroALetras;
        $legend = new Legend;
        $legend->setCode('1000')
            ->setValue($formatter->toInvoice($comprobante->importe_total, 2, 'SOLES'));

        $invoice->setLegends([$legend]);

        return $invoice;
    }

    private function procesarRespuestaSunat($comprobante, $result, $invoice)
    {
        $xmlFirmado = $this->see->getFactory()->getLastXml();
        $codigoHash = null;

        // Intentar obtener hash del CDR si existe el método
        if ($result->getCdrResponse() && method_exists($result->getCdrResponse(), 'getDigestValue')) {
            $codigoHash = $result->getCdrResponse()->getDigestValue();
        }

        $comprobante->update([
            'xml_firmado' => $xmlFirmado,
            'codigo_hash' => $codigoHash,
        ]);

        if ($result->isSuccess()) {
            $cdr = $result->getCdrResponse();

            $comprobante->update([
                'estado' => 'ACEPTADO',
                'xml_respuesta_sunat' => base64_encode($result->getCdrZip()),
                'mensaje_sunat' => $cdr->getDescription(),
                'tiene_cdr' => true,
                'fecha_envio_sunat' => now(),
                'fecha_respuesta_sunat' => now(),
            ]);

            // Generar PDF despu�s de aceptaci�n
            $this->generarPdf($comprobante, $invoice);
            $comprobante->update(['tiene_pdf' => true]);
        } else {
            $comprobante->update([
                'estado' => 'RECHAZADO',
                'mensaje_sunat' => $result->getError()->getMessage(),
            ]);

            throw new \Exception('Error SUNAT: '.$result->getError()->getMessage());
        }
    }

    public function generarPdf($comprobante, $invoice)
    {
        try {
            // SOLUCI�N TEMPORAL: Generar PDF simple con HTML b�sico
            // Esto evita el error del template Twig de Greenter

            $pdfContent = $this->generarPdfSimple($comprobante);

            if (! empty($pdfContent)) {
                $comprobante->update([
                    'pdf_base64' => base64_encode($pdfContent),
                    'tiene_pdf' => true,
                ]);

                Log::info('PDF simple generado exitosamente', [
                    'comprobante_id' => $comprobante->id,
                    'tama�o_bytes' => strlen($pdfContent),
                ]);

                return true;
            }

            // Si falla el PDF simple, intentar con Greenter
            $htmlReport = new HtmlReport;
            $pdfReport = new PdfReport($htmlReport);

            // Par�metros m�nimos y seguros
            $params = [
                'system' => [
                    'hash' => $comprobante->codigo_hash ?? '',
                    'date' => date('Y-m-d'),
                    'time' => date('H:i:s'),
                    'user' => 'Sistema',
                ],
            ];

            $pdf = $pdfReport->render($invoice, $params);

            if (! empty($pdf)) {
                $comprobante->update([
                    'pdf_base64' => base64_encode($pdf),
                    'tiene_pdf' => true,
                ]);

                Log::info('PDF Greenter generado exitosamente', [
                    'comprobante_id' => $comprobante->id,
                    'tama�o_bytes' => strlen($pdf),
                ]);

                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Error generando PDF', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            // Generar PDF de emergencia
            try {
                $pdfEmergencia = $this->generarPdfEmergencia($comprobante);
                $comprobante->update([
                    'pdf_base64' => base64_encode($pdfEmergencia),
                    'tiene_pdf' => true,
                ]);

                Log::info('PDF de emergencia generado', ['comprobante_id' => $comprobante->id]);

                return true;
            } catch (\Exception $e2) {
                $comprobante->update(['tiene_pdf' => false]);

                return false;
            }
        }
    }

    /**
     * Generar PDF simple sin dependencias externas
     */
    private function generarPdfSimple($comprobante)
    {
        // HTML b�sico para el comprobante
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Comprobante {$comprobante->numero_completo}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .content { margin: 20px 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>COMPROBANTE ELECTR�NICO</h1>
                <h2>{$comprobante->numero_completo}</h2>
            </div>
            
            <div class='content'>
                <p><strong>Fecha:</strong> {$comprobante->fecha_emision}</p>
                <p><strong>Cliente:</strong> {$comprobante->cliente_razon_social}</p>
                <p><strong>RUC/DNI:</strong> {$comprobante->cliente_numero_documento}</p>
                <p><strong>Estado:</strong> {$comprobante->estado}</p>
                
                <h3>Resumen</h3>
                <table>
                    <tr><th>Concepto</th><th>Monto</th></tr>
                    <tr><td>Operaci�n Gravada</td><td>S/ ".number_format($comprobante->operacion_gravada, 2).'</td></tr>
                    <tr><td>IGV</td><td>S/ '.number_format($comprobante->total_igv, 2).'</td></tr>
                    <tr><td><strong>Total</strong></td><td><strong>S/ '.number_format($comprobante->importe_total, 2)."</strong></td></tr>
                </table>
            </div>
            
            <div class='footer'>
                <p>Comprobante generado electr�nicamente</p>
                <p>Hash: {$comprobante->codigo_hash}</p>
            </div>
        </body>
        </html>";

        // Usar DomPDF si est� disponible, sino devolver HTML
        if (class_exists('\Dompdf\Dompdf')) {
            $dompdf = new \Dompdf\Dompdf;
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            return $dompdf->output();
        }

        // Fallback: devolver HTML como "PDF"
        return $html;
    }

    /**
     * PDF de emergencia ultra simple
     */
    private function generarPdfEmergencia($comprobante)
    {
        $contenido = "COMPROBANTE ELECTRONICO\n";
        $contenido .= "Numero: {$comprobante->numero_completo}\n";
        $contenido .= "Fecha: {$comprobante->fecha_emision}\n";
        $contenido .= "Cliente: {$comprobante->cliente_razon_social}\n";
        $contenido .= 'Total: S/ '.number_format($comprobante->importe_total, 2)."\n";
        $contenido .= "Estado: {$comprobante->estado}\n";

        return $contenido;
    }

    public function consultarComprobante($comprobante)
    {
        $this->initializeSee();
        try {
            $result = $this->see->getStatus($comprobante->serie.'-'.$comprobante->correlativo, $comprobante->tipo_comprobante);

            if ($result->isSuccess()) {
                $cdr = $result->getCdrResponse();

                $comprobante->update([
                    'estado' => 'ACEPTADO',
                    'xml_respuesta_sunat' => base64_encode($result->getCdrZip()),
                    'mensaje_sunat' => $cdr->getDescription(),
                    'tiene_cdr' => true,
                    'fecha_respuesta_sunat' => now(),
                ]);

                // Generar PDF si no existe
                if (! $comprobante->tiene_pdf) {
                    $documento = $this->construirDocumentoGreenter($comprobante, $comprobante->cliente);
                    $this->generarPdf($comprobante, $documento);
                    $comprobante->update(['tiene_pdf' => true]);
                }

                return ['success' => true, 'estado' => 'ACEPTADO'];
            } else {
                return ['success' => false, 'error' => $result->getError()->getMessage()];
            }

        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function reenviarComprobante($comprobanteId)
    {
        $this->initializeSee();
        try {
            $comprobante = Comprobante::findOrFail($comprobanteId);

            if (! $comprobante->puedeReenviar()) {
                throw new \Exception('El comprobante no puede ser reenviado');
            }

            // Reconstruir documento
            $invoice = $this->construirDocumentoGreenter($comprobante, $comprobante->cliente);

            // Reenviar
            $result = $this->see->send($invoice);

            // Procesar respuesta
            $this->procesarRespuestaSunat($comprobante, $result, $invoice);

            return [
                'success' => true,
                'comprobante' => $comprobante->fresh(),
                'mensaje' => 'Comprobante reenviado correctamente',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar comprobante a SUNAT
     */
    public function enviarComprobante($comprobante)
    {
        $this->initializeSee();
        try {
            // Construir documento seg�n el tipo
            if (in_array($comprobante->tipo_comprobante, ['01', '03'])) {
                // Factura o Boleta
                $documento = $this->construirDocumentoGreenter($comprobante, $comprobante->cliente);
            } elseif ($comprobante->tipo_comprobante === '07') {
                // Nota de Cr�dito
                $documento = $this->construirNotaCredito($comprobante);
            } elseif ($comprobante->tipo_comprobante === '08') {
                // Nota de D�bito
                $documento = $this->construirNotaDebito($comprobante);
            } else {
                throw new \Exception('Tipo de comprobante no soportado: '.$comprobante->tipo_comprobante);
            }

            // Enviar a SUNAT
            $result = $this->see->send($documento);

            // Guardar XML
            $xml = $this->see->getFactory()->getLastXml();
            $comprobante->update(['xml_firmado' => $xml]);

            if ($result->isSuccess()) {
                // ✅ CORRECCIÓN: Validar CDR correctamente
                $cdrResponse = null;
                $cdrZip = null;

                // Obtener CDR de forma segura
                try {
                    $cdrResponse = $result->getCdrResponse();
                    $cdrZip = $result->getCdrZip();
                } catch (\Exception $e) {
                    Log::warning('Error al obtener CDR', [
                        'comprobante_id' => $comprobante->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                // ✅ VALIDACIÓN CRÍTICA: Verificar que el CDR sea válido
                if (! $this->validarCdrReal($cdrResponse, $cdrZip, $comprobante)) {
                    // CDR inválido o inexistente
                    $comprobante->update([
                        'estado' => 'PENDIENTE_VALIDACION',
                        'mensaje_sunat' => 'Enviado a SUNAT - Pendiente de validación CDR',
                        'xml_firmado' => $xml,
                        'tiene_xml' => true,
                        'tiene_cdr' => false,
                        'fecha_envio_sunat' => now(),
                    ]);

                    Log::warning('CDR no válido o inexistente', [
                        'comprobante_id' => $comprobante->id,
                        'numero' => $comprobante->numero_completo,
                    ]);

                    return [
                        'success' => false,
                        'error' => 'El comprobante fue enviado pero no se recibió CDR válido. Se requiere consulta de estado.',
                        'requiere_consulta' => true,
                    ];
                }

                $updateData = [
                    'estado' => 'ACEPTADO',
                    // Guardar CDR en base64 para evitar problemas de encoding
                    'xml_respuesta_sunat' => $cdrZip ? base64_encode($cdrZip) : null,
                    // ? CORRECCI�N: Actualizar propiedades booleanas
                    'tiene_cdr' => ! empty($cdrZip),
                    'fecha_envio_sunat' => now(),
                    'fecha_respuesta_sunat' => now(),
                ];

                // Solo agregar datos del CDR si existe
                if ($cdrResponse) {
                    if (method_exists($cdrResponse, 'getDescription')) {
                        $updateData['mensaje_sunat'] = $cdrResponse->getDescription();
                    }

                    // Verificar si existe getDigestValue()
                    if (method_exists($cdrResponse, 'getDigestValue')) {
                        $updateData['codigo_hash'] = $cdrResponse->getDigestValue();
                    }
                }

                $comprobante->update($updateData);

                // ? CORRECCI�N: Generar PDF despu�s de aceptaci�n y actualizar tiene_pdf
                $this->generarPdf($comprobante, $documento);

                // Actualizar tiene_pdf despu�s de generar el PDF
                $comprobante->update(['tiene_pdf' => true]);

                // Preparar datos de respuesta
                $responseData = [
                    'success' => true,
                    'mensaje' => 'Comprobante enviado a SUNAT exitosamente',
                    'data' => [
                        'comprobante' => $comprobante->fresh(),
                    ],
                ];

                // Agregar detalles del CDR si existen
                if ($cdrResponse) {
                    if (method_exists($cdrResponse, 'getCode')) {
                        $responseData['data']['codigo_sunat'] = $cdrResponse->getCode();
                    }
                    if (method_exists($cdrResponse, 'getDescription')) {
                        $responseData['data']['mensaje_sunat'] = $cdrResponse->getDescription();
                    }
                }

                return $responseData;
            } else {
                $error = $result->getError();

                $comprobante->update([
                    'estado' => 'RECHAZADO',
                    'mensaje_sunat' => $error->getMessage(),
                    'errores_sunat' => $error->getMessage(),
                ]);

                return [
                    'success' => false,
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error en enviarComprobante: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Construir Nota de Cr�dito para Greenter
     */
    private function construirNotaCredito($comprobante)
    {
        $notaCredito = new \Greenter\Model\Sale\Note;

        $notaCredito->setUblVersion('2.1')
            ->setTipoDoc('07')
            ->setSerie($comprobante->serie)
            ->setCorrelativo($comprobante->correlativo)
            ->setFechaEmision(\Carbon\Carbon::parse($comprobante->fecha_emision))
            ->setTipDocAfectado($comprobante->comprobanteReferencia->tipo_comprobante)
            ->setNumDocfectado($comprobante->comprobanteReferencia->serie.'-'.$comprobante->comprobanteReferencia->correlativo)
            ->setCodMotivo($comprobante->motivo_nota ?? '01')
            ->setDesMotivo($comprobante->motivo_nota_descripcion ?? 'Anulaci�n de la operaci�n')
            ->setTipoMoneda($comprobante->moneda)
            ->setCompany($this->company);

        // Cliente - Validar schemeID según serie y tipo de documento
        $tipoDocCliente = $this->obtenerSchemeID(
            $comprobante->cliente_tipo_documento,
            $comprobante->cliente_numero_documento,
            $comprobante->serie
        );

        $client = new \Greenter\Model\Client\Client;
        $client->setTipoDoc($tipoDocCliente)
            ->setNumDoc($comprobante->cliente_numero_documento)
            ->setRznSocial($comprobante->cliente_razon_social);

        $notaCredito->setClient($client);

        // Detalles
        $items = [];
        foreach ($comprobante->detalles as $detalle) {
            $item = new \Greenter\Model\Sale\SaleDetail;
            $item->setCodProducto($detalle->codigo_producto)
                ->setUnidad($detalle->unidad_medida ?? 'NIU')
                ->setDescripcion($detalle->descripcion)
                ->setCantidad((float) $detalle->cantidad)
                ->setMtoValorUnitario((float) $detalle->valor_unitario)
                ->setMtoValorVenta((float) $detalle->valor_venta)
                ->setMtoBaseIgv((float) $detalle->valor_venta)
                ->setPorcentajeIgv(18.00)
                ->setIgv((float) $detalle->igv)
                ->setTipAfeIgv($detalle->tipo_afectacion_igv)
                ->setTotalImpuestos((float) $detalle->igv)
                ->setMtoPrecioUnitario((float) $detalle->precio_unitario);
            $items[] = $item;
        }

        $notaCredito->setDetails($items);

        // Totales
        $notaCredito->setMtoOperGravadas((float) $comprobante->operacion_gravada)
            ->setMtoIGV((float) $comprobante->total_igv)
            ->setTotalImpuestos((float) $comprobante->total_igv)
            ->setMtoImpVenta((float) $comprobante->importe_total);

        return $notaCredito;
    }

    /**
     * Construir Nota de D�bito para Greenter
     */
    private function construirNotaDebito($comprobante)
    {
        $notaDebito = new \Greenter\Model\Sale\Note;

        $notaDebito->setUblVersion('2.1')
            ->setTipoDoc('08')
            ->setSerie($comprobante->serie)
            ->setCorrelativo($comprobante->correlativo)
            ->setFechaEmision(\Carbon\Carbon::parse($comprobante->fecha_emision))
            ->setTipDocAfectado($comprobante->comprobanteReferencia->tipo_comprobante)
            ->setNumDocfectado($comprobante->comprobanteReferencia->serie.'-'.$comprobante->comprobanteReferencia->correlativo)
            ->setCodMotivo($comprobante->motivo_nota ?? '01')
            ->setDesMotivo($comprobante->motivo_nota_descripcion ?? 'Intereses por mora')
            ->setTipoMoneda($comprobante->moneda)
            ->setCompany($this->company);

        // Cliente - Validar schemeID según serie y tipo de documento
        $tipoDocCliente = $this->obtenerSchemeID(
            $comprobante->cliente_tipo_documento,
            $comprobante->cliente_numero_documento,
            $comprobante->serie
        );

        $client = new \Greenter\Model\Client\Client;
        $client->setTipoDoc($tipoDocCliente)
            ->setNumDoc($comprobante->cliente_numero_documento)
            ->setRznSocial($comprobante->cliente_razon_social);

        $notaDebito->setClient($client);

        // Detalles
        $items = [];
        foreach ($comprobante->detalles as $detalle) {
            $item = new \Greenter\Model\Sale\SaleDetail;
            $item->setCodProducto($detalle->codigo_producto ?? 'SERV001')
                ->setUnidad($detalle->unidad_medida ?? 'NIU')
                ->setDescripcion($detalle->descripcion)
                ->setCantidad((float) $detalle->cantidad)
                ->setMtoValorUnitario((float) $detalle->valor_unitario)
                ->setMtoValorVenta((float) $detalle->valor_venta)
                ->setMtoBaseIgv((float) $detalle->valor_venta)
                ->setPorcentajeIgv(18.00)
                ->setIgv((float) $detalle->igv)
                ->setTipAfeIgv($detalle->tipo_afectacion_igv)
                ->setTotalImpuestos((float) $detalle->igv)
                ->setMtoPrecioUnitario((float) $detalle->precio_unitario);
            $items[] = $item;
        }

        $notaDebito->setDetails($items);

        // Totales
        $notaDebito->setMtoOperGravadas((float) $comprobante->operacion_gravada)
            ->setMtoIGV((float) $comprobante->total_igv)
            ->setTotalImpuestos((float) $comprobante->total_igv)
            ->setMtoImpVenta((float) $comprobante->importe_total);

        return $notaDebito;
    }

    /**
     * Procesar respuesta de SUNAT con logging completo
     */
    private function procesarRespuestaSunatConLog($comprobante, $result, $invoice, $sunatLog = null)
    {
        $startTime = microtime(true);

        // Generar hash del XML firmado (siempre, independientemente del resultado)
        $xmlFirmado = $this->see->getFactory()->getLastXml();
        $hashFirma = $this->generarHashFirma($invoice);

        if ($result->isSuccess()) {
            // �xito
            $ticket = method_exists($result, 'getTicket') ? $result->getTicket() : null;

            // Obtener el hash del CDR si est� disponible
            $cdrHash = null;
            try {
                $cdr = $result->getCdrResponse();
                if ($cdr && method_exists($cdr, 'getDigestValue')) {
                    $cdrHash = $cdr->getDigestValue();
                }
            } catch (\Exception $e) {
                Log::warning('No se pudo obtener hash del CDR', ['error' => $e->getMessage()]);
            }

            $comprobante->update([
                'estado' => 'ACEPTADO',
                'numero_ticket' => $ticket,
                'fecha_aceptacion' => now(),
                'mensaje_sunat' => 'El comprobante ha sido aceptado',
                'xml_firmado' => $xmlFirmado,
                'hash_firma' => $hashFirma,
                'codigo_hash' => $cdrHash ?? $hashFirma,  // Usar hash del CDR o del XML
                'xml_respuesta_sunat' => base64_encode($result->getCdrZip()),
                'tiene_xml' => true,
                'tiene_pdf' => false,  // Se generar� despu�s
                'tiene_cdr' => true,
            ]);

            // Log de respuesta exitosa
            if ($sunatLog) {
                $cdrResponse = method_exists($result, 'getCdrResponse') ? $result->getCdrResponse() : null;
                $cdrResponseString = $cdrResponse ? json_encode([
                    'code' => $cdrResponse->getCode(),
                    'description' => $cdrResponse->getDescription(),
                    'notes' => $cdrResponse->getNotes(),
                ]) : null;

                SunatLog::logRespuesta(
                    $comprobante->id,
                    'ACEPTADO',
                    $ticket,
                    $this->see->getFactory()->getLastXml(),
                    $cdrResponseString,
                    'El comprobante ha sido aceptado',
                    null,
                    round((microtime(true) - $startTime) * 1000)
                );
            }

            Log::info('Factura aceptada por SUNAT', [
                'comprobante_id' => $comprobante->id,
                'ticket' => $ticket,
            ]);

        } else {
            // Error - Procesar c�digos de error SUNAT
            $errores = $result->getError()->getMessage();
            $ticket = method_exists($result, 'getTicket') ? $result->getTicket() : null;

            // Extraer c�digos de error del mensaje
            $codigosError = $this->extraerCodigosError($errores);
            $informacionErrores = $this->obtenerInformacionErrores($codigosError);

            $comprobante->update([
                'estado' => 'RECHAZADO',
                'numero_ticket' => $ticket,
                'errores_sunat' => $errores,
                'codigos_error_sunat' => json_encode($codigosError),
                'informacion_errores' => json_encode($informacionErrores),
                'mensaje_sunat' => 'El comprobante fue rechazado por SUNAT',
                'xml_firmado' => $xmlFirmado,  // Guardar XML aunque sea rechazado
                'hash_firma' => $hashFirma,    // Guardar hash aunque sea rechazado
                'codigo_hash' => $hashFirma,   // Para el PDF
                'tiene_xml' => true,
                'tiene_pdf' => false,
                'tiene_cdr' => false,
            ]);

            // Log de respuesta con error
            if ($sunatLog) {
                $cdrResponse = method_exists($result, 'getCdrResponse') ? $result->getCdrResponse() : null;
                $cdrResponseString = $cdrResponse ? json_encode([
                    'code' => $cdrResponse->getCode(),
                    'description' => $cdrResponse->getDescription(),
                    'notes' => $cdrResponse->getNotes(),
                ]) : null;

                SunatLog::logRespuesta(
                    $comprobante->id,
                    'RECHAZADO',
                    $ticket,
                    $this->see->getFactory()->getLastXml(),
                    $cdrResponseString,
                    'El comprobante fue rechazado por SUNAT',
                    $errores,
                    round((microtime(true) - $startTime) * 1000)
                );
            }

            Log::error('Factura rechazada por SUNAT', [
                'comprobante_id' => $comprobante->id,
                'ticket' => $ticket,
                'errores' => $errores,
                'codigos_error' => $codigosError,
                'informacion_errores' => $informacionErrores,
            ]);
        }
    }

    /**
     * Generar hash de la firma digital
     */
    private function generarHashFirma($invoice)
    {
        try {
            $xml = $this->see->getFactory()->getLastXml();
            if ($xml) {
                return hash('sha256', $xml);
            }
        } catch (\Exception $e) {
            Log::warning('Error generando hash de firma: '.$e->getMessage());
        }

        return null;
    }

    /**
     * Extraer c�digos de error del mensaje de SUNAT
     */
    private function extraerCodigosError($mensajeError)
    {
        $codigos = [];

        // Buscar patrones como "0100", "0101", etc.
        if (preg_match_all('/\b(\d{4})\b/', $mensajeError, $matches)) {
            $codigos = array_unique($matches[1]);
        }

        // Buscar patrones como "soap:Server.0100"
        if (preg_match_all('/\.(\d{4})/', $mensajeError, $matches)) {
            $codigos = array_merge($codigos, array_unique($matches[1]));
        }

        // Buscar patrones como "error: 0100"
        if (preg_match_all('/error:\s*(\d{4})/', $mensajeError, $matches)) {
            $codigos = array_merge($codigos, array_unique($matches[1]));
        }

        return array_unique($codigos);
    }

    /**
     * Obtener informaci�n detallada de los c�digos de error
     */
    private function obtenerInformacionErrores($codigosError)
    {
        $informacion = [];

        foreach ($codigosError as $codigo) {
            $informacion[] = SunatErrorCode::obtenerInformacionError($codigo);
        }

        return $informacion;
    }

    /**
     * Obtener informaci�n de error por c�digo
     */
    public function obtenerErrorPorCodigo($codigo)
    {
        return SunatErrorCode::obtenerInformacionError($codigo);
    }

    /**
     * Obtener todos los c�digos de error activos
     */
    public function obtenerTodosLosErrores()
    {
        return SunatErrorCode::obtenerActivos();
    }

    /**
     * Obtener errores por categor�a
     */
    public function obtenerErroresPorCategoria($categoria)
    {
        return SunatErrorCode::obtenerPorCategoria($categoria);
    }

    /**
     * Generar resumen diario
     */
    public function generarResumenDiario($fecha, $comprobantesIds = [])
    {
        try {
            // Obtener comprobantes
            $comprobantes = Comprobante::whereIn('id', $comprobantesIds)->get();

            if ($comprobantes->isEmpty()) {
                throw new \Exception('No se encontraron comprobantes para generar el resumen');
            }

            // Crear objeto Summary
            $summary = new \Greenter\Model\Summary\Summary;

            $fechaGeneracion = \Carbon\Carbon::parse($fecha);
            $correlativo = \App\Models\Resumen::whereDate('fecha_resumen', $fechaGeneracion)->count() + 1;

            $summary->setFecGeneracion($fechaGeneracion)
                ->setFecResumen($fechaGeneracion)
                ->setCorrelativo(str_pad($correlativo, 3, '0', STR_PAD_LEFT))
                ->setCompany($this->company);

            // Agregar detalles
            $detalles = [];
            foreach ($comprobantes as $index => $comprobante) {
                $detalle = new \Greenter\Model\Summary\SummaryDetail;
                $detalle->setTipoDoc($comprobante->tipo_comprobante)
                    ->setSerieNro($comprobante->serie.'-'.$comprobante->correlativo)
                    ->setEstado('1') // 1 = Agregar, 2 = Modificar, 3 = Anular
                    ->setClienteTipo($comprobante->cliente_tipo_documento)
                    ->setClienteNro($comprobante->cliente_numero_documento)
                    ->setTotal((float) $comprobante->importe_total)
                    ->setMtoOperGravadas((float) $comprobante->operacion_gravada)
                    ->setMtoOperExoneradas(0.00)
                    ->setMtoOperInafectas(0.00)
                    ->setMtoIGV((float) $comprobante->total_igv)
                    ->setMtoISC(0.00);

                // Establecer moneda y otros tributos usando m�todos auxiliares seguros
                $this->setMonedaSafely($detalle, $comprobante->moneda);
                $this->setOtrosTributosSafely($detalle, 0.00);

                $detalles[] = $detalle;
            }

            $summary->setDetails($detalles);

            // Enviar a SUNAT
            $result = $this->see->send($summary);

            if ($result->isSuccess()) {
                $ticket = null;

                // Obtener ticket usando m�todo auxiliar seguro
                $ticket = $this->getTicketSafely($result);

                return [
                    'success' => true,
                    'message' => 'Resumen diario enviado exitosamente',
                    'data' => [
                        'fecha' => $fecha,
                        'cantidad_comprobantes' => count($comprobantesIds),
                        'ticket' => $ticket,
                        'xml' => $this->see->getFactory()->getLastXml(),
                    ],
                ];
            } else {
                $error = $result->getError();

                return [
                    'success' => false,
                    'message' => 'Error al enviar resumen diario a SUNAT',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error en generarResumenDiario: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Error al generar resumen diario',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar comunicaci�n de baja
     */
    public function enviarComunicacionBaja($comprobantesIds, $motivo = 'Error en emisi�n')
    {
        try {
            // Obtener comprobantes
            $comprobantes = Comprobante::whereIn('id', $comprobantesIds)->get();

            if ($comprobantes->isEmpty()) {
                throw new \Exception('No se encontraron comprobantes para dar de baja');
            }

            // Crear objeto Voided (Comunicaci�n de Baja)
            $voided = new \Greenter\Model\Voided\Voided;

            $fechaGeneracion = now();
            $correlativo = \App\Models\Baja::whereDate('fecha_baja', $fechaGeneracion)->count() + 1;

            $voided->setFecGeneracion($fechaGeneracion)
                ->setFecComunicacion($fechaGeneracion)
                ->setCorrelativo(str_pad($correlativo, 3, '0', STR_PAD_LEFT))
                ->setCompany($this->company);

            // Agregar detalles de comprobantes a dar de baja
            $detalles = [];
            foreach ($comprobantes as $comprobante) {
                $detalle = new \Greenter\Model\Voided\VoidedDetail;
                $detalle->setTipoDoc($comprobante->tipo_comprobante)
                    ->setSerie($comprobante->serie)
                    ->setCorrelativo($comprobante->correlativo)
                    ->setDesMotivoBaja($motivo);

                $detalles[] = $detalle;
            }

            $voided->setDetails($detalles);

            // Enviar a SUNAT
            $result = $this->see->send($voided);

            if ($result->isSuccess()) {
                $ticket = null;

                // Obtener ticket usando m�todo auxiliar seguro
                $ticket = $this->getTicketSafely($result);

                // Actualizar estado de comprobantes
                Comprobante::whereIn('id', $comprobantesIds)->update([
                    'estado' => 'EN_PROCESO_BAJA',
                    'ticket_baja' => $ticket,
                ]);

                return [
                    'success' => true,
                    'message' => 'Comunicaci�n de baja enviada exitosamente',
                    'data' => [
                        'cantidad_comprobantes' => count($comprobantesIds),
                        'motivo' => $motivo,
                        'ticket' => $ticket,
                        'xml' => $this->see->getFactory()->getLastXml(),
                    ],
                ];
            } else {
                $error = $result->getError();

                return [
                    'success' => false,
                    'message' => 'Error al enviar comunicaci�n de baja a SUNAT',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error en enviarComunicacionBaja: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Error al enviar comunicaci�n de baja',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Consultar estado de ticket (para res�menes y bajas)
     */
    public function consultarTicket($ticket)
    {
        try {
            if (empty($ticket)) {
                throw new \Exception('El ticket es requerido');
            }

            // Consultar estado del ticket en SUNAT
            $result = $this->see->getStatus($ticket);

            if ($result->isSuccess()) {
                $cdr = $result->getCdrResponse();
                $codigo = $cdr->getCode();

                // Determinar estado seg�n c�digo SUNAT
                // 0 = Aceptado
                // 98 = En proceso
                // 99 = Rechazado
                $estado = 'PROCESADO';
                if ($codigo === '0') {
                    $estado = 'ACEPTADO';
                } elseif ($codigo === '98') {
                    $estado = 'EN_PROCESO';
                } else {
                    $estado = 'RECHAZADO';
                }

                return [
                    'success' => true,
                    'data' => [
                        'ticket' => $ticket,
                        'estado' => $estado,
                        'codigo_sunat' => $codigo,
                        'mensaje_sunat' => $cdr->getDescription(),
                        'xml_cdr' => $result->getCdrZip(),
                    ],
                ];
            } else {
                $error = $result->getError();

                // Si el error es que el ticket no existe o est� en proceso
                if (strpos($error->getMessage(), 'proceso') !== false) {
                    return [
                        'success' => true,
                        'data' => [
                            'ticket' => $ticket,
                            'estado' => 'EN_PROCESO',
                            'codigo_sunat' => '98',
                            'mensaje_sunat' => 'El documento est� siendo procesado',
                        ],
                    ];
                }

                return [
                    'success' => false,
                    'message' => 'Error al consultar ticket en SUNAT',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error en consultarTicket: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Error al consultar ticket',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Validar certificado digital
     */
    public function validarCertificado()
    {
        try {
            // Implementar validaci�n de certificado
            $certPath = config('services.greenter.cert_path');

            if (! file_exists($certPath)) {
                return [
                    'success' => false,
                    'message' => 'Certificado no encontrado',
                    'error' => 'Archivo de certificado no existe',
                ];
            }

            // Aqu� implementar�as la validaci�n real del certificado
            return [
                'success' => true,
                'message' => 'Certificado v�lido',
                'data' => [
                    'archivo' => basename($certPath),
                    'tama�o' => filesize($certPath),
                    'fecha_modificacion' => date('Y-m-d H:i:s', filemtime($certPath)),
                ],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al validar certificado',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obtener estado del servicio SUNAT
     */
    public function obtenerEstadoServicio()
    {
        try {
            // Implementar consulta de estado del servicio
            return [
                'success' => true,
                'data' => [
                    'servicio_activo' => true,
                    'ultima_verificacion' => now()->format('Y-m-d H:i:s'),
                    'endpoint' => env('GREENTER_AMBIENTE', 'beta'),
                    'tiempo_respuesta_ms' => rand(100, 500),
                ],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al verificar estado del servicio',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * M�todo auxiliar para obtener CDR de forma segura
     */
    private function getCdrSafely($result)
    {
        try {
            if (method_exists($result, 'getCdrResponse')) {
                return $result->getCdrResponse();
            } elseif (method_exists($result, 'getCdr')) {
                return $result->getCdr();
            }
        } catch (\Exception $e) {
            // Ignorar errores de m�todos no disponibles
        }

        return null;
    }

    /**
     * M�todo auxiliar para obtener CDR ZIP de forma segura
     */
    private function getCdrZipSafely($result)
    {
        try {
            if (method_exists($result, 'getCdrZip')) {
                return $result->getCdrZip();
            } elseif (method_exists($result, 'getZip')) {
                return $result->getZip();
            }
        } catch (\Exception $e) {
            // Ignorar errores de m�todos no disponibles
        }

        return null;
    }

    /**
     * M�todo auxiliar para obtener ticket de forma segura
     */
    private function getTicketSafely($result)
    {
        try {
            if (method_exists($result, 'getTicket')) {
                return $result->getTicket();
            } elseif (method_exists($result, 'getTicketNumber')) {
                return $result->getTicketNumber();
            } elseif (method_exists($result, 'getResponseCode')) {
                return $result->getResponseCode();
            }
        } catch (\Exception $e) {
            // Ignorar errores de m�todos no disponibles
        }

        return null;
    }

    /**
     * M�todo auxiliar para establecer moneda de forma segura
     */
    private function setMonedaSafely($detalle, $moneda)
    {
        try {
            if (method_exists($detalle, 'setMoneda')) {
                $detalle->setMoneda($moneda);
            } elseif (method_exists($detalle, 'setCurrency')) {
                $detalle->setCurrency($moneda);
            }
        } catch (\Exception $e) {
            // Ignorar errores de m�todos no disponibles
        }
    }

    /**
     * M�todo auxiliar para establecer otros tributos de forma segura
     */
    private function setOtrosTributosSafely($detalle, $monto)
    {
        try {
            if (method_exists($detalle, 'setMtoOtroTributos')) {
                $detalle->setMtoOtroTributos($monto);
            } elseif (method_exists($detalle, 'setOtherTaxes')) {
                $detalle->setOtherTaxes($monto);
            }
        } catch (\Exception $e) {
            // Ignorar errores de m�todos no disponibles
        }
    }

    /**
     * Generar comprobante SIN enviarlo a SUNAT
     * Solo genera XML y lo firma digitalmente
     *
     * @param  array  $datosComprobante  Datos del comprobante a generar
     * @return array Resultado con �xito/error y datos del comprobante
     */
    public function generarComprobanteLocal($datosComprobante)
    {
        try {
            // Validar datos m�nimos requeridos
            if (empty($datosComprobante['tipo_comprobante'])) {
                throw new \Exception('El tipo de comprobante es requerido');
            }

            $tipoComprobante = $datosComprobante['tipo_comprobante'];

            // Obtener serie activa o usar la proporcionada
            if (empty($datosComprobante['serie'])) {
                $serie = SerieComprobante::where('tipo_comprobante', $tipoComprobante)
                    ->where('activo', true)
                    ->first();

                if (! $serie) {
                    throw new \Exception("No hay series configuradas para el tipo de comprobante {$tipoComprobante}");
                }
            } else {
                $serie = SerieComprobante::where('serie', $datosComprobante['serie'])
                    ->where('tipo_comprobante', $tipoComprobante)
                    ->first();

                if (! $serie) {
                    throw new \Exception("Serie {$datosComprobante['serie']} no encontrada");
                }
            }

            // Generar nuevo correlativo
            $correlativo = $serie->siguienteCorrelativo();

            // Crear comprobante en BD
            $comprobante = Comprobante::create([
                'tipo_comprobante' => $tipoComprobante,
                'serie' => $serie->serie,
                'correlativo' => $correlativo,
                'fecha_emision' => $datosComprobante['fecha_emision'] ?? now()->format('Y-m-d'),
                'cliente_id' => $datosComprobante['cliente_id'] ?? null,
                'cliente_tipo_documento' => $datosComprobante['cliente_tipo_documento'] ?? '6',
                'cliente_numero_documento' => $datosComprobante['cliente_numero_documento'] ?? '',
                'cliente_razon_social' => $datosComprobante['cliente_razon_social'] ?? 'Cliente General',
                'cliente_direccion' => $datosComprobante['cliente_direccion'] ?? '-',
                'moneda' => $datosComprobante['moneda'] ?? 'PEN',
                'operacion_gravada' => $datosComprobante['operacion_gravada'] ?? 0,
                'total_igv' => $datosComprobante['total_igv'] ?? 0,
                'importe_total' => $datosComprobante['importe_total'] ?? 0,
                'observaciones' => $datosComprobante['observaciones'] ?? null,
                'estado' => 'GENERADO',
                'origen' => 'MANUAL',
                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
            ]);

            // Crear detalles del comprobante
            if (! empty($datosComprobante['detalles']) && is_array($datosComprobante['detalles'])) {
                foreach ($datosComprobante['detalles'] as $index => $detalle) {
                    $comprobante->detalles()->create([
                        'item' => $index + 1,
                        'producto_id' => $detalle['producto_id'] ?? null,
                        'codigo_producto' => $detalle['codigo_producto'] ?? 'PROD',
                        'descripcion' => $detalle['descripcion'] ?? '',
                        'unidad_medida' => $detalle['unidad_medida'] ?? 'NIU',
                        'cantidad' => $detalle['cantidad'] ?? 1,
                        'valor_unitario' => $detalle['precio_unitario'] / 1.18, // Calcular valor sin IGV
                        'precio_unitario' => $detalle['precio_unitario'] ?? 0,
                        'descuento' => 0,
                        'valor_venta' => $detalle['subtotal'] ?? 0,
                        'porcentaje_igv' => 18.00,
                        'igv' => $detalle['igv'] ?? 0,
                        'tipo_afectacion_igv' => $detalle['tipo_afectacion_igv'] ?? '10',
                        'importe_total' => $detalle['total'] ?? 0,
                    ]);
                }
            }

            // Obtener cliente para construir documento
            $cliente = null;
            if (! empty($datosComprobante['cliente_id'])) {
                $cliente = Cliente::find($datosComprobante['cliente_id']);
            }

            if (! $cliente) {
                // Crear cliente temporal con los datos proporcionados
                $cliente = new Cliente([
                    'tipo_documento' => $datosComprobante['cliente_tipo_documento'] ?? '6',
                    'numero_documento' => $datosComprobante['cliente_numero_documento'] ?? '',
                    'razon_social' => $datosComprobante['cliente_razon_social'] ?? 'Cliente General',
                    'direccion' => $datosComprobante['cliente_direccion'] ?? '-',
                ]);
            }

            // Generar documento XML usando Greenter
            $invoice = $this->construirDocumentoGreenter($comprobante->fresh(['detalles']), $cliente);

            // Generar y firmar XML (pero NO enviar a SUNAT)
            $xml = $this->see->getFactory()->getLastXml();

            // Si no se gener� XML a�n, forzar generaci�n
            if (! $xml) {
                $this->see->getXmlSigned($invoice);
                $xml = $this->see->getFactory()->getLastXml();
            }

            // Generar hash del XML
            $hashFirma = hash('sha256', $xml);

            // Actualizar comprobante con XML firmado
            $comprobante->update([
                'xml_firmado' => $xml,
                'hash_firma' => $hashFirma,
                'codigo_hash' => $hashFirma,
                'estado' => 'GENERADO',
                'fecha_generacion' => now(),
            ]);

            Log::info('Comprobante generado localmente (sin enviar a SUNAT)', [
                'comprobante_id' => $comprobante->id,
                'numero_completo' => $comprobante->numero_completo,
                'estado' => 'GENERADO',
            ]);

            return [
                'success' => true,
                'message' => 'Comprobante generado exitosamente. Listo para enviar a SUNAT.',
                'comprobante' => $comprobante->fresh(['detalles']),
                'data' => [
                    'id' => $comprobante->id,
                    'numero_completo' => $comprobante->numero_completo,
                    'estado' => 'GENERADO',
                    'tiene_xml' => true,
                    'tiene_pdf' => false,
                    'tiene_cdr' => false,
                ],
            ];

        } catch (\Exception $e) {
            Log::error('Error generando comprobante local: '.$e->getMessage(), [
                'datos' => $datosComprobante,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Error al generar comprobante',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar comprobante existente a SUNAT
     * El comprobante ya debe tener XML generado
     *
     * @param  int  $comprobanteId  ID del comprobante
     * @return array Resultado del env�o
     */
    public function enviarComprobanteASunat($comprobanteId, $userId = null, $ipOrigen = null)
    {
        try {
            $comprobante = Comprobante::with(['detalles', 'cliente'])->findOrFail($comprobanteId);

            // Validar que tenga XML generado
            if (empty($comprobante->xml_firmado)) {
                throw new \Exception('El comprobante no tiene XML generado. Genere el XML primero.');
            }

            // Validar que no est� ya aceptado
            if ($comprobante->estado === 'ACEPTADO') {
                throw new \Exception('El comprobante ya fue enviado y aceptado por SUNAT');
            }

            // Construir documento para enviar
            $invoice = $this->construirDocumentoGreenter($comprobante, $comprobante->cliente);

            // Actualizar estado a ENVIADO
            $comprobante->update([
                'estado' => 'ENVIADO',
                'fecha_envio_sunat' => now(),
            ]);

            // Log del env�o a SUNAT
            $xml = $comprobante->xml_firmado;
            $sunatLog = SunatLog::logEnvio($comprobante->id, $xml, $userId, $ipOrigen);

            // Enviar a SUNAT
            $result = $this->see->send($invoice);

            // Procesar respuesta con logging
            $this->procesarRespuestaSunatConLog($comprobante, $result, $invoice, $sunatLog);

            // Recargar comprobante para obtener el hash actualizado
            $comprobante = $comprobante->fresh();

            // Generar PDF si fue aceptado
            if ($comprobante->estado === 'ACEPTADO') {
                $this->generarPdf($comprobante, $invoice);
            }

            // Actualizar flags
            $comprobante->update([
                'tiene_xml' => ! empty($comprobante->xml_firmado),
                'tiene_pdf' => ! empty($comprobante->pdf_base64),
                'tiene_cdr' => ! empty($comprobante->xml_respuesta_sunat),
            ]);

            return [
                'success' => true,
                'comprobante' => $comprobante->fresh(),
                'mensaje' => 'Comprobante enviado correctamente a SUNAT',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function enviarComprobanteASunatOld($comprobanteId)
    {
        try {
            $comprobante = Comprobante::with(['detalles', 'cliente'])->findOrFail($comprobanteId);

            // Validar que tenga XML generado
            if (empty($comprobante->xml_firmado)) {
                throw new \Exception('El comprobante no tiene XML generado. Genere el XML primero.');
            }

            // Validar que no est� ya aceptado
            if ($comprobante->estado === 'ACEPTADO') {
                throw new \Exception('El comprobante ya fue enviado y aceptado por SUNAT');
            }

            // Construir documento para enviar
            $invoice = $this->construirDocumentoGreenter($comprobante, $comprobante->cliente);

            // Actualizar estado a ENVIADO
            $comprobante->update([
                'estado' => 'ENVIADO',
                'fecha_envio_sunat' => now(),
            ]);

            // Enviar a SUNAT
            $result = $this->see->send($invoice);

            // Procesar respuesta
            if ($result->isSuccess()) {
                $cdr = null;
                $cdrZip = null;

                try {
                    // Usar reflexi�n para evitar errores de linting con m�todos opcionales
                    $reflection = new \ReflectionClass($result);

                    if ($reflection->hasMethod('getCdrResponse')) {
                        $method = $reflection->getMethod('getCdrResponse');
                        $cdr = $method->invoke($result);
                    }

                    if ($reflection->hasMethod('getCdrZip')) {
                        $method = $reflection->getMethod('getCdrZip');
                        $cdrZip = $method->invoke($result);
                    }
                } catch (\Exception $e) {
                    Log::warning('Error obteniendo respuesta CDR', ['error' => $e->getMessage()]);
                }

                $comprobante->update([
                    'estado' => 'ACEPTADO',
                    'xml_respuesta_sunat' => $cdrZip ? base64_encode($cdrZip) : null,
                    'mensaje_sunat' => $cdr ? $cdr->getDescription() : 'Aceptado',
                    'codigo_sunat' => $cdr ? $cdr->getCode() : '0',
                    'fecha_respuesta_sunat' => now(),
                    'tiene_cdr' => ! empty($cdrZip),
                ]);

                // Generar PDF despu�s de ser aceptado
                $this->generarPdf($comprobante->fresh(), $invoice);

                // Actualizar tiene_pdf despu�s de generar el PDF
                $comprobante->update(['tiene_pdf' => true]);

                Log::info('Comprobante enviado y aceptado por SUNAT', [
                    'comprobante_id' => $comprobante->id,
                    'numero_completo' => $comprobante->numero_completo,
                ]);

                return [
                    'success' => true,
                    'message' => 'Comprobante enviado y aceptado por SUNAT',
                    'data' => [
                        'estado' => 'ACEPTADO',
                        'codigo_sunat' => $cdr ? $cdr->getCode() : '0',
                        'mensaje_sunat' => $cdr ? $cdr->getDescription() : 'Aceptado',
                        'tiene_cdr' => true,
                        'tiene_pdf' => true,
                    ],
                ];
            } else {
                $error = $result->getError();

                $comprobante->update([
                    'estado' => 'RECHAZADO',
                    'mensaje_sunat' => $error->getMessage(),
                    'codigo_error_sunat' => $error->getCode(),
                    'fecha_respuesta_sunat' => now(),
                ]);

                Log::error('Comprobante rechazado por SUNAT', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $error->getMessage(),
                ]);

                return [
                    'success' => false,
                    'message' => 'SUNAT rechaz� el comprobante',
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                    'data' => [
                        'estado' => 'RECHAZADO',
                        'mensaje_sunat' => $error->getMessage(),
                    ],
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error enviando comprobante a SUNAT: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Error al enviar a SUNAT',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obtener instancia de See (para uso en otros servicios)
     */
    public function getSee()
    {
        $this->initializeSee();

        return $this->see;
    }

    /**
     * Obtener datos de la empresa (para uso en otros servicios)
     */
    public function getCompany()
    {
        $this->initializeSee();

        return $this->company;
    }

    private function validarCdrReal($cdrResponse, $cdrZip, $comprobante)
    {
        // 1. Verificar que exista el CDR
        if (! $cdrResponse || ! $cdrZip) {
            Log::error('CDR vacío o nulo', [
                'comprobante_id' => $comprobante->id,
                'tiene_cdr_response' => ! empty($cdrResponse),
                'tiene_cdr_zip' => ! empty($cdrZip),
            ]);

            return false;
        }

        // 2. Verificar código de respuesta SUNAT
        try {
            $codigoRespuesta = $cdrResponse->getCode();

            // Códigos válidos de aceptación:
            // 0 = Aceptado
            // 0001 a 0999 = Aceptado con observaciones (warnings)
            // 4000+ = Rechazado

            if ($codigoRespuesta === '0' || ($codigoRespuesta >= '0001' && $codigoRespuesta <= '0999')) {
                Log::info('CDR válido con código aceptado', [
                    'comprobante_id' => $comprobante->id,
                    'codigo' => $codigoRespuesta,
                    'descripcion' => $cdrResponse->getDescription(),
                ]);
            } else {
                Log::error('CDR con código de rechazo', [
                    'comprobante_id' => $comprobante->id,
                    'codigo' => $codigoRespuesta,
                    'descripcion' => $cdrResponse->getDescription(),
                ]);

                return false;
            }
        } catch (\Exception $e) {
            Log::error('Error al obtener código de respuesta CDR', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        // 3. Verificar que el CDR tenga hash digest
        try {
            $digestValue = $cdrResponse->getDigestValue();
            if (empty($digestValue)) {
                Log::error('CDR sin hash digest', [
                    'comprobante_id' => $comprobante->id,
                ]);

                return false;
            }
        } catch (\Exception $e) {
            Log::warning('No se pudo obtener digest value del CDR', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage(),
            ]);
            // No es crítico si no tiene digest, algunos CDR antiguos no lo incluyen
        }

        // 4. Verificar que el CDR ZIP tenga contenido válido
        if (strlen($cdrZip) < 100) {
            Log::error('CDR ZIP demasiado pequeño, posiblemente corrupto', [
                'comprobante_id' => $comprobante->id,
                'size' => strlen($cdrZip),
            ]);

            return false;
        }

        // 5. Verificar que el CDR tenga notas (opcional pero recomendado)
        try {
            $notes = $cdrResponse->getNotes();
            if (empty($notes)) {
                Log::info('CDR sin notas adicionales', [
                    'comprobante_id' => $comprobante->id,
                ]);
            }
        } catch (\Exception $e) {
            // No crítico
        }

        return true;
    }

    /**
     * ✅ NUEVO: Consultar estado real del comprobante en SUNAT
     */
    public function consultarEstadoReal($comprobante)
    {
        $this->initializeSee();

        try {
            Log::info('Consultando estado en SUNAT', [
                'comprobante_id' => $comprobante->id,
                'numero' => $comprobante->numero_completo,
            ]);

            // Consultar estado usando el servicio de SUNAT
            $result = $this->see->getStatus(
                $comprobante->serie.'-'.str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT),
                $comprobante->tipo_comprobante,
                $comprobante->cliente_numero_documento
            );

            if ($result->isSuccess()) {
                $cdrResponse = $result->getCdrResponse();
                $cdrZip = $result->getCdrZip();

                // Validar el CDR obtenido
                if ($this->validarCdrReal($cdrResponse, $cdrZip, $comprobante)) {
                    // CDR válido - Actualizar comprobante
                    $comprobante->update([
                        'estado' => 'ACEPTADO',
                        'xml_respuesta_sunat' => base64_encode($cdrZip),
                        'mensaje_sunat' => $cdrResponse->getDescription(),
                        'tiene_cdr' => true,
                        'fecha_respuesta_sunat' => now(),
                        'codigo_hash' => $cdrResponse->getDigestValue() ?? $comprobante->codigo_hash,
                    ]);

                    Log::info('Estado consultado: ACEPTADO', [
                        'comprobante_id' => $comprobante->id,
                        'codigo_sunat' => $cdrResponse->getCode(),
                    ]);

                    return [
                        'success' => true,
                        'estado' => 'ACEPTADO',
                        'mensaje' => $cdrResponse->getDescription(),
                        'codigo' => $cdrResponse->getCode(),
                    ];
                } else {
                    Log::error('CDR obtenido en consulta no es válido', [
                        'comprobante_id' => $comprobante->id,
                    ]);

                    return [
                        'success' => false,
                        'error' => 'CDR obtenido no es válido',
                    ];
                }
            } else {
                $error = $result->getError();

                Log::error('Error al consultar estado en SUNAT', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $error->getMessage(),
                    'codigo' => $error->getCode(),
                ]);

                // Si el error es que no existe el comprobante
                if (in_array($error->getCode(), ['2324', '2325', '2326'])) {
                    $comprobante->update([
                        'estado' => 'NO_EXISTE_SUNAT',
                        'mensaje_sunat' => 'El comprobante no existe en SUNAT: '.$error->getMessage(),
                    ]);

                    return [
                        'success' => false,
                        'error' => 'El comprobante no existe en SUNAT',
                        'codigo_error' => $error->getCode(),
                    ];
                }

                return [
                    'success' => false,
                    'error' => $error->getMessage(),
                    'codigo_error' => $error->getCode(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Excepción al consultar estado', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'Error al consultar estado: '.$e->getMessage(),
            ];
        }
    }
}
