<?php

namespace Database\Seeders;

use App\Models\CookieConfiguracion;
use Illuminate\Database\Seeder;

class CookieConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        CookieConfiguracion::create([
            'activo' => true,
            'mensaje' => 'Utilizamos cookies propias y de terceros para mejorar tu experiencia de navegación, analizar el tráfico del sitio y personalizar el contenido. Al hacer clic en "Aceptar", aceptas el uso de todas las cookies.',
            'boton_aceptar_texto' => 'Aceptar',
            'boton_rechazar_texto' => 'Rechazar',
            'boton_configurar_texto' => 'Configurar',
            'link_politica_texto' => 'Política de Cookies',
            'link_politica_url' => '/politica-cookies',
            'mostrar_boton_rechazar' => true,
            'mostrar_boton_configurar' => true,
            'posicion' => 'bottom',
        ]);
    }
}
