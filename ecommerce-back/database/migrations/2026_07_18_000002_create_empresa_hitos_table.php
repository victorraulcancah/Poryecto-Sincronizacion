<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('empresa_hitos')) {
            return;
        }

        Schema::create('empresa_hitos', function (Blueprint $table) {
            $table->id();
            $table->string('anio', 10);
            $table->text('descripcion');
            $table->string('imagen')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_hitos');
    }
};
