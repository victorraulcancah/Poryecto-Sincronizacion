<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoPrecio extends Model
{
    protected $table = 'tipos_precio';

    protected $fillable = [
        'nombre',
        'tipo_moneda',
        'activo',
        'es_predeterminado',
        'es_para_invitados',
        'tipo_precio_7power_id',
        'company_id',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'es_predeterminado' => 'boolean',
        'es_para_invitados' => 'boolean',
    ];

    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'producto_precios', 'tipo_precio_id', 'producto_id')
            ->withPivot('precio')
            ->withTimestamps();
    }

    public function precios()
    {
        return $this->hasMany(ProductoPrecio::class, 'tipo_precio_id');
    }

    /**
     * Tipo de precio predeterminado para clientes registrados.
     */
    public static function predeterminado()
    {
        return static::where('es_predeterminado', true)->where('activo', true)->first();
    }

    /**
     * Tipo de precio para visitantes no logueados.
     */
    public static function paraInvitados()
    {
        return static::where('es_para_invitados', true)->where('activo', true)->first();
    }
}
