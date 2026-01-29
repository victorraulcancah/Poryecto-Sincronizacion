<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Models\SerieComprobante;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SerieController extends Controller
{
    /**
     * Listar series de comprobantes
     */
    public function index(Request $request): JsonResponse
    {
        $query = SerieComprobante::query();

        // Filtrar por estado si se proporciona
        if ($request->filled('estado')) {
            $estado = $request->estado === 'activo' ? true : false;
            $query->where('activo', $estado);
        } else {
            // Por defecto, solo series activas
            $query->where('activo', true);
        }

        // Filtrar por tipo de comprobante si se proporciona
        if ($request->filled('tipo_comprobante')) {
            $query->where('tipo_comprobante', $request->tipo_comprobante);
        }

        // Filtrar por sede si se proporciona
        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }

        $series = $query->select('id', 'tipo_comprobante', 'serie', 'correlativo', 'activo', 'sede_id', 'caja_id', 'descripcion')
            ->orderBy('tipo_comprobante')
            ->orderBy('serie')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $series
        ]);
    }

    /**
     * Crear nueva serie
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_comprobante' => 'required|string|max:2',
            'serie' => 'required|string|max:10',
            'correlativo' => 'required|integer|min:1',
            'sede_id' => 'nullable|exists:sedes,id',
            'caja_id' => 'nullable|exists:cajas,id',
            'descripcion' => 'nullable|string|max:255',
            'activo' => 'boolean'
        ]);

        // Verificar que no exista la misma serie para el mismo tipo
        $existe = SerieComprobante::where('tipo_comprobante', $request->tipo_comprobante)
            ->where('serie', $request->serie)
            ->exists();

        if ($existe) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una serie con el mismo tipo y número de serie'
            ], 422);
        }

        $serie = SerieComprobante::create([
            'tipo_comprobante' => $request->tipo_comprobante,
            'serie' => $request->serie,
            'correlativo' => $request->correlativo,
            'sede_id' => $request->sede_id,
            'caja_id' => $request->caja_id,
            'descripcion' => $request->descripcion,
            'activo' => $request->activo ?? true
        ]);

        return response()->json([
            'success' => true,
            'data' => $serie,
            'message' => 'Serie creada exitosamente'
        ], 201);
    }

    /**
     * Actualizar serie
     */
    public function update(Request $request, $id): JsonResponse
    {
        $serie = SerieComprobante::findOrFail($id);

        $request->validate([
            'tipo_comprobante' => 'sometimes|string|max:2',
            'serie' => 'sometimes|string|max:10',
            'correlativo' => 'sometimes|integer|min:1',
            'sede_id' => 'nullable|exists:sedes,id',
            'caja_id' => 'nullable|exists:cajas,id',
            'descripcion' => 'nullable|string|max:255',
            'activo' => 'boolean'
        ]);

        // Verificar que no exista la misma serie para el mismo tipo (excluyendo la actual)
        if ($request->filled('tipo_comprobante') || $request->filled('serie')) {
            $tipo = $request->tipo_comprobante ?? $serie->tipo_comprobante;
            $serieNum = $request->serie ?? $serie->serie;

            $existe = SerieComprobante::where('tipo_comprobante', $tipo)
                ->where('serie', $serieNum)
                ->where('id', '!=', $id)
                ->exists();

            if ($existe) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya existe otra serie con el mismo tipo y número de serie'
                ], 422);
            }
        }

        $serie->update($request->only([
            'tipo_comprobante', 'serie', 'correlativo', 'sede_id', 
            'caja_id', 'descripcion', 'activo'
        ]));

        return response()->json([
            'success' => true,
            'data' => $serie,
            'message' => 'Serie actualizada exitosamente'
        ]);
    }

    /**
     * Reservar correlativo para una serie
     */
    public function reservarCorrelativo(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_comprobante' => 'required|string|max:2',
            'serie' => 'required|string|max:10',
            'cantidad' => 'integer|min:1|max:100'
        ]);

        $serie = SerieComprobante::where('tipo_comprobante', $request->tipo_comprobante)
            ->where('serie', $request->serie)
            ->where('activo', true)
            ->first();

        if (!$serie) {
            return response()->json([
                'success' => false,
                'message' => 'Serie no encontrada o inactiva'
            ], 404);
        }

        $cantidad = $request->cantidad ?? 1;
        $correlativoInicial = $serie->correlativo;
        $correlativoFinal = $correlativoInicial + $cantidad - 1;

        // Actualizar el correlativo
        $serie->increment('correlativo', $cantidad);

        return response()->json([
            'success' => true,
            'data' => [
                'serie' => $serie->serie,
                'correlativo_inicial' => $correlativoInicial,
                'correlativo_final' => $correlativoFinal,
                'cantidad' => $cantidad,
                'numero_completo_inicial' => $serie->tipo_comprobante . '-' . str_pad($correlativoInicial, 8, '0', STR_PAD_LEFT),
                'numero_completo_final' => $serie->tipo_comprobante . '-' . str_pad($correlativoFinal, 8, '0', STR_PAD_LEFT)
            ],
            'message' => 'Correlativos reservados exitosamente'
        ]);
    }

    /**
     * Obtener estadísticas de series
     */
    public function estadisticas(): JsonResponse
    {
        $estadisticas = [
            'total_series' => SerieComprobante::count(),
            'series_activas' => SerieComprobante::where('activo', true)->count(),
            'series_inactivas' => SerieComprobante::where('activo', false)->count(),
            'series_por_tipo' => SerieComprobante::selectRaw('tipo_comprobante, COUNT(*) as total')
                ->groupBy('tipo_comprobante')
                ->get()
                ->pluck('total', 'tipo_comprobante'),
            'correlativos_por_serie' => SerieComprobante::select('tipo_comprobante', 'serie', 'correlativo')
                ->where('activo', true)
                ->orderBy('tipo_comprobante')
                ->orderBy('serie')
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => $estadisticas
        ]);
    }
}
