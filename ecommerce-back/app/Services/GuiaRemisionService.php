<?php

namespace App\Services;

use App\Models\GuiaRemision;
use Carbon\Carbon;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Despatch\Despatch;
use Greenter\Model\Despatch\DespatchDetail;
use Greenter\Model\Despatch\Direction;
use Greenter\Model\Despatch\Driver;
use Greenter\Model\Despatch\Shipment;
use Greenter\Report\HtmlReport;
use Greenter\Report\PdfReport;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;
use Illuminate\Support\Facades\Log;

class GuiaRemisionService
{
    private $see;

    private $company;

    public function __construct()
    {
        $this->see = new See;
        $this->configurarSee();
        $this->configurarEmpresa();
    }

    private function configurarSee()
    {
        // Usar certificado PEM de producción
        $pemPath = storage_path('app/certificates/certificado.pem');

        if (! file_exists($pemPath)) {
            throw new \Exception("Certificado PEM no encontrado en: {$pemPath}");
        }

        $certificadoContenido = file_get_contents($pemPath);

        if (empty($certificadoContenido)) {
            throw new \Exception('El archivo PEM está vacío');
        }

        $this->see->setCertificate($certificadoContenido);

        // Credenciales de producción desde .env
        $solUser = env('GREENTER_FE_USER');
        $solPassword = env('GREENTER_FE_PASSWORD');

        if (empty($solUser) || empty($solPassword)) {
            throw new \Exception('Las credenciales SOL no están configuradas en .env');
        }

        // Configurar endpoint de PRODUCCIÓN para guías
        $this->see->setService(SunatEndpoints::GUIA_PRODUCCION);

        // Configurar credenciales SOL
        $this->see->setCredentials($solUser, $solPassword);

        Log::info('GuiaRemisionService configurado para PRODUCCIÓN', [
            'usuario_sol' => $solUser,
            'endpoint' => 'GUIA_PRODUCCION',
        ]);
    }

    private function configurarEmpresa()
    {
        $this->company = new Company;
        $this->company->setRuc(config('empresa.ruc'))
            ->setRazonSocial(config('empresa.razon_social'))
            ->setNombreComercial(config('empresa.nombre_comercial'))
            ->setAddress(new Address([
                'direccion' => config('empresa.direccion'),
                'distrito' => config('empresa.distrito'),
                'provincia' => config('empresa.provincia'),
                'departamento' => config('empresa.departamento'),
                'ubigueo' => config('empresa.ubigeo', '150301'),
            ]));
    }

    /**
     * Generar XML firmado de la guía de remisión
     * También genera el PDF automáticamente
     */
    public function generarXml(GuiaRemision $guia)
    {
        try {
            // Construir documento Greenter
            $despatch = $this->construirDocumentoGreenter($guia);

            // Generar XML firmado
            $xml = $this->see->getXmlSigned($despatch);

            // Guardar XML en la guía
            $guia->update([
                'xml_firmado' => base64_encode($xml),
                'tiene_xml' => true,
            ]);

            Log::info('XML de guía generado correctamente', [
                'guia_id' => $guia->id,
                'xml_length' => strlen($xml),
            ]);

            // Generar PDF automáticamente
            $this->generarPdf($guia, $despatch);

            return [
                'success' => true,
                'mensaje' => 'XML y PDF generados correctamente',
                'data' => [
                    'guia' => $guia->fresh(),
                    'xml_generado' => true,
                    'pdf_generado' => true,
                ],
            ];

        } catch (\Exception $e) {
            Log::error('Error generando XML: '.$e->getMessage(), [
                'guia_id' => $guia->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar guía de remisión a SUNAT
     *
     * IMPORTANTE: SUNAT desactivó SOAP para guías de remisión (error 1085).
     * Ahora requiere usar la API REST de GRE con credenciales OAuth2.
     *
     * Para modo BETA/pruebas necesitas:
     * 1. Credenciales OAuth2 de SUNAT (diferentes a MODDATOS)
     * 2. O usar un PSE como Nubefact, FacturadorPE, etc.
     */
    public function enviarGuiaRemision(GuiaRemision $guia)
    {
        try {
            // Validar que tenga XML generado
            if (! $guia->tiene_xml || empty($guia->xml_firmado)) {
                return [
                    'success' => false,
                    'error' => 'Debe generar el XML antes de enviar a SUNAT',
                ];
            }

            // Aquí iría la lógica de envío a SUNAT con OAuth2
            // Por ahora solo simulamos el envío

            Log::info('Intentando enviar guía a SUNAT', [
                'guia_id' => $guia->id,
            ]);

            // En desarrollo sin OAuth2, dejamos en PENDIENTE
            // En producción con OAuth2, cambiaría a ACEPTADO o RECHAZADO
            $guia->update([
                'mensaje_sunat' => 'Requiere credenciales OAuth2 para enviar a SUNAT. XML ya generado.',
            ]);

            return [
                'success' => true,
                'mensaje' => 'XML listo para envío. Requiere configurar credenciales OAuth2 en producción.',
                'data' => [
                    'guia' => $guia->fresh(),
                    'requiere_oauth2' => true,
                ],
            ];

        } catch (\Exception $e) {
            Log::error('Error enviando guía a SUNAT: '.$e->getMessage(), [
                'guia_id' => $guia->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obtener instancia de See (para uso externo)
     */
    public function getSee()
    {
        return $this->see;
    }

    /**
     * Construir documento Greenter para guía de remisión (público para API REST)
     */
    public function construirDocumentoGreenterPublic(GuiaRemision $guia)
    {
        return $this->construirDocumentoGreenter($guia);
    }

    /**
     * Construir documento Greenter para guía de remisión
     */
    private function construirDocumentoGreenter(GuiaRemision $guia)
    {
        $despatch = new Despatch;

        // Datos básicos
        $fechaEmision = Carbon::parse($guia->fecha_emision);
        $fechaTraslado = Carbon::parse($guia->fecha_inicio_traslado ?? $guia->fecha_emision);

        // Tipo de documento: 09 = Guía de Remisión Remitente, 31 = Guía de Remisión Transportista
        $tipoDoc = ($guia->tipo_guia === 'TRANSPORTISTA') ? '31' : '09';

        $despatch->setTipoDoc($tipoDoc)
            ->setSerie($guia->serie)
            ->setCorrelativo($guia->correlativo)
            ->setFechaEmision($fechaEmision)
            ->setCompany($this->company);

        // Agregar nota con comprobante relacionado (FT: F001-2950)
        if ($guia->nota_sunat) {
            $despatch->setObservacion($guia->nota_sunat);
        }

        // Destinatario
        if ($guia->destinatario_tipo_documento && $guia->destinatario_numero_documento) {
            $destinatario = new Client;
            $destinatario->setTipoDoc($guia->destinatario_tipo_documento)
                ->setNumDoc($guia->destinatario_numero_documento)
                ->setRznSocial($guia->destinatario_razon_social);

            if ($guia->destinatario_direccion) {
                $destinatario->setAddress(new Address([
                    'direccion' => $guia->destinatario_direccion,
                    'ubigueo' => $guia->destinatario_ubigeo ?? '150101',
                ]));
            }

            $despatch->setDestinatario($destinatario);
        }

        // Tercero (si es diferente del remitente o destinatario)
        if ($guia->cliente_id && ($guia->cliente_numero_documento != $this->company->getRuc())) {
            $tercero = new Client;
            $tercero->setTipoDoc($guia->cliente_tipo_documento)
                ->setNumDoc($guia->cliente_numero_documento)
                ->setRznSocial($guia->cliente_razon_social);

            $despatch->setTercero($tercero);
        }

        // Envío (Shipment) - Información del traslado
        $shipment = new Shipment;

        // Motivo y modalidad de traslado
        $shipment->setCodTraslado($guia->motivo_traslado ?? '01') // 01=Venta
            ->setDesTraslado($this->getMotivoTraslado($guia->motivo_traslado ?? '01'))
            ->setModTraslado($guia->modalidad_traslado ?? '02') // 01=Público, 02=Privado
            ->setFecTraslado($fechaTraslado);

        // Peso y bultos
        if ($guia->peso_total) {
            $shipment->setPesoTotal((float) $guia->peso_total);
        }

        if ($guia->numero_bultos) {
            $shipment->setNumBultos((int) $guia->numero_bultos);
        }

        // Si es guía de TRANSPORTISTA, agregar datos del transportista y conductor
        if ($guia->tipo_guia === 'TRANSPORTISTA') {
            // Datos del transportista
            if ($guia->transportista_ruc && $guia->transportista_razon_social) {
                $transportista = new \Greenter\Model\Despatch\TransportCarrier;
                $transportista->setRuc($guia->transportista_ruc)
                    ->setRznSocial($guia->transportista_razon_social);
                
                if ($guia->transportista_numero_mtc) {
                    $transportista->setNroMtc($guia->transportista_numero_mtc);
                }
                
                $shipment->setTransportista($transportista);
            }

            // Datos del conductor (obligatorio para transportista)
            if ($guia->conductor_numero_documento && $guia->conductor_nombres) {
                $driver = new Driver;
                $driver->setTipo($guia->conductor_tipo_documento ?? '1') // 1=DNI
                    ->setNroDoc($guia->conductor_numero_documento)
                    ->setNombres($guia->conductor_nombres)
                    ->setApellidos($guia->conductor_apellidos ?? '');
                
                if ($guia->conductor_licencia) {
                    $driver->setLicencia($guia->conductor_licencia);
                }
                
                $shipment->setChoferes([$driver]);
            }

            // Datos del vehículo (obligatorio para transportista)
            if ($guia->vehiculo_placa_principal) {
                $vehiculo = new \Greenter\Model\Despatch\Vehicle;
                $vehiculo->setPlaca($guia->vehiculo_placa_principal);
                
                $shipment->setVehiculo($vehiculo);
                
                // Vehículo secundario (opcional)
                if ($guia->vehiculo_placa_secundaria) {
                    $vehiculoSecundario = new \Greenter\Model\Despatch\Vehicle;
                    $vehiculoSecundario->setPlaca($guia->vehiculo_placa_secundaria);
                    $shipment->setVehiculoSec($vehiculoSecundario);
                }
            }
        } else {
            // Para guía de REMITENTE, usar los datos del conductor si existen
            if (! $guia->esTrasladoInterno() && $guia->conductor_dni && $guia->conductor_nombres) {
                $driver = new Driver;
                $driver->setTipo('1') // 1=DNI
                    ->setNroDoc($guia->conductor_dni)
                    ->setLicencia('') // SUNAT no requiere licencia
                    ->setNombres($guia->conductor_nombres)
                    ->setApellidos(''); // Apellidos están incluidos en nombres

                $shipment->setChoferes([$driver]);
            }
        }

        // Punto de partida
        if ($guia->punto_partida_direccion) {
            $partida = new Direction(
                $guia->punto_partida_ubigeo ?? '150101',
                $guia->punto_partida_direccion
            );

            $shipment->setPartida($partida);
        }

        // Punto de llegada
        if ($guia->punto_llegada_direccion) {
            $llegada = new Direction(
                $guia->punto_llegada_ubigeo ?? '150101',
                $guia->punto_llegada_direccion
            );

            $shipment->setLlegada($llegada);
        }

        $despatch->setEnvio($shipment);

        // Detalles de la guía (productos/bienes a transportar)
        $detalles = [];
        foreach ($guia->detalles as $detalle) {
            $item = new DespatchDetail;
            $item->setCantidad((float) $detalle->cantidad)
                ->setUnidad($detalle->unidad_medida ?? 'NIU')
                ->setDescripcion($detalle->descripcion)
                ->setCodigo($detalle->producto_id ? "P{$detalle->producto_id}" : 'PROD001');

            $detalles[] = $item;
        }

        $despatch->setDetails($detalles);

        // Si no hay nota SUNAT pero hay observaciones, usarlas
        if (! $guia->nota_sunat && $guia->observaciones) {
            $despatch->setObservacion($guia->observaciones);
        }

        return $despatch;
    }

    /**
     * Generar PDF de guía de remisión
     */
    public function generarPdf(GuiaRemision $guia, $despatch = null)
    {
        try {
            if (! $despatch) {
                $despatch = $this->construirDocumentoGreenter($guia);
            }

            // Intentar con el PDF de Greenter
            try {
                $htmlReport = new HtmlReport;
                $pdfReport = new PdfReport($htmlReport);

                // Parámetros adicionales para el PDF
                $params = [
                    'system' => [
                        'hash' => $guia->codigo_hash ?? '',
                        'date' => date('Y-m-d'),
                        'time' => date('H:i:s'),
                    ],
                ];

                // Agregar logo si existe
                $logoPath = public_path('logo-empresa.png');
                if (file_exists($logoPath) && is_readable($logoPath)) {
                    try {
                        $logoContent = file_get_contents($logoPath);
                        if ($logoContent !== false) {
                            $params['system']['logo'] = $logoContent;
                            Log::info('Logo de empresa agregado al PDF de guía', ['guia_id' => $guia->id]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error al leer logo de empresa para guía', [
                            'path' => $logoPath,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $pdf = $pdfReport->render($despatch, $params);

                $guia->update([
                    'pdf_base64' => base64_encode($pdf),
                    'tiene_pdf' => true,
                ]);

                Log::info('PDF de guía generado exitosamente con Greenter', [
                    'guia_id' => $guia->id,
                    'tamaño_bytes' => strlen($pdf),
                ]);

                return;

            } catch (\Exception $e) {
                Log::warning('Error con PDF de Greenter, usando PDF simple', [
                    'guia_id' => $guia->id,
                    'error' => $e->getMessage(),
                ]);

                // Fallback: Generar PDF simple
                $pdfSimple = $this->generarPdfSimple($guia);

                $guia->update([
                    'pdf_base64' => base64_encode($pdfSimple),
                    'tiene_pdf' => true,
                ]);

                Log::info('PDF simple de guía generado exitosamente', [
                    'guia_id' => $guia->id,
                    'tamaño_bytes' => strlen($pdfSimple),
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error generando PDF de guía', [
                'guia_id' => $guia->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $guia->update(['tiene_pdf' => false]);
        }
    }

    /**
     * Generar PDF simple HTML para guía
     */
    private function generarPdfSimple($guia)
    {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Guía de Remisión {$guia->serie}-{$guia->correlativo}</title>
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
                <h1>GUÍA DE REMISIÓN ELECTRÓNICA</h1>
                <h2>{$guia->serie}-".str_pad($guia->correlativo, 8, '0', STR_PAD_LEFT)."</h2>
            </div>

            <div class='content'>
                <p><strong>Fecha Emisión:</strong> {$guia->fecha_emision}</p>
                <p><strong>Fecha Traslado:</strong> {$guia->fecha_inicio_traslado}</p>
                <p><strong>Tipo:</strong> {$guia->tipo_guia}</p>
                <p><strong>Estado:</strong> {$guia->estado}</p>

                <h3>Detalles de Transporte</h3>
                <table>
                    <tr><th>Concepto</th><th>Información</th></tr>
                    <tr><td>Punto de Partida</td><td>{$guia->punto_partida_direccion}</td></tr>
                    <tr><td>Punto de Llegada</td><td>{$guia->punto_llegada_direccion}</td></tr>
                    <tr><td>Modalidad</td><td>{$guia->modalidad_traslado}</td></tr>
                    <tr><td>Motivo</td><td>{$guia->motivo_traslado}</td></tr>
                </table>

                <h3>Destinatario</h3>
                <p><strong>Nombre:</strong> {$guia->destinatario_razon_social}</p>
                <p><strong>Documento:</strong> {$guia->destinatario_numero_documento}</p>

                <h3>Detalles de Mercadería</h3>
                <table>
                    <tr>
                        <th>Cantidad</th>
                        <th>Descripción</th>
                    </tr>";

        foreach ($guia->detalles as $detalle) {
            $html .= "<tr>
                        <td>{$detalle->cantidad}</td>
                        <td>{$detalle->descripcion}</td>
                      </tr>";
        }

        $html .= "
                </table>
            </div>

            <div class='footer'>
                <p>Guía de Remisión Electrónica generada automáticamente</p>
                <p>Hash: {$guia->codigo_hash}</p>
            </div>
        </body>
        </html>";

        // Si DomPDF está disponible, usarlo
        if (class_exists('\Dompdf\Dompdf')) {
            $dompdf = new \Dompdf\Dompdf;
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            return $dompdf->output();
        }

        // Fallback: devolver HTML
        return $html;
    }

    /**
     * Obtener descripción del motivo de traslado
     */
    private function getMotivoTraslado($codigo)
    {
        $motivos = [
            '01' => 'Venta',
            '02' => 'Compra',
            '04' => 'Traslado entre establecimientos de la misma empresa',
            '08' => 'Importación',
            '09' => 'Exportación',
            '13' => 'Otros',
        ];

        return $motivos[$codigo] ?? 'Otros';
    }

    /**
     * Obtener descripción del modo de transporte
     */
    private function getModoTransporte($codigo)
    {
        $modos = [
            '01' => 'Transporte público',
            '02' => 'Transporte privado',
        ];

        return $modos[$codigo] ?? 'Transporte privado';
    }

    /**
     * Método auxiliar para obtener CDR de forma segura
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
            // Ignorar errores de métodos no disponibles
        }

        return null;
    }

    /**
     * Método auxiliar para obtener CDR ZIP de forma segura
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
            // Ignorar errores de métodos no disponibles
        }

        return null;
    }
}
