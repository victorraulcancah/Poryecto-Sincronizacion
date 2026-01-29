<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_documento',
        'numero_documento',
        'razon_social',
        'nombre_comercial',
        'direccion',
        'ubigeo',
        // 'distrito',
        // 'provincia',
        // 'departamento',
        'telefono',
        'email',
        'activo',
        'user_id'
    ];

    protected $casts = [
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function comprobantes()
    {
        return $this->hasMany(Comprobante::class);
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopePorTipoDocumento($query, $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    // Accessors
    public function getTipoDocumentoNombreAttribute()
    {
        $tipos = [
            '1' => 'DNI',
            '4' => 'Carnet de Extranjería',
            '6' => 'RUC',
            '7' => 'Pasaporte',
            '0' => 'DOC.TRIB.NO.DOM.SIN.RUC'
        ];

        return $tipos[$this->tipo_documento] ?? 'Desconocido';
    }

    public function getNombreCompletoAttribute()
    {
        return $this->nombre_comercial ?: $this->razon_social;
    }

    public function getEsEmpresaAttribute()
    {
        return $this->tipo_documento === '6'; // RUC
    }

    // Métodos de utilidad
    public static function tiposDocumento()
    {
        return [
            '1' => 'DNI',
            '4' => 'Carnet de Extranjería', 
            '6' => 'RUC',
            '7' => 'Pasaporte',
            '0' => 'DOC.TRIB.NO.DOM.SIN.RUC'
        ];
    }

    public function puedeEliminar()
    {
        return $this->comprobantes()->count() === 0 && $this->ventas()->count() === 0;
    }
}