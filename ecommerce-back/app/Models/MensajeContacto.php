<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Mensaje enviado desde el formulario público de "Contáctanos".
 */
class MensajeContacto extends Model
{
    protected $table = 'mensajes_contacto';

    protected $fillable = [
        'nombre',
        'email',
        'telefono',
        'asunto',
        'mensaje',
        'ip',
        'leido',
        'leido_at',
    ];

    protected $casts = [
        'leido' => 'boolean',
        'leido_at' => 'datetime',
    ];

    /**
     * La bandeja de trabajo: los mensajes sin leer, más los que se leyeron
     * hoy. Un mensaje leído desaparece de la lista a medianoche.
     *
     * Los leídos de antes siguen en la base y se alcanzan con el historial,
     * el filtro de fechas y la exportación.
     */
    public function scopeBandeja($query)
    {
        return $query->where(function ($q) {
            $q->where('leido', false)
                ->orWhere('leido_at', '>=', now()->startOfDay());
        });
    }
}
