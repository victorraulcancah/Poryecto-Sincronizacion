<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Copia local del crédito disponible del cliente en el ERP 7Power
     * (consultado vía el endpoint público /ecommerce/clientes/credito).
     * Se sincroniza al vincular codigo_erp y al entrar al checkout, y se
     * descuenta localmente cuando el cliente usa crédito en un pedido,
     * ya que el ERP no se entera de los pedidos del e-commerce en tiempo real.
     */
    public function up(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->decimal('credito_disponible', 10, 2)->nullable()->after('codigo_erp');
            $table->timestamp('credito_actualizado_at')->nullable()->after('credito_disponible');
        });
    }

    public function down(): void
    {
        Schema::table('user_clientes', function (Blueprint $table) {
            $table->dropColumn(['credito_disponible', 'credito_actualizado_at']);
        });
    }
};
