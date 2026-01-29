<?php

namespace App\Services;

use App\Models\Recompensa;
use App\Models\UserCliente;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\RecompensaHistorial;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RecompensaService
{
    protected ValidadorRecompensas $validador;
    protected AsignadorRecompensas $asignador;

    public function __construct(
        ValidadorRecompensas $validador,
        AsignadorRecompensas $asignador
    ) {
        $this->validador = $validador;
        $this->asignador = $asignador;
    }

    /**
     * Procesar recompensas para un cliente en un pedido específico
     */
    public function procesarRecompensasPedido(UserCliente $cliente, Pedido $pedido): array
    {
        try {
            DB::beginTransaction();

            $resultados = [
                'recompensas_aplicadas' => [],
                'puntos_totales_otorgados' => 0,
                'descuentos_aplicados' => [],
                'envios_gratis_aplicados' => [],
                'regalos_otorgados' => [],
                'errores' => []
            ];

            // Obtener recompensas activas y vigentes
            $recompensasActivas = $this->obtenerRecompensasActivas();

            foreach ($recompensasActivas as $recompensa) {
                try {
                    // Validar si la recompensa aplica al cliente y pedido
                    $validacion = $this->validador->validarRecompensaParaPedido(
                        $recompensa,
                        $cliente,
                        $pedido
                    );

                    if ($validacion['aplica']) {
                        // Aplicar la recompensa
                        $resultado = $this->asignador->aplicarRecompensa(
                            $recompensa,
                            $cliente,
                            $pedido
                        );

                        if ($resultado['exito']) {
                            // Registrar en historial
                            $this->registrarEnHistorial(
                                $recompensa,
                                $cliente,
                                $pedido,
                                $resultado
                            );

                            // Agregar a resultados
                            $resultados['recompensas_aplicadas'][] = [
                                'recompensa_id' => $recompensa->id,
                                'nombre' => $recompensa->nombre,
                                'tipo' => $recompensa->tipo,
                                'resultado' => $resultado
                            ];

                            // Acumular totales por tipo
                            $this->acumularResultados($resultados, $resultado);
                        } else {
                            $resultados['errores'][] = [
                                'recompensa_id' => $recompensa->id,
                                'error' => $resultado['error']
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Error procesando recompensa {$recompensa->id}: " . $e->getMessage());
                    $resultados['errores'][] = [
                        'recompensa_id' => $recompensa->id,
                        'error' => 'Error interno al procesar recompensa'
                    ];
                }
            }

            DB::commit();

            return $resultados;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error procesando recompensas para pedido: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Procesar recompensas para registro de nuevo cliente
     */
    public function procesarRecompensasRegistro(UserCliente $cliente): array
    {
        try {
            DB::beginTransaction();

            $resultados = [
                'recompensas_aplicadas' => [],
                'puntos_totales_otorgados' => 0,
                'errores' => []
            ];

            // Obtener recompensas de tipo puntos que otorgan puntos por registro
            $recompensasRegistro = $this->obtenerRecompensasParaRegistro();

            foreach ($recompensasRegistro as $recompensa) {
                try {
                    // Validar si la recompensa aplica al cliente
                    $validacion = $this->validador->validarRecompensaParaCliente(
                        $recompensa,
                        $cliente
                    );

                    if ($validacion['aplica']) {
                        // Aplicar puntos por registro
                        $resultado = $this->asignador->aplicarPuntosRegistro(
                            $recompensa,
                            $cliente
                        );

                        if ($resultado['exito']) {
                            // Registrar en historial
                            $this->registrarEnHistorial(
                                $recompensa,
                                $cliente,
                                null,
                                $resultado
                            );

                            $resultados['recompensas_aplicadas'][] = [
                                'recompensa_id' => $recompensa->id,
                                'nombre' => $recompensa->nombre,
                                'puntos_otorgados' => $resultado['puntos_otorgados']
                            ];

                            $resultados['puntos_totales_otorgados'] += $resultado['puntos_otorgados'];
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Error procesando recompensa de registro {$recompensa->id}: " . $e->getMessage());
                    $resultados['errores'][] = [
                        'recompensa_id' => $recompensa->id,
                        'error' => 'Error al procesar puntos de registro'
                    ];
                }
            }

            DB::commit();

            return $resultados;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error procesando recompensas de registro: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Obtener recompensas aplicables para un cliente específico
     */
    public function obtenerRecompensasParaCliente(UserCliente $cliente): array
    {
        $recompensasActivas = $this->obtenerRecompensasActivas();
        $recompensasAplicables = [];

        foreach ($recompensasActivas as $recompensa) {
            $validacion = $this->validador->validarRecompensaParaCliente(
                $recompensa,
                $cliente
            );

            if ($validacion['aplica']) {
                $recompensasAplicables[] = [
                    'recompensa' => $recompensa,
                    'configuracion' => $this->obtenerConfiguracionParaCliente($recompensa),
                    'productos_aplicables' => $this->obtenerProductosAplicables($recompensa)
                ];
            }
        }

        return $recompensasAplicables;
    }

    /**
     * Simular aplicación de recompensas sin persistir cambios
     */
    public function simularRecompensasPedido(UserCliente $cliente, array $productosCarrito, float $montoTotal): array
    {
        $simulacion = [
            'recompensas_aplicables' => [],
            'puntos_estimados' => 0,
            'descuentos_estimados' => 0,
            'envio_gratis_disponible' => false,
            'regalos_disponibles' => []
        ];

        $recompensasActivas = $this->obtenerRecompensasActivas();

        foreach ($recompensasActivas as $recompensa) {
            $validacion = $this->validador->validarRecompensaParaSimulacion(
                $recompensa,
                $cliente,
                $productosCarrito,
                $montoTotal
            );

            if ($validacion['aplica']) {
                $simulacionRecompensa = $this->asignador->simularRecompensa(
                    $recompensa,
                    $cliente,
                    $productosCarrito,
                    $montoTotal
                );

                $simulacion['recompensas_aplicables'][] = [
                    'recompensa' => $recompensa,
                    'simulacion' => $simulacionRecompensa
                ];

                // Acumular estimaciones
                $this->acumularSimulacion($simulacion, $simulacionRecompensa);
            }
        }

        return $simulacion;
    }

    /**
     * Validar si un producto específico tiene recompensas aplicables
     */
    public function validarProductoTieneRecompensas(Producto $producto, UserCliente $cliente = null): array
    {
        $recompensasActivas = $this->obtenerRecompensasActivas();
        $recompensasAplicables = [];

        foreach ($recompensasActivas as $recompensa) {
            $validacion = $this->validador->validarProductoEnRecompensa(
                $producto,
                $recompensa,
                $cliente
            );

            if ($validacion['aplica']) {
                $recompensasAplicables[] = [
                    'recompensa_id' => $recompensa->id,
                    'nombre' => $recompensa->nombre,
                    'tipo' => $recompensa->tipo,
                    'descripcion' => $recompensa->descripcion,
                    'configuracion' => $this->obtenerConfiguracionParaCliente($recompensa)
                ];
            }
        }

        return $recompensasAplicables;
    }

    /**
     * Obtener estadísticas de recompensas para un cliente
     */
    public function obtenerEstadisticasCliente(UserCliente $cliente): array
    {
        return [
            'puntos_totales' => $cliente->getTotalPuntosGanados(),
            'recompensas_recibidas' => $cliente->recompensasHistorial()->count(),
            'recompensas_este_mes' => $cliente->getRecompensasDelMes(),
            'segmento_actual' => $cliente->getSegmentoCliente(),
            'recompensas_disponibles' => count($this->obtenerRecompensasParaCliente($cliente)),
            'historial_reciente' => $cliente->recompensasHistorial()
                ->with('recompensa:id,nombre,tipo')
                ->orderBy('fecha_aplicacion', 'desc')
                ->limit(5)
                ->get()
                ->map(function($item) {
                    return [
                        'recompensa' => $item->recompensa->nombre,
                        'tipo' => $item->recompensa->tipo,
                        'puntos' => $item->puntos_otorgados,
                        'fecha' => $item->fecha_aplicacion
                    ];
                })
        ];
    }

    // Métodos privados auxiliares

    /**
     * Obtener recompensas activas y vigentes
     */
    private function obtenerRecompensasActivas(): \Illuminate\Database\Eloquent\Collection
    {
        return Recompensa::with([
            'clientes',
            'productos',
            'puntos',
            'descuentos',
            'envios',
            'regalos'
        ])
        ->activas()
        ->vigentes()
        ->get();
    }

    /**
     * Obtener recompensas que otorgan puntos por registro
     */
    private function obtenerRecompensasParaRegistro(): \Illuminate\Database\Eloquent\Collection
    {
        return Recompensa::with(['clientes', 'puntos'])
            ->activas()
            ->vigentes()
            ->porTipo(Recompensa::TIPO_PUNTOS)
            ->whereHas('puntos', function($query) {
                $query->where('puntos_registro', '>', 0);
            })
            ->get();
    }

    /**
     * Registrar aplicación de recompensa en historial
     */
    private function registrarEnHistorial(
        Recompensa $recompensa,
        UserCliente $cliente,
        ?Pedido $pedido,
        array $resultado
    ): void {
        RecompensaHistorial::create([
            'recompensa_id' => $recompensa->id,
            'cliente_id' => $cliente->id,
            'pedido_id' => $pedido?->id,
            'puntos_otorgados' => $resultado['puntos_otorgados'] ?? 0,
            'beneficio_aplicado' => $resultado['descripcion'] ?? null,
            'fecha_aplicacion' => now()
        ]);
    }

    /**
     * Acumular resultados por tipo de recompensa
     */
    private function acumularResultados(array &$resultados, array $resultado): void
    {
        if (isset($resultado['puntos_otorgados'])) {
            $resultados['puntos_totales_otorgados'] += $resultado['puntos_otorgados'];
        }

        if (isset($resultado['descuento_aplicado'])) {
            $resultados['descuentos_aplicados'][] = $resultado['descuento_aplicado'];
        }

        if (isset($resultado['envio_gratis']) && $resultado['envio_gratis']) {
            $resultados['envios_gratis_aplicados'][] = $resultado['envio_gratis'];
        }

        if (isset($resultado['regalos'])) {
            $resultados['regalos_otorgados'] = array_merge(
                $resultados['regalos_otorgados'],
                $resultado['regalos']
            );
        }
    }

    /**
     * Acumular simulaciones
     */
    private function acumularSimulacion(array &$simulacion, array $simulacionRecompensa): void
    {
        if (isset($simulacionRecompensa['puntos_estimados'])) {
            $simulacion['puntos_estimados'] += $simulacionRecompensa['puntos_estimados'];
        }

        if (isset($simulacionRecompensa['descuento_estimado'])) {
            $simulacion['descuentos_estimados'] += $simulacionRecompensa['descuento_estimado'];
        }

        if (isset($simulacionRecompensa['envio_gratis']) && $simulacionRecompensa['envio_gratis']) {
            $simulacion['envio_gratis_disponible'] = true;
        }

        if (isset($simulacionRecompensa['regalos'])) {
            $simulacion['regalos_disponibles'] = array_merge(
                $simulacion['regalos_disponibles'],
                $simulacionRecompensa['regalos']
            );
        }
    }

    /**
     * Obtener configuración específica para mostrar al cliente
     */
    private function obtenerConfiguracionParaCliente(Recompensa $recompensa): array
    {
        switch ($recompensa->tipo) {
            case Recompensa::TIPO_PUNTOS:
                $puntos = $recompensa->puntos->first();
                return $puntos ? $puntos->getResumenConfiguracion() : [];

            case Recompensa::TIPO_DESCUENTO:
                $descuento = $recompensa->descuentos->first();
                return $descuento ? $descuento->getResumenConfiguracion() : [];

            case Recompensa::TIPO_ENVIO_GRATIS:
                $envio = $recompensa->envios->first();
                return $envio ? $envio->getResumenConfiguracion() : [];

            case Recompensa::TIPO_REGALO:
                return $recompensa->regalos->map(function($regalo) {
                    return $regalo->getResumenConfiguracion();
                })->toArray();

            default:
                return [];
        }
    }

    /**
     * Obtener productos aplicables para una recompensa
     */
    private function obtenerProductosAplicables(Recompensa $recompensa): array
    {
        $productos = [];
        
        foreach ($recompensa->productos as $recompensaProducto) {
            $productosAplicables = $recompensaProducto->getProductosAplicables();
            $productos = array_merge($productos, $productosAplicables->toArray());
        }

        // Eliminar duplicados
        return collect($productos)->unique('id')->values()->toArray();
    }

    /**
     * Limpiar recompensas vencidas (método de mantenimiento)
     */
    public function limpiarRecompensasVencidas(): int
    {
        return Recompensa::where('fecha_fin', '<', now())
            ->where('activo', true)
            ->update(['activo' => false]);
    }

    /**
     * Obtener reporte de uso de recompensas
     */
    public function obtenerReporteUso(Carbon $fechaInicio, Carbon $fechaFin): array
    {
        $historial = RecompensaHistorial::with('recompensa')
            ->whereBetween('fecha_aplicacion', [$fechaInicio, $fechaFin])
            ->get();

        return [
            'total_aplicaciones' => $historial->count(),
            'puntos_totales_otorgados' => $historial->sum('puntos_otorgados'),
            'clientes_beneficiados' => $historial->unique('cliente_id')->count(),
            'por_tipo' => $historial->groupBy('recompensa.tipo')
                ->map(function($grupo) {
                    return [
                        'aplicaciones' => $grupo->count(),
                        'puntos_otorgados' => $grupo->sum('puntos_otorgados')
                    ];
                }),
            'recompensas_mas_usadas' => $historial->groupBy('recompensa_id')
                ->map(function($grupo) {
                    return [
                        'recompensa' => $grupo->first()->recompensa->nombre,
                        'aplicaciones' => $grupo->count()
                    ];
                })
                ->sortByDesc('aplicaciones')
                ->take(10)
                ->values()
        ];
    }
}