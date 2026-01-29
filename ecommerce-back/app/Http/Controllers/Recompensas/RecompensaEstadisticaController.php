<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use App\Services\RecompensaEstadisticaService;

class RecompensaEstadisticaController extends Controller
{
    protected $estadisticaService;

    public function __construct(RecompensaEstadisticaService $estadisticaService)
    {
        $this->estadisticaService = $estadisticaService;
    }

    /**
     * GET /api/admin/recompensas/estadisticas
     * Obtiene estadísticas completas del sistema de recompensas
     */
    public function estadisticas(): JsonResponse
    {
        try {
            // Cache por 2 horas
            $cacheKey = 'recompensas_estadisticas_' . now()->format('Y-m-d-H');
            
            $estadisticas = Cache::remember($cacheKey, 7200, function () {
                return $this->estadisticaService->obtenerEstadisticasCompletas();
            });

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/admin/recompensas/tipos
     * Obtiene tipos de recompensas disponibles con configuración
     */
    public function tipos(): JsonResponse
    {
        try {
            // Cache por 24 horas (tipos son estáticos)
            $cacheKey = 'recompensas_tipos_disponibles';
            
            $tipos = Cache::remember($cacheKey, 86400, function () {
                return $this->estadisticaService->obtenerTiposDisponibles();
            });

            return response()->json([
                'success' => true,
                'message' => 'Tipos de recompensas obtenidos exitosamente',
                'data' => $tipos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener tipos de recompensas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}
