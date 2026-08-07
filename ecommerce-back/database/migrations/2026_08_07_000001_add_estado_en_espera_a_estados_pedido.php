<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Estado "En espera" para los pedidos que crea el cliente desde el checkout.
 *
 * El pedido nace en este estado y es el único en el que el cliente todavía
 * puede editar su cotización. Cuando un vendedor o administrador lo pasa a
 * "En preparación" (o lo cancela), queda cerrado para el cliente.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('estados_pedido')->updateOrInsert(
            ['id' => 10],
            [
                'nombre_estado' => 'En espera',
                'descripcion' => 'Pedido recibido; el cliente aún puede editar su cotización',
                'orden' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Los tres estados del flujo quedan primeros en el listado; el resto se
        // conserva en 0 porque hay pedidos antiguos que los referencian.
        DB::table('estados_pedido')->where('id', 4)->update(['orden' => 2]); // En preparación
        DB::table('estados_pedido')->where('id', 8)->update(['orden' => 3]); // Cancelado
    }

    public function down(): void
    {
        // Solo se borra si ningún pedido quedó en ese estado.
        if (!DB::table('pedidos')->where('estado_pedido_id', 10)->exists()) {
            DB::table('estados_pedido')->where('id', 10)->delete();
        }

        DB::table('estados_pedido')->whereIn('id', [4, 8])->update(['orden' => 0]);
    }
};
