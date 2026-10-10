<?php

namespace App\Services\Pasarela;

/**
 * Pasarela de pago de prueba: aprueba o rechaza sin mover dinero.
 *
 * Existe mientras Culqi no aprueba el comercio. Tiene la misma forma que el
 * cobro real: el navegador entrega un token (nunca el número de la tarjeta) y
 * el servidor lo cobra. Cuando llegue Culqi, el token sale de Culqi.js y este
 * método se reemplaza por la llamada a `POST /v2/charges`; el controlador y la
 * pantalla de pago no cambian.
 */
class PasarelaSimulada
{
    /** Token de la tarjeta de prueba que se aprueba. */
    public const TOKEN_APROBADO = 'tok_test_aprobado';

    /** Token de la tarjeta de prueba que se rechaza (fondos insuficientes). */
    public const TOKEN_RECHAZADO = 'tok_test_rechazado';

    /**
     * @return array{aprobado: bool, referencia: string, mensaje: string}
     */
    public function cobrar(string $token, float $monto, string $moneda): array
    {
        $referencia = 'SIM-' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 10));

        if ($token === self::TOKEN_APROBADO) {
            return [
                'aprobado' => true,
                'referencia' => $referencia,
                'mensaje' => 'Pago aprobado (pasarela de prueba, sin cobro real).',
            ];
        }

        if ($token === self::TOKEN_RECHAZADO) {
            return [
                'aprobado' => false,
                'referencia' => $referencia,
                'mensaje' => 'La tarjeta fue rechazada: fondos insuficientes.',
            ];
        }

        return [
            'aprobado' => false,
            'referencia' => $referencia,
            'mensaje' => 'No se pudo validar la tarjeta. Usa una tarjeta de prueba.',
        ];
    }
}
