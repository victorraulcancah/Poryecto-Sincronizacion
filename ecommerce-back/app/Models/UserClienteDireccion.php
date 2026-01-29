<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserClienteDireccion extends Model
{
    use HasFactory;

    protected $table = 'user_cliente_direcciones';

    protected $fillable = [
        'user_cliente_id',
        'nombre_destinatario',
        'direccion_completa',
        'referencia',
        'id_ubigeo',
        'telefono',
        // 'departamento',
        // 'provincia',
        // 'distrito',
        'codigo_postal',
        'predeterminada',
        'activa'
    ];

    protected $casts = [
        'predeterminada' => 'boolean',
        'activa' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function userCliente()
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('activa', true);
    }

    public function scopePredeterminadas($query)
    {
        return $query->where('predeterminada', true);
    }

    // Accessors
    public function getDireccionCompletaFormateadaAttribute()
    {
        $direccion = $this->direccion_completa;
        
        if ($this->referencia) {
            $direccion .= ' - ' . $this->referencia;
        }
        
        $direccion .= ', ' . $this->distrito . ', ' . $this->provincia . ', ' . $this->departamento;
        
        if ($this->codigo_postal) {
            $direccion .= ' ' . $this->codigo_postal;
        }
        
        return $direccion;
    }

    // Boot method
    protected static function boot()
    {
        parent::boot();

        // Al crear una dirección predeterminada, quitar predeterminada de las demás
        static::creating(function ($direccion) {
            if ($direccion->predeterminada) {
                static::where('user_cliente_id', $direccion->user_cliente_id)
                      ->update(['predeterminada' => false]);
            }
        });

        // Al actualizar una dirección predeterminada, quitar predeterminada de las demás
        static::updating(function ($direccion) {
            if ($direccion->predeterminada && $direccion->isDirty('predeterminada')) {
                static::where('user_cliente_id', $direccion->user_cliente_id)
                      ->where('id', '!=', $direccion->id)
                      ->update(['predeterminada' => false]);
            }
        });
    }
    public function ubigeo()
    {
        return $this->belongsTo(\App\Models\UbigeoInei::class, 'id_ubigeo', 'id_ubigeo');
    }
}