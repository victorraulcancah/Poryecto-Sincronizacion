<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['PAGO_CLIENTE', 'PAGO_PROVEEDOR', 'DEPOSITO', 'TRANSFERENCIA', 'OTRO']);
            $table->string('numero_operacion', 100);
            $table->date('fecha');
            $table->decimal('monto', 12, 2);
            $table->string('banco', 100)->nullable();
            $table->string('cuenta_origen', 50)->nullable();
            $table->string('cuenta_destino', 50)->nullable();
            $table->string('metodo_pago', 50); // transferencia, deposito, yape, plin, etc
            $table->string('archivo_voucher', 255)->nullable(); // Ruta del archivo
            $table->foreignId('cuenta_por_cobrar_id')->nullable()->constrained('cuentas_por_cobrar')->nullOnDelete();
            $table->foreignId('cuenta_por_pagar_id')->nullable()->constrained('cuentas_por_pagar')->nullOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->foreignId('compra_id')->nullable()->constrained('compras')->nullOnDelete();
            $table->enum('estado', ['PENDIENTE', 'VERIFICADO', 'RECHAZADO'])->default('PENDIENTE');
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('verificado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verificado_at')->nullable();
            $table->timestamps();
            
            $table->index(['tipo', 'estado']);
            $table->index('fecha');
            $table->index('numero_operacion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
