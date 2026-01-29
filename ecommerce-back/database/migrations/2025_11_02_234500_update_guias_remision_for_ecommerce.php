<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Actualiza la tabla guias_remision para soportar:
     * - Cliente opcional (para destinatarios manuales)
     * - Tipos de guía (REMITENTE, INTERNO)
     * - Solo 2 tipos de guías (eliminado TRANSPORTISTA)
     */
    public function up(): void
    {
        Schema::table('guias_remision', function (Blueprint $table) {
            // Agregar campos nuevos
            $table->string('tipo_guia', 20)->default('REMITENTE')->after('tipo_comprobante');
            $table->boolean('requiere_sunat')->default(true)->after('tipo_guia');
            
            // Hacer nullable los campos de cliente (para destinatarios manuales)
            $table->foreignId('cliente_id')->nullable()->change();
            $table->string('cliente_tipo_documento', 1)->nullable()->change();
            $table->string('cliente_numero_documento', 20)->nullable()->change();
            $table->string('cliente_razon_social', 200)->nullable()->change();
            
            // Agregar campos de transportista (nullable, solo para referencia)
            $table->string('transportista_ruc', 11)->nullable()->after('conductor_nombres');
            $table->string('transportista_razon_social', 200)->nullable()->after('transportista_ruc');
            
            // Hacer nullable fecha_emision (se genera automáticamente)
            $table->date('fecha_emision')->nullable()->change();
            
            // Agregar PDF
            $table->longText('pdf_base64')->nullable()->after('xml_respuesta_sunat');
            
            // Agregar venta_id para trazabilidad
            $table->foreignId('venta_id')->nullable()->after('cliente_id');
            
            // Agregar campos de comprobante relacionado
            $table->string('comprobante_tipo', 2)->nullable()->after('venta_id');
            $table->string('comprobante_serie', 4)->nullable()->after('comprobante_tipo');
            $table->string('comprobante_numero', 8)->nullable()->after('comprobante_serie');
            
            // Agregar estado logístico (para control interno)
            $table->string('estado_logistico', 50)->nullable()->after('estado');
        });
        
        // Agregar índice para tipo_guia
        Schema::table('guias_remision', function (Blueprint $table) {
            $table->index('tipo_guia');
            $table->index('requiere_sunat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guias_remision', function (Blueprint $table) {
            // Eliminar campos agregados
            $table->dropColumn([
                'tipo_guia',
                'requiere_sunat',
                'transportista_ruc',
                'transportista_razon_social',
                'pdf_base64',
                'venta_id',
                'comprobante_tipo',
                'comprobante_serie',
                'comprobante_numero',
                'estado_logistico'
            ]);
            
            // Revertir nullable (hacer NOT NULL nuevamente)
            $table->foreignId('cliente_id')->nullable(false)->change();
            $table->string('cliente_tipo_documento', 1)->nullable(false)->change();
            $table->string('cliente_numero_documento', 20)->nullable(false)->change();
            $table->string('cliente_razon_social', 200)->nullable(false)->change();
            $table->date('fecha_emision')->nullable(false)->change();
        });
    }
};
