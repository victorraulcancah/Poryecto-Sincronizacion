<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Desglose completo de métodos de pago del pedido — se copia desde
     * cotizacion_metodos_pago cuando el pedido se genera a partir de una
     * cotización (CotizacionesController::pedirCotizacion), igual que
     * compra_metodos_pago/cotizacion_metodos_pago.
     */
    public function up(): void
    {
        Schema::create('pedido_metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->string('tipo', 50);
            $table->string('moneda', 10);
            $table->decimal('monto', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_metodos_pago');
    }
};
