<?php
// app/Models/EmpresaHito.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpresaHito extends Model
{
    protected $table = 'empresa_hitos';

    protected $fillable = [
        'anio',
        'descripcion',
        'imagen',
        'orden',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
