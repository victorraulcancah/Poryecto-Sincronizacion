<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * En cuántas piezas se parte cada imagen del captcha.
 *
 * Va por imagen y no global: la dificultad depende de la foto. Una imagen muy
 * uniforme partida en 8 es casi imposible de armar, y una con mucho contraste
 * en 2 no filtra a nadie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('captcha_imagenes', function (Blueprint $table) {
            $table->unsignedTinyInteger('piezas')->default(4)->after('ruta');
        });
    }

    public function down(): void
    {
        Schema::table('captcha_imagenes', function (Blueprint $table) {
            $table->dropColumn('piezas');
        });
    }
};
