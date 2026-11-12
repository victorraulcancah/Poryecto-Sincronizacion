<?php

namespace App\Support;

/**
 * Cómo se le informa el stock al cliente en la tienda (web y app): no se
 * muestra el número de existencias sino un mensaje según el rango.
 *
 *   0        → "Agotado"
 *   1 a 3    → "¡Últimas N unidades!"   (con "¡Última unidad!" si queda una)
 *   4 a 9    → "Quedan N unidades"
 *   10 o más → "Disponible"
 *
 * El número real sigue viajando en `stock` (el carrito lo necesita para tope
 * de cantidad); estos campos son lo que se dibuja.
 */
class StockPublico
{
    public const NIVEL_AGOTADO = 'agotado';
    public const NIVEL_ULTIMAS = 'ultimas';
    public const NIVEL_QUEDAN = 'quedan';
    public const NIVEL_DISPONIBLE = 'disponible';

    /** Hasta cuántas unidades se avisa "¡Últimas N unidades!". */
    public const MAX_ULTIMAS = 3;

    /** Hasta cuántas unidades se avisa "Quedan N unidades"; desde ahí, "Disponible". */
    public const MAX_QUEDAN = 9;

    public static function nivel(?int $stock): string
    {
        $stock = max(0, (int) $stock);

        if ($stock === 0) {
            return self::NIVEL_AGOTADO;
        }
        if ($stock <= self::MAX_ULTIMAS) {
            return self::NIVEL_ULTIMAS;
        }
        if ($stock <= self::MAX_QUEDAN) {
            return self::NIVEL_QUEDAN;
        }

        return self::NIVEL_DISPONIBLE;
    }

    public static function mensaje(?int $stock): string
    {
        $stock = max(0, (int) $stock);

        return match (self::nivel($stock)) {
            self::NIVEL_AGOTADO => 'Agotado',
            self::NIVEL_ULTIMAS => $stock === 1 ? '¡Última unidad!' : "¡Últimas {$stock} unidades!",
            self::NIVEL_QUEDAN => "Quedan {$stock} unidades",
            default => 'Disponible',
        };
    }

    /**
     * Los dos campos listos para agregar a una respuesta:
     * `['stock_mensaje' => ..., 'stock_nivel' => ...]`.
     */
    public static function campos(?int $stock): array
    {
        return [
            'stock_mensaje' => self::mensaje($stock),
            'stock_nivel' => self::nivel($stock),
        ];
    }
}
