<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Services\GreenterService;
use App\Models\Cliente;
use App\Models\Producto;
use App\Models\SerieComprobante;
use App\Models\Comprobante;
use App\Models\ComprobanteDetalle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TestFacturacionController extends Controller
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Endpoint de prueba para generar factura de prueba en SUNAT BETA
     * GET /api/facturacion/test/generar-factura-prueba
     */
    public function generarFacturaPrueba()
    {
        try {
            DB::beginTransaction();

            // 1. Verificar o crear cliente de prueba
            $cliente = Cliente::firstOrCreate(
                ['numero_documento' => '20000000001'],
                [
                    'tipo_documento' => '6',
                    'razon_social' => 'EMPRESA DE PRUEBAS S.A.C.',
                    'direccion' => 'AV. FICTICIA 123, LIMA',
                    'email' => 'pruebas@ejemplo.com',
                    'telefono' => '999999999',
                    'activo' => true
                ]
            );

            // 2. Verificar o crear producto de prueba
            // Obtener primera categoría disponible
            $categoria = \App\Models\Categoria::first();
            if (!$categoria) {
                $categoria = \App\Models\Categoria::create([
                    'nombre' => 'Categoría de Prueba',
                    'descripcion' => 'Categoría para pruebas de facturación',
                    'activo' => true
                ]);
            }
            
            $producto = Producto::firstOrCreate(
                ['codigo_producto' => 'PROD-TEST-001'],
                [
                    'nombre' => 'PRODUCTO DE PRUEBA - LAPTOP',
                    'descripcion' => 'Laptop para pruebas de facturación electrónica',
                    'precio_compra' => 800.00,
                    'precio_venta' => 1000.00,
                    'stock' => 100,
                    'activo' => true,
                    'categoria_id' => $categoria->id,
                ]
            );

            // 3. Verificar o crear serie de comprobante
            $serie = SerieComprobante::firstOrCreate(
                [
                    'tipo_comprobante' => '01',
                    'serie' => 'F001'
                ],
                [
                    'correlativo' => 1,
                    'activo' => true
                ]
            );

            $correlativo = $serie->siguienteCorrelativo();

            // 4. Calcular totales (1 producto x 1000 soles)
            $cantidad = 1;
            $precioUnitario = 1000.00;

            // Precio sin IGV
            $valorUnitario = round($precioUnitario / 1.18, 2);
            $valorVenta = $valorUnitario * $cantidad;

            // IGV (18%)
            $igv = round($valorVenta * 0.18, 2);

            // Total
            $total = $valorVenta + $igv;

            // 5. Crear comprobante
            $comprobante = Comprobante::create([
                'tipo_comprobante' => '01',
                'serie' => $serie->serie,
                'correlativo' => $correlativo,
                'fecha_emision' => now()->format('Y-m-d'),
                'cliente_id' => $cliente->id,
                'cliente_tipo_documento' => $cliente->tipo_documento,
                'cliente_numero_documento' => $cliente->numero_documento,
                'cliente_razon_social' => $cliente->razon_social,
                'cliente_direccion' => $cliente->direccion,
                'moneda' => 'PEN',
                'operacion_gravada' => $valorVenta,
                'total_igv' => $igv,
                'importe_total' => $total,
                'origen' => 'TEST',
                'user_id' => 1,
                'estado' => 'PENDIENTE'
            ]);

            // 6. Crear detalle del comprobante
            ComprobanteDetalle::create([
                'comprobante_id' => $comprobante->id,
                'item' => 1,
                'producto_id' => $producto->id,
                'codigo_producto' => $producto->codigo_producto,
                'descripcion' => $producto->nombre,
                'unidad_medida' => 'NIU',
                'cantidad' => $cantidad,
                'valor_unitario' => $valorUnitario,
                'precio_unitario' => $precioUnitario,
                'descuento' => 0.00,
                'valor_venta' => $valorVenta,
                'porcentaje_igv' => 18.00,
                'igv' => $igv,
                'tipo_afectacion_igv' => '10',
                'importe_total' => $total
            ]);

            DB::commit();

            Log::info('Comprobante de prueba creado', [
                'comprobante_id' => $comprobante->id,
                'numero' => $comprobante->numero_completo
            ]);

            // 7. Enviar a SUNAT BETA
            $resultado = $this->greenterService->enviarComprobante($comprobante);

            if ($resultado['success']) {
                $comprobante->refresh();

                return response()->json([
                    'success' => true,
                    'message' => '¡Factura de prueba generada y enviada a SUNAT BETA exitosamente!',
                    'data' => [
                        'comprobante_id' => $comprobante->id,
                        'numero_completo' => $comprobante->numero_completo,
                        'cliente' => $cliente->razon_social,
                        'total' => 'S/ ' . number_format($comprobante->importe_total, 2),
                        'estado' => $comprobante->estado,
                        'mensaje_sunat' => $comprobante->mensaje_sunat,
                        'tiene_pdf' => !empty($comprobante->pdf_base64),
                        'tiene_xml' => !empty($comprobante->xml_firmado),
                        'tiene_cdr' => !empty($comprobante->xml_respuesta_sunat),
                        'urls' => [
                            'ver_comprobante' => url("/api/comprobantes/{$comprobante->id}"),
                            'descargar_pdf' => url("/api/comprobantes/{$comprobante->id}/pdf"),
                            'descargar_xml' => url("/api/comprobantes/{$comprobante->id}/xml"),
                        ]
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Comprobante creado pero hubo error al enviar a SUNAT',
                    'error' => $resultado['error'],
                    'data' => [
                        'comprobante_id' => $comprobante->id,
                        'numero_completo' => $comprobante->numero_completo,
                        'estado' => $comprobante->fresh()->estado
                    ]
                ], 422);
            }

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error en prueba de facturación', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al generar factura de prueba',
                'error' => $e->getMessage(),
                'linea' => $e->getLine(),
                'archivo' => $e->getFile()
            ], 500);
        }
    }

    /**
     * Verificar configuración de SUNAT
     * GET /api/facturacion/test/verificar-configuracion
     */
    public function verificarConfiguracion()
    {
        $config = [
            'modo' => env('GREENTER_MODE', 'BETA'),
            'usuario_sunat' => env('GREENTER_FE_USER'),
            'certificado_existe' => file_exists(storage_path('app/' . env('GREENTER_CERT_PATH'))),
            'certificado_path' => storage_path('app/' . env('GREENTER_CERT_PATH')),
            'ruc_empresa' => env('COMPANY_RUC'),
            'nombre_empresa' => env('COMPANY_NAME'),
            'logo_existe' => file_exists(public_path(env('COMPANY_LOGO_PATH', 'logo-empresa.png'))),
            'logo_path' => public_path(env('COMPANY_LOGO_PATH', 'logo-empresa.png')),
        ];

        $errores = [];

        if (!$config['certificado_existe']) {
            $errores[] = "Certificado digital no encontrado en: {$config['certificado_path']}";
        }

        if (!$config['usuario_sunat']) {
            $errores[] = "Usuario SUNAT no configurado (GREENTER_FE_USER en .env)";
        }

        if (!$config['ruc_empresa']) {
            $errores[] = "RUC de empresa no configurado (COMPANY_RUC en .env)";
        }

        return response()->json([
            'success' => empty($errores),
            'configuracion' => $config,
            'errores' => $errores,
            'message' => empty($errores)
                ? 'Configuración correcta para facturación electrónica'
                : 'Hay errores en la configuración'
        ]);
    }

    /**
     * Estado del servicio SUNAT
     * GET /api/facturacion/test/estado-sunat
     */
    public function estadoSunat()
    {
        try {
            $modo = env('GREENTER_MODE', 'BETA');
            $url = $modo === 'BETA'
                ? 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
                : 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';

            return response()->json([
                'success' => true,
                'modo' => $modo,
                'url_servicio' => $url,
                'message' => "Configurado para ambiente de {$modo}",
                'nota' => $modo === 'BETA'
                    ? 'Estás en BETA - Las facturas NO son reales'
                    : 'CUIDADO: Estás en PRODUCCIÓN - Las facturas SON REALES'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar estado SUNAT',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
