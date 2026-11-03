<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Genera y guarda versiones reducidas de las imágenes de /storage.
 *
 * Las fotos de productos y banners se suben tal cual salen de la cámara
 * (1 a 2 MB cada una) y las pantallas las dibujan a 200-400 px. Aquí se crea
 * la versión del ancho pedido una sola vez y se reutiliza.
 *
 * Usa WebP si el PHP del servidor lo soporta y, si no, JPEG.
 */
class ImagenReducidaService
{
    /** Anchos permitidos: evita que cualquiera llene el disco con medidas raras. */
    public const ANCHOS = [160, 320, 480, 720, 1080, 1600];

    public const EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    private const CALIDAD = 80;

    /** Una imagen original que ya pesa menos que esto se entrega sin tocar. */
    private const BYTES_YA_LIVIANA = 40 * 1024;

    /** Por qué falló la última reducción (para el comando de precalentado). */
    public ?string $ultimoError = null;

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
        $this->ultimoError = null;

        $origen = $this->resolverOrigen($ruta);
        if ($origen === null) {
            return null;
        }

        if (filesize($origen) <= self::BYTES_YA_LIVIANA) {
            return [$origen, $this->tipoMime($origen)];
        }

        [$extension, $mime] = $this->formatoDeSalida();
        $carpeta = $this->carpetaCache($ancho);
        if ($carpeta === null) {
            return $this->original($origen, $ruta, 'no hay una carpeta de caché en la que se pueda escribir');
        }

        $destino = "{$carpeta}/".sha1($ruta).".{$extension}";
        $vigente = is_file($destino) && filemtime($destino) >= filemtime($origen);

        if (! $vigente) {
            $error = $this->reducir($origen, $destino, $ancho, $extension);
            if ($error !== null) {
                return $this->original($origen, $ruta, $error);
            }
        }

        return [$destino, $mime];
    }

    /** @return array{0: string, 1: string} */
    private function original(string $origen, string $ruta, string $motivo): array
    {
        $this->ultimoError = $motivo;

        // Una vez por hora por imagen: avisa sin llenar el log.
        try {
            if (Cache::add('imagen-reducida-fallo:'.sha1($ruta), 1, 3600)) {
                Log::warning("ImagenReducida: se entrega la original de {$ruta}: {$motivo}");
            }
        } catch (\Throwable) {
            // El log no puede romper la imagen.
        }

        return [$origen, $this->tipoMime($origen)];
    }

    /** WebP si el PHP lo soporta; si no, JPEG. */
    private function formatoDeSalida(): array
    {
        return function_exists('imagewebp')
            ? ['webp', 'image/webp']
            : ['jpg', 'image/jpeg'];
    }

    /**
     * Carpeta donde guardar las reducidas del ancho dado, creándola si falta.
     * Prefiere la de las subidas (que el servidor web ya puede escribir).
     */
    private function carpetaCache(int $ancho): ?string
    {
        foreach ([storage_path('app/public/_img'), storage_path('app/img-cache')] as $base) {
            $carpeta = "{$base}/{$ancho}";
            if ((is_dir($carpeta) || @mkdir($carpeta, 0775, true) || is_dir($carpeta)) && is_writable($carpeta)) {
                return $carpeta;
            }
        }

        return null;
    }

    /** @return string|null  null si quedó guardada; si no, el motivo */
    private function reducir(string $origen, string $destino, int $ancho, string $extension): ?string
    {
        if (! extension_loaded('gd')) {
            return 'la extensión GD de PHP no está instalada';
        }

        $info = @getimagesize($origen);
        if ($info === false) {
            return 'no es una imagen legible';
        }

        [$anchoOriginal, $altoOriginal, $tipo] = $info;
        // Evita decodificar imágenes enormes: GD necesita ~5 bytes por píxel.
        if ($anchoOriginal * $altoOriginal > 36_000_000) {
            return 'la imagen es demasiado grande para reducirla';
        }

        $imagen = match ($tipo) {
            IMAGETYPE_JPEG => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($origen) : false,
            IMAGETYPE_PNG => function_exists('imagecreatefrompng') ? @imagecreatefrompng($origen) : false,
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($origen) : false,
            IMAGETYPE_GIF => function_exists('imagecreatefromgif') ? @imagecreatefromgif($origen) : false,
            default => false,
        };
        if ($imagen === false) {
            return 'GD no pudo abrir la imagen (formato no soportado o dañada)';
        }

        // Nunca se agranda: una foto de 300 px se queda en 300.
        if ($anchoOriginal > $ancho) {
            $reducida = imagescale($imagen, $ancho, -1, IMG_BICUBIC);
            if ($reducida === false) {
                return 'GD no pudo reducir la imagen';
            }
            $imagen = $reducida;
        }

        imagepalettetotruecolor($imagen);

        if ($extension === 'jpg') {
            // JPEG no tiene transparencia: se pone sobre blanco.
            $lienzo = imagecreatetruecolor(imagesx($imagen), imagesy($imagen));
            imagefill($lienzo, 0, 0, imagecolorallocate($lienzo, 255, 255, 255));
            imagecopy($lienzo, $imagen, 0, 0, 0, 0, imagesx($imagen), imagesy($imagen));
            $imagen = $lienzo;
        } else {
            // Conserva la transparencia de los PNG (fotos de producto sin fondo).
            imagealphablending($imagen, false);
            imagesavealpha($imagen, true);
        }

        // Se escribe a un temporal y se renombra: dos peticiones simultáneas no
        // pueden dejar un archivo a medias.
        $temporal = $destino.'.'.uniqid('', true).'.tmp';
        $guardada = $extension === 'webp'
            ? @imagewebp($imagen, $temporal, self::CALIDAD)
            : @imagejpeg($imagen, $temporal, self::CALIDAD);

        if (! $guardada || ! is_file($temporal)) {
            @unlink($temporal);

            return 'no se pudo escribir el archivo reducido';
        }

        // Si la reducida no pesa menos, no sirve de nada.
        if (filesize($temporal) >= filesize($origen)) {
            @unlink($temporal);

            return 'la versión reducida no pesa menos que la original';
        }

        return @rename($temporal, $destino) ? null : 'no se pudo guardar el archivo reducido';
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
