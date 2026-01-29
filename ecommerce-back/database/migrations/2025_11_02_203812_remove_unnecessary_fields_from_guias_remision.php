<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Elimina campos innecesarios de guias_remision:
     * - cliente_direccion: NO se usa, usar punto_partida_direccion
     * - numero_licencia: SUNAT NO lo requiere
     * - constancia_mtc: NO se valida en SUNAT
     * - numero_ticket: Temporal, mover a logs
     *
     * Hace nullable:
     * - observaciones: Campo opcional
     */
    public function up(): void
    {
        // Eliminar columnas innecesarias
        DB::statement('ALTER TABLE guias_remision DROP COLUMN cliente_direccion');
        DB::statement('ALTER TABLE guias_remision DROP COLUMN numero_licencia');
        DB::statement('ALTER TABLE guias_remision DROP COLUMN constancia_mtc');
        DB::statement('ALTER TABLE guias_remision DROP COLUMN numero_ticket');

        // Hacer nullable el campo observaciones
        DB::statement('ALTER TABLE guias_remision MODIFY observaciones TEXT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restaurar columnas eliminadas
        DB::statement('ALTER TABLE guias_remision ADD COLUMN cliente_direccion VARCHAR(200) NULL AFTER cliente_razon_social');
        DB::statement('ALTER TABLE guias_remision ADD COLUMN numero_licencia VARCHAR(20) NULL AFTER numero_placa');
        DB::statement('ALTER TABLE guias_remision ADD COLUMN constancia_mtc VARCHAR(50) NULL AFTER conductor_nombres');
        DB::statement('ALTER TABLE guias_remision ADD COLUMN numero_ticket VARCHAR(100) NULL AFTER codigo_hash');

        // Revertir nullable
        DB::statement('ALTER TABLE guias_remision MODIFY observaciones TEXT NOT NULL');
    }
};
