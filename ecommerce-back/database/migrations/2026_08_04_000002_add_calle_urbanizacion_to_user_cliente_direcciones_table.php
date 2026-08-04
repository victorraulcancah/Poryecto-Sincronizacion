<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('user_cliente_direcciones')) {
            return;
        }

        Schema::table('user_cliente_direcciones', function (Blueprint $table) {
            // direccion_completa se sigue guardando (se usa en checkout, mi
            // cuenta, etc.); estos dos campos guardan las partes por
            // separado para poder editarlas de nuevo en el modal de cliente.
            if (!Schema::hasColumn('user_cliente_direcciones', 'calle_numero')) {
                $table->string('calle_numero')->nullable()->after('direccion_completa');
            }
            if (!Schema::hasColumn('user_cliente_direcciones', 'urbanizacion')) {
                $table->string('urbanizacion')->nullable()->after('calle_numero');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('user_cliente_direcciones')) {
            return;
        }

        Schema::table('user_cliente_direcciones', function (Blueprint $table) {
            if (Schema::hasColumn('user_cliente_direcciones', 'urbanizacion')) {
                $table->dropColumn('urbanizacion');
            }
            if (Schema::hasColumn('user_cliente_direcciones', 'calle_numero')) {
                $table->dropColumn('calle_numero');
            }
        });
    }
};
