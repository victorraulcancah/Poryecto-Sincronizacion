<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BajaDetalle extends Model
{
    use HasFactory;

    protected $table = 'bajas_detalle';

    protected $fillable = [
        'baja_id',
        'comprobante_id',
        'tipo_comprobante',
        'serie',
        'numero',
        'motivo'
    ];

    protected $casts = [
        'created_at' => 'datetime'
    ];

    // Relaciones
    public function baja()
    {
        return $this->belongsTo(Baja::class);
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }
}
