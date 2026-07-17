<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info') || Schema::hasColumn('empresa_info', 'tiktok')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->string('tiktok')->nullable()->after('youtube');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info') || !Schema::hasColumn('empresa_info', 'tiktok')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            $table->dropColumn('tiktok');
        });
    }
};
