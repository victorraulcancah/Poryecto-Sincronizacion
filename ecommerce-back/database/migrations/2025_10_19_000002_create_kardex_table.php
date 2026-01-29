<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kardex', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->date('fecha');
            $table->enum('tipo_movimiento', ['ENTRADA', 'SALIDA', 'AJUSTE']);
            $table->enum('tipo_operacion', [
                'COMPRA', 'VENTA', 'DEVOLUCION_COMPRA', 'DEVOLUCION_VENTA',
                'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'INVENTARIO_INICIAL',
                'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA', 'MERMA', 'ROBO'
            ]);
            $table->string('documento_tipo', 20)->nullable(); // factura, boleta, guia
            $table->string('documento_numero', 50)->nullable();
            $table->integer('cantidad');
            $table->decimal('costo_unitario', 12, 2);
            $table->decimal('costo_total', 12, 2);
            $table->integer('stock_anterior');
            $table->integer('stock_actual');
            $table->decimal('costo_promedio', 12, 2);
            $table->foreignId('compra_id')->nullable()->constrained('compras')->nullOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            
            $table->index(['producto_id', 'fecha']);
            $table->index('tipo_movimiento');
            $table->index('tipo_operacion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kardex');
    }
};
