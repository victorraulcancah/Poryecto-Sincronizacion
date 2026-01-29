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
        Schema::create('guias_remision', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_comprobante', 2)->default('09');
            $table->string('serie', 4);
            $table->integer('correlativo');
            $table->date('fecha_emision');
            $table->date('fecha_inicio_traslado');
            
            // Datos del cliente (remitente)
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->string('cliente_tipo_documento', 1);
            $table->string('cliente_numero_documento', 20);
            $table->string('cliente_razon_social', 200);
            $table->string('cliente_direccion', 200);
            
            // Datos del destinatario
            $table->string('destinatario_tipo_documento', 1);
            $table->string('destinatario_numero_documento', 20);
            $table->string('destinatario_razon_social', 200);
            $table->string('destinatario_direccion', 200);
            $table->string('destinatario_ubigeo', 6);
            
            // Información de traslado
            $table->string('motivo_traslado', 2);
            $table->string('modalidad_traslado', 2);
            $table->decimal('peso_total', 10, 2)->default(0);
            $table->integer('numero_bultos')->default(1);
            $table->string('modo_transporte', 2)->default('01');
            
            // Información del transporte
            $table->string('numero_placa', 20)->nullable();
            $table->string('numero_licencia', 20)->nullable();
            $table->string('conductor_dni', 8)->nullable();
            $table->string('conductor_nombres', 200)->nullable();
            
            // Puntos de partida y llegada
            $table->string('punto_partida_ubigeo', 6);
            $table->string('punto_partida_direccion', 200);
            $table->string('punto_llegada_ubigeo', 6);
            $table->string('punto_llegada_direccion', 200);
            
            // Observaciones
            $table->text('observaciones')->nullable();
            
            // Estado y respuesta SUNAT
            $table->string('estado', 20)->default('PENDIENTE');
            $table->longText('xml_firmado')->nullable();
            $table->longText('xml_respuesta_sunat')->nullable();
            $table->text('mensaje_sunat')->nullable();
            $table->string('codigo_hash', 100)->nullable();
            $table->string('numero_ticket', 50)->nullable();
            $table->timestamp('fecha_aceptacion')->nullable();
            $table->text('errores_sunat')->nullable();
            
            // Auditoría
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            // Índices
            $table->index(['serie', 'correlativo']);
            $table->index(['fecha_emision']);
            $table->index(['estado']);
            $table->index(['cliente_id']);
            $table->unique(['serie', 'correlativo'], 'unique_serie_correlativo_guia');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guias_remision');
    }
};