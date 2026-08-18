<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `pedido_tracking.usuario_id` era NOT NULL, así que solo podía registrar
 * cambios hechos por un usuario del panel. Cuando el cliente cancela su
 * cotización desde la tienda no hay tal usuario y el insert reventaba.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE pedido_tracking MODIFY usuario_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE pedido_tracking MODIFY usuario_id BIGINT UNSIGNED NOT NULL');
    }
};
