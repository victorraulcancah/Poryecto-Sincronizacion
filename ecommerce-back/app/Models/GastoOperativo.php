<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GastoOperativo extends Model
{
    use HasFactory;

    protected $table = 'gastos_operativos';

    protected $fillable = [
        'fecha',
        'categoria',
        'concepto',
        'monto',
        'comprobante_tipo',
        'comprobante_numero',
        'proveedor_id',
        'es_fijo',
        'es_recurrente',
        'descripcion',
        'user_id'
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
        'es_fijo' => 'boolean',
        'es_recurrente' => 'boolean'
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
