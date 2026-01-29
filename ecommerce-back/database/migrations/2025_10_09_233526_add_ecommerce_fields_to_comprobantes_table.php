<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->string('origen')->default('MANUAL')->after('estado'); // MANUAL, ECOMMERCE
            $table->unsignedBigInteger('compra_id')->nullable()->after('origen'); // Relación con compra
            $table->string('metodo_pago')->nullable()->after('compra_id'); // Método de pago usado
            $table->string('referencia_pago')->nullable()->after('metodo_pago'); // Referencia del pago
            
            // Índices
            $table->index('origen');
            $table->index('compra_id');
            $table->index('metodo_pago');
            
            // Foreign key
            $table->foreign('compra_id')->references('id')->on('compras')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropForeign(['compra_id']);
            $table->dropIndex(['origen']);
            $table->dropIndex(['compra_id']);
            $table->dropIndex(['metodo_pago']);
            $table->dropColumn(['origen', 'compra_id', 'metodo_pago', 'referencia_pago']);
        });
    }
};