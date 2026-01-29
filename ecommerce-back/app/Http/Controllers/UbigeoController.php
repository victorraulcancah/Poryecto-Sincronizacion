<?php

namespace App\Http\Controllers;

use App\Models\UbigeoInei;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UbigeoController extends Controller
{
    // Busca esta función y reemplázala completamente:
    public function getDepartamentos()
    {
        try {
            $departamentos = UbigeoInei::where('provincia', '00')
                ->where('distrito', '00')
                ->select('departamento as id', 'nombre', 'id_ubigeo') // ← AGREGADO id_ubigeo
                ->orderBy('nombre')
                ->get();
                        
            return response()->json($departamentos);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al cargar departamentos'], 500);
        }
    }

    // Busca esta función y reemplázala completamente:
    public function getProvincias($departamentoId)
    {
        try {
            $provincias = UbigeoInei::where('departamento', $departamentoId)
                ->where('distrito', '00')
                ->where('provincia', '!=', '00')
                ->select('provincia as id', 'nombre', 'id_ubigeo') // ← AGREGADO id_ubigeo
                ->orderBy('nombre')
                ->get();
                        
            return response()->json($provincias);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al cargar provincias'], 500);
        }
    }

    public function getDistritos($departamentoId, $provinciaId): JsonResponse
    {
        try {
            $distritos = UbigeoInei::where('departamento', $departamentoId)
                                   ->where('provincia', $provinciaId)
                                   ->where('distrito', '!=', '00') // Excluir el registro padre de la provincia
                                   ->select('distrito as id', 'nombre', 'id_ubigeo') // Seleccionar campos específicos
                                   ->orderBy('nombre')
                                   ->get();

            return response()->json($distritos);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener distritos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener la cadena completa de ubigeo basada en un ID específico
     */
    public function getUbigeoChain($ubigeoId): JsonResponse
    {
        try {
            $ubigeo = UbigeoInei::where('id_ubigeo', $ubigeoId)->first();
            
            if (!$ubigeo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ubigeo no encontrado'
                ], 404);
            }

            // Obtener departamento correctamente
            $departamento = UbigeoInei::where('departamento', $ubigeo->departamento)
                ->where('provincia', '00')
                ->where('distrito', '00')
                ->first();
            
            // Obtener provincia correctamente  
            $provincia = UbigeoInei::where('departamento', $ubigeo->departamento)
                ->where('provincia', $ubigeo->provincia)
                ->where('distrito', '00')
                ->first();

            $chain = [
                'ubigeo_id' => $ubigeo->id_ubigeo,
                'departamento' => [
                    'id' => $ubigeo->departamento,
                    'nombre' => $departamento ? $departamento->nombre : 'N/A'
                ],
                'provincia' => [
                    'id' => $ubigeo->provincia,
                    'nombre' => $provincia ? $provincia->nombre : 'N/A'
                ],
                'distrito' => [
                    'id' => $ubigeo->distrito,
                    'nombre' => $ubigeo->nombre
                ]
            ];

            return response()->json([
                'status' => 'success',
                'data' => $chain
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener cadena de ubigeo: ' . $e->getMessage()
            ], 500);
        }
    }
}
