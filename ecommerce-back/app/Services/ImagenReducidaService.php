<?php

namespace App\Services;

/**
 * Genera y guarda versiones WebP reducidas de las imágenes de /storage.
 *
 * Las fotos de productos y banners se suben tal cual salen de la cámara
 * (1 a 2 MB cada una) y las pantallas las dibujan a 200-400 px. Aquí se crea
 * la versión del ancho pedido una sola vez y se reutiliza.
 */
class ImagenReducidaService
{
    /** Anchos permitidos: evita que cualquiera llene el disco con medidas raras. */
    public const ANCHOS = [160, 320, 480, 720, 1080, 1600];

    public const EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    private const CALIDAD = 80;

    /** Una imagen original que ya pesa menos que esto se entrega sin tocar. */
    private const BYTES_YA_LIVIANA = 40 * 1024;

    /** El ancho permitido más cercano por arriba (nunca más que el mayor). */
    public function anchoPermitido(int $pedido): int
    {
        foreach (self::ANCHOS as $ancho) {
            if ($pedido <= $ancho) {
                return $ancho;
            }
        }

        return self::ANCHOS[array_key_last(self::ANCHOS)];
    }

    /**
     * Ruta absoluta del archivo original, o null si no existe, no es una imagen
     * o intenta salirse de la carpeta storage.
     */
    public function resolverOrigen(string $ruta): ?string
    {
        $extension = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));
        if (! in_array($extension, self::EXTENSIONES, true) || str_contains($ruta, "\0")) {
            return null;
        }

        // Según el servidor las subidas quedan en public/storage (enlace o
        // carpeta) o en storage/app/public.
        foreach ([public_path('storage'), storage_path('app/public')] as $base) {
            $base = realpath($base);
            $archivo = $base ? realpath($base.DIRECTORY_SEPARATOR.$ruta) : false;

            if ($archivo && is_file($archivo) && str_starts_with($archivo, $base.DIRECTORY_SEPARATOR)) {
                return $archivo;
            }
        }

        return null;
    }

    /**
     * El archivo a entregar para [$ruta] al ancho [$ancho] y su tipo MIME. Crea
     * la versión reducida si aún no existe; si no se puede (sin GD, imagen
     * dañada) o no vale la pena (ya es liviana), devuelve la original.
     *
     * @return array{0: string, 1: string}|null  [archivo, mime], o null si la imagen no existe
     */
    public function obtener(string $ruta, int $ancho): ?array
    {
        $origen = $this->resolverOrigen($ruta);
        if ($origen === null) {
            return null;
        }

        if (filesize($origen) <= self::BYTES_YA_LIVIANA) {
            return [$origen, $this->tipoMime($origen)];
        }

        $destino = $this->rutaCache($ancho, $ruta);
        $vigente = is_file($destino) && filemtime($destino) >= filemtime($origen);

        if (! $vigente && ! $this->reducir($origen, $destino, $ancho)) {
            return [$origen, $this->tipoMime($origen)];
        }

        return [$destino, 'image/webp'];
    }

    private function rutaCache(int $ancho, string $ruta): string
    {
        return storage_path("app/img-cache/{$ancho}/".sha1($ruta).'.webp');
    }

    private function reducir(string $origen, string $destino, int $ancho): bool
    {
        if (! function_exists('imagewebp')) {
            return false;
        }

        $info = @getimagesize($origen);
        if ($info === false) {
            return false;
        }

        [$anchoOriginal, $altoOriginal, $tipo] = $info;
        // Evita decodificar imágenes enormes: GD necesita ~5 bytes por píxel.
        if ($anchoOriginal * $altoOriginal > 36_000_000) {
            return false;
        }

        $imagen = match ($tipo) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($origen),
            IMAGETYPE_PNG => @imagecreatefrompng($origen),
            IMAGETYPE_WEBP => @imagecreatefromwebp($origen),
            IMAGETYPE_GIF => @imagecreatefromgif($origen),
            default => false,
        };
        if ($imagen === false) {
            return false;
        }

        // Nunca se agranda: una foto de 300 px se queda en 300.
        if ($anchoOriginal > $ancho) {
            $reducida = imagescale($imagen, $ancho, -1, IMG_BICUBIC);
            if ($reducida === false) {
                return false;
            }
            $imagen = $reducida;
        }

        // Conserva la transparencia de los PNG (fotos de producto sin fondo).
        imagepalettetotruecolor($imagen);
        imagealphablending($imagen, false);
        imagesavealpha($imagen, true);

        $carpeta = dirname($destino);
        if (! is_dir($carpeta) && ! @mkdir($carpeta, 0775, true) && ! is_dir($carpeta)) {
            return false;
        }

        // Se escribe a un temporal y se renombra: dos peticiones simultáneas no
        // pueden dejar un archivo a medias.
        $temporal = $destino.'.'.uniqid('', true).'.tmp';
        $guardada = imagewebp($imagen, $temporal, self::CALIDAD);

        // Si la reducida no pesa menos, no sirve de nada.
        if (! $guardada || filesize($temporal) >= filesize($origen)) {
            @unlink($temporal);

            return false;
        }

        return rename($temporal, $destino);
    }

    private function tipoMime(string $archivo): string
    {
        return match (strtolower(pathinfo($archivo, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/jpeg',
        };
    }
}
