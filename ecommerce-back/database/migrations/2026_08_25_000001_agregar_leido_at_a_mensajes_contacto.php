<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cuándo se marcó el mensaje como leído.
 *
 * Hace falta para la bandeja: lo leído hoy sigue a la vista y desaparece a
 * medianoche. No sirve `updated_at`, porque también cambia al editar el
 * mensaje y adelantaría la fecha sin que nadie lo haya leído de nuevo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mensajes_contacto', function (Blueprint $table) {
            $table->timestamp('leido_at')->nullable()->after('leido');
        });

        // Los que ya estaban leídos se fechan con su última modificación: es
        // lo más cercano que hay, y así no quedan flotando sin fecha.
        DB::table('mensajes_contacto')
            ->where('leido', true)
            ->update(['leido_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('mensajes_contacto', function (Blueprint $table) {
            $table->dropColumn('leido_at');
        });
    }
};
