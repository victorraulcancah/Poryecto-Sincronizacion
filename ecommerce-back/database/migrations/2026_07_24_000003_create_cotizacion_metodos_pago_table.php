<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Desglose completo de métodos de pago combinados en una cotización
     * (efectivo, yape, crédito, etc.), igual que compra_metodos_pago pero
     * para cotizaciones — el checkout del e-commerce solo genera cotizaciones,
     * y el crédito debe descontarse/registrarse desde ese momento.
     */
    public function up(): void
    {
        Schema::create('cotizacion_metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_id')->constrained('cotizaciones')->cascadeOnDelete();
            $table->string('tipo', 50);
            $table->string('moneda', 10);
            $table->decimal('monto', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizacion_metodos_pago');
    }
};
