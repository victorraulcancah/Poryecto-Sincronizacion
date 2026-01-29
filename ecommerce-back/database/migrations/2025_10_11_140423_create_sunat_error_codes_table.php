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
        Schema::create('sunat_error_codes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique(); // Código del error (ej: 0100, 0101, etc.)
            $table->text('descripcion'); // Descripción completa del error
            $table->string('categoria', 50)->nullable(); // Categoría del error (autenticacion, xml, validacion, etc.)
            $table->string('tipo', 20)->nullable(); // Tipo: error, warning, info
            $table->boolean('activo')->default(true); // Si el código está activo
            $table->text('solucion_sugerida')->nullable(); // Solución sugerida para el error
            $table->timestamps();
            
            $table->index(['codigo', 'activo']);
            $table->index('categoria');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sunat_error_codes');
    }
};
