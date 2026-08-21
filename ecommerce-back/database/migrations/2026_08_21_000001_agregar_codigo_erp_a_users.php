<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vinculación de un usuario del panel con un usuario (vendedor) de Novik.
 *
 * Guarda el `codigo` del usuario en el ERP (ej. "USR013"), igual que los
 * clientes guardan su `codigo_erp`. Con esa llave el panel puede mostrarle al
 * vendedor solo las cotizaciones de los clientes de su cartera.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('codigo_erp', 20)->nullable()->unique()->after('is_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['codigo_erp']);
            $table->dropColumn('codigo_erp');
        });
    }
};
