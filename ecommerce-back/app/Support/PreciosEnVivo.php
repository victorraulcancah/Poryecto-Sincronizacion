<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Precios leídos directamente de Novik, sin esperar a la sincronización.
 *
 * La tienda guarda una copia de los precios en `producto_precios`, que
 * `sync:7power --only-precios` refresca cada 30 segundos y que sirve para
 * filtrar y ordenar por precio. Pero el precio que se MUESTRA (y el que se
 * cobra) sale de Novik en el momento: si alguien cambia una lista de precios en
 * el ERP, la tienda lo muestra en la siguiente carga de la página.
 *
 * Se aplica en `ProductoPrecio::newCollection`, o sea cada vez que la tienda
 * carga precios de productos (listados, detalle, relacionados, favoritos,
 * carrito, pago): una sola consulta a Novik por tanda de productos, igual que
 * `StockEnVivo`.
 *
 * Limitaciones, a propósito:
 *  - Solo se corrigen precios que la tienda ya tiene. Un precio nuevo (un
 *    producto sin precio en esa lista) o uno borrado en Novik aparece o
 *    desaparece con la siguiente sincronización, de 30 segundos como mucho.
 *  - Si Novik no responde se sigue con la copia local, y no se vuelve a
 *    preguntar durante unos segundos para no hacer esperar a cada visita.
 *  - Se apaga con `PRECIOS_EN_VIVO=false` en el `.env`.
 */
class PreciosEnVivo
{
    /** Segundos sin volver a preguntar a Novik después de una falla. */
    private const PAUSA_SI_FALLA = 30;

    private const CLAVE_PAUSA = 'precios_en_vivo_pausado';

    /** Segundos que se reutiliza lo ya leído de Novik (ver `aplicar`). */
    private const VIGENCIA_LECTURA = 2.0;

    /** Mapeos de la tienda a Novik, leídos una vez por petición. */
    private static ?array $productos = null; // producto_id => producto_7power_id
    private static ?array $listas = null;    // tipo_precio_id => list_price_id de Novik

    /**
     * Lo último leído de Novik: 'producto-lista' => precio, o null si Novik no tiene esa fila. Laravel
     * llama a `newCollection` una vez con toda la tanda y otra por cada producto al emparejar la
     * relación: sin reutilizar esto, 24 productos serían 25 consultas a Novik en vez de una. Dura pocos
     * segundos, para no dar un precio viejo en procesos largos.
     */
    private static array $vivos = [];
    private static float $vivosDesde = 0.0;

    /**
     * Pone en cada precio de la colección el valor actual de Novik.
     *
     * Los cambios se hacen sin ensuciar el modelo: quien guarde un precio sin
     * tocarlo no escribe nada.
     *
     * @param  Collection<int, \App\Models\ProductoPrecio>  $precios
     */
    public static function aplicar(Collection $precios): void
    {
        if ($precios->isEmpty() || ! config('services.precios_en_vivo', true)) {
            return;
        }

        try {
            if (Cache::store('file')->has(self::CLAVE_PAUSA)) {
                return;
            }

            self::$productos ??= DB::table('producto_mapeo_7power')
                ->pluck('producto_7power_id', 'producto_id')->all();
            self::$listas ??= DB::table('tipos_precio')
                ->whereNotNull('tipo_precio_7power_id')
                ->pluck('tipo_precio_7power_id', 'id')->all();

            if (microtime(true) - self::$vivosDesde > self::VIGENCIA_LECTURA) {
                self::$vivos = [];
                self::$vivosDesde = microtime(true);
            }

            // Lo que todavía no se leyó de Novik en estos segundos.
            $productosNovik = [];
            $listasNovik = [];
            $pedidas = [];
            foreach ($precios as $precio) {
                $producto = self::$productos[$precio->producto_id] ?? null;
                $lista = self::$listas[$precio->tipo_precio_id] ?? null;
                $clave = $producto . '-' . $lista;
                if ($producto && $lista && ! array_key_exists($clave, self::$vivos)) {
                    $productosNovik[$producto] = true;
                    $listasNovik[$lista] = true;
                    $pedidas[$clave] = true;
                }
            }

            if ($pedidas) {
                $filas = DB::connection('mysql_7power')
                    ->table('list_price_product')
                    ->whereIn('product_id', array_keys($productosNovik))
                    ->whereIn('list_price_id', array_keys($listasNovik))
                    ->get(['product_id', 'list_price_id', 'precio']);

                // Lo pedido que Novik no devolvió queda en null: esa fila no existe allá.
                foreach ($pedidas as $clave => $_) {
                    self::$vivos[$clave] = null;
                }
                foreach ($filas as $fila) {
                    self::$vivos[$fila->product_id . '-' . $fila->list_price_id] = $fila->precio ?? 0;
                }
            }

            foreach ($precios as $precio) {
                $producto = self::$productos[$precio->producto_id] ?? null;
                $lista = self::$listas[$precio->tipo_precio_id] ?? null;
                $vivo = ($producto && $lista) ? (self::$vivos[$producto . '-' . $lista] ?? null) : null;

                if ($vivo === null) {
                    continue;
                }

                if ((float) $precio->getRawOriginal('precio') !== (float) $vivo) {
                    $precio->setRawAttributes(
                        array_merge($precio->getAttributes(), ['precio' => $vivo]),
                        true
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('No se pudieron leer los precios en vivo de Novik; se usa la copia local', [
                'error' => $e->getMessage(),
            ]);

            try {
                Cache::store('file')->put(self::CLAVE_PAUSA, true, self::PAUSA_SI_FALLA);
            } catch (\Throwable) {
                // Sin dónde guardar la pausa: se intentará de nuevo en la próxima carga.
            }
        }
    }
}
