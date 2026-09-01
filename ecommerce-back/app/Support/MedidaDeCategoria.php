<?php

namespace App\Support;

/**
 * Qué se mide en cada categoría del catálogo.
 *
 * El filtro del sidebar era uno solo, "Tamaño" en pulgadas, para todo el
 * catálogo. En Amplificadores ofrecía pulgadas que no existen y no devolvía
 * nada. Acá cada categoría declara su propia medida:
 *
 *   AMPLIFICADOR  -> canales   ("4CH * 500 RMS")
 *   DRIVER        -> bobina    ("2'' DRIVER 3''VC")
 *   RCA, CABLE    -> metros    ("3.30M", "30 CM", "100 METROS")
 *   parlantes     -> pulgadas  ("6.5'' MEDIO RANGO")   <- lo de siempre
 *
 * Las categorías que no aparecen acá no muestran filtro, que es mejor que
 * mostrar uno vacío o con datos de otra cosa.
 *
 * Ninguna de estas medidas es una columna: están escritas a mano dentro del
 * nombre del producto, así que se leen con expresiones regulares.
 */
class MedidaDeCategoria
{
    public const PULGADAS = 'pulgadas';
    public const CANALES = 'canales';
    public const BOBINA = 'bobina';
    public const METROS = 'metros';

    /**
     * Categoría (por nombre) -> tipo de medida. Se compara en mayúsculas y sin
     * tildes porque los nombres vienen del ERP y se escriben a mano.
     */
    private const POR_CATEGORIA = [
        'AMPLIFICADOR' => self::CANALES,
        'KIT DE AMPLIFICADOR' => self::CANALES,

        'DRIVER' => self::BOBINA,

        'RCA' => self::METROS,
        'ROLLO CABLE' => self::METROS,

        'PARLANTE' => self::PULGADAS,
        'PARLANTE BLUETOOH' => self::PULGADAS,
        'SUBWOOFER' => self::PULGADAS,
        'SUBWOOFER AMPLIFICADO' => self::PULGADAS,
        'MEDIO RANGO' => self::PULGADAS,
        'MID BASS' => self::PULGADAS,
        'TWEETER' => self::PULGADAS,
        'COMPONENTE' => self::PULGADAS,
    ];

    private const TITULOS = [
        self::PULGADAS => 'Tamaño',
        self::CANALES => 'Canales',
        self::BOBINA => 'Bobina',
        self::METROS => 'Longitud',
    ];

    /** Devuelve el tipo de medida de una categoría, o null si no tiene. */
    public static function tipoDe(?string $nombreCategoria): ?string
    {
        if (! $nombreCategoria) {
            return null;
        }

        $limpio = mb_strtoupper(trim(preg_replace('/\s+/u', ' ', $nombreCategoria)), 'UTF-8');

        return self::POR_CATEGORIA[$limpio] ?? null;
    }

    /** Título que se muestra sobre el filtro en el sidebar. */
    public static function titulo(?string $tipo): string
    {
        return self::TITULOS[$tipo] ?? 'Tamaño';
    }

    /**
     * Medidas escritas en el nombre de un producto, ya normalizadas (sin ceros
     * de más y con punto decimal).
     *
     * Devuelve una lista porque un nombre puede traer varias: un amplificador
     * "4CH * 120 + 1CH * 320" es de 4 y de 1 canal, y tiene que salir en los dos
     * filtros. Si se quedara solo con la primera, el conteo del sidebar no
     * cuadraría con los productos que devuelve el filtro.
     */
    public static function leerDe(string $tipo, string $nombre): array
    {
        return match ($tipo) {
            self::CANALES => self::leerCanales($nombre),
            self::BOBINA => self::leerBobina($nombre),
            self::METROS => self::leerMetros($nombre),
            self::PULGADAS => self::leerPulgadas($nombre),
            default => [],
        };
    }

    /** Texto de la opción en el sidebar: 6.5", 4 canales, 3" VC, 3.3 m. */
    public static function etiqueta(string $tipo, string $valor): string
    {
        return match ($tipo) {
            self::CANALES => $valor === '1' ? '1 canal' : $valor . ' canales',
            self::BOBINA => $valor . '" VC',
            self::METROS => $valor . ' m',
            default => $valor . '"',
        };
    }

    /**
     * Condición SQL que reconoce esa medida dentro del nombre.
     *
     * Devuelve [$sql, $bindings]. Se arma acá y no en el controlador para que
     * lo que se lista y lo que se filtra no puedan quedar desalineados.
     */
    public static function condicionSql(string $tipo, string $valor): array
    {
        $n = self::numeroRegex($valor);

        return match ($tipo) {
            self::CANALES => ['nombre REGEXP ?', ["(^|[^0-9.]){$n}[[:space:]]*CH([^A-Z0-9]|$)"]],

            self::BOBINA => ['nombre REGEXP ?', ["(^|[^0-9.]){$n}[[:space:]]*(''|\"|”|″)?[[:space:]]*VC([^A-Z0-9]|$)"]],

            // Los centímetros se guardan convertidos a metros (30 CM -> 0.3), así
            // que hay que reconocer las dos formas de escribirlo.
            self::METROS => ['(nombre REGEXP ? OR nombre REGEXP ?)', [
                "(^|[^0-9.]){$n}[[:space:]]*(M|MT|MTS|METRO|METROS)([^A-Z0-9]|$)",
                "(^|[^0-9.])" . self::numeroRegex(self::aCentimetros($valor)) . "[[:space:]]*CM([^A-Z0-9]|$)",
            ]],

            // Pulgadas: con la marca, o al principio del nombre sin ella
            // ("6.5 PARLANTE 2 VIAS"), que es como se lee arriba.
            default => ['(nombre REGEXP ? OR nombre REGEXP ?)', [
                "(^|[^0-9.]){$n}[[:space:]]*(''|\"|”|″)",
                "^[[:space:]]*{$n}[[:space:]]",
            ]],
        };
    }

    // ------------------------------------------------------------- lectores

    /** "4CH * 120 + 1CH * 320" -> [4, 1]. */
    private static function leerCanales(string $nombre): array
    {
        preg_match_all('/([0-9]+)[[:space:]]*CH\b/iu', $nombre, $m);

        return self::normalizarTodos($m[1] ?? []);
    }

    /** "2'' DRIVER 3''VC" -> [3]. Es la bobina, no la boca del driver. */
    private static function leerBobina(string $nombre): array
    {
        preg_match_all('/([0-9]+(?:[.,][0-9]+)?)[[:space:]]*(?:\'\'|"|”|″)?[[:space:]]*VC\b/iu', $nombre, $m);

        return self::normalizarTodos($m[1] ?? []);
    }

    /** "3.30M", "30 CM", "100 METROS" -> siempre en metros. */
    private static function leerMetros(string $nombre): array
    {
        if (! preg_match_all('/([0-9]+(?:[.,][0-9]+)?)[[:space:]]*(CM|MTS|MT|METROS|METRO|M)\b/iu', $nombre, $m, PREG_SET_ORDER)) {
            return [];
        }

        $valores = [];
        foreach ($m as $coincidencia) {
            $valor = str_replace(',', '.', $coincidencia[1]);

            // Todo se expresa en metros para que la lista sea comparable y
            // ordenable: "30 CM" y "0.30 M" son la misma longitud y no pueden
            // salir como dos opciones distintas.
            if (mb_strtoupper($coincidencia[2]) === 'CM') {
                $valor = (string) ((float) $valor / 100);
            }

            $valores[] = $valor;
        }

        return self::normalizarTodos($valores);
    }

    /** La lógica de siempre: la medida en pulgadas dentro del nombre. */
    private static function leerPulgadas(string $nombre): array
    {
        // 1) Con marca de pulgadas: "6.5''", '10"'.
        if (preg_match_all("/(?<![0-9.])([0-9]+(?:[.,][0-9]+)?)[[:space:]]*(?:''|\"|”|″)/u", $nombre, $m)) {
            return self::normalizarTodos($m[1]);
        }

        // 2) Al principio y sin marca ("6.5 PARLANTE 2 VIAS"). Acá no hace falta
        //    comprobar que sea un producto de audio: ya se sabe por la categoría.
        if (preg_match('/^\s*([0-9]+(?:[.,][0-9]+)?)\s/u', $nombre, $m)) {
            return self::normalizarTodos([$m[1]]);
        }

        return [];
    }

    // ---------------------------------------------------------- utilidades

    /** @param string[] $valores */
    private static function normalizarTodos(array $valores): array
    {
        $limpios = [];
        foreach ($valores as $valor) {
            $limpio = self::normalizar($valor);
            if ($limpio !== '' && ! in_array($limpio, $limpios, true)) {
                $limpios[] = $limpio;
            }
        }

        return $limpios;
    }

    /** "5.20" y "5.2" son la misma medida; "1,5" y "1.5" también. */
    private static function normalizar(string $valor): string
    {
        $valor = str_replace(',', '.', trim($valor));

        if (str_contains($valor, '.')) {
            $valor = rtrim(rtrim($valor, '0'), '.');
        }

        return $valor === '' ? '0' : $valor;
    }

    private static function aCentimetros(string $metros): string
    {
        return self::normalizar((string) ((float) $metros * 100));
    }

    /**
     * El número, escapado para un REGEXP y tolerando los ceros de más con que
     * está escrito en los nombres: buscando "1.8" tiene que encontrar "1.80M",
     * y buscando "2" tiene que encontrar "2M" y "2.00 M" pero nunca "20M".
     */
    private static function numeroRegex(string $valor): string
    {
        $limpio = preg_replace('/[^0-9.]/', '', $valor);

        if (str_contains($limpio, '.')) {
            return str_replace('.', '[.]', $limpio) . '0*';
        }

        return $limpio . '([.]0+)?';
    }
}
