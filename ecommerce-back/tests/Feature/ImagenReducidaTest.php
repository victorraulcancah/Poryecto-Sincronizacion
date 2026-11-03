<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImagenReducidaTest extends TestCase
{
    private string $carpeta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->carpeta = storage_path('app/public/pruebas-img');
        File::ensureDirectoryExists($this->carpeta);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->carpeta);
        File::deleteDirectory(storage_path('app/img-cache'));

        parent::tearDown();
    }

    /** Foto con ruido: pesa lo suficiente para que valga la pena reducirla. */
    private function foto(string $nombre, int $ancho = 1600, int $alto = 1200): string
    {
        $imagen = imagecreatetruecolor($ancho, $alto);
        for ($i = 0; $i < 4000; $i++) {
            imagefilledrectangle(
                $imagen,
                random_int(0, $ancho),
                random_int(0, $alto),
                random_int(0, $ancho),
                random_int(0, $alto),
                imagecolorallocate($imagen, random_int(0, 255), random_int(0, 255), random_int(0, 255)),
            );
        }
        $ruta = "{$this->carpeta}/{$nombre}";
        imagejpeg($imagen, $ruta, 95);

        return $ruta;
    }

    public function test_entrega_una_version_webp_mas_liviana_y_con_cache_larga(): void
    {
        $original = $this->foto('grande.jpg');

        $respuesta = $this->get('/api/img/480/pruebas-img/grande.jpg');

        $respuesta->assertOk();
        $respuesta->assertHeader('Content-Type', 'image/webp');
        $this->assertStringContainsString('max-age=31536000', $respuesta->headers->get('Cache-Control'));

        $archivo = $respuesta->baseResponse->getFile()->getPathname();
        $this->assertLessThan(filesize($original) / 4, filesize($archivo));
        $this->assertSame(480, getimagesize($archivo)[0]);
    }

    public function test_redondea_el_ancho_pedido_al_permitido(): void
    {
        $this->foto('grande.jpg');

        $archivo = $this->get('/api/img/300/pruebas-img/grande.jpg')
            ->assertOk()->baseResponse->getFile()->getPathname();
        $this->assertSame(320, getimagesize($archivo)[0]);

        // Pasado el mayor permitido se queda en el mayor (la foto de prueba mide 1600).
        $archivo = $this->get('/api/img/5000/pruebas-img/grande.jpg')
            ->assertOk()->baseResponse->getFile()->getPathname();
        $this->assertLessThanOrEqual(1600, getimagesize($archivo)[0]);
    }

    public function test_no_agranda_una_imagen_mas_chica_que_lo_pedido(): void
    {
        $this->foto('chica.jpg', 300, 300);

        $respuesta = $this->get('/api/img/720/pruebas-img/chica.jpg')->assertOk();

        $archivo = $respuesta->baseResponse->getFile()->getPathname();
        $this->assertLessThanOrEqual(300, getimagesize($archivo)[0]);
    }

    public function test_una_imagen_ya_liviana_se_entrega_sin_tocar(): void
    {
        $imagen = imagecreatetruecolor(40, 40);
        imagepng($imagen, "{$this->carpeta}/logo.png");

        $respuesta = $this->get('/api/img/160/pruebas-img/logo.png')->assertOk();

        $respuesta->assertHeader('Content-Type', 'image/png');
        $this->assertSame(
            realpath("{$this->carpeta}/logo.png"),
            realpath($respuesta->baseResponse->getFile()->getPathname()),
        );
    }

    public function test_rechaza_rutas_fuera_de_storage_y_archivos_que_no_son_imagen(): void
    {
        File::put("{$this->carpeta}/secreto.txt", 'x');

        $this->get('/api/img/480/pruebas-img/secreto.txt')->assertNotFound();
        $this->get('/api/img/480/pruebas-img/no-existe.jpg')->assertNotFound();
        $this->get('/api/img/480/..%2F..%2F.env.jpg')->assertNotFound();
        $this->get('/api/img/480/pruebas-img/../../../../.env')->assertNotFound();
    }

    public function test_el_comando_precalienta_las_versiones_reducidas(): void
    {
        $this->foto('grande.jpg');

        $this->artisan('imagenes:precalentar', ['--carpeta' => ['pruebas-img'], '--ancho' => ['480']])
            ->expectsOutputToContain('1 imágenes revisadas')
            ->assertSuccessful();

        $this->assertCount(1, glob(storage_path('app/img-cache/480/*.webp')));
    }

    public function test_un_archivo_que_dice_ser_imagen_pero_esta_danado_se_entrega_como_esta(): void
    {
        File::put("{$this->carpeta}/roto.jpg", str_repeat('no soy una imagen', 5000));

        $this->get('/api/img/480/pruebas-img/roto.jpg')->assertOk();
    }
}
