<?php

namespace App\Listeners;

use App\Events\OnUserRegister;
use App\Services\RecompensaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class ProcessUserRegistrationRewards implements ShouldQueue
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
    public function handle(OnUserRegister $event): void
    {
        try {
            Log::info("Procesando recompensas de registro para cliente: {$event->cliente->id}");

            // Procesar recompensas de registro
            $resultados = $this->recompensaService->procesarRecompensasRegistro($event->cliente);

            if (!empty($resultados['recompensas_aplicadas'])) {
                Log::info("Recompensas de registro aplicadas exitosamente", [
                    'cliente_id' => $event->cliente->id,
                    'puntos_totales' => $resultados['puntos_totales_otorgados'],
                    'recompensas_count' => count($resultados['recompensas_aplicadas'])
                ]);

                // Opcional: Enviar notificación al cliente sobre sus puntos de bienvenida
                $this->notificarPuntosBienvenida($event->cliente, $resultados);
            } else {
                Log::info("No hay recompensas de registro disponibles para el cliente: {$event->cliente->id}");
            }

            if (!empty($resultados['errores'])) {
                Log::warning("Errores al procesar recompensas de registro", [
                    'cliente_id' => $event->cliente->id,
                    'errores' => $resultados['errores']
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Error procesando recompensas de registro para cliente {$event->cliente->id}: " . $e->getMessage(), [
                'exception' => $e,
                'cliente_id' => $event->cliente->id,
                'datos_registro' => $event->datosRegistro
            ]);

            // Re-lanzar la excepción para que el job sea reintentado
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(OnUserRegister $event, \Throwable $exception): void
    {
        Log::error("Falló el procesamiento de recompensas de registro para cliente {$event->cliente->id}", [
            'exception' => $exception,
            'cliente_id' => $event->cliente->id,
            'datos_registro' => $event->datosRegistro
        ]);

        // Opcional: Notificar a administradores sobre el fallo
        // $this->notificarFalloAdministradores($event, $exception);
    }

    /**
     * Notificar al cliente sobre sus puntos de bienvenida
     */
    private function notificarPuntosBienvenida($cliente, array $resultados): void
    {
        try {
            // Aquí se puede implementar el envío de email, notificación push, etc.
            // Por ejemplo:
            // Mail::to($cliente->email)->send(new PuntosBienvenidaMail($cliente, $resultados));
            
            Log::info("Notificación de puntos de bienvenida enviada", [
                'cliente_id' => $cliente->id,
                'puntos_otorgados' => $resultados['puntos_totales_otorgados']
            ]);
        } catch (\Exception $e) {
            Log::warning("Error enviando notificación de puntos de bienvenida: " . $e->getMessage(), [
                'cliente_id' => $cliente->id
            ]);
        }
    }

    /**
     * Determine the time at which the listener should timeout.
     */
    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(5);
    }

    /**
     * Calculate the number of seconds to wait before retrying the listener.
     */
    public function backoff(): array
    {
        return [1, 5, 10]; // Reintentar después de 1, 5 y 10 segundos
    }
}