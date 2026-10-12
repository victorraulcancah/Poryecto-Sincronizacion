<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Seguimiento manual de las compras por pasarela.
 *
 * El negocio factura a mano en el ERP, envía el comprobante a mano y llama al
 * cliente para coordinar el delivery. Estas columnas dejan constancia de en
 * qué punto está cada compra, qué comprobante del ERP se emitió y quién la
 * atendió.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagos_en_linea', function (Blueprint $table) {
            // pendiente_facturar | facturado | en_delivery | entregado | cancelado
            $table->string('estado_proceso', 20)->default('pendiente_facturar')->after('estado')->index();
            $table->string('comprobante_erp', 50)->nullable()->after('estado_proceso');
            $table->text('notas_internas')->nullable()->after('comprobante_erp');
            $table->unsignedBigInteger('atendido_por')->nullable()->after('notas_internas');
            $table->timestamp('atendido_at')->nullable()->after('atendido_por');

            // PDF del comprobante (boleta/factura) que el personal emitió en el
            // ERP y envió al cliente desde el panel.
            $table->string('comprobante_archivo')->nullable()->after('atendido_at');
            $table->string('comprobante_nombre')->nullable()->after('comprobante_archivo');
            $table->timestamp('comprobante_enviado_at')->nullable()->after('comprobante_nombre');
            $table->unsignedBigInteger('comprobante_enviado_por')->nullable()->after('comprobante_enviado_at');
        });
    }

    public function down(): void
    {
        Schema::table('pagos_en_linea', function (Blueprint $table) {
            $table->dropIndex(['estado_proceso']);
            $table->dropColumn([
                'estado_proceso', 'comprobante_erp', 'notas_internas', 'atendido_por', 'atendido_at',
                'comprobante_archivo', 'comprobante_nombre', 'comprobante_enviado_at', 'comprobante_enviado_por',
            ]);
        });
    }
};
