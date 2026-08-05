<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega RUC a los tipos de documento.
     *
     * Se usa el id 6 a propósito: es el código de SUNAT para RUC y es el que
     * ya asumía el modal de administración (que lo tenía escrito a mano
     * apuntando a un id inexistente, por lo que guardar con RUC fallaba).
     */
    public function up(): void
    {
        if (!Schema::hasTable('document_types')) {
            return;
        }

        if (DB::table('document_types')->where('id', 6)->exists()) {
            return;
        }

        DB::table('document_types')->insert([
            'id' => 6,
            'nombre' => 'RUC',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('document_types')) {
            return;
        }

        // Solo se elimina si ningún cliente lo está usando.
        $enUso = DB::table('user_clientes')->where('tipo_documento_id', 6)->exists();
        if (!$enUso) {
            DB::table('document_types')->where('id', 6)->where('nombre', 'RUC')->delete();
        }
    }
};
