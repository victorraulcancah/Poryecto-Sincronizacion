<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos del nuevo formato del Libro de Reclamaciones: datos de la compra,
 * solución esperada, adjuntos y trazabilidad (canal, IP, responsable).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reclamos', function (Blueprint $table) {
            $table->string('tipo_documento', 20)->default('DNI')->after('consumidor_nombre');

            // Información de la compra (todo opcional)
            $table->string('tipo_comprobante', 30)->nullable()->after('descripcion_bien');
            $table->string('numero_comprobante', 50)->nullable()->after('tipo_comprobante');
            $table->date('fecha_compra')->nullable()->after('numero_comprobante');
            $table->string('codigo_pedido', 50)->nullable()->after('fecha_compra');
            $table->string('codigo_producto', 50)->nullable()->after('codigo_pedido');
            $table->string('nombre_producto')->nullable()->after('codigo_producto');
            $table->string('marca', 100)->nullable()->after('nombre_producto');
            $table->string('modelo', 100)->nullable()->after('marca');

            // Qué solución espera el consumidor
            $table->string('solucion_esperada', 60)->nullable()->after('pedido_consumidor');
            $table->string('otra_solucion')->nullable()->after('solucion_esperada');

            // Adjuntos: se guarda la ruta del archivo
            $table->string('foto')->nullable()->after('otra_solucion');
            $table->string('factura')->nullable()->after('foto');
            $table->string('video')->nullable()->after('factura');

            // Trazabilidad y gestión
            $table->string('canal', 50)->default('Web')->after('video');
            $table->string('ip', 45)->nullable()->after('canal');
            $table->unsignedBigInteger('responsable_id')->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('reclamos', function (Blueprint $table) {
            $table->dropColumn([
                'tipo_documento', 'tipo_comprobante', 'numero_comprobante', 'fecha_compra',
                'codigo_pedido', 'codigo_producto', 'nombre_producto', 'marca', 'modelo',
                'solucion_esperada', 'otra_solucion', 'foto', 'factura', 'video',
                'canal', 'ip', 'responsable_id',
            ]);
        });
    }
};
