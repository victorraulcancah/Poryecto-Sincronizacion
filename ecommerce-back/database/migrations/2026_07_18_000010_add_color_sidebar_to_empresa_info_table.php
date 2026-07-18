<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info') || Schema::hasColumn('empresa_info', 'color_sidebar')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->string('color_sidebar')->nullable()->after('color_navbar');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info') || !Schema::hasColumn('empresa_info', 'color_sidebar')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->dropColumn('color_sidebar');
        });
    }
};
