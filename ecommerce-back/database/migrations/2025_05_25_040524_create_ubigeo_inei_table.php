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
        Schema::create('ubigeo_inei', function (Blueprint $table) {
            $table->id('id_ubigeo');
            $table->string('departamento', 2);
            $table->string('provincia', 2);
            $table->string('distrito', 2);
            $table->string('nombre', 45);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ubigeo_inei');
    }
};
