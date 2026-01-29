<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_chica', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('codigo', 20)->unique();
            $table->decimal('fondo_fijo', 12, 2);
            $table->decimal('saldo_actual', 12, 2);
            $table->foreignId('responsable_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('caja_chica_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caja_chica_id')->constrained('caja_chica')->cascadeOnDelete();
            $table->enum('tipo', ['GASTO', 'REPOSICION']);
            $table->date('fecha');
            $table->decimal('monto', 12, 2);
            $table->string('categoria', 50); // movilidad, utiles, refrigerio, etc
            $table->string('comprobante_tipo', 20)->nullable(); // boleta, factura, recibo
            $table->string('comprobante_numero', 50)->nullable();
            $table->string('proveedor', 200)->nullable();
            $table->text('descripcion');
            $table->string('archivo_adjunto', 255)->nullable();
            $table->enum('estado', ['PENDIENTE', 'APROBADO', 'RECHAZADO'])->default('PENDIENTE');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprobado_at')->nullable();
            $table->timestamps();
            
            $table->index(['caja_chica_id', 'fecha']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_chica_movimientos');
        Schema::dropIfExists('caja_chica');
    }
};
