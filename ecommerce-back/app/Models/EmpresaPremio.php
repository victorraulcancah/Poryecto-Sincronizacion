<?php
// app/Models/EmpresaPremio.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpresaPremio extends Model
{
    protected $table = 'empresa_premios';

    protected $fillable = [
        'titulo',
        'anio',
        'imagen',
        'orden',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
