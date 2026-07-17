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
            if (!Schema::hasColumn('empresa_info', 'sobre_nosotros')) {
                $table->text('sobre_nosotros')->nullable()->after('descripcion');
            }
            if (!Schema::hasColumn('empresa_info', 'metodos_pago')) {
                $table->json('metodos_pago')->nullable()->after('tiktok');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('empresa_info')) {
            return;
        }

        Schema::table('empresa_info', function (Blueprint $table) {
            if (Schema::hasColumn('empresa_info', 'sobre_nosotros')) {
                $table->dropColumn('sobre_nosotros');
            }
            if (Schema::hasColumn('empresa_info', 'metodos_pago')) {
                $table->dropColumn('metodos_pago');
            }
        });
    }
};
