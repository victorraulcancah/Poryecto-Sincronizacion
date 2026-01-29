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
        Schema::create('pasos_envio', function (Blueprint $table) {
            $table->id();
            $table->integer('orden')->default(1)->comment('Orden de visualización del paso');
            $table->string('titulo', 255)->comment('Título del paso');
            $table->text('descripcion')->nullable()->comment('Descripción del paso');
            $table->string('imagen', 500)->nullable()->comment('Ruta de la imagen del paso (opcional)');
            $table->boolean('activo')->default(true)->comment('Si el paso está activo o no');
            $table->timestamps();
            
            $table->index(['activo', 'orden']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pasos_envio');
    }
};
