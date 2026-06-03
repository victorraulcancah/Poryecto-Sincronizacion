<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cotizaciones', function (Blueprint $table) {
            $table->char('moneda', 1)->default('s')->after('costo_envio');
        });

        Schema::table('cotizacion_detalles', function (Blueprint $table) {
            $table->char('moneda', 1)->default('s')->after('subtotal_linea');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->char('moneda', 1)->default('s')->after('costo_envio');
        });

        Schema::table('pedido_detalles', function (Blueprint $table) {
            $table->char('moneda', 1)->default('s')->after('subtotal_linea');
        });
    }

    public function down(): void
    {
        Schema::table('cotizaciones', function (Blueprint $table) {
            $table->dropColumn('moneda');
        });

        Schema::table('cotizacion_detalles', function (Blueprint $table) {
            $table->dropColumn('moneda');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('moneda');
        });

        Schema::table('pedido_detalles', function (Blueprint $table) {
            $table->dropColumn('moneda');
        });
    }
};
