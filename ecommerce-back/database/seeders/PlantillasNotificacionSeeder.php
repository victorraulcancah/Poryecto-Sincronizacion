<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PlantillaNotificacion;

class PlantillasNotificacionSeeder extends Seeder
{
    public function run(): void
    {
        $plantillas = [
            // EMAIL - Venta realizada
            [
                'codigo' => 'VENTA_REALIZADA_EMAIL',
                'nombre' => 'Venta Realizada - Email',
                'tipo' => 'VENTA_REALIZADA',
                'canal' => 'EMAIL',
                'asunto' => 'Gracias por tu compra #{numero_venta}',
                'contenido' => "Hola {nombre},\n\nGracias por tu compra en Magus.\n\nNúmero de venta: {numero_venta}\nTotal: {total}\nFecha: {fecha}\n\nEn breve recibirás tu comprobante electrónico.\n\nSaludos,\nEquipo Magus",
                'variables' => ['nombre', 'numero_venta', 'total', 'fecha'],
                'activo' => true
            ],

            // WHATSAPP - Venta realizada
            [
                'codigo' => 'VENTA_REALIZADA_WHATSAPP',
                'nombre' => 'Venta Realizada - WhatsApp',
                'tipo' => 'VENTA_REALIZADA',
                'canal' => 'WHATSAPP',
                'asunto' => null,
                'contenido' => "🛒 *Compra Confirmada*\n\nHola {nombre}!\n\nTu compra #{numero_venta} por {total} ha sido registrada exitosamente.\n\n📅 Fecha: {fecha}\n\nGracias por tu preferencia! 🎉",
                'variables' => ['nombre', 'numero_venta', 'total', 'fecha'],
                'activo' => true
            ],

            // EMAIL - Comprobante generado
            [
                'codigo' => 'COMPROBANTE_GENERADO_EMAIL',
                'nombre' => 'Comprobante Generado - Email',
                'tipo' => 'COMPROBANTE_GENERADO',
                'canal' => 'EMAIL',
                'asunto' => 'Tu {tipo_comprobante} {numero} está lista',
                'contenido' => "Hola {nombre},\n\nTu {tipo_comprobante} electrónica ha sido generada:\n\nNúmero: {numero}\nTotal: {total}\n\nPuedes descargarla desde tu cuenta o haciendo clic aquí:\n{link_descarga}\n\nSaludos,\nEquipo Magus",
                'variables' => ['nombre', 'tipo_comprobante', 'numero', 'total', 'link_descarga'],
                'activo' => true
            ],

            // WHATSAPP - Comprobante generado
            [
                'codigo' => 'COMPROBANTE_GENERADO_WHATSAPP',
                'nombre' => 'Comprobante Generado - WhatsApp',
                'tipo' => 'COMPROBANTE_GENERADO',
                'canal' => 'WHATSAPP',
                'asunto' => null,
                'contenido' => "📄 *Comprobante Electrónico*\n\nHola {nombre}!\n\nTu {tipo_comprobante} {numero} por {total} ya está disponible.\n\n📥 Descárgala aquí:\n{link_descarga}\n\nGracias! 😊",
                'variables' => ['nombre', 'tipo_comprobante', 'numero', 'total', 'link_descarga'],
                'activo' => true
            ],

            // EMAIL - Recordatorio de pago
            [
                'codigo' => 'RECORDATORIO_PAGO_EMAIL',
                'nombre' => 'Recordatorio de Pago - Email',
                'tipo' => 'RECORDATORIO_PAGO',
                'canal' => 'EMAIL',
                'asunto' => 'Recordatorio: Pago {estado} - {numero_documento}',
                'contenido' => "Hola {nombre},\n\nTe recordamos que tienes un pago {estado}:\n\nDocumento: {numero_documento}\nMonto pendiente: {monto}\nFecha de vencimiento: {fecha_vencimiento}\nDías: {dias_vencidos}\n\nPor favor, realiza tu pago a la brevedad.\n\nSaludos,\nEquipo Magus",
                'variables' => ['nombre', 'numero_documento', 'monto', 'fecha_vencimiento', 'dias_vencidos', 'estado'],
                'activo' => true
            ],

            // WHATSAPP - Recordatorio de pago
            [
                'codigo' => 'RECORDATORIO_PAGO_WHATSAPP',
                'nombre' => 'Recordatorio de Pago - WhatsApp',
                'tipo' => 'RECORDATORIO_PAGO',
                'canal' => 'WHATSAPP',
                'asunto' => null,
                'contenido' => "💰 *Recordatorio de Pago*\n\nHola {nombre},\n\nTienes un pago {estado}:\n\n📄 Doc: {numero_documento}\n💵 Monto: {monto}\n📅 Vencimiento: {fecha_vencimiento}\n⏰ {dias_vencidos} días\n\nPor favor, realiza tu pago pronto. Gracias!",
                'variables' => ['nombre', 'numero_documento', 'monto', 'fecha_vencimiento', 'dias_vencidos', 'estado'],
                'activo' => true
            ],

            // EMAIL - Voucher verificado
            [
                'codigo' => 'VOUCHER_VERIFICADO_EMAIL',
                'nombre' => 'Voucher Verificado - Email',
                'tipo' => 'VOUCHER_VERIFICADO',
                'canal' => 'EMAIL',
                'asunto' => 'Pago verificado - {numero_operacion}',
                'contenido' => "Hola {nombre},\n\nTu pago ha sido verificado exitosamente:\n\nNúmero de operación: {numero_operacion}\nMonto: {monto}\nFecha: {fecha}\n\nGracias por tu pago!\n\nSaludos,\nEquipo Magus",
                'variables' => ['nombre', 'numero_operacion', 'monto', 'fecha'],
                'activo' => true
            ],

            // WHATSAPP - Voucher verificado
            [
                'codigo' => 'VOUCHER_VERIFICADO_WHATSAPP',
                'nombre' => 'Voucher Verificado - WhatsApp',
                'tipo' => 'VOUCHER_VERIFICADO',
                'canal' => 'WHATSAPP',
                'asunto' => null,
                'contenido' => "✅ *Pago Verificado*\n\nHola {nombre}!\n\nTu pago ha sido confirmado:\n\n💵 Monto: {monto}\n🔢 Op: {numero_operacion}\n📅 {fecha}\n\nGracias! 🎉",
                'variables' => ['nombre', 'numero_operacion', 'monto', 'fecha'],
                'activo' => true
            ],

            // WHATSAPP - Cotización/pedido creado desde el checkout del ecommerce.
            // Editable desde el panel (Configuración > Plantillas); {link} lo
            // completa siempre el sistema con la URL del ecommerce, no es
            // editable por texto — ver WhatsAppTemplateController.
            [
                'codigo' => 'COTIZACION_CREADA_WHATSAPP',
                'nombre' => 'Cotización/Pedido Creado - WhatsApp',
                'tipo' => 'COTIZACION_CREADA',
                'canal' => 'WHATSAPP',
                'asunto' => null,
                'contenido' => "🛒 *¡Gracias por tu compra!*\n\nHola {nombre}!\n\nRegistramos tu pedido #{codigo_pedido} por {total}.\n\nSigue tu pedido o vuelve a comprar aquí:\n{link}\n\nGracias por tu preferencia! 🎉",
                'variables' => ['nombre', 'codigo_cotizacion', 'codigo_pedido', 'total', 'link'],
                'activo' => true
            ]
        ];

        foreach ($plantillas as $plantilla) {
            PlantillaNotificacion::updateOrCreate(
                ['codigo' => $plantilla['codigo']],
                $plantilla
            );
        }

        $this->command->info('✅ Plantillas de notificación creadas correctamente');
    }
}
