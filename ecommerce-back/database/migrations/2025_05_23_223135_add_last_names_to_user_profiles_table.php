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
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('last_name_father')->after('first_name')->nullable();
            $table->string('last_name_mother')->after('last_name_father')->nullable();
            
            // Opcional: si ya tienes columna 'last_name' y quieres eliminarla
            $table->dropColumn('last_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('last_name')->after('first_name')->nullable();

            $table->dropColumn('last_name_father');
            $table->dropColumn('last_name_mother');
        });
    }
};
