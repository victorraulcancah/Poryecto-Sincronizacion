<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Compra;
use App\Models\User;
use App\Models\UserCliente;

class OnPaymentConfirmed
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $compra;
    public $cliente;
    public $metodoPago;
    public $referenciaPago;
    public $montoTotal;

    /**
     * Create a new event instance.
     */
    public function __construct(Compra $compra, $cliente, string $metodoPago, ?string $referenciaPago = null)
    {
        $this->compra = $compra;
        $this->cliente = $cliente;
        $this->metodoPago = $metodoPago;
        $this->referenciaPago = $referenciaPago;
        $this->montoTotal = $compra->total;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel-name'),
        ];
    }
}