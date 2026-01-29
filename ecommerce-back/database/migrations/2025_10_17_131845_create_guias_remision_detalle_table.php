<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('guias_remision_detalle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guia_remision_id')->constrained('guias_remision')->onDelete('cascade');
            $table->integer('item');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->string('codigo_producto', 50);
            $table->string('descripcion', 200);
            $table->string('unidad_medida', 3)->default('KGM');
            $table->decimal('cantidad', 10, 2);
            $table->decimal('peso_unitario', 10, 2);
            $table->decimal('peso_total', 10, 2);
            $table->text('observaciones')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index(['guia_remision_id']);
            $table->index(['producto_id']);
            $table->index(['item']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guias_remision_detalle');
    }
};