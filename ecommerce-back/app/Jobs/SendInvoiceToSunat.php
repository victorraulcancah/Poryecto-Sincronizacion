<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\GreenterService;
use App\Models\Comprobante;
use Illuminate\Support\Facades\Log;

class SendInvoiceToSunat implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $comprobanteId;
    public $userId;
    public $ipOrigen;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     *
     * @var int
     */
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(int $comprobanteId, int $userId, ?string $ipOrigen = null)
    {
        $this->comprobanteId = $comprobanteId;
        $this->userId = $userId;
        $this->ipOrigen = $ipOrigen;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("Iniciando envío a SUNAT", [
                'comprobante_id' => $this->comprobanteId,
                'user_id' => $this->userId
            ]);

            $comprobante = Comprobante::findOrFail($this->comprobanteId);

            // Verificar que el comprobante esté en estado PENDIENTE
            if ($comprobante->estado !== 'PENDIENTE') {
                Log::warning("Comprobante no está en estado PENDIENTE", [
                    'comprobante_id' => $this->comprobanteId,
                    'estado_actual' => $comprobante->estado
                ]);
                return;
            }

            // Crear venta temporal para el servicio Greenter
            $venta = $this->crearVentaTemporal($comprobante);

            // Enviar a SUNAT usando GreenterService
            $greenterService = new GreenterService();
            $resultado = $greenterService->generarFactura($venta->id, null, $this->userId, $this->ipOrigen);

            if ($resultado['success']) {
                Log::info("Comprobante enviado exitosamente a SUNAT", [
                    'comprobante_id' => $this->comprobanteId,
                    'estado' => $comprobante->fresh()->estado
                ]);
            } else {
                Log::error("Error al enviar comprobante a SUNAT", [
                    'comprobante_id' => $this->comprobanteId,
                    'error' => $resultado['error'] ?? 'Error desconocido'
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Error en job SendInvoiceToSunat", [
                'comprobante_id' => $this->comprobanteId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Re-lanzar la excepción para que el job falle y se reintente
            throw $e;
        }
    }

    /**
     * Crear venta temporal para el servicio Greenter
     */
    private function crearVentaTemporal($comprobante)
    {
        // Crear venta temporal
        $venta = \App\Models\Venta::create([
            'cliente_id' => $comprobante->cliente_id,
            'user_id' => $comprobante->user_id,
            'fecha_venta' => $comprobante->fecha_emision,
            'subtotal' => $comprobante->operacion_gravada,
            'igv' => $comprobante->total_igv,
            'total' => $comprobante->importe_total,
            'estado' => 'FACTURADO',
            'comprobante_id' => $comprobante->id
        ]);

        // Crear detalles de venta
        foreach ($comprobante->detalles as $detalle) {
            \App\Models\VentaDetalle::create([
                'venta_id' => $venta->id,
                'producto_id' => $detalle->producto_id,
                'cantidad' => $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'subtotal' => $detalle->total,
                'igv' => $detalle->igv,
                'total' => $detalle->total
            ]);
        }

        return $venta;
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Job SendInvoiceToSunat falló definitivamente", [
            'comprobante_id' => $this->comprobanteId,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);

        // Actualizar estado del comprobante a ERROR
        $comprobante = Comprobante::find($this->comprobanteId);
        if ($comprobante) {
            $comprobante->update([
                'estado' => 'ERROR',
                'mensaje_sunat' => 'Error en envío automático: ' . $exception->getMessage()
            ]);
        }
    }
}