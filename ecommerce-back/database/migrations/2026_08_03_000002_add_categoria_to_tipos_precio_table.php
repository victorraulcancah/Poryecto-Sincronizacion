<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_precio', function (Blueprint $table) {
            // 'visitante' = pestaña "Clientes visitantes" (registrados sin
            // vincular + invitados anónimos): solo 1 lista activa por moneda.
            // 'vinculado' = pestaña "Clientes vinculados": varias listas
            // activas a la vez, aparecen como opciones en el cliente.
            $table->enum('categoria', ['visitante', 'vinculado'])->default('vinculado')->after('es_para_invitados');
        });

        // Backfill: las listas que ya estaban marcadas como predeterminada o
        // de invitados son, por definición, listas de "visitantes".
        DB::table('tipos_precio')
            ->where('es_predeterminado', true)
            ->orWhere('es_para_invitados', true)
            ->update(['categoria' => 'visitante']);
    }

    public function down(): void
    {
        Schema::table('tipos_precio', function (Blueprint $table) {
            $table->dropColumn('categoria');
        });
    }
};
