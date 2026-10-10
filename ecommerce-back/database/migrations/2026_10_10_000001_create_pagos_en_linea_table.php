<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compras pagadas por la pasarela de pago (botón "Pagar" del carrito).
 *
 * Es una tabla aparte de `pedidos` a propósito: el flujo de pedidos y
 * cotizaciones que revisa el equipo de ventas no se toca. Mientras Culqi no
 * apruebe el comercio la pasarela es simulada (`simulado = 1`): se registra la
 * compra y se avisa por correo, pero no hay cobro real ni descuento de stock.
 *
 * Nunca se guarda el número de la tarjeta: solo la marca y los últimos 4
 * dígitos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_en_linea', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->unsignedBigInteger('user_cliente_id')->index();

            // pagado | rechazado
            $table->string('estado', 20)->default('pagado');
            $table->boolean('simulado')->default(true);
            $table->string('pasarela', 20)->default('simulada');
            $table->string('referencia_pasarela', 60)->nullable();
            $table->string('mensaje_pasarela')->nullable();

            // 's' soles, 'd' dólares: una pasarela cobra en una sola moneda.
            $table->char('moneda', 1)->default('s');
            $table->decimal('subtotal', 12, 2)->default(0);
            // IGV incluido en el total (informativo; el precio ya lo trae).
            $table->decimal('igv', 12, 2)->default(0);
            $table->string('cupon_codigo', 50)->nullable();
            $table->decimal('descuento', 12, 2)->default(0);
            $table->decimal('costo_envio', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            // Líneas compradas con el precio que se cobró: producto, cantidad,
            // precio unitario, subtotal e imagen.
            $table->json('items');

            // Entrega: solo delivery, no hay recojo en tienda.
            $table->string('forma_envio', 30)->default('delivery');
            $table->string('cliente_nombre', 150);
            $table->string('cliente_email', 150);
            $table->string('numero_documento', 20)->nullable();
            $table->string('telefono_contacto', 20);
            $table->text('direccion_envio');
            $table->string('departamento_nombre', 100)->nullable();
            $table->string('provincia_nombre', 100)->nullable();
            $table->string('distrito_nombre', 100)->nullable();
            $table->text('observaciones')->nullable();

            $table->string('tarjeta_marca', 20)->nullable();
            $table->char('tarjeta_ultimos4', 4)->nullable();

            $table->timestamp('email_enviado_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_en_linea');
    }
};
