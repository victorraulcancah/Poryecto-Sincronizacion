<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuiaRemisionDetalle extends Model
{
    use HasFactory;

    protected $table = 'guias_remision_detalle';

    protected $fillable = [
        'guia_remision_id',
        'item',
        'producto_id',
        'codigo_producto',
        'descripcion',
        'unidad_medida',
        'cantidad',
        'peso_unitario',
        'peso_total',
        'observaciones',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'cantidad' => 'decimal:2',
        'peso_unitario' => 'decimal:2',
        'peso_total' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function guiaRemision()
    {
        return $this->belongsTo(GuiaRemision::class);
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Accessors
    public function getUnidadMedidaNombreAttribute()
    {
        $unidades = [
            'KGM' => 'Kilogramo',
            'GRM' => 'Gramo',
            'LTR' => 'Litro',
            'MTK' => 'Metro cuadrado',
            'MTR' => 'Metro',
            'NIU' => 'Unidad',
            'PK' => 'Paquete',
            'BX' => 'Caja',
            'BG' => 'Bolsa',
            'SET' => 'Juego'
        ];

        return $unidades[$this->unidad_medida] ?? $this->unidad_medida;
    }

    // Scopes
    public function scopePorGuia($query, $guiaId)
    {
        return $query->where('guia_remision_id', $guiaId);
    }

    public function scopePorProducto($query, $productoId)
    {
        return $query->where('producto_id', $productoId);
    }

    // Métodos de utilidad
    public function calcularPesoTotal()
    {
        return $this->cantidad * $this->peso_unitario;
    }

    // Métodos estáticos
    public static function unidadesMedida()
    {
        return [
            'KGM' => 'Kilogramo',
            'GRM' => 'Gramo',
            'LTR' => 'Litro',
            'MTK' => 'Metro cuadrado',
            'MTR' => 'Metro',
            'NIU' => 'Unidad',
            'PK' => 'Paquete',
            'BX' => 'Caja',
            'BG' => 'Bolsa',
            'SET' => 'Juego'
        ];
    }
}
