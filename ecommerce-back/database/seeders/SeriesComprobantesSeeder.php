<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\SerieComprobante;

class SeriesComprobantesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Asegura series base para Factura (01) y Boleta (03)
        $series = [
            [
                'tipo_comprobante' => '01',
                'serie' => 'F001',
                'correlativo' => 0,
                'activo' => true,
                'descripcion' => 'Serie por defecto Factura',
            ],
            [
                'tipo_comprobante' => '03',
                'serie' => 'B001',
                'correlativo' => 0,
                'activo' => true,
                'descripcion' => 'Serie por defecto Boleta',
            ],
        ];

        foreach ($series as $data) {
            $exists = SerieComprobante::where('tipo_comprobante', $data['tipo_comprobante'])
                ->where('serie', $data['serie'])
                ->exists();

            if (!$exists) {
                SerieComprobante::create($data);
                $this->command?->info("✔️ Serie creada: {$data['serie']} ({$data['tipo_comprobante']})");
            } else {
                $this->command?->warn("⚠️ Serie ya existe: {$data['serie']} ({$data['tipo_comprobante']})");
            }
        }
    }
}


