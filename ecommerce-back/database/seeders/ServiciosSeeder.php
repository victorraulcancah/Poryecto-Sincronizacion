<?php

namespace Database\Seeders;

use App\Models\Servicio;
use Illuminate\Database\Seeder;

class ServiciosSeeder extends Seeder
{
    public function run(): void
    {
        $servicios = [
            [
                'codigo_servicio' => 'SERV-001',
                'nombre' => 'Instalación de Software',
                'descripcion' => 'Servicio de instalación y configuración de software',
                'precio' => 150.00,
                'mostrar_igv' => true,
                'unidad_medida' => 'ZZ',
                'tipo_afectacion_igv' => '10',
                'activo' => true,
            ],
            [
                'codigo_servicio' => 'SERV-002',
                'nombre' => 'Mantenimiento de PC',
                'descripcion' => 'Servicio de mantenimiento preventivo y correctivo de computadoras',
                'precio' => 80.00,
                'mostrar_igv' => true,
                'unidad_medida' => 'ZZ',
                'tipo_afectacion_igv' => '10',
                'activo' => true,
            ],
            [
                'codigo_servicio' => 'SERV-003',
                'nombre' => 'Soporte Técnico Remoto',
                'descripcion' => 'Asistencia técnica remota por hora',
                'precio' => 50.00,
                'mostrar_igv' => true,
                'unidad_medida' => 'HUR',
                'tipo_afectacion_igv' => '10',
                'activo' => true,
            ],
            [
                'codigo_servicio' => 'SERV-004',
                'nombre' => 'Configuración de Red',
                'descripcion' => 'Configuración de redes LAN/WLAN',
                'precio' => 200.00,
                'mostrar_igv' => true,
                'unidad_medida' => 'ZZ',
                'tipo_afectacion_igv' => '10',
                'activo' => true,
            ],
            [
                'codigo_servicio' => 'SERV-005',
                'nombre' => 'Desarrollo Web',
                'descripcion' => 'Desarrollo de sitios web personalizados',
                'precio' => 1500.00,
                'mostrar_igv' => true,
                'unidad_medida' => 'ZZ',
                'tipo_afectacion_igv' => '10',
                'activo' => true,
            ],
        ];

        foreach ($servicios as $servicio) {
            Servicio::create($servicio);
        }
    }
}
