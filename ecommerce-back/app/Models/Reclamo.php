<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\UserCliente;

class Reclamo extends Model
{
    use HasFactory;

    protected $table = 'reclamos';

    protected $fillable = [
        'numero_reclamo',
        'user_cliente_id',
        
        // Datos del consumidor
        'consumidor_nombre',
        'consumidor_dni',
        'consumidor_direccion',
        'consumidor_telefono',
        'consumidor_email',
        
        // Menor de edad
        'es_menor_edad',
        'apoderado_nombre',
        'apoderado_dni',
        'apoderado_direccion',
        'apoderado_telefono',
        'apoderado_email',
        
        // Identificación del bien contratado
        'tipo_bien',
        'monto_reclamado',
        'descripcion_bien',
        
        // Detalle de la reclamación
        'tipo_solicitud',
        'detalle_reclamo',
        'pedido_consumidor',
        
        // Respuesta del proveedor
        'respuesta_proveedor',
        'fecha_respuesta',
        
        // Estados del reclamo
        'estado',
        'fecha_limite_respuesta'
    ];

    protected $casts = [
        'es_menor_edad' => 'boolean',
        'monto_reclamado' => 'decimal:2',
        'fecha_respuesta' => 'date',
        'fecha_limite_respuesta' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relación con el cliente del e-commerce
    public function user_cliente()
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    // Scopes para filtrar
    public function scopePendientes($query)
    {
        return $query->where('estado', 'pendiente');
    }

    public function scopeEnProceso($query)
    {
        return $query->where('estado', 'en_proceso');
    }

    public function scopeResueltos($query)
    {
        return $query->where('estado', 'resuelto');
    }

    public function scopeCerrados($query)
    {
        return $query->where('estado', 'cerrado');
    }

    public function scopeVencidos($query)
    {
        return $query->where('fecha_limite_respuesta', '<', now()->toDateString())
            ->whereIn('estado', ['pendiente', 'en_proceso']);
    }

    // Accessors
    public function getEstadoLabelAttribute()
    {
        $estados = [
            'pendiente' => 'Pendiente',
            'en_proceso' => 'En Proceso',
            'resuelto' => 'Resuelto',
            'cerrado' => 'Cerrado'
        ];

        return $estados[$this->estado] ?? 'Desconocido';
    }

    public function getTipoSolicitudLabelAttribute()
    {
        return $this->tipo_solicitud === 'reclamo' ? 'Reclamo' : 'Queja';
    }

    public function getTipoBienLabelAttribute()
    {
        return $this->tipo_bien === 'producto' ? 'Producto' : 'Servicio';
    }

    // Verificar si el reclamo está vencido
    public function getIsVencidoAttribute()
    {
        return $this->fecha_limite_respuesta < now()->toDateString() 
            && in_array($this->estado, ['pendiente', 'en_proceso']);
    }

    // Obtener días restantes para respuesta
    public function getDiasRestantesAttribute()
    {
        if (in_array($this->estado, ['resuelto', 'cerrado'])) {
            return 0;
        }

        $diasRestantes = now()->diffInDays($this->fecha_limite_respuesta, false);
        return $diasRestantes >= 0 ? $diasRestantes : 0;
    }

    // Obtener el nombre completo del responsable (consumidor o apoderado)
    public function getNombreResponsableAttribute()
    {
        return $this->es_menor_edad ? $this->apoderado_nombre : $this->consumidor_nombre;
    }

    public function getEmailResponsableAttribute()
    {
        return $this->es_menor_edad ? $this->apoderado_email : $this->consumidor_email;
    }

    // Formatear el número de reclamo para mostrar
    public function getNumeroReclamoFormateadoAttribute()
    {
        return strtoupper($this->numero_reclamo);
    }
}