<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class UserMotorizado extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'sanctum';

    protected $table = 'user_motorizados';

    protected $fillable = [
        'motorizado_id',
        'username',
        'password',
        'is_active',
        'last_login_at'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function motorizado()
    {
        return $this->belongsTo(Motorizado::class, 'motorizado_id');
    }

    public function estado()
    {
        return $this->hasOne(MotorizadoEstado::class, 'motorizado_id', 'motorizado_id');
    }

    public function asignaciones()
    {
        return $this->hasMany(PedidoMotorizado::class, 'motorizado_id', 'motorizado_id');
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDisponibles($query)
    {
        return $query->whereHas('estado', function($q) {
            $q->where('estado', 'disponible');
        });
    }

    // Accessors
    public function getNombreCompletoAttribute()
    {
        return $this->motorizado ? $this->motorizado->nombre_completo : '';
    }

    public function getNumeroUnidadAttribute()
    {
        return $this->motorizado ? $this->motorizado->numero_unidad : '';
    }

    public function getEstadoActualAttribute()
    {
        return $this->estado ? $this->estado->estado : 'offline';
    }

    // Métodos de utilidad
    public function actualizarUltimoLogin()
    {
        $this->update(['last_login_at' => now()]);
    }

    public function cambiarEstado($nuevoEstado, $latitud = null, $longitud = null)
    {
        return MotorizadoEstado::updateOrCreate(
            ['motorizado_id' => $this->motorizado_id],
            [
                'estado' => $nuevoEstado,
                'latitud' => $latitud,
                'longitud' => $longitud,
                'ultima_actividad' => now()
            ]
        );
    }

    public function pedidosAsignados()
    {
        return $this->hasMany(PedidoMotorizado::class, 'motorizado_id', 'motorizado_id')
                    ->whereIn('estado_asignacion', ['asignado', 'aceptado', 'en_camino']);
    }

    public function pedidosCompletados()
    {
        return $this->hasMany(PedidoMotorizado::class, 'motorizado_id', 'motorizado_id')
                    ->where('estado_asignacion', 'entregado');
    }

    public function estadisticasDelDia()
    {
        $hoy = now()->format('Y-m-d');

        return [
            'pedidos_asignados' => $this->pedidosAsignados()->whereDate('fecha_asignacion', $hoy)->count(),
            'pedidos_entregados' => $this->pedidosCompletados()->whereDate('fecha_entrega', $hoy)->count(),
            'pedidos_pendientes' => $this->pedidosAsignados()->count(),
        ];
    }

    // Verificar si puede recibir nuevos pedidos
    public function puedeRecibirPedidos()
    {
        return $this->is_active &&
               $this->motorizado->estado &&
               in_array($this->estado_actual, ['disponible', 'en_ruta']);
    }
}