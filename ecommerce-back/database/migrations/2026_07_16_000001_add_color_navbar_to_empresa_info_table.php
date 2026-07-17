<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info') || Schema::hasColumn('empresa_info', 'color_navbar')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->string('color_navbar', 20)->nullable()->after('logo');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info') || !Schema::hasColumn('empresa_info', 'color_navbar')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->dropColumn('color_navbar');
        });
    }
};
