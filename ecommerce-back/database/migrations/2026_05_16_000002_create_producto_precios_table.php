<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producto_precios', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('producto_id');
            $table->unsignedBigInteger('tipo_precio_id');
            $table->decimal('precio', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('producto_id')->references('id')->on('productos')->onDelete('cascade');
            $table->foreign('tipo_precio_id')->references('id')->on('tipos_precio')->onDelete('cascade');
            $table->unique(['producto_id', 'tipo_precio_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producto_precios');
    }
};
