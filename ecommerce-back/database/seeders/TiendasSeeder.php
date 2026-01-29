<?php

namespace Database\Seeders;

use App\Models\Tienda;
use Illuminate\Database\Seeder;

class TiendasSeeder extends Seeder
{
    public function run(): void
    {
        $tiendas = [
            [
                'nombre' => 'Tienda Central',
                'descripcion' => 'Tienda principal - Centro de Lima',
                'estado' => 'ACTIVA'
            ],
            [
                'nombre' => 'Tienda Norte',
                'descripcion' => 'Sucursal zona norte',
                'estado' => 'ACTIVA'
            ],
            [
                'nombre' => 'Tienda Sur',
                'descripcion' => 'Sucursal zona sur',
                'estado' => 'ACTIVA'
            ]
        ];

        foreach ($tiendas as $tienda) {
            Tienda::firstOrCreate(
                ['nombre' => $tienda['nombre']],
                $tienda
            );
        }

        $this->command->info('✅ Tiendas creadas correctamente');
    }
}
