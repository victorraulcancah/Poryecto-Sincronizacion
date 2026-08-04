<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('empresa_info')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            // Texto y color de fondo de la pantalla de carga inicial (splash),
            // configurables desde /dashboard/empresa-info. El logo del splash
            // reutiliza el mismo campo "logo" ya existente.
            if (!Schema::hasColumn('empresa_info', 'splash_texto')) {
                $table->string('splash_texto')->nullable()->after('color_sidebar');
            }
            if (!Schema::hasColumn('empresa_info', 'splash_color_fondo')) {
                $table->string('splash_color_fondo')->nullable()->after('splash_texto');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            if (Schema::hasColumn('empresa_info', 'splash_color_fondo')) {
                $table->dropColumn('splash_color_fondo');
            }
            if (Schema::hasColumn('empresa_info', 'splash_texto')) {
                $table->dropColumn('splash_texto');
            }
        });
    }
};
