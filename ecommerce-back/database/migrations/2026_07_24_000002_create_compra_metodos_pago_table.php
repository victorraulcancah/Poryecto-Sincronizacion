<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Desglose completo de métodos de pago combinados en un pedido
     * (efectivo, yape, crédito, etc.), cada uno con su propio monto y
     * moneda. `compras.metodo_pago` se mantiene como resumen/compatibilidad.
     */
    public function up(): void
    {
        Schema::create('compra_metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compra_id')->constrained('compras')->cascadeOnDelete();
            $table->string('tipo', 50);
            $table->string('moneda', 10);
            $table->decimal('monto', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compra_metodos_pago');
    }
};
