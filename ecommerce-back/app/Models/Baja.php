<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Baja extends Model
{
    use HasFactory;

    protected $fillable = [
        'empresa_id',
        'fecha_baja',
        'fecha_generacion',
        'correlativo',
        'identificador',
        'ticket',
        'cantidad_comprobantes',
        'xml_path',
        'cdr_path',
        'estado',
        'codigo_sunat',
        'mensaje_sunat',
        'fecha_envio',
        'fecha_procesamiento'
    ];

    protected $casts = [
        'fecha_baja' => 'date',
        'fecha_generacion' => 'date',
        'fecha_envio' => 'datetime',
        'fecha_procesamiento' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function empresa()
    {
        return $this->belongsTo(EmpresaInfo::class, 'empresa_id');
    }

    public function detalles()
    {
        return $this->hasMany(BajaDetalle::class);
    }

    // Scopes
    public function scopePendientes($query)
    {
        return $query->where('estado', 'PENDIENTE');
    }

    public function scopeEnviados($query)
    {
        return $query->where('estado', 'ENVIADO');
    }

    public function scopeAceptados($query)
    {
        return $query->where('estado', 'ACEPTADO');
    }

    public function scopeRechazados($query)
    {
        return $query->where('estado', 'RECHAZADO');
    }
}
