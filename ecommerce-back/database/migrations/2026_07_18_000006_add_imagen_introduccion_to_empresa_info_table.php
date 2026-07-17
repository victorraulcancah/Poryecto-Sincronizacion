<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info') || Schema::hasColumn('empresa_info', 'imagen_introduccion')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->string('imagen_introduccion')->nullable()->after('sobre_nosotros');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info') || !Schema::hasColumn('empresa_info', 'imagen_introduccion')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->dropColumn('imagen_introduccion');
        });
    }
};
