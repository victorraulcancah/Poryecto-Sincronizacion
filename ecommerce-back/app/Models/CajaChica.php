<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CajaChica extends Model
{
    use HasFactory;

    protected $table = 'caja_chica';

    protected $fillable = [
        'nombre',
        'codigo',
        'fondo_fijo',
        'saldo_actual',
        'responsable_id',
        'activo'
    ];

    protected $casts = [
        'fondo_fijo' => 'decimal:2',
        'saldo_actual' => 'decimal:2',
        'activo' => 'boolean'
    ];

    public function responsable()
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function movimientos()
    {
        return $this->hasMany(CajaChicaMovimiento::class);
    }
}
