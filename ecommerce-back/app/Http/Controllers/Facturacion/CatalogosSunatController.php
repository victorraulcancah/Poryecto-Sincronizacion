<?php

namespace App\Http\Controllers\Facturacion;

use App\Models\CatalogoSunat;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class CatalogosSunatController extends BaseController
{
    /**
     * Listar todos los catálogos disponibles
     */
    public function catalogos(): JsonResponse
    {
        $catalogos = CatalogoSunat::select('catalogo')
            ->distinct()
            ->where('activo', true)
            ->orderBy('catalogo')
            ->pluck('catalogo');

        return response()->json([
            'success' => true,
            'data' => $catalogos
        ]);
    }

    /**
     * Obtener items de un catálogo específico
     */
    public function index(Request $request, $catalogo): JsonResponse
    {
        $query = CatalogoSunat::where('catalogo', $catalogo)
            ->where('activo', true);

        // Filtrar por descripción si se proporciona
        if ($request->filled('buscar')) {
            $query->where(function($q) use ($request) {
                $q->where('descripcion', 'LIKE', '%' . $request->buscar . '%')
                  ->orWhere('codigo', 'LIKE', '%' . $request->buscar . '%');
            });
        }

        $items = $query->select('codigo', 'descripcion', 'descripcion_corta', 'metadatos')
            ->orderBy('codigo')
            ->get();

        return response()->json([
            'success' => true,
            'catalogo' => $catalogo,
            'data' => $items
        ]);
    }

    /**
     * Obtener un item específico de un catálogo
     */
    public function show($catalogo, $codigo): JsonResponse
    {
        $item = CatalogoSunat::where('catalogo', $catalogo)
            ->where('codigo', $codigo)
            ->where('activo', true)
            ->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item no encontrado en el catálogo'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'catalogo' => $catalogo,
            'data' => $item
        ]);
    }

    /**
     * Obtener catálogos específicos más utilizados
     */
    public function catalogosPrincipales(): JsonResponse
    {
        $catalogos = [
            'tipo-documento-identidad' => $this->getCatalogo('tipo_documento_identidad'),
            'tipo-afectacion-igv' => $this->getCatalogo('tipo_afectacion_igv'),
            'unidad-medida' => $this->getCatalogo('unidad_medida'),
            'motivo-nota-credito' => $this->getCatalogo('motivo_nota_credito'),
            'motivo-nota-debito' => $this->getCatalogo('motivo_nota_debito'),
            'tipo-comprobante' => $this->getCatalogo('tipo_comprobante'),
            'monedas' => $this->getCatalogo('monedas'),
            'tipo-operacion' => $this->getCatalogo('tipo_operacion')
        ];

        return response()->json([
            'success' => true,
            'data' => $catalogos
        ]);
    }

    /**
     * Buscar en todos los catálogos
     */
    public function buscar(Request $request): JsonResponse
    {
        $request->validate([
            'termino' => 'required|string|min:2|max:100',
            'catalogos' => 'nullable|array',
            'catalogos.*' => 'string'
        ]);

        $query = CatalogoSunat::where('activo', true);

        // Filtrar por catálogos específicos si se proporcionan
        if ($request->filled('catalogos')) {
            $query->whereIn('catalogo', $request->catalogos);
        }

        // Buscar en descripción y código
        $query->where(function($q) use ($request) {
            $q->where('descripcion', 'LIKE', '%' . $request->termino . '%')
              ->orWhere('codigo', 'LIKE', '%' . $request->termino . '%')
              ->orWhere('descripcion_corta', 'LIKE', '%' . $request->termino . '%');
        });

        $resultados = $query->select('catalogo', 'codigo', 'descripcion', 'descripcion_corta')
            ->orderBy('catalogo')
            ->orderBy('codigo')
            ->get()
            ->groupBy('catalogo');

        return response()->json([
            'success' => true,
            'termino' => $request->termino,
            'data' => $resultados
        ]);
    }

    /**
     * Obtener estadísticas de catálogos
     */
    public function estadisticas(): JsonResponse
    {
        $estadisticas = [
            'total_catalogos' => CatalogoSunat::select('catalogo')->distinct()->count(),
            'total_items' => CatalogoSunat::where('activo', true)->count(),
            'items_por_catalogo' => CatalogoSunat::selectRaw('catalogo, COUNT(*) as total')
                ->where('activo', true)
                ->groupBy('catalogo')
                ->orderBy('total', 'desc')
                ->get()
                ->pluck('total', 'catalogo'),
            'catalogos_mas_utilizados' => [
                'tipo_documento_identidad',
                'tipo_afectacion_igv',
                'unidad_medida',
                'tipo_comprobante',
                'monedas'
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $estadisticas
        ]);
    }

    /**
     * Método auxiliar para obtener un catálogo específico
     */
    private function getCatalogo($catalogo)
    {
        return CatalogoSunat::where('catalogo', $catalogo)
            ->where('activo', true)
            ->select('codigo', 'descripcion', 'descripcion_corta')
            ->orderBy('codigo')
            ->get();
    }
}


