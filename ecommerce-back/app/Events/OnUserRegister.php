<?php

namespace App\Events;

use App\Models\UserCliente;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OnUserRegister
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public UserCliente $cliente;
    public array $datosRegistro;

    /**
     * Create a new event instance.
     */
    public function __construct(UserCliente $cliente, array $datosRegistro = [])
    {
        $this->cliente = $cliente;
        $this->datosRegistro = $datosRegistro;
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