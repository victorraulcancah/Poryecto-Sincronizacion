<?php
// app/Models/EmpresaBannerNosotros.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpresaBannerNosotros extends Model
{
    protected $table = 'empresa_banners_nosotros';

    protected $fillable = [
        'imagen',
        'titulo',
        'subtitulo',
        'orden',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
