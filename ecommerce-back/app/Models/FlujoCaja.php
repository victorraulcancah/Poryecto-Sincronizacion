<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlujoCaja extends Model
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

    protected $appends = ['desviacion', 'desviacion_porcentaje'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getDesviacionAttribute()
    {
        if ($this->monto_real === null) {
            return null;
        }
        return $this->monto_real - $this->monto_proyectado;
    }

    public function getDesviacionPorcentajeAttribute()
    {
        if ($this->monto_real === null || $this->monto_proyectado == 0) {
            return null;
        }
        return (($this->monto_real - $this->monto_proyectado) / $this->monto_proyectado) * 100;
    }
}
