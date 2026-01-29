<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoriaCompatibilidad extends Model
{
    use HasFactory;

    protected $table = 'categoria_compatibilidades';

    protected $fillable = [
        'categoria_principal_id',
        'categoria_compatible_id'
    ];

    protected $casts = [
        'categoria_principal_id' => 'integer',
        'categoria_compatible_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Relación con la categoría principal
     */
    public function categoriaPrincipal()
    {
        return $this->belongsTo(Categoria::class, 'categoria_principal_id');
    }

    /**
     * Relación con la categoría compatible
     */
    public function categoriaCompatible()
    {
        return $this->belongsTo(Categoria::class, 'categoria_compatible_id');
    }

    /**
     * Obtener categorías compatibles para una categoría específica
     */
    public static function getCategoriasCompatibles($categoriaId)
    {
        return self::where('categoria_principal_id', $categoriaId)
            ->with(['categoriaCompatible' => function($query) {
                $query->activas()
                      ->withCount(['productos' => function($q) {
                          $q->where('activo', true)->where('stock', '>', 0);
                      }]);
            }])
            ->get()
            ->pluck('categoriaCompatible')
            ->filter(); // Eliminar nulls
    }

    /**
     * Verificar si dos categorías son compatibles
     */
    public static function sonCompatibles($categoriaPrincipalId, $categoriaCompatibleId)
    {
        return self::where('categoria_principal_id', $categoriaPrincipalId)
            ->where('categoria_compatible_id', $categoriaCompatibleId)
            ->exists();
    }

    /**
     * Crear compatibilidad bidireccional
     */
    public static function crearCompatibilidadBidireccional($categoria1Id, $categoria2Id)
    {
        // Crear relación A -> B
        self::firstOrCreate([
            'categoria_principal_id' => $categoria1Id,
            'categoria_compatible_id' => $categoria2Id
        ]);

        // Crear relación B -> A
        self::firstOrCreate([
            'categoria_principal_id' => $categoria2Id,
            'categoria_compatible_id' => $categoria1Id
        ]);
    }

    /**
     * Eliminar compatibilidad bidireccional
     */
    public static function eliminarCompatibilidadBidireccional($categoria1Id, $categoria2Id)
    {
        // Eliminar relación A -> B
        self::where('categoria_principal_id', $categoria1Id)
            ->where('categoria_compatible_id', $categoria2Id)
            ->delete();

        // Eliminar relación B -> A
        self::where('categoria_principal_id', $categoria2Id)
            ->where('categoria_compatible_id', $categoria1Id)
            ->delete();
    }

    /**
     * Boot method para eventos del modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Validar que una categoría no sea compatible consigo misma
        static::creating(function ($compatibilidad) {
            if ($compatibilidad->categoria_principal_id === $compatibilidad->categoria_compatible_id) {
                throw new \InvalidArgumentException('Una categoría no puede ser compatible consigo misma');
            }
        });
    }
}