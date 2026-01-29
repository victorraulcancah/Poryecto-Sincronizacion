<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Services\GreenterService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

/**
 * Servicio de Contingencia para Facturación Electrónica
 *
 * Permite emitir comprobantes en modo offline cuando SUNAT no está disponible
 * y regularizarlos posteriormente cuando el servicio se restablece.
 */
class ContingenciaService
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Verificar si SUNAT está disponible
     *
     * @return bool
     */
    public function verificarDisponibilidadSunat()
    {
        $cacheKey = 'sunat_disponible';

        // Cache por 2 minutos
        return Cache::remember($cacheKey, 120, function () {
            try {
                // Intentar conectar con un timeout corto
                $resultado = $this->greenterService->obtenerEstadoServicio();

                if ($resultado['success']) {
                    Log::info('SUNAT disponible');
                    return true;
                }

                Log::warning('SUNAT no disponible', ['resultado' => $resultado]);
                return false;

            } catch (\Exception $e) {
                Log::error('Error verificando disponibilidad SUNAT', [
                    'error' => $e->getMessage()
                ]);
                return false;
            }
        });
    }

    /**
     * Activar modo contingencia
     *
     * @param string $motivo
     * @return array
     */
    public function activarModoContingencia($motivo = 'Servicio SUNAT no disponible')
    {
        $modoActivo = $this->estaModoContingenciaActivo();

        if ($modoActivo) {
            return [
                'success' => false,
                'message' => 'El modo contingencia ya está activo'
            ];
        }

        Cache::put('modo_contingencia', [
            'activo' => true,
            'fecha_inicio' => now()->toDateTimeString(),
            'motivo' => $motivo
        ], now()->addDays(7)); // Máximo 7 días en contingencia

        Log::warning('Modo contingencia activado', [
            'motivo' => $motivo,
            'fecha' => now()->toDateTimeString()
        ]);

        return [
            'success' => true,
            'message' => 'Modo contingencia activado',
            'data' => [
                'fecha_inicio' => now()->toDateTimeString(),
                'motivo' => $motivo
            ]
        ];
    }

    /**
     * Desactivar modo contingencia
     *
     * @return array
     */
    public function desactivarModoContingencia()
    {
        $modoActivo = $this->estaModoContingenciaActivo();

        if (!$modoActivo) {
            return [
                'success' => false,
                'message' => 'El modo contingencia no está activo'
            ];
        }

        $infoContingencia = Cache::get('modo_contingencia', []);

        Cache::forget('modo_contingencia');

        Log::info('Modo contingencia desactivado', [
            'duracion' => $infoContingencia['fecha_inicio'] ?? 'desconocida'
        ]);

        return [
            'success' => true,
            'message' => 'Modo contingencia desactivado',
            'data' => [
                'fecha_inicio' => $infoContingencia['fecha_inicio'] ?? null,
                'fecha_fin' => now()->toDateTimeString()
            ]
        ];
    }

    /**
     * Verificar si el modo contingencia está activo
     *
     * @return bool
     */
    public function estaModoContingenciaActivo()
    {
        $modo = Cache::get('modo_contingencia', ['activo' => false]);
        return $modo['activo'] ?? false;
    }

    /**
     * Obtener información del modo contingencia
     *
     * @return array
     */
    public function obtenerInfoContingencia()
    {
        $modo = Cache::get('modo_contingencia', ['activo' => false]);

        if (!$modo['activo']) {
            return [
                'activo' => false
            ];
        }

        $fechaInicio = Carbon::parse($modo['fecha_inicio']);
        $duracion = $fechaInicio->diffForHumans();

        // Contar comprobantes pendientes de regularización
        $pendientes = Comprobante::where('estado', 'CONTINGENCIA')->count();

        return [
            'activo' => true,
            'fecha_inicio' => $modo['fecha_inicio'],
            'motivo' => $modo['motivo'] ?? 'No especificado',
            'duracion' => $duracion,
            'comprobantes_pendientes' => $pendientes
        ];
    }

    /**
     * Emitir comprobante en modo contingencia
     *
     * @param Comprobante $comprobante
     * @return array
     */
    public function emitirEnContingencia(Comprobante $comprobante)
    {
        try {
            // Marcar el comprobante como emitido en contingencia
            $comprobante->update([
                'estado' => 'CONTINGENCIA',
                'fecha_contingencia' => now(),
                'observaciones' => ($comprobante->observaciones ?? '') . ' | Emitido en modo contingencia'
            ]);

            // Generar XML localmente (sin enviar a SUNAT)
            try {
                $invoice = $this->greenterService->construirDocumentoGreenter($comprobante, $comprobante->cliente);

                // Guardar XML firmado localmente
                $xml = $this->greenterService->see->getFactory()->getLastXml();
                $comprobante->update(['xml_firmado' => $xml]);

                // Generar PDF
                $this->greenterService->generarPdf($comprobante, $invoice);

            } catch (\Exception $e) {
                Log::warning('Error generando XML/PDF en contingencia', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $e->getMessage()
                ]);
            }

            Log::info('Comprobante emitido en modo contingencia', [
                'comprobante_id' => $comprobante->id,
                'numero' => $comprobante->serie . '-' . $comprobante->correlativo
            ]);

            return [
                'success' => true,
                'message' => 'Comprobante emitido en modo contingencia',
                'data' => [
                    'comprobante' => $comprobante->fresh(),
                    'requiere_regularizacion' => true
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Error emitiendo en contingencia', [
                'comprobante_id' => $comprobante->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Error emitiendo en modo contingencia: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Regularizar comprobantes emitidos en contingencia
     *
     * @param int|null $limite Número máximo de comprobantes a regularizar
     * @return array
     */
    public function regularizarComprobantesContingencia($limite = 50)
    {
        try {
            // Verificar que SUNAT esté disponible
            if (!$this->verificarDisponibilidadSunat()) {
                return [
                    'success' => false,
                    'message' => 'SUNAT no está disponible, no se puede regularizar'
                ];
            }

            // Obtener comprobantes pendientes de regularización
            $comprobantes = Comprobante::where('estado', 'CONTINGENCIA')
                ->orderBy('fecha_contingencia', 'asc')
                ->limit($limite)
                ->get();

            if ($comprobantes->isEmpty()) {
                return [
                    'success' => true,
                    'message' => 'No hay comprobantes pendientes de regularización',
                    'regularizados' => 0,
                    'fallidos' => 0
                ];
            }

            $regularizados = 0;
            $fallidos = 0;
            $errores = [];

            foreach ($comprobantes as $comprobante) {
                try {
                    // Intentar enviar a SUNAT
                    $resultado = $this->greenterService->enviarComprobante($comprobante);

                    if ($resultado['success']) {
                        $regularizados++;

                        Log::info('Comprobante regularizado', [
                            'comprobante_id' => $comprobante->id,
                            'numero' => $comprobante->serie . '-' . $comprobante->correlativo
                        ]);
                    } else {
                        $fallidos++;
                        $errores[] = [
                            'comprobante_id' => $comprobante->id,
                            'numero' => $comprobante->serie . '-' . $comprobante->correlativo,
                            'error' => $resultado['error'] ?? 'Error desconocido'
                        ];

                        Log::warning('Error regularizando comprobante', [
                            'comprobante_id' => $comprobante->id,
                            'error' => $resultado['error'] ?? 'Error desconocido'
                        ]);
                    }

                    // Pausa entre envíos para no saturar SUNAT
                    sleep(1);

                } catch (\Exception $e) {
                    $fallidos++;
                    $errores[] = [
                        'comprobante_id' => $comprobante->id,
                        'numero' => $comprobante->serie . '-' . $comprobante->correlativo,
                        'error' => $e->getMessage()
                    ];

                    Log::error('Excepción regularizando comprobante', [
                        'comprobante_id' => $comprobante->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return [
                'success' => true,
                'message' => "Regularización completada: {$regularizados} exitosos, {$fallidos} fallidos",
                'data' => [
                    'total_procesados' => $comprobantes->count(),
                    'regularizados' => $regularizados,
                    'fallidos' => $fallidos,
                    'errores' => $errores
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Error en proceso de regularización', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Error en proceso de regularización: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtener estadísticas de contingencia
     *
     * @return array
     */
    public function obtenerEstadisticas()
    {
        $totalContingencia = Comprobante::where('estado', 'CONTINGENCIA')->count();
        $totalRegularizados = Comprobante::where('estado', 'ACEPTADO')
            ->whereNotNull('fecha_contingencia')
            ->count();

        $ultimosContingencia = Comprobante::where('estado', 'CONTINGENCIA')
            ->orderBy('fecha_contingencia', 'desc')
            ->limit(10)
            ->get();

        return [
            'modo_activo' => $this->estaModoContingenciaActivo(),
            'pendientes_regularizacion' => $totalContingencia,
            'total_regularizados' => $totalRegularizados,
            'ultimos_comprobantes' => $ultimosContingencia->map(function ($c) {
                return [
                    'id' => $c->id,
                    'numero' => $c->serie . '-' . $c->correlativo,
                    'fecha_contingencia' => $c->fecha_contingencia,
                    'cliente' => $c->cliente_razon_social,
                    'importe' => $c->importe_total
                ];
            })
        ];
    }

    /**
     * Verificar automáticamente disponibilidad y activar/desactivar contingencia
     *
     * @return array
     */
    public function verificarYActualizarModoContingencia()
    {
        $sunatDisponible = $this->verificarDisponibilidadSunat();
        $modoActivo = $this->estaModoContingenciaActivo();

        if (!$sunatDisponible && !$modoActivo) {
            // SUNAT no disponible y modo contingencia no activo -> Activar
            return $this->activarModoContingencia('Activación automática - SUNAT no responde');
        } elseif ($sunatDisponible && $modoActivo) {
            // SUNAT disponible y modo contingencia activo -> Desactivar y regularizar
            $this->desactivarModoContingencia();

            // Iniciar regularización automática
            return $this->regularizarComprobantesContingencia(10);
        }

        return [
            'success' => true,
            'message' => 'Estado verificado, sin cambios',
            'sunat_disponible' => $sunatDisponible,
            'modo_contingencia' => $modoActivo
        ];
    }
}
