<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantillaNotificacion extends Model
{
    use HasFactory;

    protected $table = 'plantillas_notificacion';

    protected $fillable = [
        'codigo',
        'nombre',
        'tipo',
        'canal',
        'asunto',
        'contenido',
        'variables',
        'activo'
    ];

    protected $casts = [
        'variables' => 'array',
        'activo' => 'boolean'
    ];

    /**
     * Reemplazar variables en el contenido
     */
    public function renderizar($datos)
    {
        $contenido = $this->contenido;
        $asunto = $this->asunto;

        foreach ($datos as $key => $value) {
            $contenido = str_replace('{' . $key . '}', $value, $contenido);
            if ($asunto) {
                $asunto = str_replace('{' . $key . '}', $value, $asunto);
            }
        }

        return [
            'asunto' => $asunto,
            'contenido' => $contenido
        ];
    }
}
