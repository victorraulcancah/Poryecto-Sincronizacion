<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlujoCajaProyeccion extends Model
{
    use HasFactory;

    protected $table = 'flujo_caja_proyecciones';

    protected $fillable = [
        'fecha',
        'tipo',
        'concepto',
        'monto_proyectado',
        'monto_real',
        'categoria',
        'estado',
        'recurrente',
        'frecuencia',
        'observaciones',
        'user_id'
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto_proyectado' => 'decimal:2',
        'monto_real' => 'decimal:2',
        'recurrente' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
