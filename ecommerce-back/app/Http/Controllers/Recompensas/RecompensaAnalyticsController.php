<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaHistorial;
use App\Models\UserCliente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class RecompensaAnalyticsController extends Controller
{
    /**
     * Dashboard principal de analytics
     */
    public function dashboard(Request $request): JsonResponse
    {
        try {
            $cacheKey = 'recompensas_dashboard_' . now()->format('Y-m-d-H');
            
            $dashboard = Cache::remember($cacheKey, 3600, function () {
                return [
                    'resumen_ejecutivo' => $this->getResumenEjecutivo(),
                    'metricas_principales' => $this->getMetricasPrincipales(),
                    'tendencias_mensuales' => $this->getTendenciasMensuales(),
                    'top_recompensas' => $this->getTopRecompensas(),
                    'segmentacion_uso' => $this->getSegmentacionUso(),
                    'conversion_rates' => $this->getConversionRates()
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Dashboard de analytics obtenido exitosamente',
                'data' => $dashboard,
                'metadata' => [
                    'generado_en' => now()->toISOString(),
                    'cache_hasta' => now()->addHour()->toISOString(),
                    'periodo_analisis' => 'Últimos 12 meses'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el dashboard de analytics',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Resumen ejecutivo de recompensas
     */
    public function resumenEjecutivo(Request $request): JsonResponse
    {
        try {
            $cacheKey = 'recompensas_resumen_ejecutivo_' . now()->format('Y-m-d-H');
            
            $resumen = Cache::remember($cacheKey, 3600, function () { // Cache por 1 hora
                return [
                    'metricas_principales' => $this->getMetricasPrincipales(),
                    'top_recompensas' => $this->getTopRecompensas(),
                    'segmentacion_uso' => $this->getSegmentacionUso(),
                    'conversion_rates' => $this->getConversionRates(),
                    'tendencias' => $this->calcularTendencias('mensual', now()->subMonths(6)->format('Y-m-d'), now()->format('Y-m-d'))
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Resumen ejecutivo obtenido exitosamente',
                'data' => $resumen
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el resumen ejecutivo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tendencias detalladas por período
     */
    public function tendencias(Request $request): JsonResponse
    {
        try {
            $periodo = $request->get('periodo', 'mensual'); // diario, mensual, anual
            $fechaInicio = $request->get('fecha_inicio', now()->subMonths(6)->format('Y-m-d'));
            $fechaFin = $request->get('fecha_fin', now()->format('Y-m-d'));

            $tendencias = $this->calcularTendencias($periodo, $fechaInicio, $fechaFin);

            return response()->json([
                'success' => true,
                'message' => 'Tendencias obtenidas exitosamente',
                'data' => [
                    'periodo' => $periodo,
                    'rango_fechas' => [
                        'inicio' => $fechaInicio,
                        'fin' => $fechaFin
                    ],
                    'tendencias' => $tendencias,
                    'resumen' => $this->getResumenTendencias($tendencias)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las tendencias',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Métricas de rendimiento por recompensa
     */
    public function rendimiento(Request $request): JsonResponse
    {
        try {
            $recompensaId = $request->get('recompensa_id');
            $periodo = $request->get('periodo', 30); // días

            if ($recompensaId) {
                $rendimiento = $this->getRendimientoRecompensa($recompensaId, $periodo);
            } else {
                $rendimiento = $this->getRendimientoGeneral($periodo);
            }

            return response()->json([
                'success' => true,
                'message' => 'Métricas de rendimiento obtenidas exitosamente',
                'data' => $rendimiento
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las métricas de rendimiento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Comparativa entre períodos
     */
    public function comparativa(Request $request): JsonResponse
    {
        try {
            $periodoActual = [
                'inicio' => $request->get('periodo_actual_inicio', now()->subDays(30)->format('Y-m-d')),
                'fin' => $request->get('periodo_actual_fin', now()->format('Y-m-d'))
            ];

            $periodoAnterior = [
                'inicio' => $request->get('periodo_anterior_inicio', now()->subDays(60)->format('Y-m-d')),
                'fin' => $request->get('periodo_anterior_fin', now()->subDays(30)->format('Y-m-d'))
            ];

            $comparativa = $this->compararPeriodos($periodoActual, $periodoAnterior);

            return response()->json([
                'success' => true,
                'message' => 'Comparativa de períodos obtenida exitosamente',
                'data' => $comparativa
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la comparativa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Análisis de comportamiento de clientes
     */
    public function comportamientoClientes(Request $request): JsonResponse
    {
        try {
            $cacheKey = 'recompensas_comportamiento_clientes_' . now()->format('Y-m-d-H');
            
            $analisis = Cache::remember($cacheKey, 1800, function () { // Cache por 30 minutos
                return [
                    'segmentacion_participacion' => $this->getParticipacionPorSegmento(),
                    'frecuencia_uso' => $this->getFrecuenciaUso(),
                    'patrones_temporales' => $this->getPatronesTemporales(),
                    'fidelizacion' => $this->getMetricasFidelizacion(),
                    'valor_cliente' => $this->getValorCliente()
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Análisis de comportamiento obtenido exitosamente',
                'data' => $analisis
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el análisis de comportamiento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ========================
    // MÉTODOS PRIVADOS
    // ========================

    private function getResumenEjecutivo(): array
    {
        $mesActual = now()->format('Y-m');
        $mesAnterior = now()->subMonth()->format('Y-m');

        $metricas = DB::table('recompensas_historial')
            ->selectRaw('
                DATE_FORMAT(fecha_aplicacion, "%Y-%m") as mes,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes_unicos,
                SUM(puntos_otorgados) as puntos_totales
            ')
            ->whereIn(DB::raw('DATE_FORMAT(fecha_aplicacion, "%Y-%m")'), [$mesActual, $mesAnterior])
            ->groupBy('mes')
            ->get()
            ->keyBy('mes');

        $actual = $metricas->get($mesActual, (object)['aplicaciones' => 0, 'clientes_unicos' => 0, 'puntos_totales' => 0]);
        $anterior = $metricas->get($mesAnterior, (object)['aplicaciones' => 0, 'clientes_unicos' => 0, 'puntos_totales' => 0]);

        return [
            'aplicaciones_mes' => (int) $actual->aplicaciones,
            'clientes_activos_mes' => (int) $actual->clientes_unicos,
            'puntos_otorgados_mes' => (int) $actual->puntos_totales,
            'crecimiento' => [
                'aplicaciones' => $this->calcularCrecimiento($anterior->aplicaciones, $actual->aplicaciones),
                'clientes' => $this->calcularCrecimiento($anterior->clientes_unicos, $actual->clientes_unicos),
                'puntos' => $this->calcularCrecimiento($anterior->puntos_totales, $actual->puntos_totales)
            ],
            'participacion_clientes' => $this->calcularParticipacionClientes()
        ];
    }

    private function getMetricasPrincipales(): array
    {
        return [
            'recompensas_totales' => Recompensa::count(),
            'recompensas_activas' => Recompensa::activas()->count(),
            'recompensas_vigentes' => Recompensa::activas()->vigentes()->count(),
            'utilizacion_promedio' => $this->calcularUtilizacionPromedio(),
            'efectividad_general' => $this->calcularEfectividadGeneral(),
            'roi_estimado' => $this->calcularROIEstimado()
        ];
    }

    private function getTendenciasMensuales(): array
    {
        $inicio = now()->subMonths(11)->startOfMonth();
        $fin = now()->endOfMonth();

        return DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw('
                DATE_FORMAT(rh.fecha_aplicacion, "%Y-%m") as mes,
                r.tipo,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                SUM(rh.puntos_otorgados) as puntos_otorgados
            ')
            ->whereBetween('rh.fecha_aplicacion', [$inicio, $fin])
            ->groupBy('mes', 'r.tipo')
            ->orderBy('mes')
            ->get()
            ->groupBy('mes')
            ->map(function($grupo) {
                return [
                    'total_aplicaciones' => $grupo->sum('aplicaciones'),
                    'total_clientes' => $grupo->sum('clientes_unicos'),
                    'total_puntos' => $grupo->sum('puntos_otorgados'),
                    'por_tipo' => $grupo->keyBy('tipo')->toArray()
                ];
            })
            ->toArray();
    }

    private function getTopRecompensas(): array
    {
        $inicio = now()->subDays(30);

        return DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw('
                r.id,
                r.nombre,
                r.tipo,
                COUNT(*) as total_aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                SUM(rh.puntos_otorgados) as puntos_otorgados,
                AVG(rh.puntos_otorgados) as promedio_puntos
            ')
            ->where('rh.fecha_aplicacion', '>=', $inicio)
            ->groupBy('r.id', 'r.nombre', 'r.tipo')
            ->orderByDesc('total_aplicaciones')
            ->limit(10)
            ->get()
            ->toArray();
    }

    private function getSegmentacionUso(): array
    {
        return DB::table('recompensas_historial as rh')
            ->join('user_clientes as uc', 'rh.cliente_id', '=', 'uc.id')
            ->selectRaw('
                CASE 
                    WHEN DATEDIFF(NOW(), uc.created_at) < 30 THEN "nuevos"
                    WHEN DATEDIFF(NOW(), uc.created_at) < 365 THEN "regulares"
                    ELSE "veteranos"
                END as segmento,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                SUM(rh.puntos_otorgados) as puntos_totales
            ')
            ->where('rh.fecha_aplicacion', '>=', now()->subDays(30))
            ->groupBy('segmento')
            ->get()
            ->toArray();
    }

    private function getConversionRates(): array
    {
        $clientesTotal = UserCliente::where('estado', true)->count();
        $clientesConRecompensas = DB::table('recompensas_historial')
            ->distinct('cliente_id')
            ->count();

        return [
            'tasa_adopcion' => $clientesTotal > 0 ? round(($clientesConRecompensas / $clientesTotal) * 100, 2) : 0,
            'clientes_activos' => $clientesConRecompensas,
            'clientes_totales' => $clientesTotal,
            'conversiones_por_tipo' => $this->getConversionesPorTipo()
        ];
    }

    private function calcularTendencias($periodo, $fechaInicio, $fechaFin): array
    {
        $formatoFecha = match($periodo) {
            'diario' => '%Y-%m-%d',
            'mensual' => '%Y-%m',
            'anual' => '%Y',
            default => '%Y-%m'
        };

        return DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw("
                DATE_FORMAT(rh.fecha_aplicacion, '{$formatoFecha}') as periodo,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                SUM(rh.puntos_otorgados) as puntos_otorgados,
                r.tipo
            ")
            ->whereBetween('rh.fecha_aplicacion', [$fechaInicio, $fechaFin])
            ->groupBy('periodo', 'r.tipo')
            ->orderBy('periodo')
            ->get()
            ->groupBy('periodo')
            ->toArray();
    }

    private function calcularCrecimiento($anterior, $actual): array
    {
        if ($anterior == 0 && $actual == 0) {
            return ['porcentaje' => 0, 'direccion' => 'estable', 'diferencia' => 0];
        }

        if ($anterior == 0) {
            return ['porcentaje' => 100, 'direccion' => 'subida', 'diferencia' => $actual];
        }

        $porcentaje = (($actual - $anterior) / $anterior) * 100;
        $direccion = $porcentaje > 0 ? 'subida' : ($porcentaje < 0 ? 'bajada' : 'estable');

        return [
            'porcentaje' => round(abs($porcentaje), 2),
            'direccion' => $direccion,
            'diferencia' => $actual - $anterior
        ];
    }

    private function calcularParticipacionClientes(): float
    {
        $clientesTotal = UserCliente::where('estado', true)->count();
        $clientesConRecompensas = DB::table('recompensas_historial')
            ->distinct('cliente_id')
            ->count();

        return $clientesTotal > 0 ? round(($clientesConRecompensas / $clientesTotal) * 100, 2) : 0;
    }

    private function calcularUtilizacionPromedio(): float
    {
        $recompensasActivas = Recompensa::activas()->count();
        $aplicacionesMes = DB::table('recompensas_historial')
            ->whereMonth('fecha_aplicacion', now()->month)
            ->whereYear('fecha_aplicacion', now()->year)
            ->count();

        return $recompensasActivas > 0 ? round($aplicacionesMes / $recompensasActivas, 2) : 0;
    }

    private function calcularEfectividadGeneral(): float
    {
        // Efectividad = (Clientes que usaron recompensas / Total clientes activos) * 100
        return $this->calcularParticipacionClientes();
    }

    private function calcularROIEstimado(): array
    {
        // ROI simplificado basado en engagement vs costo operativo estimado
        $aplicacionesMes = DB::table('recompensas_historial')
            ->whereMonth('fecha_aplicacion', now()->month)
            ->whereYear('fecha_aplicacion', now()->year)
            ->count();

        $puntosOtorgadosMes = DB::table('recompensas_historial')
            ->whereMonth('fecha_aplicacion', now()->month)
            ->whereYear('fecha_aplicacion', now()->year)
            ->sum('puntos_otorgados');

        $costoEstimado = $puntosOtorgadosMes * 0.01; // Asumiendo 1 punto = $0.01
        $beneficioEstimado = $aplicacionesMes * 5; // Asumiendo beneficio promedio por engagement

        return [
            'costo_estimado' => round($costoEstimado, 2),
            'beneficio_estimado' => round($beneficioEstimado, 2),
            'roi_porcentaje' => $costoEstimado > 0 ? round((($beneficioEstimado - $costoEstimado) / $costoEstimado) * 100, 2) : 0
        ];
    }

    private function getConversionesPorTipo(): array
    {
        return DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw('
                r.tipo,
                COUNT(DISTINCT rh.cliente_id) as clientes_convertidos
            ')
            ->groupBy('r.tipo')
            ->get()
            ->pluck('clientes_convertidos', 'tipo')
            ->toArray();
    }

    private function getResumenTendencias($tendencias): array
    {
        $totales = [
            'aplicaciones' => 0,
            'clientes' => 0,
            'puntos' => 0
        ];

        foreach ($tendencias as $periodo => $datos) {
            // Sumar todos los registros del período (por tipo de recompensa)
            $totales['aplicaciones'] += $datos->sum('aplicaciones');
            $totales['clientes'] += $datos->sum('clientes_unicos');
            $totales['puntos'] += $datos->sum('puntos_otorgados');
        }

        $periodos = count($tendencias);

        return [
            'totales' => $totales,
            'promedios' => [
                'aplicaciones_por_periodo' => $periodos > 0 ? round($totales['aplicaciones'] / $periodos, 2) : 0,
                'clientes_por_periodo' => $periodos > 0 ? round($totales['clientes'] / $periodos, 2) : 0,
                'puntos_por_periodo' => $periodos > 0 ? round($totales['puntos'] / $periodos, 2) : 0
            ]
        ];
    }

    private function getRendimientoRecompensa($recompensaId, $periodo): array
    {
        $inicio = now()->subDays($periodo);

        $resultado = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw('
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos,
                SUM(rh.puntos_otorgados) as puntos_totales,
                AVG(rh.puntos_otorgados) as promedio_puntos,
                MAX(rh.fecha_aplicacion) as ultima_aplicacion,
                MIN(rh.fecha_aplicacion) as primera_aplicacion
            ')
            ->where('rh.recompensa_id', $recompensaId)
            ->where('rh.fecha_aplicacion', '>=', $inicio)
            ->first();

        return $resultado ? (array) $resultado : [];
    }

    private function getRendimientoGeneral($periodo): array
    {
        $inicio = now()->subDays($periodo);

        $general = DB::table('recompensas_historial')
            ->selectRaw('
                COUNT(*) as aplicaciones_totales,
                COUNT(DISTINCT cliente_id) as clientes_unicos,
                COUNT(DISTINCT recompensa_id) as recompensas_utilizadas,
                SUM(puntos_otorgados) as puntos_totales
            ')
            ->where('fecha_aplicacion', '>=', $inicio)
            ->first();

        $porTipo = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->selectRaw('
                r.tipo,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes,
                SUM(rh.puntos_otorgados) as puntos
            ')
            ->where('rh.fecha_aplicacion', '>=', $inicio)
            ->groupBy('r.tipo')
            ->get();

        return [
            'resumen_general' => $general,
            'por_tipo' => $porTipo
        ];
    }

    private function compararPeriodos($periodoActual, $periodoAnterior): array
    {
        $actual = $this->getMetricasPeriodo($periodoActual['inicio'], $periodoActual['fin']);
        $anterior = $this->getMetricasPeriodo($periodoAnterior['inicio'], $periodoAnterior['fin']);

        return [
            'periodo_actual' => [
                'fechas' => $periodoActual,
                'metricas' => $actual
            ],
            'periodo_anterior' => [
                'fechas' => $periodoAnterior,
                'metricas' => $anterior
            ],
            'comparativa' => [
                'aplicaciones' => $this->calcularCrecimiento($anterior->aplicaciones, $actual->aplicaciones),
                'clientes' => $this->calcularCrecimiento($anterior->clientes_unicos, $actual->clientes_unicos),
                'puntos' => $this->calcularCrecimiento($anterior->puntos_totales, $actual->puntos_totales)
            ]
        ];
    }

    private function getMetricasPeriodo($inicio, $fin): object
    {
        return DB::table('recompensas_historial')
            ->selectRaw('
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes_unicos,
                SUM(puntos_otorgados) as puntos_totales,
                COUNT(DISTINCT recompensa_id) as recompensas_utilizadas
            ')
            ->whereBetween('fecha_aplicacion', [$inicio, $fin])
            ->first();
    }

    private function getParticipacionPorSegmento(): array
    {
        return DB::table('recompensas_historial as rh')
            ->join('user_clientes as uc', 'rh.cliente_id', '=', 'uc.id')
            ->selectRaw('
                CASE 
                    WHEN DATEDIFF(NOW(), uc.created_at) < 30 THEN "nuevos"
                    WHEN DATEDIFF(NOW(), uc.created_at) < 365 THEN "regulares"
                    ELSE "veteranos"
                END as segmento,
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_participantes
            ')
            ->where('rh.fecha_aplicacion', '>=', now()->subDays(90)) // Límite temporal
            ->groupBy('segmento')
            ->get()
            ->toArray();
    }

    private function getFrecuenciaUso(): array
    {
        return DB::table('recompensas_historial')
            ->selectRaw('
                cliente_id,
                COUNT(*) as total_usos
            ')
            ->where('fecha_aplicacion', '>=', now()->subDays(90)) // Límite temporal
            ->groupBy('cliente_id')
            ->havingRaw('COUNT(*) >= 1')
            ->limit(1000) // Límite de resultados
            ->get()
            ->groupBy(function($item) {
                if ($item->total_usos == 1) return 'ocasional';
                if ($item->total_usos <= 5) return 'regular';
                if ($item->total_usos <= 15) return 'frecuente';
                return 'muy_frecuente';
            })
            ->map(function($grupo) {
                return count($grupo);
            })
            ->toArray();
    }

    private function getPatronesTemporales(): array
    {
        $porDia = DB::table('recompensas_historial')
            ->selectRaw('
                DAYNAME(fecha_aplicacion) as dia_semana,
                COUNT(*) as aplicaciones
            ')
            ->where('fecha_aplicacion', '>=', now()->subDays(30))
            ->groupBy('dia_semana')
            ->get();

        $porHora = DB::table('recompensas_historial')
            ->selectRaw('
                HOUR(fecha_aplicacion) as hora,
                COUNT(*) as aplicaciones
            ')
            ->where('fecha_aplicacion', '>=', now()->subDays(7))
            ->groupBy('hora')
            ->get();

        return [
            'por_dia_semana' => $porDia,
            'por_hora_dia' => $porHora
        ];
    }

    private function getMetricasFidelizacion(): array
    {
        $fechaLimite = now()->subDays(90);
        
        $retencion = DB::table('recompensas_historial as rh1')
            ->join('recompensas_historial as rh2', 'rh1.cliente_id', '=', 'rh2.cliente_id')
            ->selectRaw('
                COUNT(DISTINCT rh1.cliente_id) as clientes_con_recompras
            ')
            ->where('rh1.fecha_aplicacion', '>=', $fechaLimite)
            ->where('rh2.fecha_aplicacion', '>=', $fechaLimite)
            ->where('rh1.fecha_aplicacion', '<', 'rh2.fecha_aplicacion')
            ->whereRaw('DATEDIFF(rh2.fecha_aplicacion, rh1.fecha_aplicacion) <= 30')
            ->first();

        $totalClientes = DB::table('recompensas_historial')
            ->where('fecha_aplicacion', '>=', $fechaLimite)
            ->distinct('cliente_id')
            ->count();

        return [
            'tasa_retencion' => $totalClientes > 0 ? round(($retencion->clientes_con_recompras / $totalClientes) * 100, 2) : 0,
            'clientes_fidelizados' => $retencion->clientes_con_recompras,
            'total_clientes' => $totalClientes
        ];
    }

    private function getValorCliente(): array
    {
        $resultado = DB::table('recompensas_historial')
            ->selectRaw('
                AVG(puntos_otorgados) as valor_promedio_por_aplicacion,
                MAX(puntos_otorgados) as valor_maximo,
                MIN(puntos_otorgados) as valor_minimo,
                STDDEV(puntos_otorgados) as desviacion_estandar
            ')
            ->where('fecha_aplicacion', '>=', now()->subDays(90)) // Límite temporal
            ->first();

        return $resultado ? (array) $resultado : [];
    }
}
