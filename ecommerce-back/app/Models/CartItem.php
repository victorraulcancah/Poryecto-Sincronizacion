<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = [
        'user_id',
        'user_cliente_id',
        'producto_id',
        'cantidad'
    ];

    protected $casts = [
        'cantidad' => 'integer'
    ];

    /**
     * Relación con el usuario del sistema (admin, vendedor)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con el cliente del e-commerce
     */
    public function userCliente(): BelongsTo
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    /**
     * Relación con el producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Obtener el usuario autenticado (puede ser user o userCliente)
     */
    public function getUsuarioAttribute()
    {
        return $this->user ?? $this->userCliente;
    }

    /**
     * Verificar si es un cliente del e-commerce
     */
    public function isCliente(): bool
    {
        return $this->user_cliente_id !== null;
    }

    /**
     * Verificar si es un usuario del sistema
     */
    public function isUsuarioSistema(): bool
    {
        return $this->user_id !== null;
    }
}
