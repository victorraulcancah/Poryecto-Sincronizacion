<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_precio', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->char('tipo_moneda', 1)->default('s'); // s = soles, d = dolares
            $table->boolean('activo')->default(true);
            // Lista que reciben los clientes registrados nuevos (configurable)
            $table->boolean('es_predeterminado')->default(false);
            // Lista que ven los visitantes no logueados (configurable)
            $table->boolean('es_para_invitados')->default(false);
            // Mapeo con la lista de 7Power
            $table->unsignedBigInteger('tipo_precio_7power_id')->nullable()->unique();
            $table->unsignedBigInteger('company_id')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_precio');
    }
};
