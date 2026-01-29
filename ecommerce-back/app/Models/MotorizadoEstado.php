<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MotorizadoEstado extends Model
{
    use HasFactory;

    protected $table = 'motorizado_estados';

    protected $fillable = [
        'motorizado_id',
        'estado',
        'latitud',
        'longitud',
        'ultima_actividad'
    ];

    protected $casts = [
        'latitud' => 'decimal:8',
        'longitud' => 'decimal:8',
        'ultima_actividad' => 'datetime'
    ];

    public function motorizado()
    {
        return $this->belongsTo(Motorizado::class);
    }

    public function userMotorizado()
    {
        return $this->belongsTo(UserMotorizado::class, 'motorizado_id', 'motorizado_id');
    }

    // Scopes
    public function scopeDisponibles($query)
    {
        return $query->where('estado', 'disponible');
    }

    public function scopeOcupados($query)
    {
        return $query->where('estado', 'ocupado');
    }

    public function scopeEnRuta($query)
    {
        return $query->where('estado', 'en_ruta');
    }

    // Métodos estáticos
    public static function actualizarEstado($motorizadoId, $estado, $latitud = null, $longitud = null)
    {
        return self::updateOrCreate(
            ['motorizado_id' => $motorizadoId],
            [
                'estado' => $estado,
                'latitud' => $latitud,
                'longitud' => $longitud,
                'ultima_actividad' => now()
            ]
        );
    }

    public static function motorizadosDisponibles()
    {
        return self::disponibles()
                   ->whereHas('motorizado', function($q) {
                       $q->where('estado', true);
                   })
                   ->whereHas('userMotorizado', function($q) {
                       $q->where('is_active', true);
                   })
                   ->get();
    }
}