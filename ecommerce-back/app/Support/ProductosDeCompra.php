<?php

namespace App\Support;

use App\Models\Producto;

/**
 * Imagen y marca de los productos que aparecen en las compras del cliente.
 *
 * Las compras en línea guardan sus productos como una foto de lo que se compró
 * (nombre, precio, cantidad) y las compras de la tienda física vienen del ERP,
 * que no tiene fotos ni marcas. Para mostrarlos con imagen, marca y código como
 * en la web, se completan aquí con los datos actuales del catálogo.
 */
class ProductosDeCompra
{
    /**
     * @param  list<int|string>  $ids
     * @return array<int, array{imagen_url: ?string, marca: ?string}>  por id de producto
     */
    public static function porIds(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === []) {
            return [];
        }

        $mapa = [];
        foreach (self::consulta()->whereIn('id', $ids)->get() as $producto) {
            $mapa[$producto->id] = self::datos($producto);
        }

        return $mapa;
    }

    /**
     * @param  list<string|null>  $codigos
     * @return array<string, array{imagen_url: ?string, marca: ?string}>  por código de producto
     */
    public static function porCodigos(array $codigos): array
    {
        $codigos = array_values(array_unique(array_filter(array_map(
            fn ($c) => $c === null ? '' : trim((string) $c),
            $codigos,
        ))));
        if ($codigos === []) {
            return [];
        }

        $mapa = [];
        foreach (self::consulta()->whereIn('codigo_producto', $codigos)->get() as $producto) {
            $mapa[$producto->codigo_producto] = self::datos($producto);
        }

        return $mapa;
    }

    /** Solo las columnas que hacen falta (esto corre en cada lista de compras). */
    private static function consulta()
    {
        return Producto::query()
            ->select(['id', 'codigo_producto', 'imagen', 'marca_id'])
            ->with('marca:id,nombre');
    }

    /** @return array{imagen_url: ?string, marca: ?string} */
    private static function datos(Producto $producto): array
    {
        return [
            'imagen_url' => $producto->imagen_url,
            'marca' => $producto->marca?->nombre,
        ];
    }
}
