<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('forma_envios');

        Schema::create('forma_envios', function (Blueprint $table) {
            $table->id();
            $table->string('departamento_id');
            $table->string('provincia_id')->nullable();
            $table->string('distrito_id')->nullable();
            $table->decimal('costo', 10, 2)->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forma_envios');
    }
};
