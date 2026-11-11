<?php

namespace App\Support;

use App\Models\PagoEnLinea;
use App\Services\FcmService;
use Illuminate\Support\Facades\Log;

/**
 * Avisa por push al cliente cuando cambia la etapa de su compra.
 */
class NotificarCompra
{
    /**
     * Texto de la notificación para cada etapa. `pendiente_facturar` es el estado
     * inicial y no se avisa.
     *
     * @return array{0: string, 1: string}|null  [título, cuerpo]
     */
    public static function mensaje(string $estadoProceso, string $codigo): ?array
    {
        return match ($estadoProceso) {
            'facturado' => ['Compra facturada', "Emitimos el comprobante de tu compra {$codigo}."],
            'en_delivery' => ['Tu pedido va en camino', "Tu compra {$codigo} salió a entrega."],
            'entregado' => ['Pedido entregado', "Tu compra {$codigo} fue entregada. ¡Gracias por comprar en 7Power!"],
            'cancelado' => ['Compra cancelada', "Tu compra {$codigo} fue cancelada."],
            default => null,
        };
    }

    /**
     * Manda la notificación del estado actual de [$pago]. Nunca falla: un problema
     * con Firebase no debe impedir guardar el seguimiento.
     */
    public static function estadoCambio(PagoEnLinea $pago, FcmService $fcm): int
    {
        $mensaje = self::mensaje((string) $pago->estado_proceso, (string) $pago->codigo);
        if ($mensaje === null || ! $pago->user_cliente_id) {
            return 0;
        }

        try {
            return $fcm->enviarACliente((int) $pago->user_cliente_id, $mensaje[0], $mensaje[1], [
                'tipo' => 'compra',
                'compra_id' => $pago->id,
                'estado' => $pago->estado_proceso,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Push de compra: '.$e->getMessage());

            return 0;
        }
    }
}
