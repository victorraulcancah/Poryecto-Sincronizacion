<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos para la vitrina de marcas de la página pública ("Trabajamos con las
 * mejores marcas del mundo").
 *
 * Hasta ahora esa página mostraba todas las marcas activas que tuvieran logo,
 * en el orden que salieran de la base. Con esto el administrador decide cuáles
 * aparecen y en qué orden.
 *
 * Son campos aparte de `activo` a propósito: una marca puede estar activa en el
 * catálogo (sus productos se venden) y no salir en la vitrina.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('marcas_productos')) {
            return;
        }

        Schema::table('marcas_productos', function (Blueprint $table) {
            if (! Schema::hasColumn('marcas_productos', 'mostrar_en_vitrina')) {
                $table->boolean('mostrar_en_vitrina')->default(true)->after('activo');
            }

            if (! Schema::hasColumn('marcas_productos', 'orden_vitrina')) {
                // Sin orden asignado van al final, ordenadas por nombre.
                $table->unsignedInteger('orden_vitrina')->nullable()->after('mostrar_en_vitrina');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('marcas_productos')) {
            return;
        }

        Schema::table('marcas_productos', function (Blueprint $table) {
            foreach (['mostrar_en_vitrina', 'orden_vitrina'] as $columna) {
                if (Schema::hasColumn('marcas_productos', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};
