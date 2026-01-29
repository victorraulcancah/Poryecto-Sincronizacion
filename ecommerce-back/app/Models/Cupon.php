<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cupon extends Model
{
    use HasFactory;

    protected $table = 'cupones';

    protected $fillable = [
        'codigo',
        'titulo',
        'descripcion',
        'tipo_descuento',
        'valor_descuento',
        'compra_minima',
        'fecha_inicio',
        'fecha_fin',
        'limite_uso',
        'usos_actuales',
        'solo_primera_compra',
        'activo'
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'valor_descuento' => 'decimal:2',
        'compra_minima' => 'decimal:2',
        'solo_primera_compra' => 'boolean',
        'activo' => 'boolean'
    ];

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeVigentes($query)
    {
        return $query->where('activo', true)
                    ->where('fecha_inicio', '<=', now())
                    ->where('fecha_fin', '>=', now());
    }

    public function scopeDisponibles($query)
    {
        return $query->vigentes()
                    ->where(function($q) {
                        $q->whereNull('limite_uso')
                          ->orWhereRaw('usos_actuales < limite_uso');
                    });
    }

    // Métodos de utilidad
    public function calcularDescuento($total)
    {
        if ($this->tipo_descuento === 'porcentaje') {
            return $total * ($this->valor_descuento / 100);
        }
        return min($this->valor_descuento, $total);
    }

    public function puedeUsarse($total = 0, $esPrimeraCompra = false)
    {
        // Verificar si está activo y vigente
        if (!$this->activo || !$this->estaVigente()) {
            return false;
        }

        // Verificar límite de uso
        if ($this->limite_uso && $this->usos_actuales >= $this->limite_uso) {
            return false;
        }

        // Verificar compra mínima
        if ($this->compra_minima && $total < $this->compra_minima) {
            return false;
        }

        // Verificar si es solo para primera compra
        if ($this->solo_primera_compra && !$esPrimeraCompra) {
            return false;
        }

        return true;
    }

    public function estaVigente()
    {
        return $this->fecha_inicio <= now() && $this->fecha_fin >= now();
    }

    public function incrementarUso()
    {
        $this->increment('usos_actuales');
    }
}