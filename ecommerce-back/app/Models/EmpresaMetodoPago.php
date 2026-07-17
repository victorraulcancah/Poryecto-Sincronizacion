<?php
// app/Models/EmpresaMetodoPago.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpresaMetodoPago extends Model
{
    protected $table = 'empresa_metodos_pago';

    protected $fillable = [
        'nombre',
        'imagen',
        'orden',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
