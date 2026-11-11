<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Teléfonos de los clientes que reciben notificaciones push del app móvil.
 *
 * Cada fila es el "token" que Firebase le da a una instalación del app. Un
 * cliente puede tener varios teléfonos; un token solo pertenece a un cliente
 * (si alguien más inicia sesión en ese teléfono, el token cambia de dueño).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispositivos_cliente', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_cliente_id')->index();
            $table->string('token', 512)->unique();
            $table->string('plataforma', 20)->default('android');
            $table->timestamp('ultimo_uso_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivos_cliente');
    }
};
