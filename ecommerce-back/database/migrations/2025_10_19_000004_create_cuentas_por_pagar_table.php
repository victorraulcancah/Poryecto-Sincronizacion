<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabla de proveedores
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_documento', 10); // RUC, DNI
            $table->string('numero_documento', 20)->unique();
            $table->string('razon_social', 200);
            $table->string('nombre_comercial', 200)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('contacto_nombre', 100)->nullable();
            $table->string('contacto_telefono', 20)->nullable();
            $table->integer('dias_credito')->default(0);
            $table->decimal('limite_credito', 12, 2)->default(0);
            $table->boolean('activo')->default(true);
            $table->text('observaciones')->nullable();
            $table->timestamps();
            
            $table->index('numero_documento');
            $table->index('activo');
        });

        Schema::create('cuentas_por_pagar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('proveedores')->cascadeOnDelete();
            $table->foreignId('compra_id')->nullable()->constrained('compras')->nullOnDelete();
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
            
            $table->index(['proveedor_id', 'estado']);
            $table->index('fecha_vencimiento');
            $table->index('estado');
        });

        Schema::create('cxp_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_por_pagar_id')->constrained('cuentas_por_pagar')->cascadeOnDelete();
            $table->date('fecha_pago');
            $table->decimal('monto', 12, 2);
            $table->string('metodo_pago', 50);
            $table->string('referencia', 100)->nullable();
            $table->string('numero_operacion', 100)->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index('cuenta_por_pagar_id');
            $table->index('fecha_pago');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cxp_pagos');
        Schema::dropIfExists('cuentas_por_pagar');
        Schema::dropIfExists('proveedores');
    }
};
