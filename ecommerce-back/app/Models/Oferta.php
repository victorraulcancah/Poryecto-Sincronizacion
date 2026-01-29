<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Oferta extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'subtitulo',
        'descripcion',
        'tipo_descuento',
        'valor_descuento',
        'fecha_inicio',
        'fecha_fin',
        'imagen',
        'color_fondo',
        'texto_boton',
        'enlace_url',
        'prioridad',
        'activo',
        'es_oferta_principal',
        'es_oferta_semana'
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'activo' => 'boolean',
        'es_oferta_principal' => 'boolean',
        'es_oferta_semana' => 'boolean',
        'valor_descuento' => 'decimal:2'
    ];

    // ✅ ACCESSORS CORREGIDOS PARA QUE APAREZCAN EN EL JSON
    protected $appends = ['imagen_url'];

    // Relaciones
    public function tipoOferta()
    {
        return $this->belongsTo(TipoOferta::class);
    }

    public function productos()
    {
        return $this->hasMany(OfertaProducto::class);
    }

    // ✅ ACCESSORS CORREGIDOS
    public function getImagenUrlAttribute()
    {
        if (!$this->imagen) {
            return null;
        }

        // Si ya contiene la URL completa, devolverla tal como está
        if (str_starts_with($this->imagen, 'http')) {
            return $this->imagen;
        }

        return asset('storage/' . $this->imagen);
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('activo', true)
            ->where('fecha_inicio', '<=', now())
            ->where('fecha_fin', '>=', now());
    }

    // ✅ SCOPE: Oferta principal del día
    public function scopeOfertaPrincipal($query)
    {
        return $query->where('es_oferta_principal', true);
    }
    public function scopeOfertaSemana($query)
    {
        return $query->where('es_oferta_semana', true);
    }

    // Métodos de utilidad
    public function calcularPrecioOferta($precioOriginal)
    {
        if ($this->tipo_descuento === 'porcentaje') {
            return $precioOriginal * (1 - $this->valor_descuento / 100);
        }
        return max(0, $precioOriginal - $this->valor_descuento);
    }

    public function estaVigente()
    {
        return $this->activo &&
            $this->fecha_inicio <= now() &&
            $this->fecha_fin >= now();
    }

    // ✅ NUEVO MÉTODO: Marcar como oferta principal
    public function marcarComoPrincipal()
    {
        \Log::info('🎯 marcarComoPrincipal() - Iniciando para oferta ID: ' . $this->id);
        
        // ✅ USAR TRANSACCIÓN EXPLÍCITA para garantizar consistencia
        \DB::transaction(function () {
            // Primero, quitar el estado principal de todas las demás ofertas
            $affected = \DB::table('ofertas')->where('es_oferta_principal', 1)->update(['es_oferta_principal' => 0]);
            \Log::info('🎯 marcarComoPrincipal() - Ofertas desmarcadas: ' . $affected);

            // Luego, marcar esta oferta como principal usando query directa
            $updated = \DB::table('ofertas')->where('id', $this->id)->update(['es_oferta_principal' => 1]);
            \Log::info('🎯 marcarComoPrincipal() - Query directa ejecutada. Filas afectadas: ' . $updated);
        });
        
        // Verificar que se actualizó correctamente
        $this->refresh();
        \Log::info('🎯 marcarComoPrincipal() - Verificación final. es_oferta_principal = ' . ($this->es_oferta_principal ? 'TRUE' : 'FALSE'));
    }

    // ✅ NUEVO MÉTODO: Quitar estado principal
    public function quitarEstadoPrincipal()
    {
        $this->update(['es_oferta_principal' => false]);
    }
    public function marcarComoOfertaSemana()
    {
        \Log::info('📅 marcarComoOfertaSemana() - Iniciando para oferta ID: ' . $this->id);
        
        // ✅ USAR TRANSACCIÓN EXPLÍCITA para garantizar consistencia
        \DB::transaction(function () {
            // Quitar el estado de oferta de la semana de todas las demás ofertas
            $affected = \DB::table('ofertas')->where('es_oferta_semana', 1)->update(['es_oferta_semana' => 0]);
            \Log::info('📅 marcarComoOfertaSemana() - Ofertas desmarcadas: ' . $affected);

            // Marcar esta oferta como oferta de la semana usando query directa
            $updated = \DB::table('ofertas')->where('id', $this->id)->update(['es_oferta_semana' => 1]);
            \Log::info('📅 marcarComoOfertaSemana() - Query directa ejecutada. Filas afectadas: ' . $updated);
        });
        
        // Verificar que se actualizó correctamente
        $this->refresh();
        \Log::info('📅 marcarComoOfertaSemana() - Verificación final. es_oferta_semana = ' . ($this->es_oferta_semana ? 'TRUE' : 'FALSE'));
    }

    public function quitarEstadoOfertaSemana()
    {
        $this->update(['es_oferta_semana' => false]);
    }

    // ✅ NUEVO MÉTODO ESTÁTICO: Obtener oferta principal activa
    public static function obtenerOfertaPrincipalActiva()
    {
        return static::with(['productos.producto'])
            ->activas()
            ->ofertaPrincipal()
            ->first();
    }
    public static function obtenerOfertaSemanaActiva()
{
    return static::with(['productos.producto'])
        ->activas()
        ->ofertaSemana()
        ->first();
}
}