<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            // NULL = usa el tipo de precio predeterminado configurado
            $table->unsignedBigInteger('tipo_precio_id')->nullable()->after('estado');
            $table->foreign('tipo_precio_id')->references('id')->on('tipos_precio')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->dropForeign(['tipo_precio_id']);
            $table->dropColumn('tipo_precio_id');
        });
    }
};
