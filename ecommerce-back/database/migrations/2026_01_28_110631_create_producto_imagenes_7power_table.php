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
        Schema::create('producto_imagenes_7power', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('producto_7power_id')->unique()->comment('ID del producto en 7power');
            $table->string('imagen')->comment('Nombre del archivo de imagen');
            $table->string('imagen_url')->comment('URL completa de la imagen');
            $table->timestamps();
            
            $table->index('producto_7power_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_imagenes_7power');
    }
};
