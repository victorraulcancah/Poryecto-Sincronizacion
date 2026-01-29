<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UbigeoInei extends Model
{
    protected $table = 'ubigeo_inei';
    protected $primaryKey = 'id_ubigeo';
    public $timestamps = false; // La tabla no tiene timestamps
    
    protected $fillable = [
        'id_ubigeo',
        'departamento',
        'provincia',
        'distrito',
        'nombre'
    ];

    // Accessors para obtener nombres en lugar de códigos
    public function getDepartamentoNombreAttribute()
    {
        $departamento = static::where('departamento', $this->departamento)
            ->where('provincia', '00')
            ->where('distrito', '00')
            ->first();
        return $departamento ? $departamento->nombre : 'N/A';
    }

    public function getProvinciaNombreAttribute()
    {
        $provincia = static::where('departamento', $this->departamento)
            ->where('provincia', $this->provincia)
            ->where('distrito', '00')
            ->first();
        return $provincia ? $provincia->nombre : 'N/A';
    }

    public function getDistritoNombreAttribute()
    {
        return $this->nombre; // El nombre del distrito ya está en el campo 'nombre'
    }

    // Scope para obtener departamentos
    // Eliminar estos métodos si existen:
    // public static function departamentos()
    // public static function provinciasPorDepartamento()  
    // public static function distritosPorProvincia()

    // No necesitas scopes adicionales, las consultas están directamente en el controlador
   
}
