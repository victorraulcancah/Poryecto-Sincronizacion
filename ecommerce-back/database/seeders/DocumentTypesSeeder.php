<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DocumentTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $documentTypes = [
            ['nombre' => 'DNI'],
            ['nombre' => 'Pasaporte'],
            ['nombre' => 'Carnet de Extranjería'],
            ['nombre' => 'Cédula'],
        ];

        foreach ($documentTypes as $docType) {
            DB::table('document_types')->insert([
                'nombre' => $docType['nombre'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
