<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

/**
 * El Vendedor ahora solo entra a Pedidos — ya no tiene acceso a la pantalla
 * de Cotizaciones. El filtro por cartera de CotizacionesController
 * (App\Support\CarteraDelVendedor) queda sin efecto práctico para este rol,
 * pero se deja el código tal cual por si se reactiva el acceso más adelante.
 */
return new class extends Migration
{
    private const GUARD = 'api';

    public function up(): void
    {
        $rol = Role::where('name', 'vendedor')->where('guard_name', self::GUARD)->first();
        $rol?->revokePermissionTo(['cotizaciones.ver', 'cotizaciones.show']);
    }

    public function down(): void
    {
        $rol = Role::where('name', 'vendedor')->where('guard_name', self::GUARD)->first();
        $rol?->givePermissionTo(['cotizaciones.ver', 'cotizaciones.show']);
    }
};
