<?php

namespace App\Support;

/**
 * Cómo se le informa el stock al cliente en la tienda (web y app): no se
 * muestra el número de existencias sino un mensaje según el rango, con la
 * unidad de medida del producto ("unidad", "set", "par"...).
 *
 *   0        → "Agotado"
 *   1 a 3    → "¡Últimas 3 unidades!"  ("¡Última unidad!", "¡Últimos 3 sets!")
 *   4 a 9    → "Quedan 7 sets"
 *   10 o más → "Disponible: +10 sets"
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

    /** Hasta cuántas unidades se avisa "¡Últimas N!". */
    public const MAX_ULTIMAS = 3;

    /** Hasta cuántas unidades se avisa "Quedan N"; desde ahí, "Disponible: +10". */
    public const MAX_QUEDAN = 9;

    /** Desde cuántas unidades se dice "+10" en vez del número exacto. */
    public const TOPE_DISPONIBLE = 10;

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

    public static function mensaje(?int $stock, ?string $unidad = null): string
    {
        $stock = max(0, (int) $stock);
        $unidad = UnidadDeMedida::limpiar($unidad) ?? UnidadDeMedida::POR_DEFECTO;
        $plural = self::plural($unidad);

        return match (self::nivel($stock)) {
            self::NIVEL_AGOTADO => 'Agotado',
            self::NIVEL_ULTIMAS => $stock === 1
                ? (self::esFemenina($unidad) ? "¡Última {$unidad}!" : "¡Último {$unidad}!")
                : (self::esFemenina($unidad) ? "¡Últimas {$stock} {$plural}!" : "¡Últimos {$stock} {$plural}!"),
            self::NIVEL_QUEDAN => "Quedan {$stock} {$plural}",
            default => 'Disponible: +' . self::TOPE_DISPONIBLE . " {$plural}",
        };
    }

    /**
     * Los campos listos para agregar a una respuesta:
     * `stock_mensaje`, `stock_nivel` y `unidad_medida`.
     */
    public static function campos(?int $stock, ?string $unidad = null): array
    {
        $unidad = UnidadDeMedida::limpiar($unidad) ?? UnidadDeMedida::POR_DEFECTO;

        return [
            'stock_mensaje' => self::mensaje($stock, $unidad),
            'stock_nivel' => self::nivel($stock),
            'unidad_medida' => $unidad,
        ];
    }

    /** "unidad" → "unidades", "set" → "sets", "par" → "pares", "caja" → "cajas". */
    public static function plural(string $unidad): string
    {
        $ultima = mb_substr($unidad, -1);

        if (in_array($ultima, ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú'], true)) {
            return $unidad . 's';
        }
        if ($ultima === 'z') {
            return mb_substr($unidad, 0, -1) . 'ces';
        }
        // Las terminadas en l, r, n, d, j llevan "es" (par → pares, unidad →
        // unidades); las demás, "s" (set → sets, kit → kits).
        if (in_array($ultima, ['l', 'r', 'n', 'd', 'j'], true)) {
            return $unidad . 'es';
        }

        return $unidad . 's';
    }

    /** Género: "unidad", "caja", "docena" son femeninas; "set", "par", "juego", masculinas. */
    public static function esFemenina(string $unidad): bool
    {
        return (bool) preg_match('/(a|ad|ión)$/u', $unidad);
    }
}
