<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas_por_cobrar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->foreignId('comprobante_id')->nullable()->constrained('comprobantes')->nullOnDelete();
            $table->string('numero_documento', 50);
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento');
            $table->decimal('monto_total', 12, 2);
            $table->decimal('monto_pagado', 12, 2)->default(0);
            $table->decimal('saldo_pendiente', 12, 2);
            $table->enum('estado', ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'])->default('PENDIENTE');
            $table->integer('dias_credito')->default(0);
            $table->integer('dias_vencidos')->default(0);
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index(['cliente_id', 'estado']);
            $table->index('fecha_vencimiento');
            $table->index('estado');
        });

        Schema::create('cxc_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_por_cobrar_id')->constrained('cuentas_por_cobrar')->cascadeOnDelete();
            $table->date('fecha_pago');
            $table->decimal('monto', 12, 2);
            $table->string('metodo_pago', 50);
            $table->string('referencia', 100)->nullable();
            $table->string('numero_operacion', 100)->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index('cuenta_por_cobrar_id');
            $table->index('fecha_pago');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cxc_pagos');
        Schema::dropIfExists('cuentas_por_cobrar');
    }
};
