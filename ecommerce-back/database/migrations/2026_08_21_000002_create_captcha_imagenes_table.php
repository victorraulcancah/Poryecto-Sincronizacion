<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Imágenes del rompecabezas del registro.
 *
 * Antes estaban pegadas en el código como enlaces a sitios ajenos (freepik,
 * pinterest…): si bloqueaban el hotlink, las piezas salían en blanco y nadie
 * podía registrarse. Ahora se administran desde el panel y se guardan aquí.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('captcha_imagenes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            // Ruta relativa del tipo "storage/captcha/xxx.jpg".
            $table->string('ruta');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('activo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('captcha_imagenes');
    }
};
