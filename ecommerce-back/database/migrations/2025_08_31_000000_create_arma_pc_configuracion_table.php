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
        Schema::create('arma_pc_configuracion', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('categoria_id');
            $table->integer('orden')->default(1);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            // Índices y foreign keys
            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('cascade');
            $table->unique(['categoria_id']); // Una categoría solo puede estar una vez en la configuración
            $table->index(['activo', 'orden']); // Para consultas rápidas ordenadas
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('arma_pc_configuracion');
    }
};