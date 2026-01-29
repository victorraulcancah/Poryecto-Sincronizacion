<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SerieComprobante;
use Illuminate\Support\Facades\DB;

class GuiasRemisionSeriesSeeder extends Seeder
{
    public function run(): void
    {
        // Serie para GRE Remitente (tipo 09)
        SerieComprobante::updateOrCreate(
            [
                'tipo_comprobante' => '09',
                'serie' => 'T001'
            ],
            [
                'descripcion' => 'Serie para Guías de Remisión Remitente',
                'correlativo' => 0,
                'activo' => true
            ]
        );

        // Serie para GRE Transportista (tipo 31)
        SerieComprobante::updateOrCreate(
            [
                'tipo_comprobante' => '31',
                'serie' => 'V001'
            ],
            [
                'descripcion' => 'Serie para Guías de Remisión Transportista',
                'correlativo' => 0,
                'activo' => true
            ]
        );

        $this->command->info('✓ Series de guías de remisión creadas/actualizadas correctamente');
    }
}
