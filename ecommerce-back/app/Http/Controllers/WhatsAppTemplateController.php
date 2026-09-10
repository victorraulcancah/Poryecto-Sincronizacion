<?php

namespace App\Http\Controllers;

use App\Models\PlantillaNotificacion;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Edición del mensaje de WhatsApp que se manda al crear una cotización o
 * pedido desde el checkout, y estado/vinculación del microservicio.
 *
 * El link ({link}) no se edita acá: sale siempre de
 * config('whatsapp.link_ecommerce'), fijo — ver WhatsAppService y la
 * plantilla COTIZACION_CREADA_WHATSAPP.
 */
class WhatsAppTemplateController extends Controller
{
    private const CODIGO = 'COTIZACION_CREADA_WHATSAPP';

    /** El mensaje configurable, más el estado del microservicio. */
    public function show(WhatsAppService $whatsapp)
    {
        $plantilla = PlantillaNotificacion::where('codigo', self::CODIGO)->first();

        if (!$plantilla) {
            return response()->json(['message' => 'Plantilla no encontrada'], 404);
        }

        return response()->json([
            'contenido' => $plantilla->contenido,
            'activo' => $plantilla->activo,
            'variables' => $plantilla->variables,
            'link_ecommerce' => config('whatsapp.link_ecommerce'),
            'habilitado' => (bool) config('whatsapp.habilitado'),
            'conexion' => $whatsapp->estado(),
        ]);
    }

    /** Solo el texto del mensaje y si está activo — el link no se edita acá. */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'contenido' => 'required|string|max:2000',
            'activo' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plantilla = PlantillaNotificacion::where('codigo', self::CODIGO)->first();

        if (!$plantilla) {
            return response()->json(['message' => 'Plantilla no encontrada'], 404);
        }

        $plantilla->update([
            'contenido' => $request->contenido,
            'activo' => $request->boolean('activo', $plantilla->activo),
        ]);

        return response()->json([
            'message' => 'Mensaje actualizado correctamente',
            'contenido' => $plantilla->contenido,
            'activo' => $plantilla->activo,
        ]);
    }

    /** Fuerza un QR nuevo para vincular otro teléfono. */
    public function desvincular(WhatsAppService $whatsapp)
    {
        $ok = $whatsapp->desvincular();

        return response()->json([
            'desvinculado' => $ok,
            'message' => $ok
                ? 'Sesión cerrada. Escanea el QR nuevo desde el microservicio.'
                : 'No se pudo desvincular — revisa que el microservicio esté corriendo.',
        ], $ok ? 200 : 500);
    }
}
