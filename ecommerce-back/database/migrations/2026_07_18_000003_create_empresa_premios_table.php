<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('empresa_premios')) {
            return;
        }

        Schema::create('empresa_premios', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->string('anio', 10)->nullable();
            $table->string('imagen')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_premios');
    }
};
