<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClienteDireccion extends Model
{
     use HasFactory;

    protected $table = 'clientes_direcciones';
    protected $primaryKey = 'id_direccion';
    public $timestamps = false;

    protected $fillable = [
        'id_cliente',
        'nombre_destinatario',
        'direccion_completa',
        'ubigeo_id',
        'codigo_postal',
        'predeterminada',
        'fecha_creacion'
    ];

    protected $casts = [
        'predeterminada' => 'boolean',
        'fecha_agregada' => 'datetime'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    public function ubigeo()
    {
        return $this->belongsTo(UbigeoInei::class, 'ubigeo_id', 'id_ubigeo');
    }
}
