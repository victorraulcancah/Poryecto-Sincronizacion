<?php
// app/Models/EmpresaValor.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpresaValor extends Model
{
    protected $table = 'empresa_valores';

    protected $fillable = [
        'titulo',
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
