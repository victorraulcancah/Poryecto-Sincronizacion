<?php

namespace App\Listeners;

use App\Events\OnOrderCompleted;
use App\Services\RecompensaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class ProcessOrderCompletionRewards implements ShouldQueue
{
    use InteractsWithQueue;

    protected RecompensaService $recompensaService;

    /**
     * Create the event listener.
     */
    public function __construct(RecompensaService $recompensaService)
    {
        $this->recompensaService = $recompensaService;
    }

    /**
     * Handle the event.
     */
    public function handle(OnOrderCompleted $event): void
    {
        try {
            Log::info("Procesando recompensas para pedido completado", [
                'pedido_id' => $event->pedido->id,
                'cliente_id' => $event->cliente->id,
                'total_pedido' => $event->pedido->total
            ]);

            // Procesar recompensas del pedido
            $resultados = $this->recompensaService->procesarRecompensasPedido(
                $event->cliente,
                $event->pedido
            );

            if (!empty($resultados['recompensas_aplicadas'])) {
                Log::info("Recompensas aplicadas exitosamente al pedido", [
                    'pedido_id' => $event->pedido->id,
                    'cliente_id' => $event->cliente->id,
                    'recompensas_count' => count($resultados['recompensas_aplicadas']),
                    'puntos_otorgados' => $resultados['puntos_totales_otorgados'],
                    'descuentos_aplicados' => count($resultados['descuentos_aplicados']),
                    'envios_gratis' => count($resultados['envios_gratis_aplicados']),
                    'regalos_otorgados' => count($resultados['regalos_otorgados'])
                ]);

                // Notificar al cliente sobre las recompensas obtenidas
                $this->notificarRecompensasObtenidas($event->cliente, $event->pedido, $resultados);

                // Actualizar métricas de recompensas (opcional)
                $this->actualizarMetricas($resultados);
            } else {
                Log::info("No hay recompensas aplicables para este pedido", [
                    'pedido_id' => $event->pedido->id,
                    'cliente_id' => $event->cliente->id
                ]);
            }

            if (!empty($resultados['errores'])) {
                Log::warning("Errores al procesar algunas recompensas", [
                    'pedido_id' => $event->pedido->id,
                    'cliente_id' => $event->cliente->id,
                    'errores' => $resultados['errores']
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Error procesando recompensas para pedido {$event->pedido->id}: " . $e->getMessage(), [
                'exception' => $e,
                'pedido_id' => $event->pedido->id,
                'cliente_id' => $event->cliente->id,
                'datos_pedido' => $event->datosPedido
            ]);

            // Re-lanzar la excepción para que el job sea reintentado
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(OnOrderCompleted $event, \Throwable $exception): void
    {
        Log::error("Falló el procesamiento de recompensas para pedido {$event->pedido->id}", [
            'exception' => $exception,
            'pedido_id' => $event->pedido->id,
            'cliente_id' => $event->cliente->id,
            'datos_pedido' => $event->datosPedido
        ]);

        // Opcional: Marcar el pedido para revisión manual
        $this->marcarPedidoParaRevision($event->pedido, $exception);

        // Opcional: Notificar a administradores sobre el fallo
        // $this->notificarFalloAdministradores($event, $exception);
    }

    /**
     * Notificar al cliente sobre las recompensas obtenidas
     */
    private function notificarRecompensasObtenidas($cliente, $pedido, array $resultados): void
    {
        try {
            $resumenRecompensas = $this->generarResumenRecompensas($resultados);
            
            // Aquí se puede implementar el envío de email, notificación push, etc.
            // Por ejemplo:
            // Mail::to($cliente->email)->send(new RecompensasObtenidas($cliente, $pedido, $resumenRecompensas));
            
            Log::info("Notificación de recompensas enviada al cliente", [
                'cliente_id' => $cliente->id,
                'pedido_id' => $pedido->id,
                'resumen' => $resumenRecompensas
            ]);
        } catch (\Exception $e) {
            Log::warning("Error enviando notificación de recompensas: " . $e->getMessage(), [
                'cliente_id' => $cliente->id,
                'pedido_id' => $pedido->id
            ]);
        }
    }

    /**
     * Generar resumen de recompensas para notificación
     */
    private function generarResumenRecompensas(array $resultados): array
    {
        $resumen = [
            'total_recompensas' => count($resultados['recompensas_aplicadas']),
            'puntos_ganados' => $resultados['puntos_totales_otorgados'],
            'descuentos_aplicados' => $resultados['descuentos_aplicados'],
            'envio_gratis' => !empty($resultados['envios_gratis_aplicados']),
            'regalos_recibidos' => $resultados['regalos_otorgados'],
            'mensaje_personalizado' => $this->generarMensajePersonalizado($resultados)
        ];

        return $resumen;
    }

    /**
     * Generar mensaje personalizado basado en las recompensas obtenidas
     */
    private function generarMensajePersonalizado(array $resultados): string
    {
        $mensajes = [];

        if ($resultados['puntos_totales_otorgados'] > 0) {
            $mensajes[] = "¡Ganaste {$resultados['puntos_totales_otorgados']} puntos!";
        }

        if (!empty($resultados['descuentos_aplicados'])) {
            $totalDescuentos = array_sum(array_column($resultados['descuentos_aplicados'], 'monto'));
            $mensajes[] = "Ahorraste S/ {$totalDescuentos} en descuentos";
        }

        if (!empty($resultados['envios_gratis_aplicados'])) {
            $mensajes[] = "¡Tu envío fue gratis!";
        }

        if (!empty($resultados['regalos_otorgados'])) {
            $cantidadRegalos = count($resultados['regalos_otorgados']);
            $mensajes[] = "Recibiste {$cantidadRegalos} regalo(s) adicional(es)";
        }

        return empty($mensajes) ? 
            "¡Gracias por tu compra!" : 
            implode(' ', $mensajes) . " ¡Gracias por ser parte de nuestra comunidad!";
    }

    /**
     * Actualizar métricas de recompensas
     */
    private function actualizarMetricas(array $resultados): void
    {
        try {
            // Aquí se pueden actualizar métricas en cache, base de datos, etc.
            // Por ejemplo:
            // Cache::increment('recompensas.aplicadas.total', count($resultados['recompensas_aplicadas']));
            // Cache::increment('recompensas.puntos.otorgados', $resultados['puntos_totales_otorgados']);
            
            Log::debug("Métricas de recompensas actualizadas", [
                'recompensas_aplicadas' => count($resultados['recompensas_aplicadas']),
                'puntos_otorgados' => $resultados['puntos_totales_otorgados']
            ]);
        } catch (\Exception $e) {
            Log::warning("Error actualizando métricas de recompensas: " . $e->getMessage());
        }
    }

    /**
     * Marcar pedido para revisión manual en caso de fallo
     */
    private function marcarPedidoParaRevision($pedido, \Throwable $exception): void
    {
        try {
            // Aquí se puede implementar lógica para marcar el pedido
            // Por ejemplo, agregar una nota o cambiar un estado
            
            Log::info("Pedido marcado para revisión manual de recompensas", [
                'pedido_id' => $pedido->id,
                'razon' => $exception->getMessage()
            ]);
        } catch (\Exception $e) {
            Log::error("Error marcando pedido para revisión: " . $e->getMessage());
        }
    }

    /**
     * Determine the time at which the listener should timeout.
     */
    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(10);
    }

    /**
     * Calculate the number of seconds to wait before retrying the listener.
     */
    public function backoff(): array
    {
        return [2, 10, 30]; // Reintentar después de 2, 10 y 30 segundos
    }
}