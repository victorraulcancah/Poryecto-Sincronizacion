<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PedidoMotorizado extends Model
{
    use HasFactory;

    protected $table = 'pedido_motorizado';

    protected $fillable = [
        'pedido_id',
        'motorizado_id',
        'asignado_por',
        'estado_asignacion',
        'fecha_asignacion',
        'fecha_aceptacion',
        'fecha_inicio',
        'fecha_entrega',
        'observaciones'
    ];

    protected $casts = [
        'fecha_asignacion' => 'datetime',
        'fecha_aceptacion' => 'datetime',
        'fecha_inicio' => 'datetime',
        'fecha_entrega' => 'datetime'
    ];

    // Relaciones
    public function pedido()
    {
        return $this->belongsTo(Pedido::class);
    }

    public function motorizado()
    {
        return $this->belongsTo(Motorizado::class);
    }

    public function userMotorizado()
    {
        return $this->belongsTo(UserMotorizado::class, 'motorizado_id', 'motorizado_id');
    }

    public function asignadoPor()
    {
        return $this->belongsTo(User::class, 'asignado_por');
    }

    // Scopes
    public function scopeAsignados($query)
    {
        return $query->where('estado_asignacion', 'asignado');
    }

    public function scopeAceptados($query)
    {
        return $query->where('estado_asignacion', 'aceptado');
    }

    public function scopeEnCamino($query)
    {
        return $query->where('estado_asignacion', 'en_camino');
    }

    public function scopeEntregados($query)
    {
        return $query->where('estado_asignacion', 'entregado');
    }

    public function scopeCancelados($query)
    {
        return $query->where('estado_asignacion', 'cancelado');
    }

    public function scopeActivos($query)
    {
        return $query->whereIn('estado_asignacion', ['asignado', 'aceptado', 'en_camino']);
    }

    // Métodos de acción
    public function aceptar()
    {
        $this->update([
            'estado_asignacion' => 'aceptado',
            'fecha_aceptacion' => now()
        ]);

        // Actualizar estado del motorizado
        MotorizadoEstado::actualizarEstado($this->motorizado_id, 'ocupado');
    }

    public function iniciarRuta()
    {
        $this->update([
            'estado_asignacion' => 'en_camino',
            'fecha_inicio' => now()
        ]);

        // Actualizar estado del motorizado
        MotorizadoEstado::actualizarEstado($this->motorizado_id, 'en_ruta');
    }

    public function completarEntrega($observaciones = null)
    {
        $this->update([
            'estado_asignacion' => 'entregado',
            'fecha_entrega' => now(),
            'observaciones' => $observaciones
        ]);

        // Actualizar estado del motorizado a disponible
        MotorizadoEstado::actualizarEstado($this->motorizado_id, 'disponible');
    }

    public function cancelar($observaciones = null)
    {
        $this->update([
            'estado_asignacion' => 'cancelado',
            'observaciones' => $observaciones
        ]);

        // Actualizar estado del motorizado a disponible
        MotorizadoEstado::actualizarEstado($this->motorizado_id, 'disponible');
    }

    // Accessors
    public function getTiempoAsignacionAttribute()
    {
        if (!$this->fecha_entrega) {
            return now()->diffInMinutes($this->fecha_asignacion);
        }
        return $this->fecha_entrega->diffInMinutes($this->fecha_asignacion);
    }

    public function getTiempoEntregaAttribute()
    {
        if (!$this->fecha_inicio || !$this->fecha_entrega) {
            return null;
        }
        return $this->fecha_entrega->diffInMinutes($this->fecha_inicio);
    }
}