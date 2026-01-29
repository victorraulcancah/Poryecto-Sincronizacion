<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\Comprobante;
use App\Models\ComprobanteDetalle;
use App\Models\Cliente;
use App\Models\SerieComprobante;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FacturacionComprasService
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Generar comprobante automáticamente desde una compra
     */
    public function generarComprobanteAutomatico(Compra $compra)
    {
        try {
            // Validaciones previas
            if (!$compra->puedeFacturarse()) {
                throw new \Exception('La compra no puede ser facturada en este momento');
            }

            if (!$compra->tieneDatosParaFacturar()) {
                throw new \Exception('La compra no tiene datos suficientes para facturar');
            }

            DB::beginTransaction();

            // Obtener o crear cliente para facturación
            $cliente = $this->obtenerOCrearClienteFacturacion($compra);

            // Determinar tipo de comprobante (01=Factura si RUC, 03=Boleta si DNI)
            $tipoComprobante = $cliente->tipo_documento === '6' ? '01' : '03';

            // Obtener serie disponible
            $serie = SerieComprobante::where('tipo_comprobante', $tipoComprobante)
                                    ->where('activo', true)
                                    ->first();

            if (!$serie) {
                throw new \Exception("No hay series activas para el tipo de comprobante {$tipoComprobante}");
            }

            // Generar correlativo
            $correlativo = $serie->siguienteCorrelativo();

            // Crear comprobante
            $comprobante = $this->crearComprobanteDesdeCompra($compra, $cliente, $tipoComprobante, $serie->serie, $correlativo);

            // Enviar a SUNAT usando Greenter
            $resultadoSunat = $this->greenterService->enviarComprobante($comprobante);

            if ($resultadoSunat['success']) {
                // Actualizar compra con el comprobante generado
                $compra->update([
                    'comprobante_id' => $comprobante->id,
                    'facturado_automaticamente' => true
                ]);

                DB::commit();

                Log::info('Comprobante generado automáticamente', [
                    'compra_id' => $compra->id,
                    'comprobante_id' => $comprobante->id,
                    'numero' => $comprobante->serie . '-' . $comprobante->correlativo
                ]);

                return [
                    'success' => true,
                    'comprobante' => $comprobante->fresh(),
                    'mensaje' => 'Comprobante generado y enviado a SUNAT exitosamente'
                ];
            } else {
                // Si falla el envío a SUNAT, mantener el comprobante pero en estado PENDIENTE
                $compra->update([
                    'comprobante_id' => $comprobante->id,
                    'facturado_automaticamente' => true
                ]);

                DB::commit();

                Log::warning('Comprobante creado pero falló envío a SUNAT', [
                    'compra_id' => $compra->id,
                    'comprobante_id' => $comprobante->id,
                    'error' => $resultadoSunat['error'] ?? 'Error desconocido'
                ]);

                return [
                    'success' => false,
                    'comprobante' => $comprobante->fresh(),
                    'error' => $resultadoSunat['error'] ?? 'Error al enviar a SUNAT',
                    'mensaje' => 'Comprobante creado pero pendiente de envío a SUNAT'
                ];
            }

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Error al generar comprobante automático', [
                'compra_id' => $compra->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Obtener o crear cliente para facturación
     */
    private function obtenerOCrearClienteFacturacion(Compra $compra)
    {
        $datosFacturacion = $compra->getDatosFacturacionCompletos();

        // Si ya tiene cliente asociado, usarlo
        if ($compra->cliente_id) {
            return $compra->cliente;
        }

        // Buscar cliente existente por número de documento
        $cliente = Cliente::where('numero_documento', $datosFacturacion['numero_documento'])
                         ->where('tipo_documento', $datosFacturacion['tipo_documento'])
                         ->first();

        // Si no existe, crear nuevo cliente
        if (!$cliente) {
            $cliente = Cliente::create([
                'tipo_documento' => $datosFacturacion['tipo_documento'],
                'numero_documento' => $datosFacturacion['numero_documento'],
                'razon_social' => $datosFacturacion['razon_social'],
                'direccion' => $datosFacturacion['direccion'],
                'email' => $datosFacturacion['email'] ?? null,
                'telefono' => $datosFacturacion['telefono'] ?? null,
                'activo' => true
            ]);

            Log::info('Cliente creado automáticamente para facturación', [
                'cliente_id' => $cliente->id,
                'documento' => $cliente->numero_documento
            ]);
        }

        return $cliente;
    }

    /**
     * Crear comprobante desde datos de compra
     */
    private function crearComprobanteDesdeCompra(Compra $compra, Cliente $cliente, $tipoComprobante, $serie, $correlativo)
    {
        // Calcular totales (la compra ya tiene los totales calculados)
        $subtotal = $compra->subtotal; // Operación gravada (sin IGV)
        $igv = $compra->igv;
        $total = $compra->total;

        // Crear comprobante
        $comprobante = Comprobante::create([
            'tipo_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'correlativo' => $correlativo,
            'fecha_emision' => now()->format('Y-m-d'),
            'cliente_id' => $cliente->id,
            'cliente_tipo_documento' => $cliente->tipo_documento,
            'cliente_numero_documento' => $cliente->numero_documento,
            'cliente_razon_social' => $cliente->razon_social,
            'cliente_direccion' => $cliente->direccion,
            'moneda' => 'PEN',
            'operacion_gravada' => $subtotal,
            'operacion_exonerada' => 0.00,
            'operacion_inafecta' => 0.00,
            'operacion_gratuita' => 0.00,
            'total_igv' => $igv,
            'total_descuentos' => $compra->descuento_total ?? 0.00,
            'total_otros_cargos' => $compra->costo_envio ?? 0.00,
            'importe_total' => $total,
            'observaciones' => $compra->observaciones,
            'origen' => 'COMPRA_ONLINE',
            'compra_id' => $compra->id,
            'metodo_pago' => $compra->metodo_pago,
            'user_id' => $compra->user_id ?? 1,
            'estado' => 'PENDIENTE'
        ]);

        // Crear detalles del comprobante desde los detalles de la compra
        foreach ($compra->detalles as $index => $detalle) {
            // Calcular valores sin IGV
            $valorUnitario = round($detalle->precio_unitario / 1.18, 2);
            $valorVenta = round($valorUnitario * $detalle->cantidad, 2);
            $igvLinea = round($valorVenta * 0.18, 2);
            $totalLinea = $valorVenta + $igvLinea;

            ComprobanteDetalle::create([
                'comprobante_id' => $comprobante->id,
                'item' => $index + 1,
                'producto_id' => $detalle->producto_id,
                'codigo_producto' => $detalle->codigo_producto,
                'descripcion' => $detalle->nombre_producto,
                'unidad_medida' => 'NIU',
                'cantidad' => $detalle->cantidad,
                'valor_unitario' => $valorUnitario,
                'precio_unitario' => $detalle->precio_unitario,
                'descuento' => 0.00,
                'valor_venta' => $valorVenta,
                'porcentaje_igv' => 18.00,
                'igv' => $igvLinea,
                'tipo_afectacion_igv' => '10', // Gravado - Operación Onerosa
                'importe_total' => $totalLinea
            ]);
        }

        return $comprobante;
    }

    /**
     * Intentar facturar compras pendientes (para ejecutar en cron/job)
     */
    public function facturarComprasPendientes($limite = 10)
    {
        $compras = Compra::where('estado_compra_id', 3) // Estado Pagada
                        ->where('requiere_factura', true)
                        ->whereNull('comprobante_id')
                        ->limit($limite)
                        ->get();

        $resultados = [
            'exitosas' => 0,
            'fallidas' => 0,
            'errores' => []
        ];

        foreach ($compras as $compra) {
            $resultado = $this->generarComprobanteAutomatico($compra);

            if ($resultado['success']) {
                $resultados['exitosas']++;
            } else {
                $resultados['fallidas']++;
                $resultados['errores'][] = [
                    'compra_id' => $compra->id,
                    'error' => $resultado['error']
                ];
            }
        }

        Log::info('Proceso de facturación automática completado', $resultados);

        return $resultados;
    }
}
