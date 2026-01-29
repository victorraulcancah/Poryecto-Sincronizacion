<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cookie_configuracion', function (Blueprint $table) {
            $table->id();
            $table->boolean('activo')->default(true);
            $table->text('mensaje')->nullable();
            $table->string('boton_aceptar_texto')->default('Aceptar');
            $table->string('boton_rechazar_texto')->default('Rechazar');
            $table->string('boton_configurar_texto')->default('Configurar');
            $table->string('link_politica_texto')->default('Política de Cookies');
            $table->string('link_politica_url')->nullable();
            $table->boolean('mostrar_boton_rechazar')->default(true);
            $table->boolean('mostrar_boton_configurar')->default(true);
            $table->string('posicion')->default('bottom'); // bottom, top
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cookie_configuracion');
    }
};
