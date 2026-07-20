<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cart_items') || Schema::hasColumn('cart_items', 'guardado_para_despues')) {
            return;
        }

        Schema::table('cart_items', function (Blueprint $table) {
            $table->boolean('guardado_para_despues')->default(false)->after('cantidad');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('cart_items') || !Schema::hasColumn('cart_items', 'guardado_para_despues')) {
            return;
        }

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn('guardado_para_despues');
        });
    }
};
