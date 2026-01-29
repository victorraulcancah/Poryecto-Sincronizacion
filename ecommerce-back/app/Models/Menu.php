<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    use HasFactory;

    protected $table = 'menus';

    protected $fillable = [
        'nombre',
        'url',
        'icono',
        'orden',
        'padre_id',
        'tipo',
        'target',
        'visible'
    ];

    protected $casts = [
        'visible' => 'boolean',
        'orden' => 'integer',
    ];

    // Relación con el menú padre
    public function padre()
    {
        return $this->belongsTo(Menu::class, 'padre_id');
    }

    // Relación con los submenús (hijos)
    public function hijos()
    {
        return $this->hasMany(Menu::class, 'padre_id')->where('visible', true)->orderBy('orden');
    }

    // Scope para obtener solo menús visibles
    public function scopeVisibles($query)
    {
        return $query->where('visible', true);
    }

    // Scope para obtener menús por tipo
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    // Scope para obtener solo menús principales (sin padre)
    public function scopePrincipales($query)
    {
        return $query->whereNull('padre_id');
    }
}
