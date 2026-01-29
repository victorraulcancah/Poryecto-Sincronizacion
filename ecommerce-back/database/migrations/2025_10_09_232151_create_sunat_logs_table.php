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
        Schema::create('sunat_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('comprobante_id');
            $table->string('tipo_operacion')->default('enviar'); // enviar, consultar, reenviar
            $table->string('estado')->nullable(); // ENVIADO, ACEPTADO, RECHAZADO
            $table->string('numero_ticket')->nullable();
            $table->text('xml_enviado')->nullable();
            $table->text('xml_respuesta')->nullable();
            $table->text('cdr_respuesta')->nullable();
            $table->string('hash_firma')->nullable();
            $table->text('mensaje_sunat')->nullable();
            $table->text('errores_sunat')->nullable();
            $table->json('detalles_adicionales')->nullable();
            $table->timestamp('fecha_envio')->nullable();
            $table->timestamp('fecha_respuesta')->nullable();
            $table->integer('tiempo_respuesta_ms')->nullable();
            $table->string('ip_origen')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();

            // Índices
            $table->index('comprobante_id');
            $table->index('estado');
            $table->index('numero_ticket');
            $table->index('fecha_envio');
            $table->index('user_id');

            // Foreign key
            $table->foreign('comprobante_id')->references('id')->on('comprobantes')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sunat_logs');
    }
};