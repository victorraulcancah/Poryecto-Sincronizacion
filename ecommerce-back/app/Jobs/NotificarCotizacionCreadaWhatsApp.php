<?php

namespace App\Jobs;

use App\Models\Cotizacion;
use App\Services\NotificacionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Aviso de WhatsApp al cliente cuando crea una cotización/pedido desde el
 * checkout del ecommerce. Va en un Job y no en línea porque el checkout ya
 * respondió al cliente — un WhatsApp lento o caído no debe demorar ni
 * romper esa respuesta.
 *
 * El mensaje sale de la plantilla `COTIZACION_CREADA_WHATSAPP`
 * (tabla `plantillas_notificacion`, editable desde el panel), así que
 * cambiar el texto no requiere tocar código.
 */
class NotificarCotizacionCreadaWhatsApp implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 30;

    public function __construct(
        public int $cotizacionId,
        public string $codigoPedido,
    ) {
    }

    public function handle(NotificacionService $notificaciones): void
    {
        $cotizacion = Cotizacion::with('userCliente')->find($this->cotizacionId);

        if (!$cotizacion || !$cotizacion->userCliente) {
            Log::warning('NotificarCotizacionCreadaWhatsApp: cotización o cliente no encontrado', [
                'cotizacion_id' => $this->cotizacionId,
            ]);
            return;
        }

        $telefono = $cotizacion->userCliente->telefono;

        if (!$telefono) {
            Log::info('NotificarCotizacionCreadaWhatsApp: cliente sin teléfono, no se envía', [
                'cotizacion_id' => $this->cotizacionId,
            ]);
            return;
        }

        $simbolo = $cotizacion->moneda === 'd' ? 'US$' : 'S/';

        $datos = [
            'nombre' => $cotizacion->cliente_nombre ?: $cotizacion->userCliente->nombres,
            'codigo_cotizacion' => $cotizacion->codigo_cotizacion,
            'codigo_pedido' => $this->codigoPedido,
            'total' => $simbolo.' '.number_format((float) $cotizacion->total, 2),
            // Fijo, no editable desde la plantilla — ver config/whatsapp.php.
            'link' => config('whatsapp.link_ecommerce'),
        ];

        $notificaciones->enviarConPlantilla(
            'COTIZACION_CREADA_WHATSAPP',
            ['telefono' => $telefono],
            $datos
        );
    }
}
