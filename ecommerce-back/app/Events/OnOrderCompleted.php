<?php

namespace App\Events;

use App\Models\Pedido;
use App\Models\UserCliente;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OnOrderCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Pedido $pedido;
    public UserCliente $cliente;
    public array $datosPedido;

    /**
     * Create a new event instance.
     */
    public function __construct(Pedido $pedido, UserCliente $cliente, array $datosPedido = [])
    {
        $this->pedido = $pedido;
        $this->cliente = $cliente;
        $this->datosPedido = $datosPedido;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            // No broadcasting needed for this event
        ];
    }
}