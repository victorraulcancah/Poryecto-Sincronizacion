<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cómo se presenta la vitrina de marcas: en cuadrícula o en carrusel, cuántos
 * logos por fila y cuántas filas.
 *
 * Es una sola fila de configuración (id = 1); no hay más de una vitrina.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vitrina_marcas_config')) {
            return;
        }

        Schema::create('vitrina_marcas_config', function (Blueprint $table) {
            $table->id();
            $table->boolean('carrusel')->default(false);
            // Segundos que tarda el carrusel en dar una vuelta completa.
            $table->unsignedSmallInteger('velocidad')->default(30);
            $table->unsignedTinyInteger('por_fila')->default(6);
            // 0 = sin límite: se muestran todas las marcas elegidas.
            $table->unsignedTinyInteger('filas')->default(0);
            $table->timestamps();
        });

        DB::table('vitrina_marcas_config')->insert([
            'id' => 1,
            'carrusel' => false,
            'velocidad' => 30,
            'por_fila' => 6,
            'filas' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('vitrina_marcas_config');
    }
};
