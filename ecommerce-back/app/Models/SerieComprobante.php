<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SerieComprobante extends Model
{
    use HasFactory;

    protected $table = 'series_comprobantes';

    protected $fillable = [
        'tipo_comprobante',
        'serie',
        'correlativo',
        'activo',
        'sede_id',
        'caja_id',
        'descripcion'
    ];

    protected $casts = [
        'correlativo' => 'integer',
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function comprobantes()
    {
        return $this->hasMany(Comprobante::class, 'serie', 'serie')
                    ->where('tipo_comprobante', $this->tipo_comprobante);
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }

    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo_comprobante', $tipo);
    }

    // Accessors
    public function getTipoComprobanteNombreAttribute()
    {
        $tipos = [
            '01' => 'Factura',
            '03' => 'Boleta de Venta',
            '07' => 'Nota de Crédito',
            '08' => 'Nota de Débito'
        ];

        return $tipos[$this->tipo_comprobante] ?? 'Desconocido';
    }

    // Métodos estáticos
    public static function tiposComprobante()
    {
        return [
            '01' => 'Factura',
            '03' => 'Boleta de Venta',
            '07' => 'Nota de Crédito', 
            '08' => 'Nota de Débito'
        ];
    }

    // Métodos de utilidad
    public function siguienteCorrelativo()
    {
        $this->increment('correlativo');
        return $this->correlativo;
    }

    public function proximoNumero()
    {
        return $this->serie . '-' . str_pad($this->correlativo + 1, 8, '0', STR_PAD_LEFT);
    }
}