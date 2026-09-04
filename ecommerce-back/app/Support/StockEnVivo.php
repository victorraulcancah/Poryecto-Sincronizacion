<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Stock leído directamente de Novik, sin esperar a la sincronización.
 *
 * La tienda trabaja con una copia del stock en `productos.stock`, que el
 * comando `sync:7power --update-stock` refresca cada minuto. Para un listado
 * esa copia está bien: consultar Novik producto por producto haría decenas de
 * consultas cruzadas por página.
 *
 * Pero al confirmar un pedido un minuto de desfase alcanza para vender algo que
 * el ERP ya despachó. En esos puntos se pregunta a Novik en el momento, que es
 * una sola consulta para todo el carrito.
 *
 * Si Novik no responde se devuelve `null` para ese producto y quien llama debe
 * caer a la copia local: es preferible vender con un dato de hace un minuto a
 * dejar la tienda sin poder cobrar porque el ERP está caído.
 */
class StockEnVivo
{
    /** Almacén de Novik del que se surte la tienda (PRINCIPAL). */
    private const ALMACEN = 1;

    /**
     * Stock actual en Novik de varios productos de la tienda.
     *
     * @param  int[]  $productoIds  IDs de `productos` (los de la tienda, no los de Novik).
     * @return array<int,int>       [producto_id => stock]. Sin la clave si no se pudo saber.
     */
    public static function de(array $productoIds): array
    {
        if (empty($productoIds)) {
            return [];
        }

        try {
            // producto de la tienda -> producto de Novik
            $mapeo = DB::table('producto_mapeo_7power')
                ->whereIn('producto_id', $productoIds)
                ->pluck('producto_7power_id', 'producto_id');

            if ($mapeo->isEmpty()) {
                return [];
            }

            $stockPorProducto7Power = DB::connection('mysql_7power')
                ->table('product_warehouse')
                ->where('warehouse_id', self::ALMACEN)
                ->whereIn('product_id', $mapeo->values()->all())
                ->pluck('stock', 'product_id');

            $resultado = [];
            foreach ($mapeo as $productoId => $producto7PowerId) {
                // Sin fila en el almacén no hay stock registrado: es 0, no
                // "no se sabe". Hay ~39 productos así en Novik.
                $resultado[$productoId] = (int) ($stockPorProducto7Power[$producto7PowerId] ?? 0);
            }

            return $resultado;
        } catch (\Throwable $e) {
            // Novik caído o sin red: quien llama usa la copia local.
            Log::warning('No se pudo leer el stock en vivo de Novik', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Stock de un solo producto. Devuelve null si no se pudo averiguar (producto
     * sin mapeo o Novik sin responder).
     */
    public static function deProducto(int $productoId): ?int
    {
        return self::de([$productoId])[$productoId] ?? null;
    }

    /**
     * Lee el stock en Novik y lo deja guardado en la tienda.
     *
     * La ficha del producto ya leia el stock en vivo, pero solo para mostrarlo:
     * la columna `productos.stock` seguia con el valor de la ultima
     * sincronizacion, asi que el catalogo y el buscador mostraban otra cosa
     * hasta que corriera el cron. Al abrir una ficha se aprovecha para dejar ese
     * producto al dia.
     *
     * Solo escribe si el valor cambio, para no tocar `updated_at` en cada visita.
     *
     * @return int|null  el stock real, o null si no se pudo averiguar
     */
    public static function sincronizar(int $productoId): ?int
    {
        $stock = self::deProducto($productoId);

        if ($stock === null) {
            return null;
        }

        DB::table('productos')
            ->where('id', $productoId)
            ->where('stock', '<>', $stock)
            ->update(['stock' => $stock, 'updated_at' => now()]);

        return $stock;
    }
}
