<?php

namespace App\Listeners;

use App\Events\OnPaymentConfirmed;
use App\Services\GreenterService;
use App\Models\Comprobante;
use App\Models\ComprobanteDetalle;
use App\Models\SerieComprobante;
use App\Models\Cliente;
use App\Jobs\SendInvoiceToSunat;
use App\Jobs\SendInvoiceNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessAutomaticInvoicing implements ShouldQueue
{
    use InteractsWithQueue;

    protected $greenterService;

    /**
     * Create the event listener.
     */
    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Handle the event.
     */
    public function handle(OnPaymentConfirmed $event): void
    {
        try {
            Log::info("Iniciando facturación automática", [
                'compra_id' => $event->compra->id,
                'cliente_id' => $event->cliente->id,
                'monto' => $event->montoTotal
            ]);

            DB::beginTransaction();

            // 1. Crear o encontrar cliente
            Log::info("Creando o encontrando cliente", ['compra_id' => $event->compra->id]);
            $cliente = $this->crearOEncontrarCliente($event->cliente, $event->compra);
            Log::info("Cliente encontrado/creado", ['cliente_id' => $cliente->id]);

            // 2. Determinar tipo de comprobante
            $tipoComprobante = $this->determinarTipoComprobante($cliente);
            Log::info("Tipo de comprobante determinado", ['tipo' => $tipoComprobante]);

            // 3. Obtener serie
            $serie = $this->obtenerSerie($tipoComprobante);
            Log::info("Serie obtenida", ['serie_id' => $serie->id, 'serie' => $serie->serie]);

            // 4. Crear comprobante
            Log::info("Creando comprobante", ['compra_id' => $event->compra->id]);
            $comprobante = $this->crearComprobante($event->compra, $cliente, $serie, $tipoComprobante);
            Log::info("Comprobante creado", ['comprobante_id' => $comprobante->id]);

            // 5. Crear detalles del comprobante
            $this->crearDetallesComprobante($event->compra, $comprobante);

            DB::commit();

            // 6. Enviar a SUNAT en segundo plano
            SendInvoiceToSunat::dispatch($comprobante->id, $event->cliente->id, request()->ip());

            // 7. NO ENVIAR notificación automáticamente - El usuario debe hacerlo manualmente
            // SendInvoiceNotification::dispatch($comprobante->id, $event->cliente->email);

            Log::info("Facturación automática completada (sin envío de email)", [
                'comprobante_id' => $comprobante->id,
                'serie' => $comprobante->serie,
                'correlativo' => $comprobante->correlativo,
                'nota' => 'Email NO enviado automáticamente - Usuario debe usar POST /api/comprobantes/{id}/email'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error en facturación automática", [
                'compra_id' => $event->compra->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Crear o encontrar cliente
     */
    private function crearOEncontrarCliente($userCliente, $compra)
    {
        // Buscar cliente existente por documento
        $cliente = Cliente::where('numero_documento', $compra->numero_documento)->first();

        if (!$cliente) {
            // Crear nuevo cliente
            $cliente = Cliente::create([
                'tipo_documento' => strlen($compra->numero_documento) === 11 ? '6' : '1', // RUC o DNI
                'numero_documento' => $compra->numero_documento,
                'razon_social' => $compra->cliente_nombre,
                'direccion' => $compra->direccion_envio,
                'email' => $compra->cliente_email,
                'telefono' => $compra->telefono_contacto,
                'activo' => true
            ]);
        }

        return $cliente;
    }

    /**
     * Determinar tipo de comprobante
     */
    private function determinarTipoComprobante($cliente)
    {
        // Si es RUC (11 dígitos) = Factura, si es DNI (8 dígitos) = Boleta
        return strlen($cliente->numero_documento) === 11 ? '01' : '03';
    }

    /**
     * Obtener serie disponible
     */
    private function obtenerSerie($tipoComprobante)
    {
        $serie = SerieComprobante::where('tipo_comprobante', $tipoComprobante)
                                ->where('activo', true)
                                ->first();

        if (!$serie) {
            throw new \Exception("No hay series configuradas para el tipo de comprobante {$tipoComprobante}");
        }

        return $serie;
    }

    /**
     * Crear comprobante
     */
    private function crearComprobante($compra, $cliente, $serie, $tipoComprobante)
    {
        // Actualizar correlativo
        $serie->correlativo += 1;
        $serie->save();

        $correlativo = str_pad($serie->correlativo, 6, '0', STR_PAD_LEFT);

        // Calcular totales
        $subtotal = $compra->subtotal;
        $igv = $compra->igv;
        $total = $compra->total;

        return Comprobante::create([
            'cliente_id' => $cliente->id,
            'user_id' => 1, // Usuario por defecto
            'tipo_comprobante' => $tipoComprobante,
            'serie' => $serie->serie,
            'correlativo' => $correlativo,
            'fecha_emision' => now()->format('Y-m-d'),
            'cliente_tipo_documento' => $cliente->tipo_documento,
            'cliente_numero_documento' => $cliente->numero_documento,
            'cliente_razon_social' => $cliente->razon_social,
            'cliente_direccion' => $cliente->direccion,
            'moneda' => 'PEN',
            'operacion_gravada' => round($subtotal, 2),
            'operacion_exonerada' => 0.00,
            'operacion_inafecta' => 0.00,
            'total_igv' => round($igv, 2),
            'total_descuentos' => 0.00,
            'importe_total' => round($total, 2),
            'estado' => 'PENDIENTE',
            'origen' => 'ECOMMERCE',
            'compra_id' => $compra->id,
            'metodo_pago' => $compra->metodo_pago,
            'referencia_pago' => 'TEST-' . time()
        ]);
    }

    /**
     * Crear detalles del comprobante
     */
    private function crearDetallesComprobante($compra, $comprobante)
    {
        foreach ($compra->detalles as $index => $detalle) {
            ComprobanteDetalle::create([
                'comprobante_id' => $comprobante->id,
                'item' => $index + 1,
                'producto_id' => $detalle->producto_id,
                'codigo_producto' => $detalle->codigo_producto,
                'descripcion' => $detalle->nombre_producto,
                'unidad_medida' => 'NIU',
                'cantidad' => $detalle->cantidad,
                'valor_unitario' => round($detalle->precio_unitario / 1.18, 2), // Sin IGV
                'precio_unitario' => round($detalle->precio_unitario, 2), // Con IGV
                'valor_venta' => round($detalle->subtotal_linea / 1.18, 2), // Sin IGV
                'igv' => round($detalle->subtotal_linea * 0.18 / 1.18, 2), // IGV
                'total' => round($detalle->subtotal_linea, 2),
                'descuento' => 0.00,
                'porcentaje_igv' => 18.00,
                'tipo_afectacion_igv' => '10', // Gravado - Operación Onerosa
            ]);
        }
    }
}