<?php

namespace App\Http\Controllers;

use App\Models\EmpresaInfo;
use App\Models\MensajeContacto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Formulario público de "Contáctanos".
 */
class ContactoController extends Controller
{
    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:120',
            'email' => 'required|email|max:150',
            'telefono' => 'nullable|string|max:30',
            'asunto' => 'required|string|max:150',
            'mensaje' => 'required|string|max:2000',
        ]);

        $datos['ip'] = $request->ip();
        $mensaje = MensajeContacto::create($datos);

        // El aviso por correo es "mejor esfuerzo": si el SMTP está caído, el
        // mensaje ya quedó guardado y el cliente no tiene por qué ver un error.
        $destino = EmpresaInfo::query()->value('email');
        if ($destino) {
            try {
                Mail::raw(
                    "Nuevo mensaje desde el formulario de contacto\n\n"
                        . "Nombre: {$mensaje->nombre}\n"
                        . "Correo: {$mensaje->email}\n"
                        . "Teléfono: " . ($mensaje->telefono ?: '-') . "\n"
                        . "Asunto: {$mensaje->asunto}\n\n"
                        . $mensaje->mensaje,
                    function ($mail) use ($destino, $mensaje) {
                        $mail->to($destino)
                            ->subject("Contacto web: {$mensaje->asunto}")
                            ->replyTo($mensaje->email, $mensaje->nombre);
                    }
                );
            } catch (\Throwable $e) {
                Log::warning('No se pudo enviar el correo de contacto: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Mensaje recibido',
            'id' => $mensaje->id,
        ], 201);
    }

    /** Listado para el panel de administración. */
    public function index(Request $request)
    {
        $query = MensajeContacto::query()->latest();

        if ($request->boolean('solo_no_leidos')) {
            $query->where('leido', false);
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    /**
     * Cuántos mensajes quedan sin leer.
     *
     * Va aparte del listado porque lo consulta el menú lateral en cada
     * pantalla: traer la primera página entera solo para contar sería tirar
     * 20 registros a la basura en cada carga.
     */
    public function noLeidos()
    {
        return response()->json([
            'no_leidos' => MensajeContacto::where('leido', false)->count(),
        ]);
    }

    public function show($id)
    {
        return response()->json(MensajeContacto::findOrFail($id));
    }

    /** Marca como leído o como no leído (el panel permite las dos cosas). */
    public function marcarLeido(Request $request, $id)
    {
        $mensaje = MensajeContacto::findOrFail($id);
        $mensaje->update(['leido' => $request->boolean('leido', true)]);

        return response()->json($mensaje);
    }

    /** Edición desde el panel (por si hay que corregir un dato de contacto). */
    public function update(Request $request, $id)
    {
        $mensaje = MensajeContacto::findOrFail($id);

        $mensaje->update($request->validate([
            'nombre' => 'sometimes|required|string|max:120',
            'email' => 'sometimes|required|email|max:150',
            'telefono' => 'nullable|string|max:30',
            'asunto' => 'sometimes|required|string|max:150',
            'mensaje' => 'sometimes|required|string|max:2000',
            'leido' => 'boolean',
        ]));

        return response()->json($mensaje);
    }

    public function destroy($id)
    {
        MensajeContacto::findOrFail($id)->delete();

        return response()->json(['message' => 'Mensaje eliminado']);
    }
}
