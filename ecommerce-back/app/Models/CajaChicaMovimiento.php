<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CajaChicaMovimiento extends Model
{
    use HasFactory;

    protected $table = 'caja_chica_movimientos';

    protected $fillable = [
        'caja_chica_id',
        'tipo',
        'fecha',
        'monto',
        'categoria',
        'comprobante_tipo',
        'comprobante_numero',
        'proveedor',
        'descripcion',
        'archivo_adjunto',
        'estado',
        'user_id',
        'aprobado_por',
        'aprobado_at'
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
        'aprobado_at' => 'datetime'
    ];

    public function cajaChica()
    {
        return $this->belongsTo(CajaChica::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function aprobador()
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }
}
