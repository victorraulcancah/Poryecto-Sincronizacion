<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SunatErrorCode;
use App\Services\GreenterService;

class SunatErrorController extends Controller
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Obtener todos los códigos de error activos
     */
    public function index()
    {
        try {
            $errores = SunatErrorCode::obtenerActivos();
            
            return response()->json([
                'success' => true,
                'data' => $errores,
                'total' => $errores->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener códigos de error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener error por código específico
     */
    public function show($codigo)
    {
        try {
            $error = SunatErrorCode::buscarPorCodigo($codigo);
            
            if (!$error) {
                return response()->json([
                    'success' => false,
                    'message' => 'Código de error no encontrado'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $error
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener código de error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener errores por categoría
     */
    public function porCategoria($categoria)
    {
        try {
            $errores = SunatErrorCode::obtenerPorCategoria($categoria);
            
            return response()->json([
                'success' => true,
                'data' => $errores,
                'categoria' => $categoria,
                'total' => $errores->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener errores por categoría',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener categorías disponibles
     */
    public function categorias()
    {
        try {
            $categorias = SunatErrorCode::select('categoria')
                ->distinct()
                ->where('activo', true)
                ->orderBy('categoria')
                ->pluck('categoria');
            
            return response()->json([
                'success' => true,
                'data' => $categorias
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categorías',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar errores por texto
     */
    public function buscar(Request $request)
    {
        try {
            $query = $request->get('q', '');
            $categoria = $request->get('categoria');
            
            $errores = SunatErrorCode::where('activo', true);
            
            if ($query) {
                $errores->where(function($q) use ($query) {
                    $q->where('codigo', 'like', "%{$query}%")
                      ->orWhere('descripcion', 'like', "%{$query}%")
                      ->orWhere('solucion_sugerida', 'like', "%{$query}%");
                });
            }
            
            if ($categoria) {
                $errores->where('categoria', $categoria);
            }
            
            $resultados = $errores->orderBy('codigo')->get();
            
            return response()->json([
                'success' => true,
                'data' => $resultados,
                'query' => $query,
                'categoria' => $categoria,
                'total' => $resultados->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar códigos de error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parsear código de error desde mensaje SUNAT
     */
    public function parsear(Request $request)
    {
        try {
            $mensaje = $request->get('mensaje', '');
            
            if (empty($mensaje)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El mensaje es requerido'
                ], 400);
            }
            
            $codigo = SunatErrorCode::parsearCodigoError($mensaje);
            
            if (!$codigo) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró código de error en el mensaje',
                    'mensaje' => $mensaje
                ]);
            }
            
            $informacion = SunatErrorCode::obtenerInformacionError($codigo);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'codigo_extraido' => $codigo,
                    'informacion' => $informacion,
                    'mensaje_original' => $mensaje
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al parsear código de error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de errores
     */
    public function estadisticas()
    {
        try {
            $estadisticas = [
                'total_errores' => SunatErrorCode::where('activo', true)->count(),
                'por_categoria' => SunatErrorCode::selectRaw('categoria, COUNT(*) as total')
                    ->where('activo', true)
                    ->groupBy('categoria')
                    ->orderBy('total', 'desc')
                    ->get(),
                'por_tipo' => SunatErrorCode::selectRaw('tipo, COUNT(*) as total')
                    ->where('activo', true)
                    ->groupBy('tipo')
                    ->orderBy('total', 'desc')
                    ->get()
            ];
            
            return response()->json([
                'success' => true,
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
}
