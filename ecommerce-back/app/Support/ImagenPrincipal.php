<?php

namespace App\Support;

use App\Models\Producto;
use Illuminate\Support\Facades\Storage;

/**
 * La imagen principal del producto es, por defecto, la primera de la galería.
 *
 * Copia el archivo (no lo comparte) para que borrar o cambiar una no afecte a la otra.
 */
class ImagenPrincipal
{
    /**
     * Solo actúa cuando la primera imagen de la galería cambió (se subió la primera,
     * se reordenó o se borró la primera): así, una imagen principal elegida a mano
     * no se pisa cada vez que se guarda el producto.
     *
     * Devuelve la URL de la nueva imagen principal, o null si no hubo cambio.
     */
    public static function desdeGaleria(int $productoId, ?string $primeraAntes, array $imagenes): ?string
    {
        $primera = $imagenes[0] ?? null;
        if ($primera === null || $primera === $primeraAntes) {
            return null;
        }

        return self::copiar($productoId, $primera);
    }

    /** Pone como principal la imagen `$archivo` de la galería (nombre del archivo). */
    public static function copiar(int $productoId, string $archivo): ?string
    {
        try {
            $origen = Storage::disk('public')->path('productos/detalles/' . $archivo);
            if (!is_file($origen)) {
                return null;
            }

            $directorio = public_path('storage/productos');
            if (!is_dir($directorio)) {
                mkdir($directorio, 0755, true);
            }

            $nombre = time() . '_' . uniqid() . '.' . pathinfo($archivo, PATHINFO_EXTENSION);
            if (!copy($origen, $directorio . '/' . $nombre)) {
                return null;
            }

            $anterior = Producto::where('id', $productoId)->value('imagen');
            Producto::where('id', $productoId)->update(['imagen' => $nombre]);

            if ($anterior) {
                $rutaAnterior = $directorio . '/' . $anterior;
                if (is_file($rutaAnterior)) {
                    @unlink($rutaAnterior);
                }
            }

            return asset('storage/productos/' . $nombre);
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }
}
