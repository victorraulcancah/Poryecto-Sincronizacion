<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Momento en que el pedido dejó de estar "En espera".
 *
 * La bandeja de `/dashboard/pedidos` muestra lo que falta atender más lo que se
 * atendió hoy; a la medianoche esos últimos salen de la lista. Se guarda una
 * marca propia en vez de mirar `updated_at` porque este último cambia con
 * cualquier edición (al editar la cotización el pedido se rehace).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->timestamp('atendido_at')->nullable()->after('estado_pedido_id');
            // La bandeja filtra por esta columna en cada carga del listado.
            $table->index('atendido_at');
        });

        // Los pedidos que ya existían y no están "En espera" se dan por
        // atendidos en su última actualización, para que no reaparezcan todos
        // en la bandeja.
        DB::table('pedidos')
            ->where('estado_pedido_id', '!=', 10)
            ->update(['atendido_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['atendido_at']);
            $table->dropColumn('atendido_at');
        });
    }
};
