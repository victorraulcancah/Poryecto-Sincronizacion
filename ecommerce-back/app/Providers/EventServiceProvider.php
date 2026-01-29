<?php

namespace App\Providers;

use App\Events\OnOrderCompleted;
use App\Events\OnUserRegister;
use App\Events\OnPaymentConfirmed;
use App\Events\VentaCreated;
use App\Listeners\ProcessOrderCompletionRewards;
use App\Listeners\ProcessUserRegistrationRewards;
use App\Listeners\ProcessAutomaticInvoicing;
use App\Listeners\ProcessVentaCreated;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        
        // Eventos del módulo de recompensas
        OnUserRegister::class => [
            ProcessUserRegistrationRewards::class,
        ],
        
        OnOrderCompleted::class => [
            ProcessOrderCompletionRewards::class,
        ],
        
        OnPaymentConfirmed::class => [
            ProcessAutomaticInvoicing::class,
        ],
        
        // Evento de venta creada - Integración con contabilidad
        VentaCreated::class => [
            ProcessVentaCreated::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        parent::boot();

        // Registrar eventos adicionales si es necesario
        $this->registerRewardsEvents();
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }

    /**
     * Registrar eventos específicos del módulo de recompensas
     */
    protected function registerRewardsEvents(): void
    {
        // Evento para cuando se actualiza el perfil del cliente
        // Útil para recalcular segmentación
        Event::listen('user.profile.updated', function ($cliente) {
            // Aquí se puede implementar lógica para recalcular
            // las recompensas aplicables cuando cambia el perfil
            \Illuminate\Support\Facades\Log::info('Perfil de cliente actualizado', [
                'cliente_id' => $cliente->id ?? null
            ]);
        });

        // Evento para cuando se cancela un pedido
        // Útil para revertir recompensas aplicadas
        Event::listen('order.cancelled', function ($pedido) {
            // Aquí se puede implementar lógica para revertir
            // recompensas aplicadas en pedidos cancelados
            \Illuminate\Support\Facades\Log::info('Pedido cancelado - revisar recompensas', [
                'pedido_id' => $pedido->id ?? null
            ]);
        });

        // Evento para cuando se modifica el stock de un producto
        // Útil para verificar disponibilidad de regalos
        Event::listen('product.stock.updated', function ($producto) {
            // Aquí se puede implementar lógica para verificar
            // si los regalos siguen disponibles
            \Illuminate\Support\Facades\Log::debug('Stock de producto actualizado', [
                'producto_id' => $producto->id ?? null,
                'nuevo_stock' => $producto->stock ?? null
            ]);
        });
    }

    /**
     * Get the events and handlers.
     *
     * @return array<string, array<int, string>>
     */
    public function listens(): array
    {
        return $this->listen;
    }
}