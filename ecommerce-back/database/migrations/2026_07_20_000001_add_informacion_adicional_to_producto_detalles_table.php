<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('producto_detalles') || Schema::hasColumn('producto_detalles', 'informacion_adicional')) {
            return;
        }

        Schema::table('producto_detalles', function (Blueprint $table) {
            $table->json('informacion_adicional')->nullable()->after('politicas_devolucion');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('producto_detalles') || !Schema::hasColumn('producto_detalles', 'informacion_adicional')) {
            return;
        }

        Schema::table('producto_detalles', function (Blueprint $table) {
            $table->dropColumn('informacion_adicional');
        });
    }
};
