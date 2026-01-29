<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UbigeoIneiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $path = database_path('seeders/data/ubigeo_inei.csv');
        $file = fopen($path, 'r');

        // Saltar encabezado
        fgetcsv($file);

        while (($data = fgetcsv($file, 1000, ',')) !== false) {
            DB::table('ubigeo_inei')->insert([
                'id_ubigeo'    => $data[0],
                'departamento' => $data[1],
                'provincia'    => $data[2],
                'distrito'     => $data[3],
                'nombre'       => $data[4],
            ]);
        }

        fclose($file);
    }
}
