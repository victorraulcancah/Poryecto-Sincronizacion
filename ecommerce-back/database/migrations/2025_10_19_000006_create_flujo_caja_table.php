<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flujo_caja_proyecciones', function (Blueprint $table) {
            $table->id();
            $table->date('fecha');
            $table->enum('tipo', ['INGRESO', 'EGRESO']);
            $table->string('concepto', 200);
            $table->decimal('monto_proyectado', 12, 2);
            $table->decimal('monto_real', 12, 2)->nullable();
            $table->enum('categoria', [
                'VENTAS', 'COBROS', 'PRESTAMOS', 'OTROS_INGRESOS',
                'COMPRAS', 'PAGOS_PROVEEDORES', 'SUELDOS', 'SERVICIOS', 
                'IMPUESTOS', 'PRESTAMOS_PAGO', 'OTROS_EGRESOS'
            ]);
            $table->enum('estado', ['PROYECTADO', 'REALIZADO', 'CANCELADO'])->default('PROYECTADO');
            $table->boolean('recurrente')->default(false);
            $table->string('frecuencia', 20)->nullable(); // diario, semanal, mensual
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index(['fecha', 'tipo']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flujo_caja_proyecciones');
    }
};
