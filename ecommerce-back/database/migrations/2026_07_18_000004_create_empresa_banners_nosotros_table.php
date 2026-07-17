<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('empresa_banners_nosotros')) {
            return;
        }

        Schema::create('empresa_banners_nosotros', function (Blueprint $table) {
            $table->id();
            $table->string('imagen');
            $table->string('titulo')->nullable();
            $table->string('subtitulo')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_banners_nosotros');
    }
};
