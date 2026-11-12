<?php

namespace Tests\Unit;

use App\Models\Producto;
use App\Support\StockPublico;
use App\Support\UnidadDeMedida;
use PHPUnit\Framework\TestCase;

class StockPublicoTest extends TestCase
{
    public function test_los_mensajes_siguen_los_rangos_del_cliente(): void
    {
        $this->assertSame('Agotado', StockPublico::mensaje(0));
        $this->assertSame('¡Última unidad!', StockPublico::mensaje(1));
        $this->assertSame('¡Últimas 2 unidades!', StockPublico::mensaje(2));
        $this->assertSame('¡Últimas 3 unidades!', StockPublico::mensaje(3));
        $this->assertSame('Quedan 4 unidades', StockPublico::mensaje(4));
        $this->assertSame('Quedan 7 unidades', StockPublico::mensaje(7));
        $this->assertSame('Quedan 9 unidades', StockPublico::mensaje(9));
        $this->assertSame('Disponible', StockPublico::mensaje(10));
        $this->assertSame('Disponible', StockPublico::mensaje(544));
    }

    public function test_los_mensajes_usan_la_unidad_de_medida_del_producto(): void
    {
        $this->assertSame('Quedan 7 sets', StockPublico::mensaje(7, 'set'));
        $this->assertSame('Quedan 4 pares', StockPublico::mensaje(4, 'par'));
        // Con 10 o más solo "Disponible": la unidad ya sale junto al precio.
        $this->assertSame('Disponible', StockPublico::mensaje(25, 'SET'));
        $this->assertSame('Disponible', StockPublico::mensaje(25, 'caja'));
        // Género: unidad/caja son femeninas; set/par, masculinas.
        $this->assertSame('¡Último set!', StockPublico::mensaje(1, 'set'));
        $this->assertSame('¡Últimos 3 sets!', StockPublico::mensaje(3, 'set'));
        $this->assertSame('¡Últimos 2 pares!', StockPublico::mensaje(2, 'par'));
        $this->assertSame('¡Última caja!', StockPublico::mensaje(1, 'caja'));
        // Sin unidad conocida se dice "unidades".
        $this->assertSame('Quedan 5 unidades', StockPublico::mensaje(5, null));
        $this->assertSame('Quedan 5 unidades', StockPublico::mensaje(5, '  '));
    }

    public function test_el_plural_de_la_unidad(): void
    {
        $this->assertSame('unidades', StockPublico::plural('unidad'));
        $this->assertSame('sets', StockPublico::plural('set'));
        $this->assertSame('pares', StockPublico::plural('par'));
        $this->assertSame('juegos', StockPublico::plural('juego'));
        $this->assertSame('kits', StockPublico::plural('kit'));
        $this->assertSame('luces', StockPublico::plural('luz'));
    }

    public function test_los_niveles_para_el_color(): void
    {
        $this->assertSame('agotado', StockPublico::nivel(0));
        $this->assertSame('ultimas', StockPublico::nivel(3));
        $this->assertSame('quedan', StockPublico::nivel(4));
        $this->assertSame('quedan', StockPublico::nivel(9));
        $this->assertSame('disponible', StockPublico::nivel(10));
    }

    public function test_un_stock_negativo_o_vacio_es_agotado(): void
    {
        $this->assertSame('Agotado', StockPublico::mensaje(-5));
        $this->assertSame('Agotado', StockPublico::mensaje(null));
    }

    public function test_los_campos_listos_para_una_respuesta(): void
    {
        $this->assertSame(
            ['stock_mensaje' => 'Quedan 7 sets', 'stock_nivel' => 'quedan', 'unidad_medida' => 'set'],
            StockPublico::campos(7, 'set')
        );
        $this->assertSame('unidad', StockPublico::campos(7)['unidad_medida']);
    }

    public function test_la_unidad_se_limpia(): void
    {
        $this->assertSame('set', UnidadDeMedida::limpiar('  SET '));
        $this->assertNull(UnidadDeMedida::limpiar('   '));
        $this->assertNull(UnidadDeMedida::limpiar(null));
    }

    public function test_el_producto_expone_los_campos_solo_si_trae_el_stock(): void
    {
        $con = new Producto();
        $con->setRawAttributes(['stock' => 3]);
        $this->assertSame('ultimas', $con->stock_nivel);

        // Una consulta sin la columna `stock` no debe decir "Agotado".
        $sin = new Producto();
        $sin->setRawAttributes(['nombre' => 'X']);
        $this->assertNull($sin->stock_mensaje);
        $this->assertNull($sin->stock_nivel);
    }
}
