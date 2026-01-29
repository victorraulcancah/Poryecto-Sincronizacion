<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabla para análisis de utilidad por venta
        Schema::create('utilidad_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->cascadeOnDelete();
            $table->foreignId('comprobante_id')->nullable()->constrained('comprobantes')->nullOnDelete();
            $table->date('fecha_venta');
            $table->decimal('total_venta', 12, 2);
            $table->decimal('costo_total', 12, 2);
            $table->decimal('utilidad_bruta', 12, 2);
            $table->decimal('margen_porcentaje', 5, 2);
            $table->decimal('gastos_operativos', 12, 2)->default(0);
            $table->decimal('utilidad_neta', 12, 2);
            $table->text('observaciones')->nullable();
            $table->timestamps();
            
            $table->index(['fecha_venta', 'venta_id']);
        });

        // Tabla para análisis de utilidad por producto
        Schema::create('utilidad_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->date('fecha');
            $table->integer('cantidad_vendida');
            $table->decimal('precio_venta_promedio', 12, 2);
            $table->decimal('costo_promedio', 12, 2);
            $table->decimal('total_ventas', 12, 2);
            $table->decimal('total_costos', 12, 2);
            $table->decimal('utilidad_bruta', 12, 2);
            $table->decimal('margen_porcentaje', 5, 2);
            $table->timestamps();
            
            $table->index(['producto_id', 'fecha']);
        });

        // Tabla para gastos operativos
        Schema::create('gastos_operativos', function (Blueprint $table) {
            $table->id();
            $table->date('fecha');
            $table->enum('categoria', [
                'ALQUILER', 'SERVICIOS', 'SUELDOS', 'MARKETING', 
                'TRANSPORTE', 'MANTENIMIENTO', 'IMPUESTOS', 'OTROS'
            ]);
            $table->string('concepto', 200);
            $table->decimal('monto', 12, 2);
            $table->string('comprobante_tipo', 20)->nullable();
            $table->string('comprobante_numero', 50)->nullable();
            $table->foreignId('proveedor_id')->nullable()->constrained('proveedores')->nullOnDelete();
            $table->boolean('es_fijo')->default(false);
            $table->boolean('es_recurrente')->default(false);
            $table->text('descripcion')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index(['fecha', 'categoria']);
        });

        // Tabla para resumen de utilidades mensual
        Schema::create('utilidad_mensual', function (Blueprint $table) {
            $table->id();
            $table->integer('mes');
            $table->integer('anio');
            $table->decimal('total_ventas', 12, 2);
            $table->decimal('total_costos', 12, 2);
            $table->decimal('utilidad_bruta', 12, 2);
            $table->decimal('margen_bruto_porcentaje', 5, 2);
            $table->decimal('gastos_operativos', 12, 2);
            $table->decimal('utilidad_operativa', 12, 2);
            $table->decimal('margen_operativo_porcentaje', 5, 2);
            $table->decimal('otros_ingresos', 12, 2)->default(0);
            $table->decimal('otros_gastos', 12, 2)->default(0);
            $table->decimal('utilidad_neta', 12, 2);
            $table->decimal('margen_neto_porcentaje', 5, 2);
            $table->timestamps();
            
            $table->unique(['mes', 'anio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilidad_mensual');
        Schema::dropIfExists('gastos_operativos');
        Schema::dropIfExists('utilidad_productos');
        Schema::dropIfExists('utilidad_ventas');
    }
};
