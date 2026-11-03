<?php

namespace App\Console\Commands;

use App\Services\ImagenReducidaService;
use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;

/**
 * Crea de antemano las versiones reducidas de las imágenes, para que el primer
 * visitante no pague el tiempo de generarlas.
 */
class PrecalentarImagenes extends Command
{
    protected $signature = 'imagenes:precalentar
        {--carpeta=* : Carpetas de storage a recorrer (por defecto las del catálogo)}
        {--ancho=* : Anchos a generar (por defecto los que usan la web y el app)}';

    protected $description = 'Genera las versiones reducidas (WebP) de las imágenes del catálogo';

    private const CARPETAS = ['productos', 'banners', 'banners_horizontales', 'banners_promocionales', 'categorias', 'marcas_productos', 'empresa'];

    private const ANCHOS = [320, 480, 1080, 1600];

    public function handle(ImagenReducidaService $imagenes): int
    {
        $carpetas = $this->option('carpeta') ?: self::CARPETAS;
        $anchos = array_map('intval', $this->option('ancho') ?: self::ANCHOS);
        // Las subidas quedan en public/storage o en storage/app/public (suelen
        // ser la misma carpeta por el enlace simbólico).
        $bases = array_unique(array_filter([
            realpath(public_path('storage')),
            realpath(storage_path('app/public')),
        ]));

        if (! $bases) {
            $this->error('No se encontró la carpeta storage.');

            return self::FAILURE;
        }

        $hechas = 0;
        $vistas = [];
        foreach ($bases as $base) {
            foreach ($carpetas as $carpeta) {
                if (! is_dir("{$base}/{$carpeta}")) {
                    continue;
                }

                foreach (Finder::create()->files()->in("{$base}/{$carpeta}") as $archivo) {
                    $ruta = str_replace('\\', '/', substr($archivo->getRealPath(), strlen($base) + 1));
                    if (isset($vistas[$ruta])) {
                        continue;
                    }
                    $vistas[$ruta] = true;

                    foreach ($anchos as $ancho) {
                        $imagenes->obtener($ruta, $imagenes->anchoPermitido($ancho));
                    }
                    $hechas++;
                }
                $this->line("{$carpeta}: listo");
            }
        }

        $this->info("{$hechas} imágenes revisadas.");

        return self::SUCCESS;
    }
}
