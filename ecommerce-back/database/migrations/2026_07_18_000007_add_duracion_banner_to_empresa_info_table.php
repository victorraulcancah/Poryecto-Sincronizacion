<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info') || Schema::hasColumn('empresa_info', 'duracion_banner_segundos')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->unsignedTinyInteger('duracion_banner_segundos')->default(5)->after('imagen_introduccion');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info') || !Schema::hasColumn('empresa_info', 'duracion_banner_segundos')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->dropColumn('duracion_banner_segundos');
        });
    }
};
