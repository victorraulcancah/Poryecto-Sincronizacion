<?php

namespace Tests\Unit;

use App\Models\Producto;
use App\Support\StockPublico;
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
            ['stock_mensaje' => 'Quedan 7 unidades', 'stock_nivel' => 'quedan'],
            StockPublico::campos(7)
        );
    }

    public function test_el_producto_expone_los_campos_solo_si_trae_el_stock(): void
    {
        $con = new Producto();
        $con->setRawAttributes(['stock' => 3]);
        $this->assertSame('¡Últimas 3 unidades!', $con->stock_mensaje);
        $this->assertSame('ultimas', $con->stock_nivel);

        // Una consulta sin la columna `stock` no debe decir "Agotado".
        $sin = new Producto();
        $sin->setRawAttributes(['nombre' => 'X']);
        $this->assertNull($sin->stock_mensaje);
        $this->assertNull($sin->stock_nivel);
    }
}
