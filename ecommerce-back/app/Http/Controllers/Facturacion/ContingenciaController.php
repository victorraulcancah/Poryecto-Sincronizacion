<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Services\ContingenciaService;
use Illuminate\Http\Request;

class ContingenciaController extends Controller
{
    protected $contingenciaService;

    public function __construct(ContingenciaService $contingenciaService)
    {
        $this->contingenciaService = $contingenciaService;
    }

    /**
     * Obtener información del modo contingencia
     */
    public function info()
    {
        try {
            $info = $this->contingenciaService->obtenerInfoContingencia();

            return response()->json([
                'success' => true,
                'data' => $info
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activar modo contingencia
     */
    public function activar(Request $request)
    {
        try {
            $request->validate([
                'motivo' => 'required|string|max:255'
            ]);

            $resultado = $this->contingenciaService->activarModoContingencia($request->motivo);

            if ($resultado['success']) {
                return response()->json($resultado);
            } else {
                return response()->json($resultado, 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Desactivar modo contingencia
     */
    public function desactivar()
    {
        try {
            $resultado = $this->contingenciaService->desactivarModoContingencia();

            if ($resultado['success']) {
                return response()->json($resultado);
            } else {
                return response()->json($resultado, 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Regularizar comprobantes emitidos en contingencia
     */
    public function regularizar(Request $request)
    {
        try {
            $limite = $request->input('limite', 50);

            $resultado = $this->contingenciaService->regularizarComprobantesContingencia($limite);

            return response()->json($resultado);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de contingencia
     */
    public function estadisticas()
    {
        try {
            $estadisticas = $this->contingenciaService->obtenerEstadisticas();

            return response()->json([
                'success' => true,
                'data' => $estadisticas
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar y actualizar estado automáticamente
     */
    public function verificar()
    {
        try {
            $resultado = $this->contingenciaService->verificarYActualizarModoContingencia();

            return response()->json($resultado);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
