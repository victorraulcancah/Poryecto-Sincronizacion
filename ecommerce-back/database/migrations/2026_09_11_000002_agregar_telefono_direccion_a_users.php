<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El formulario de "Mi Perfil" del panel admin (/dashboard/perfil) pedía
 * teléfono y dirección desde antes, pero la tabla `users` nunca tuvo esas
 * columnas — por eso el formulario nunca los guardaba de verdad.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telefono', 20)->nullable()->after('email');
            $table->text('direccion')->nullable()->after('telefono');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['telefono', 'direccion']);
        });
    }
};
