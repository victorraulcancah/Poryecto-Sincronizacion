<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Unidad de medida de los productos de la tienda ("unidad", "set", "par"...).
 *
 * La tienda no guarda esa columna: vive en Novik (`products.measure_id` →
 * `measures.name`). Se lee de ahí por el mapeo producto de la tienda → producto
 * de Novik, todo en una sola consulta (son unos cientos de productos), y se
 * guarda unos minutos: la unidad casi nunca cambia y un listado necesita la de
 * decenas de productos a la vez.
 *
 * Si Novik no responde no se inventa nada: se devuelve `null` y quien llama usa
 * "unidad" por defecto.
 */
class UnidadDeMedida
{
    private const CLAVE_CACHE = 'unidad_de_medida_productos';
    private const CLAVE_FALLO = 'unidad_de_medida_productos_fallo';
    private const MINUTOS_CACHE = 15;

    /** Tras un fallo del ERP no se reintenta durante este tiempo (cada intento puede tardar el timeout). */
    private const SEGUNDOS_ESPERA_TRAS_FALLO = 60;

    /** Lo que se dice cuando el producto no tiene unidad definida. */
    public const POR_DEFECTO = 'unidad';

    /**
     * @return array<int,string>  [producto_id => unidad en minúsculas]
     */
    public static function mapa(): array
    {
        $guardado = Cache::get(self::CLAVE_CACHE);
        if (is_array($guardado)) {
            return $guardado;
        }

        // Con el ERP caído, cada respuesta esperaría su timeout: se descansa un rato.
        if (Cache::has(self::CLAVE_FALLO)) {
            return [];
        }

        try {
            $mapeo = DB::table('producto_mapeo_7power')->pluck('producto_7power_id', 'producto_id');
            if ($mapeo->isEmpty()) {
                return [];
            }

            $nombres = DB::connection('mysql_7power')
                ->table('products as p')
                ->join('measures as m', 'm.id', '=', 'p.measure_id')
                ->whereIn('p.id', $mapeo->values()->all())
                ->pluck('m.name', 'p.id');

            $mapa = [];
            foreach ($mapeo as $productoId => $producto7PowerId) {
                $nombre = self::limpiar($nombres[$producto7PowerId] ?? null);
                if ($nombre !== null) {
                    $mapa[(int) $productoId] = $nombre;
                }
            }

            // Solo se guarda lo que se pudo leer: un fallo no debe quedar en
            // caché durante quince minutos.
            Cache::put(self::CLAVE_CACHE, $mapa, now()->addMinutes(self::MINUTOS_CACHE));

            return $mapa;
        } catch (\Throwable $e) {
            Log::warning('No se pudo leer la unidad de medida de Novik', ['error' => $e->getMessage()]);
            Cache::put(self::CLAVE_FALLO, true, now()->addSeconds(self::SEGUNDOS_ESPERA_TRAS_FALLO));
            return [];
        }
    }

    /** Unidad de un producto de la tienda, o null si no se conoce. */
    public static function de(?int $productoId): ?string
    {
        if (! $productoId) {
            return null;
        }

        return self::mapa()[$productoId] ?? null;
    }

    /** "UNIDAD " → "unidad"; vacío → null. */
    public static function limpiar(?string $nombre): ?string
    {
        $nombre = mb_strtolower(trim((string) $nombre));

        return $nombre === '' ? null : $nombre;
    }
}
