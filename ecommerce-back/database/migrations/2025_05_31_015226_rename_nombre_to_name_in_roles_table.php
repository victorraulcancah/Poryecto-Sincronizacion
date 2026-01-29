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
        Schema::table('roles', function (Illuminate\Database\Schema\Blueprint $table) {
        $table->renameColumn('nombre', 'name');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->renameColumn('name', 'nombre');
        });
    }
};
