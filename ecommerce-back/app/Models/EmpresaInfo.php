<?php
// app/Models/EmpresaInfo.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmpresaInfo extends Model
{
    use HasFactory;

    protected $table = 'empresa_info';

    protected $fillable = [
        'nombre_empresa',
        'ruc',
        'razon_social',
        'direccion',
        'ubigeo',
        'departamento',
        'provincia',
        'distrito',
        'urbanizacion',
        'codigo_local',
        'telefono',
        'celular',
        'email',
        'sol_usuario',
        'sol_clave',
        'sol_endpoint',
        'website',
        'logo',
        'color_navbar',
        'descripcion',
        'sobre_nosotros',
        'imagen_introduccion',
        'facebook',
        'instagram',
        'twitter',
        'youtube',
        'tiktok',
        'whatsapp',
        'horario_atencion',
        'metodos_pago'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'metodos_pago' => 'array',
    ];
}
