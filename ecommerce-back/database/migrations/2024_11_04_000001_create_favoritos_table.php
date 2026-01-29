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
        if (!Schema::hasTable('favoritos')) {
            Schema::create('favoritos', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_cliente_id');
                $table->unsignedBigInteger('producto_id');
                $table->timestamps();

                // Índices
                $table->unique(['user_cliente_id', 'producto_id'], 'favoritos_user_cliente_producto_unique');
                $table->index('user_cliente_id');
                $table->index('producto_id');

                // Claves foráneas
                $table->foreign('user_cliente_id')
                    ->references('id')
                    ->on('user_clientes')
                    ->onDelete('cascade');

                $table->foreign('producto_id')
                    ->references('id')
                    ->on('productos')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('favoritos');
    }
};
