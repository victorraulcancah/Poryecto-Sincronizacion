<?php

namespace Database\Seeders;

use App\Models\EmpresaValor;
use Illuminate\Database\Seeder;

class EmpresaValoresSeeder extends Seeder
{
    public function run(): void
    {
        $valores = [
            [
                'titulo' => 'Nuestra actitud',
                'descripcion' => '¡Nos gusta el sonido a todo volumen! Somos decididos y seguros de nosotros mismos, impulsados por la acción, con el deseo de construir juntos un estilo de vida mejor. Vemos el mundo del sonido y la cultura que ha generado como una oportunidad para el crecimiento y la unión.',
                'orden' => 0,
                'activo' => true,
            ],
            [
                'titulo' => 'Valor',
                'descripcion' => 'Nuestro valor fundamental es la pasión. La pasión que nuestros empleados ponen en su trabajo permite que muchos de nuestros otros valores, como el respeto, el trabajo en equipo y el orgullo, se manifiesten plenamente.',
                'orden' => 1,
                'activo' => true,
            ],
            [
                'titulo' => 'Objetivo',
                'descripcion' => 'Utiliza el sonido para mejorar el estilo de vida de las personas en todo el mundo e inspirarlas a unirse a nuestra búsqueda de alta fidelidad.',
                'orden' => 2,
                'activo' => true,
            ],
            [
                'titulo' => 'Misión',
                'descripcion' => 'Nuestro objetivo es fabricar productos de sonido de la más alta calidad para todo tipo de vehículos y superar los límites de la alta fidelidad. Trabajamos a diario para revolucionar el desarrollo de equipos de sonido y ofrecer una línea de productos sofisticada y moderna que marca la pauta en la industria.',
                'orden' => 3,
                'activo' => true,
            ],
            [
                'titulo' => 'Visión',
                'descripcion' => 'Nuestro objetivo es llegar a todos los rincones del mundo y ser reconocidos como una potencia en el sector, ofreciendo productos de alta calidad a todos nuestros clientes.',
                'orden' => 4,
                'activo' => true,
            ],
        ];

        foreach ($valores as $valor) {
            EmpresaValor::create($valor);
        }
    }
}
