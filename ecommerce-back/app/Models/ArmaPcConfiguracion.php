<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArmaPcConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'arma_pc_configuracion';

    protected $fillable = [
        'categoria_id',
        'orden',
        'activo',
        'nombre_paso',
        'descripcion_paso',
        'es_requerido'
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
        'es_requerido' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Relación con la categoría
     */
    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    /**
     * Scope para configuraciones activas
     */
    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }

    /**
     * Scope para ordenar por orden
     */
    public function scopeOrdenado($query)
    {
        return $query->orderBy('orden', 'asc');
    }

    /**
     * Método estático para obtener categorías configuradas
     */
    public static function getCategoriasConfiguradas()
    {
        return self::activas()
            ->ordenado()
            ->with(['categoria' => function($query) {
                $query->activas()
                      ->withCount(['productos' => function($q) {
                          $q->where('activo', true)->where('stock', '>', 0);
                      }]);
            }])
            ->get()
            ->map(function($config) {
                $categoria = $config->categoria;
                if ($categoria) {
                    // Agregar información del paso y compatibilidad
                    $categoria->paso_info = [
                        'orden' => $config->orden,
                        'nombre_paso' => $config->nombre_paso ?: "Paso {$config->orden}",
                        'descripcion_paso' => $config->descripcion_paso,
                        'es_requerido' => $config->es_requerido
                    ];
                    
                    // Agregar la URL completa de la imagen
                    if ($categoria->imagen) {
                        $categoria->img = asset('storage/categorias/' . $categoria->imagen);
                    }
                    return $categoria;
                }
                return null;
            })
            ->filter(); // Eliminar nulls
    }

    /**
     * Relación con compatibilidades donde esta categoría es principal
     */
    public function compatibilidadesPrincipales()
    {
        return $this->hasMany(CategoriaCompatibilidad::class, 'categoria_principal_id', 'categoria_id');
    }

    /**
     * Relación con compatibilidades donde esta categoría es compatible
     */
    public function compatibilidadesCompatibles()
    {
        return $this->hasMany(CategoriaCompatibilidad::class, 'categoria_compatible_id', 'categoria_id');
    }

    /**
     * Boot method para eventos del modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Cuando se crea una nueva configuración, asegurar orden único
        static::creating(function ($configuracion) {
            if (!$configuracion->orden) {
                $maxOrden = self::max('orden') ?? 0;
                $configuracion->orden = $maxOrden + 1;
            }
        });
    }
}