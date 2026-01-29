<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'tipo_documento',
        'numero_documento',
        'razon_social',
        'nombre_comercial',
        'direccion',
        'telefono',
        'email',
        'contacto_nombre',
        'contacto_telefono',
        'dias_credito',
        'limite_credito',
        'activo',
        'observaciones'
    ];

    protected $casts = [
        'dias_credito' => 'integer',
        'limite_credito' => 'decimal:2',
        'activo' => 'boolean'
    ];

    public function cuentasPorPagar()
    {
        return $this->hasMany(CuentaPorPagar::class);
    }

    public function compras()
    {
        return $this->hasMany(Compra::class);
    }
}
