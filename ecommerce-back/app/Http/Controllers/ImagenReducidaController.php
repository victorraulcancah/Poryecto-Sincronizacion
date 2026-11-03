<?php

namespace App\Http\Controllers;

use App\Services\ImagenReducidaService;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sirve las imágenes de /storage reducidas al ancho que pide el cliente.
 *
 *   GET /api/img/{ancho}/{ruta de storage}
 *   GET /api/img/480/productos/1774460813_69c41f8d4268f.jpg
 *
 * La primera petición crea la versión WebP y la guarda; las siguientes salen
 * del archivo, con caché larga en el navegador.
 */
class ImagenReducidaController extends Controller
{
    public function show(ImagenReducidaService $imagenes, int $ancho, string $ruta): Response
    {
        $resultado = $imagenes->obtener($ruta, $imagenes->anchoPermitido($ancho));

        if ($resultado === null) {
            abort(404);
        }

        [$archivo, $tipo] = $resultado;

        // Los nombres de archivo llevan marca de tiempo y código aleatorio: si la
        // imagen cambia, cambia la URL. Por eso puede cachearse "para siempre".
        return response()->file($archivo, [
            'Content-Type' => $tipo,
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
