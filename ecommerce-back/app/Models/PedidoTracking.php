<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoTracking extends Model
{
    protected $table = 'pedido_tracking';
    
    protected $fillable = [
        'pedido_id',
        'estado_pedido_id',
        'comentario',
        'usuario_id',
        'fecha_cambio'
    ];

    protected $casts = [
        'fecha_cambio' => 'datetime'
    ];

    // Relación con Pedido
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    // Relación con EstadoPedido
    public function estadoPedido(): BelongsTo
    {
        return $this->belongsTo(EstadoPedido::class);
    }

    // Relación con Usuario (admin que hizo el cambio)
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}