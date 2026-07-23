<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Código de cliente del ERP 7Power (formato CLI00001), asignado
     * MANUALMENTE por un administrador para vincular la cuenta del
     * e-commerce con el cliente correspondiente en la base de datos
     * del ERP (conexión mysql_7power). No se autogenera aquí.
     */
    public function up(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->string('codigo_erp', 20)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->dropColumn('codigo_erp');
        });
    }
};
