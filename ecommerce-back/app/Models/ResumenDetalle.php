<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResumenDetalle extends Model
{
    use HasFactory;

    protected $table = 'resumenes_detalle';

    protected $fillable = [
        'resumen_id',
        'comprobante_id',
        'tipo_comprobante',
        'serie',
        'numero',
        'estado_item',
        'total',
        'igv'
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'igv' => 'decimal:2',
        'created_at' => 'datetime'
    ];

    // Relaciones
    public function resumen()
    {
        return $this->belongsTo(Resumen::class);
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }
}
