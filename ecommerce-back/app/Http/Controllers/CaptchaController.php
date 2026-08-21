<?php

namespace App\Http\Controllers;

use App\Models\CaptchaImagen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Rompecabezas del registro público.
 *
 * El servidor arma el desafío y guarda la solución en caché bajo un token; el
 * navegador nunca sabe cuál es el orden correcto. Al registrarse hay que
 * mandar el token ya resuelto, así que un POST directo al registro sin pasar
 * por el captcha se rechaza (antes solo se validaba en el navegador).
 */
class CaptchaController extends Controller
{
    /** El desafío caduca a los 10 minutos. */
    private const VIGENCIA_MINUTOS = 10;

    private const PIEZAS = 4;

    // ══════════════════════════════════════════════════════════════════
    //  Público: armar y verificar el desafío
    // ══════════════════════════════════════════════════════════════════

    /**
     * Devuelve una imagen al azar y el orden barajado en que se muestran las
     * piezas. La solución (qué pieza va en qué hueco) se queda en el servidor.
     */
    public function desafio(): JsonResponse
    {
        $imagen = CaptchaImagen::activas()->inRandomOrder()->first();

        if (! $imagen) {
            return response()->json([
                'status' => 'error',
                'message' => 'No hay imágenes de captcha configuradas.',
            ], 503);
        }

        $orden = range(0, self::PIEZAS - 1);
        shuffle($orden);

        $token = (string) Str::uuid();

        Cache::put("captcha:{$token}", [
            'imagen_id' => $imagen->id,
            'resuelto' => false,
        ], now()->addMinutes(self::VIGENCIA_MINUTOS));

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'imagen' => $imagen->ruta,
            // Índices de pieza en el orden en que se le muestran al usuario.
            'piezas' => $orden,
            'total_piezas' => self::PIEZAS,
        ]);
    }

    /**
     * Comprueba el orden que armó el usuario. Se llama al pulsar "Confirmar",
     * no al soltar la última pieza.
     */
    public function verificar(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'orden' => 'required|array|size:' . self::PIEZAS,
            'orden.*' => 'required|integer|min:0|max:' . (self::PIEZAS - 1),
        ]);

        $clave = "captcha:{$request->token}";
        $desafio = Cache::get($clave);

        if (! $desafio) {
            return response()->json([
                'status' => 'error',
                'expirado' => true,
                'message' => 'El captcha caducó. Se generó uno nuevo.',
            ], 422);
        }

        // La solución es la identidad: la pieza 0 va en el hueco 0, y así.
        $correcto = array_map('intval', $request->orden) === range(0, self::PIEZAS - 1);

        if (! $correcto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Las piezas no están en el orden correcto.',
            ], 422);
        }

        $desafio['resuelto'] = true;
        Cache::put($clave, $desafio, now()->addMinutes(self::VIGENCIA_MINUTOS));

        return response()->json([
            'status' => 'success',
            'message' => 'Captcha resuelto.',
        ]);
    }

    /**
     * ¿Ese token se resolvió? Lo consume para que no sirva dos veces.
     * Lo usa el registro antes de crear la cuenta.
     */
    public static function consumirToken(?string $token): bool
    {
        if (! $token) return false;

        $clave = "captcha:{$token}";
        $desafio = Cache::get($clave);

        if (! $desafio || empty($desafio['resuelto'])) return false;

        Cache::forget($clave);

        return true;
    }

    // ══════════════════════════════════════════════════════════════════
    //  Panel: CRUD de las imágenes
    // ══════════════════════════════════════════════════════════════════

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'imagenes' => CaptchaImagen::orderByDesc('id')->get(),
            'activas' => CaptchaImagen::activas()->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:120',
            // Cuadradas o casi: el rompecabezas las parte en 4.
            'imagen' => 'required|image|mimes:jpeg,jpg,png,webp|max:4096',
            'activo' => 'nullable|boolean',
        ], [
            'imagen.uploaded' => 'La imagen pasa del máximo que acepta el servidor.',
        ]);

        $archivo = $request->file('imagen');
        $nombreArchivo = time() . '_' . Str::random(8) . '.' . $archivo->getClientOriginalExtension();
        $destino = public_path('storage/captcha');

        if (! file_exists($destino)) {
            mkdir($destino, 0755, true);
        }

        $archivo->move($destino, $nombreArchivo);

        $imagen = CaptchaImagen::create([
            'nombre' => $request->nombre,
            'ruta' => 'storage/captcha/' . $nombreArchivo,
            'activo' => $request->boolean('activo', true),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Imagen agregada.',
            'imagen' => $imagen,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $imagen = CaptchaImagen::findOrFail($id);

        $request->validate([
            'nombre' => 'sometimes|required|string|max:120',
            'activo' => 'sometimes|boolean',
        ]);

        // No se puede dejar el captcha sin ninguna imagen activa: el registro
        // se quedaría sin desafío que mostrar.
        if ($request->has('activo') && ! $request->boolean('activo') && $imagen->activo) {
            $quedan = CaptchaImagen::activas()->where('id', '!=', $imagen->id)->count();
            if ($quedan === 0) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Debe quedar al menos una imagen activa.',
                ], 422);
            }
        }

        $imagen->fill($request->only(['nombre', 'activo']))->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Imagen actualizada.',
            'imagen' => $imagen,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $imagen = CaptchaImagen::findOrFail($id);

        if ($imagen->activo && CaptchaImagen::activas()->where('id', '!=', $imagen->id)->count() === 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Debe quedar al menos una imagen activa.',
            ], 422);
        }

        $ruta = public_path($imagen->ruta);
        if (file_exists($ruta)) {
            @unlink($ruta);
        }

        $imagen->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Imagen eliminada.',
        ]);
    }
}
