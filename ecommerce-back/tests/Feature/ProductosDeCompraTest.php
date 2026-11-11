<?php

namespace Tests\Feature;

use App\Support\ProductosDeCompra;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProductosDeCompraTest extends TestCase
{
    /**
     * Las migraciones del proyecto no corren en SQLite (la base de las pruebas),
     * así que se crean solo las tablas que usa esta pieza.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('marcas_productos', function (Blueprint $t) {
            $t->id();
            $t->string('nombre');
            $t->timestamps();
        });
        Schema::create('productos', function (Blueprint $t) {
            $t->id();
            $t->string('nombre');
            $t->string('codigo_producto')->nullable();
            $t->string('imagen')->nullable();
            $t->unsignedBigInteger('marca_id')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        DB::table('marcas_productos')->insert(['id' => 25, 'nombre' => '7POWER']);
        DB::table('productos')->insert([
            ['id' => 1, 'nombre' => 'Driver', 'codigo_producto' => 'DRV2', 'imagen' => 'driver.jpg', 'marca_id' => 25],
            ['id' => 2, 'nombre' => 'Sin foto ni marca', 'codigo_producto' => 'X9', 'imagen' => null, 'marca_id' => null],
        ]);
    }

    public function test_busca_imagen_y_marca_por_id(): void
    {
        $mapa = ProductosDeCompra::porIds([1, 2, 99, '1', null]);

        $this->assertSame(['marca' => '7POWER'], array_intersect_key($mapa[1], ['marca' => 1]));
        $this->assertStringEndsWith('/storage/productos/driver.jpg', $mapa[1]['imagen_url']);
        $this->assertSame(['imagen_url' => null, 'marca' => null], $mapa[2]);
        $this->assertArrayNotHasKey(99, $mapa, 'un producto que ya no existe no inventa datos');
    }

    public function test_busca_por_codigo_ignorando_espacios_y_vacios(): void
    {
        $mapa = ProductosDeCompra::porCodigos([' DRV2 ', 'X9', '', null, 'NO-EXISTE']);

        $this->assertSame('7POWER', $mapa['DRV2']['marca']);
        $this->assertArrayHasKey('X9', $mapa);
        $this->assertArrayNotHasKey('NO-EXISTE', $mapa);
    }

    public function test_sin_datos_no_consulta_la_base(): void
    {
        DB::enableQueryLog();

        $this->assertSame([], ProductosDeCompra::porIds([]));
        $this->assertSame([], ProductosDeCompra::porCodigos(['', null]));
        $this->assertCount(0, DB::getQueryLog());
    }

    public function test_usa_pocas_consultas_aunque_haya_muchos_productos(): void
    {
        DB::enableQueryLog();

        ProductosDeCompra::porIds(range(1, 50));

        // Una para los productos y una para sus marcas.
        $this->assertLessThanOrEqual(2, count(DB::getQueryLog()));
    }

    public function test_un_producto_dado_de_baja_no_se_usa(): void
    {
        DB::table('productos')->where('id', 1)->update(['deleted_at' => now()]);

        $this->assertArrayNotHasKey(1, ProductosDeCompra::porIds([1]));
    }
}
