<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RecompensaEstadisticaService
{
    /**
     * Obtiene estadísticas completas del sistema de recompensas
     */
    public function obtenerEstadisticasCompletas(): array
    {
        return [
            'resumen' => $this->obtenerResumenGeneral(),
            'por_tipo' => $this->obtenerEstadisticasPorTipo(),
            'mes_actual' => $this->obtenerMetricasDelMes(),
            'comparativa_mes_anterior' => $this->obtenerComparativaMesAnterior(),
            'top_recompensas_mes' => $this->obtenerTopRecompensas(),
            'metadata' => [
                'generado_en' => now()->toISOString(),
                'cache_hasta' => now()->addHours(2)->toISOString(),
                'periodo_analisis' => 'Últimos 12 meses'
            ]
        ];
    }

    /**
     * Obtiene resumen general de recompensas
     */
    public function obtenerResumenGeneral(): array
    {
        $resumen = DB::table('recompensas')
            ->selectRaw('
                COUNT(*) as total_recompensas,
                COUNT(CASE WHEN estado = "activa" THEN 1 END) as recompensas_activas,
                COUNT(CASE WHEN estado = "activa" AND fecha_inicio <= NOW() AND fecha_fin >= NOW() THEN 1 END) as recompensas_vigentes
            ')
            ->first();

        $tasaActivacion = $resumen->total_recompensas > 0 
            ? round(($resumen->recompensas_activas / $resumen->total_recompensas) * 100, 2)
            : 0;

        return [
            'total_recompensas' => $resumen->total_recompensas,
            'recompensas_activas' => $resumen->recompensas_activas,
            'recompensas_vigentes' => $resumen->recompensas_vigentes,
            'tasa_activacion' => $tasaActivacion
        ];
    }

    /**
     * Obtiene estadísticas por tipo de recompensa
     */
    public function obtenerEstadisticasPorTipo(): array
    {
        $tipos = ['puntos', 'descuento', 'envio_gratis', 'regalo'];
        $estadisticasPorTipo = [];

        foreach ($tipos as $tipo) {
            $estadisticasPorTipo[$tipo] = $this->obtenerEstadisticasTipoEspecifico($tipo);
        }

        return $estadisticasPorTipo;
    }

    /**
     * Obtiene estadísticas para un tipo específico
     */
    public function obtenerEstadisticasTipoEspecifico(string $tipo): array
    {
        // Estadísticas básicas del tipo
        $basicas = DB::table('recompensas')
            ->where('tipo', $tipo)
            ->selectRaw('
                COUNT(*) as total,
                COUNT(CASE WHEN estado = "activa" THEN 1 END) as activas
            ')
            ->first();

        // Estadísticas del mes actual
        $mesActual = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->where('r.tipo', $tipo)
            ->whereRaw('DATE_FORMAT(rh.fecha_aplicacion, "%Y-%m") = DATE_FORMAT(NOW(), "%Y-%m")')
            ->selectRaw('
                COUNT(rh.id) as aplicaciones_mes,
                SUM(rh.puntos_otorgados) as puntos_otorgados_mes
            ')
            ->first();

        return [
            'total' => $basicas->total,
            'activas' => $basicas->activas,
            'aplicaciones_mes' => $mesActual->aplicaciones_mes ?? 0,
            'puntos_otorgados_mes' => $mesActual->puntos_otorgados_mes ?? 0
        ];
    }

    /**
     * Obtiene métricas del mes actual
     */
    public function obtenerMetricasDelMes(): array
    {
        $mesActual = Carbon::now()->format('Y-m');
        
        $metricas = DB::table('recompensas_historial')
            ->whereRaw('DATE_FORMAT(fecha_aplicacion, "%Y-%m") = ?', [$mesActual])
            ->selectRaw('
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes_beneficiados,
                SUM(puntos_otorgados) as puntos_otorgados,
                AVG(puntos_otorgados) as promedio_puntos_por_aplicacion
            ')
            ->first();

        return [
            'aplicaciones' => $metricas->aplicaciones,
            'puntos_otorgados' => $metricas->puntos_otorgados,
            'clientes_beneficiados' => $metricas->clientes_beneficiados,
            'promedio_puntos_por_aplicacion' => round($metricas->promedio_puntos_por_aplicacion, 2)
        ];
    }

    /**
     * Obtiene comparativa con mes anterior
     */
    public function obtenerComparativaMesAnterior(): array
    {
        $mesActual = Carbon::now()->format('Y-m');
        $mesAnterior = Carbon::now()->subMonth()->format('Y-m');

        // Métricas mes actual
        $actual = DB::table('recompensas_historial')
            ->whereRaw('DATE_FORMAT(fecha_aplicacion, "%Y-%m") = ?', [$mesActual])
            ->selectRaw('
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes,
                SUM(puntos_otorgados) as puntos
            ')
            ->first();

        // Métricas mes anterior
        $anterior = DB::table('recompensas_historial')
            ->whereRaw('DATE_FORMAT(fecha_aplicacion, "%Y-%m") = ?', [$mesAnterior])
            ->selectRaw('
                COUNT(*) as aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes,
                SUM(puntos_otorgados) as puntos
            ')
            ->first();

        return [
            'aplicaciones' => $this->calcularTendencia($anterior->aplicaciones, $actual->aplicaciones),
            'clientes' => $this->calcularTendencia($anterior->clientes, $actual->clientes),
            'puntos' => $this->calcularTendencia($anterior->puntos, $actual->puntos)
        ];
    }

    /**
     * Calcula tendencia entre dos valores
     */
    public function calcularTendencia(?float $anterior, ?float $actual): array
    {
        // Convertir null a 0
        $anterior = $anterior ?? 0;
        $actual = $actual ?? 0;
        
        if ($anterior == 0 && $actual == 0) {
            return [
                'actual' => $actual,
                'anterior' => $anterior,
                'tendencia' => [
                    'porcentaje' => 0,
                    'direccion' => 'estable',
                    'diferencia' => 0
                ]
            ];
        }

        if ($anterior == 0) {
            return [
                'actual' => $actual,
                'anterior' => $anterior,
                'tendencia' => [
                    'porcentaje' => 100,
                    'direccion' => 'subida',
                    'diferencia' => $actual
                ]
            ];
        }

        $porcentaje = (($actual - $anterior) / $anterior) * 100;
        $direccion = $porcentaje > 0 ? 'subida' : ($porcentaje < 0 ? 'bajada' : 'estable');

        return [
            'actual' => $actual,
            'anterior' => $anterior,
            'tendencia' => [
                'porcentaje' => round(abs($porcentaje), 2),
                'direccion' => $direccion,
                'diferencia' => $actual - $anterior
            ]
        ];
    }

    /**
     * Obtiene top recompensas del mes
     * Si no hay historial, devuelve las recompensas más recientes
     */
    public function obtenerTopRecompensas(int $limite = 10): array
    {
        $mesActual = Carbon::now()->format('Y-m');

        // Intentar obtener del historial primero
        $topRecompensas = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->whereRaw('DATE_FORMAT(rh.fecha_aplicacion, "%Y-%m") = ?', [$mesActual])
            ->selectRaw('
                r.id,
                r.nombre,
                r.tipo,
                COUNT(rh.id) as total_aplicaciones,
                COUNT(DISTINCT rh.cliente_id) as clientes_unicos
            ')
            ->groupBy('r.id', 'r.nombre', 'r.tipo')
            ->orderBy('total_aplicaciones', 'desc')
            ->limit($limite)
            ->get()
            ->toArray();

        // Si no hay datos del historial, usar las recompensas más recientes como fallback
        if (empty($topRecompensas)) {
            $topRecompensas = DB::table('recompensas as r')
                ->selectRaw('
                    r.id,
                    r.nombre,
                    r.tipo,
                    0 as total_aplicaciones,
                    0 as clientes_unicos
                ')
                ->orderBy('r.created_at', 'desc')
                ->limit($limite)
                ->get()
                ->toArray();
        }

        return $topRecompensas;
    }

    /**
     * Obtiene tipos de recompensas disponibles
     */
    public function obtenerTiposDisponibles(): array
    {
        return [
            'tipos' => [
                [
                    'value' => 'puntos',
                    'label' => 'Sistema de Puntos',
                    'descripcion' => 'Acumula puntos por compras y canjéalos por beneficios',
                    'campos_configuracion' => [
                        [
                            'campo' => 'puntos_por_compra',
                            'tipo' => 'decimal',
                            'descripcion' => 'Puntos otorgados por cada compra',
                            'requerido' => false,
                            'min' => 0,
                            'max' => 9999.99
                        ],
                        [
                            'campo' => 'puntos_por_monto',
                            'tipo' => 'decimal',
                            'descripcion' => 'Puntos por cada sol gastado',
                            'requerido' => false,
                            'min' => 0,
                            'max' => 9999.99
                        ],
                        [
                            'campo' => 'puntos_registro',
                            'tipo' => 'decimal',
                            'descripcion' => 'Puntos otorgados al registrarse',
                            'requerido' => false,
                            'min' => 0,
                            'max' => 9999.99
                        ]
                    ]
                ],
                [
                    'value' => 'descuento',
                    'label' => 'Descuentos',
                    'descripcion' => 'Aplica descuentos por porcentaje o cantidad fija',
                    'campos_configuracion' => [
                        [
                            'campo' => 'tipo_descuento',
                            'tipo' => 'enum',
                            'opciones' => ['porcentaje', 'cantidad_fija'],
                            'descripcion' => 'Tipo de descuento a aplicar',
                            'requerido' => true
                        ],
                        [
                            'campo' => 'valor_descuento',
                            'tipo' => 'decimal',
                            'descripcion' => 'Valor del descuento',
                            'requerido' => true,
                            'min' => 0.01,
                            'max' => 9999.99
                        ],
                        [
                            'campo' => 'compra_minima',
                            'tipo' => 'decimal',
                            'descripcion' => 'Compra mínima requerida',
                            'requerido' => false,
                            'min' => 0,
                            'max' => 9999.99
                        ]
                    ]
                ],
                [
                    'value' => 'envio_gratis',
                    'label' => 'Envío Gratuito',
                    'descripcion' => 'Ofrece envío gratuito con condiciones específicas',
                    'campos_configuracion' => [
                        [
                            'campo' => 'minimo_compra',
                            'tipo' => 'decimal',
                            'descripcion' => 'Compra mínima para envío gratuito',
                            'requerido' => false,
                            'min' => 0,
                            'max' => 9999.99
                        ],
                        [
                            'campo' => 'zonas_aplicables',
                            'tipo' => 'json',
                            'descripcion' => 'Zonas donde aplica el envío gratuito',
                            'requerido' => false
                        ]
                    ]
                ],
                [
                    'value' => 'regalo',
                    'label' => 'Productos de Regalo',
                    'descripcion' => 'Otorga productos específicos como regalo',
                    'campos_configuracion' => [
                        [
                            'campo' => 'producto_id',
                            'tipo' => 'integer',
                            'descripcion' => 'ID del producto a regalar',
                            'requerido' => true
                        ],
                        [
                            'campo' => 'cantidad',
                            'tipo' => 'integer',
                            'descripcion' => 'Cantidad del producto a regalar',
                            'requerido' => true,
                            'min' => 1,
                            'max' => 100
                        ]
                    ]
                ]
            ],
            'estados' => [
                [
                    'value' => 'programada',
                    'label' => 'Programada',
                    'descripcion' => 'Recompensa creada pero no activa'
                ],
                [
                    'value' => 'activa',
                    'label' => 'Activa',
                    'descripcion' => 'Recompensa activa y disponible'
                ],
                [
                    'value' => 'pausada',
                    'label' => 'Pausada',
                    'descripcion' => 'Recompensa temporalmente pausada'
                ],
                [
                    'value' => 'expirada',
                    'label' => 'Expirada',
                    'descripcion' => 'Recompensa expirada por fecha'
                ],
                [
                    'value' => 'cancelada',
                    'label' => 'Cancelada',
                    'descripcion' => 'Recompensa cancelada permanentemente'
                ]
            ]
        ];
    }

    /**
     * Obtiene estadísticas detalladas por período
     */
    public function obtenerEstadisticasPorPeriodo(string $periodo = 'mes'): array
    {
        $fechaInicio = match($periodo) {
            'semana' => Carbon::now()->startOfWeek(),
            'mes' => Carbon::now()->startOfMonth(),
            'trimestre' => Carbon::now()->startOfQuarter(),
            'año' => Carbon::now()->startOfYear(),
            default => Carbon::now()->startOfMonth()
        };

        $fechaFin = match($periodo) {
            'semana' => Carbon::now()->endOfWeek(),
            'mes' => Carbon::now()->endOfMonth(),
            'trimestre' => Carbon::now()->endOfQuarter(),
            'año' => Carbon::now()->endOfYear(),
            default => Carbon::now()->endOfMonth()
        };

        $resultado = DB::table('recompensas_historial')
            ->whereBetween('fecha_aplicacion', [$fechaInicio, $fechaFin])
            ->selectRaw('
                COUNT(*) as total_aplicaciones,
                COUNT(DISTINCT cliente_id) as clientes_unicos,
                SUM(puntos_otorgados) as puntos_otorgados,
                AVG(puntos_otorgados) as promedio_puntos
            ')
            ->first();

        // Convertir el objeto a array y manejar valores null
        return [
            'total_aplicaciones' => $resultado->total_aplicaciones ?? 0,
            'clientes_unicos' => $resultado->clientes_unicos ?? 0,
            'puntos_otorgados' => $resultado->puntos_otorgados ?? 0,
            'promedio_puntos' => round($resultado->promedio_puntos ?? 0, 2),
            'periodo' => $periodo,
            'fecha_inicio' => $fechaInicio->toDateString(),
            'fecha_fin' => $fechaFin->toDateString()
        ];
    }

    /**
     * Obtiene tendencias por tipo de recompensa
     */
    public function obtenerTendenciasPorTipo(): array
    {
        $tipos = ['puntos', 'descuento', 'envio_gratis', 'regalo'];
        $tendencias = [];

        foreach ($tipos as $tipo) {
            $tendencias[$tipo] = $this->obtenerTendenciaTipo($tipo);
        }

        return $tendencias;
    }

    /**
     * Obtiene tendencia para un tipo específico
     */
    private function obtenerTendenciaTipo(string $tipo): array
    {
        $mesActual = Carbon::now()->format('Y-m');
        $mesAnterior = Carbon::now()->subMonth()->format('Y-m');

        $actual = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->where('r.tipo', $tipo)
            ->whereRaw('DATE_FORMAT(rh.fecha_aplicacion, "%Y-%m") = ?', [$mesActual])
            ->count();

        $anterior = DB::table('recompensas_historial as rh')
            ->join('recompensas as r', 'rh.recompensa_id', '=', 'r.id')
            ->where('r.tipo', $tipo)
            ->whereRaw('DATE_FORMAT(rh.fecha_aplicacion, "%Y-%m") = ?', [$mesAnterior])
            ->count();

        return $this->calcularTendencia($anterior, $actual);
    }
}
