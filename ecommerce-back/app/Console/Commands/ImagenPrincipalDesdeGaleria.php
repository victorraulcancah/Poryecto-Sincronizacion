<?php

namespace App\Console\Commands;

use App\Models\ProductoDetalle;
use App\Support\ImagenPrincipal;
use Illuminate\Console\Command;

/**
 * Deja como imagen principal de cada producto la primera de su galería.
 * Sin --aplicar solo muestra qué productos cambiarían.
 */
class ImagenPrincipalDesdeGaleria extends Command
{
    protected $signature = 'productos:imagen-principal-desde-galeria {--aplicar : Hacer el cambio (sin esto solo se lista)}';

    protected $description = 'Usa la primera imagen de la galería como imagen principal de cada producto';

    public function handle(): int
    {
        $aplicar = (bool) $this->option('aplicar');
        $cambiarian = 0;

        ProductoDetalle::query()->whereNotNull('imagenes')->chunkById(200, function ($detalles) use ($aplicar, &$cambiarian) {
            foreach ($detalles as $detalle) {
                $imagenes = $detalle->imagenes;
                $imagenes = is_string($imagenes) ? json_decode($imagenes, true) : $imagenes;
                $primera = is_array($imagenes) ? ($imagenes[0] ?? null) : null;
                if (!$primera) {
                    continue;
                }

                $cambiarian++;
                if ($aplicar) {
                    ImagenPrincipal::copiar((int) $detalle->producto_id, $primera);
                } else {
                    $this->line("Producto {$detalle->producto_id}: {$primera}");
                }
            }
        });

        $this->info($aplicar
            ? "Listo: {$cambiarian} productos actualizados."
            : "{$cambiarian} productos cambiarían. Usa --aplicar para hacerlo.");

        return self::SUCCESS;
    }
}
