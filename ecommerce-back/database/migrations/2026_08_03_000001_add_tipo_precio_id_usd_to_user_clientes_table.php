<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            // tipo_precio_id (existente) pasa a usarse para la lista en Soles (PEN).
            // Este nuevo campo guarda la lista en Dólares (USD).
            // NULL = usa el tipo de precio predeterminado configurado.
            $table->unsignedBigInteger('tipo_precio_id_usd')->nullable()->after('tipo_precio_id');
            $table->foreign('tipo_precio_id_usd')->references('id')->on('tipos_precio')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->dropForeign(['tipo_precio_id_usd']);
            $table->dropColumn('tipo_precio_id_usd');
        });
    }
};
