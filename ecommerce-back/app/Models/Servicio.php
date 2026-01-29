<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Servicio extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'codigo_servicio',
        'nombre',
        'descripcion',
        'precio',
        'mostrar_igv',
        'unidad_medida',
        'tipo_afectacion_igv',
        'activo',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'mostrar_igv' => 'boolean',
        'activo' => 'boolean',
    ];

    // Relaciones
    public function ventaDetalles()
    {
        return $this->hasMany(VentaDetalle::class);
    }
}
