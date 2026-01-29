<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CajaMovimiento extends Model
{
    use HasFactory;

    protected $table = 'caja_movimientos';

    protected $fillable = [
        'caja_id',
        'user_id',
        'fecha',
        'hora',
        'monto_inicial',
        'monto_final',
        'monto_sistema',
        'diferencia',
        'observaciones',
        'estado'
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto_inicial' => 'decimal:2',
        'monto_final' => 'decimal:2',
        'monto_sistema' => 'decimal:2',
        'diferencia' => 'decimal:2'
    ];

    public function caja()
    {
        return $this->belongsTo(Caja::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transacciones()
    {
        return $this->hasMany(CajaTransaccion::class);
    }
}
