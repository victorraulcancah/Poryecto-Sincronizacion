<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `plantillas_notificacion.tipo` y `notificaciones.tipo` son un enum de
 * valores fijos (el mismo vocabulario en las dos tablas) y no tenían
 * ninguno para "se creó una cotización/pedido" — hacía falta uno nuevo para
 * la plantilla `COTIZACION_CREADA_WHATSAPP` y para el registro que deja
 * NotificacionService al enviarla.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE plantillas_notificacion MODIFY tipo ENUM(".
            "'VENTA_REALIZADA','PAGO_RECIBIDO','COMPROBANTE_GENERADO','CUENTA_POR_COBRAR',".
            "'RECORDATORIO_PAGO','VOUCHER_VERIFICADO','PEDIDO_ENVIADO','OTRO','COTIZACION_CREADA'".
            ") NOT NULL"
        );

        DB::statement(
            "ALTER TABLE notificaciones MODIFY tipo ENUM(".
            "'VENTA_REALIZADA','PAGO_RECIBIDO','COMPROBANTE_GENERADO','CUENTA_POR_COBRAR',".
            "'RECORDATORIO_PAGO','VOUCHER_VERIFICADO','PEDIDO_ENVIADO','OTRO','COTIZACION_CREADA'".
            ") NOT NULL"
        );
    }

    public function down(): void
    {
        // No se achica el enum: si ya existe una fila con 'COTIZACION_CREADA'
        // (la plantilla, o una notificación ya enviada), MySQL rechaza el
        // ALTER porque perdería ese valor. Dejarlo no rompe nada.
    }
};
