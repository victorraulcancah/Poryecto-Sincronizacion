<?php

namespace App\Jobs;

use App\Models\Pedido;
use App\Services\NotificacionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Igual que NotificarCotizacionCreadaWhatsApp, pero para el pedido que se
 * crea directo (sin pasar por una cotización) vía
 * PedidosController::crearPedidoEcommerce. Mismo plantilla
 * `COTIZACION_CREADA_WHATSAPP`: el texto no menciona "cotización", así que
 * sirve igual para los dos casos.
 */
class NotificarPedidoCreadoWhatsApp implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 30;

    public function __construct(public int $pedidoId)
    {
    }

    public function handle(NotificacionService $notificaciones): void
    {
        $pedido = Pedido::with('userCliente')->find($this->pedidoId);

        if (!$pedido || !$pedido->userCliente) {
            Log::warning('NotificarPedidoCreadoWhatsApp: pedido o cliente no encontrado', [
                'pedido_id' => $this->pedidoId,
            ]);
            return;
        }

        $telefono = $pedido->userCliente->telefono;

        if (!$telefono) {
            Log::info('NotificarPedidoCreadoWhatsApp: cliente sin teléfono, no se envía', [
                'pedido_id' => $this->pedidoId,
            ]);
            return;
        }

        $simbolo = $pedido->moneda === 'd' ? 'US$' : 'S/';

        $datos = [
            'nombre' => $pedido->cliente_nombre ?: $pedido->userCliente->nombres,
            'codigo_cotizacion' => '',
            'codigo_pedido' => $pedido->codigo_pedido,
            'total' => $simbolo.' '.number_format((float) $pedido->total, 2),
            'link' => config('whatsapp.link_ecommerce'),
        ];

        $notificaciones->enviarConPlantilla(
            'COTIZACION_CREADA_WHATSAPP',
            ['telefono' => $telefono],
            $datos
        );
    }
}
