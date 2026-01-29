<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Resumen extends Model
{
    use HasFactory;

    protected $fillable = [
        'empresa_id',
        'fecha_resumen',
        'fecha_generacion',
        'correlativo',
        'identificador',
        'ticket',
        'cantidad_comprobantes',
        'total_gravado',
        'total_exonerado',
        'total_inafecto',
        'total_igv',
        'total_general',
        'xml_path',
        'cdr_path',
        'estado',
        'codigo_sunat',
        'mensaje_sunat',
        'fecha_envio',
        'fecha_procesamiento'
    ];

    protected $casts = [
        'fecha_resumen' => 'date',
        'fecha_generacion' => 'date',
        'fecha_envio' => 'datetime',
        'fecha_procesamiento' => 'datetime',
        'total_gravado' => 'decimal:2',
        'total_exonerado' => 'decimal:2',
        'total_inafecto' => 'decimal:2',
        'total_igv' => 'decimal:2',
        'total_general' => 'decimal:2',
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
        return $this->hasMany(ResumenDetalle::class);
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
