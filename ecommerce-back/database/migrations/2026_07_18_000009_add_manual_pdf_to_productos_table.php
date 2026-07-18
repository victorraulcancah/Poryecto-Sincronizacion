<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('productos') || Schema::hasColumn('productos', 'manual_pdf')) {
            return;
        }

        Schema::table('productos', function (Blueprint $table) {
            $table->string('manual_pdf')->nullable()->after('imagen');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('productos') || !Schema::hasColumn('productos', 'manual_pdf')) {
            return;
        }

        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('manual_pdf');
        });
    }
};
