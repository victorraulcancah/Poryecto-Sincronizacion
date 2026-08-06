<?php

namespace App\Http\Controllers;

use App\Models\TipoPrecio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TiposPrecioController extends Controller
{
    /**
     * Listar todos los tipos de precio (listas) sincronizados.
     */
    public function index()
    {
        $tipos = TipoPrecio::orderBy('nombre')->get()->map(function ($t) {
            return [
                'id' => $t->id,
                'nombre' => $t->nombre,
                'tipo_moneda' => $t->tipo_moneda,
                'activo' => $t->activo,
                'es_predeterminado' => $t->es_predeterminado,
                'es_para_invitados' => $t->es_para_invitados,
                'categoria' => $t->categoria,
                // Solo cuentan los productos que realmente tienen precio: hay
                // filas cargadas en 0 (por importaciones o precios sin
                // definir) que no deben sumar al "N productos con precio".
                'productos_count' => $t->precios()->where('precio', '>', 0)->count(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'tipos_precio' => $tipos,
        ]);
    }

    /**
     * Activar / desactivar un tipo de precio.
     */
    public function toggleActivo($id)
    {
        $tipo = TipoPrecio::findOrFail($id);
        $tipo->activo = !$tipo->activo;

        // Si se desactiva, no puede seguir siendo predeterminado/invitados
        if (!$tipo->activo) {
            $tipo->es_predeterminado = false;
            $tipo->es_para_invitados = false;
        }
        $tipo->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Estado actualizado',
            'tipo_precio' => $tipo,
        ]);
    }

    /**
     * Marcar la lista predeterminada para clientes registrados (única).
     */
    public function marcarPredeterminado($id)
    {
        $tipo = TipoPrecio::findOrFail($id);
        if (!$tipo->activo) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede marcar como predeterminada una lista inactiva',
            ], 422);
        }

        // Update directo por query builder (no Eloquent ->save()) para evitar
        // que el tracking de "sucio" ignore un campo que ya era true antes
        // del update masivo de abajo y no lo reescriba.
        DB::transaction(function () use ($tipo) {
            TipoPrecio::where('es_predeterminado', true)
                ->where('tipo_moneda', $tipo->tipo_moneda)
                ->update(['es_predeterminado' => false]);
            TipoPrecio::where('id', $tipo->id)->update(['es_predeterminado' => true]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Lista predeterminada para clientes registrados actualizada',
        ]);
    }

    /**
     * Marcar la lista que ven los visitantes no logueados (única).
     */
    public function marcarInvitados($id)
    {
        $tipo = TipoPrecio::findOrFail($id);
        if (!$tipo->activo) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede marcar como lista de invitados una lista inactiva',
            ], 422);
        }

        DB::transaction(function () use ($tipo) {
            TipoPrecio::where('es_para_invitados', true)
                ->where('tipo_moneda', $tipo->tipo_moneda)
                ->update(['es_para_invitados' => false]);
            TipoPrecio::where('id', $tipo->id)->update(['es_para_invitados' => true]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Lista para invitados actualizada',
        ]);
    }

    /**
     * Quitar la marca de invitados (los invitados no ven precio / cae a base).
     */
    public function quitarInvitados()
    {
        TipoPrecio::where('es_para_invitados', true)->update(['es_para_invitados' => false]);

        return response()->json([
            'status' => 'success',
            'message' => 'Se quitó la lista de invitados',
        ]);
    }

    /**
     * Pestaña "Clientes visitantes": activa/desactiva una lista como LA
     * elegida (predeterminada + invitados a la vez) para su moneda. Solo
     * puede haber una activa por moneda dentro de esta categoría.
     */
    public function toggleVisitante($id)
    {
        $tipo = TipoPrecio::findOrFail($id);
        if ($tipo->categoria !== 'visitante') {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta lista no pertenece a la categoría de clientes visitantes.',
            ], 422);
        }

        $activar = !($tipo->es_predeterminado && $tipo->es_para_invitados);

        // Updates directos por query builder (no Eloquent ->save()) para
        // evitar que el tracking de "sucio" ignore un campo que ya era true
        // antes del update masivo y no lo reescriba.
        DB::transaction(function () use ($tipo, $activar) {
            if ($activar) {
                TipoPrecio::where('categoria', 'visitante')
                    ->where('tipo_moneda', $tipo->tipo_moneda)
                    ->update(['es_predeterminado' => false, 'es_para_invitados' => false]);

                TipoPrecio::where('id', $tipo->id)->update([
                    'activo' => true,
                    'es_predeterminado' => true,
                    'es_para_invitados' => true,
                ]);
            } else {
                TipoPrecio::where('id', $tipo->id)->update([
                    'es_predeterminado' => false,
                    'es_para_invitados' => false,
                ]);
            }
        });

        $tipo->refresh();

        return response()->json([
            'status' => 'success',
            'tipo_precio' => $tipo,
        ]);
    }

    /**
     * Pestaña "Clientes vinculados": activa/desactiva una lista como opción
     * disponible en el selector del cliente. Varias pueden estar activas.
     */
    public function toggleVinculado($id)
    {
        $tipo = TipoPrecio::findOrFail($id);
        if ($tipo->categoria !== 'vinculado') {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta lista no pertenece a la categoría de clientes vinculados.',
            ], 422);
        }

        $tipo->activo = !$tipo->activo;
        $tipo->save();

        return response()->json([
            'status' => 'success',
            'tipo_precio' => $tipo,
        ]);
    }

    /**
     * Mueve una lista entre pestañas (categoría "visitante" / "vinculado").
     */
    public function cambiarCategoria(Request $request, $id)
    {
        $request->validate([
            'categoria' => 'required|in:visitante,vinculado',
        ]);

        $tipo = TipoPrecio::findOrFail($id);
        $tipo->categoria = $request->categoria;
        // Al cambiar de categoría, los flags de la otra pestaña ya no aplican.
        $tipo->es_predeterminado = false;
        $tipo->es_para_invitados = false;
        $tipo->save();

        return response()->json([
            'status' => 'success',
            'tipo_precio' => $tipo,
        ]);
    }

    /**
     * Modal "Agregar Lista de Precio" (pestaña Clientes visitantes): elige,
     * de entre TODAS las listas sincronizadas, una en soles y una en
     * dólares (o ninguna) como LA lista para visitantes de esa moneda.
     */
    public function asignarVisitantes(Request $request)
    {
        $request->validate([
            'soles_id' => 'nullable|exists:tipos_precio,id',
            'dolares_id' => 'nullable|exists:tipos_precio,id',
        ]);

        if ($request->filled('soles_id') && optional(TipoPrecio::find($request->soles_id))->tipo_moneda !== 's') {
            return response()->json(['status' => 'error', 'message' => 'La lista elegida para soles no es de esa moneda.'], 422);
        }
        if ($request->filled('dolares_id') && optional(TipoPrecio::find($request->dolares_id))->tipo_moneda !== 'd') {
            return response()->json(['status' => 'error', 'message' => 'La lista elegida para dólares no es de esa moneda.'], 422);
        }

        DB::transaction(function () use ($request) {
            // Libera lo que antes era la lista de visitantes en cada moneda.
            TipoPrecio::where('categoria', 'visitante')->where('tipo_moneda', 's')
                ->update(['categoria' => 'vinculado', 'es_predeterminado' => false, 'es_para_invitados' => false]);
            TipoPrecio::where('categoria', 'visitante')->where('tipo_moneda', 'd')
                ->update(['categoria' => 'vinculado', 'es_predeterminado' => false, 'es_para_invitados' => false]);

            if ($request->filled('soles_id')) {
                TipoPrecio::where('id', $request->soles_id)->update([
                    'categoria' => 'visitante', 'activo' => true,
                    'es_predeterminado' => true, 'es_para_invitados' => true,
                ]);
            }
            if ($request->filled('dolares_id')) {
                TipoPrecio::where('id', $request->dolares_id)->update([
                    'categoria' => 'visitante', 'activo' => true,
                    'es_predeterminado' => true, 'es_para_invitados' => true,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Listas de clientes visitantes actualizadas',
        ]);
    }

    /**
     * Modal "Agregar Lista de Precio" (pestaña Clientes vinculados): elige,
     * de entre TODAS las listas sincronizadas, cualquier cantidad como
     * opciones disponibles para los clientes vinculados.
     */
    public function asignarVinculados(Request $request)
    {
        $request->validate([
            'ids' => 'present|array',
            'ids.*' => 'integer|exists:tipos_precio,id',
        ]);

        DB::transaction(function () use ($request) {
            $ids = $request->input('ids', []);

            // Lo que estaba activo como vinculado y ya no viene seleccionado, se desactiva.
            TipoPrecio::where('categoria', 'vinculado')->where('activo', true)
                ->whereNotIn('id', $ids)
                ->update(['activo' => false]);

            if (!empty($ids)) {
                TipoPrecio::whereIn('id', $ids)->update([
                    'categoria' => 'vinculado',
                    'activo' => true,
                    'es_predeterminado' => false,
                    'es_para_invitados' => false,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Listas de clientes vinculados actualizadas',
        ]);
    }

    /**
     * Botón "Lista +": trae de inmediato las listas de precio nuevas desde
     * Novik (sin esperar al cron), sin resincronizar productos/stock.
     */
    public function resincronizar()
    {
        $exitCode = \Illuminate\Support\Facades\Artisan::call('sync:7power', [
            '--only-tipos-precio' => true,
        ]);

        if ($exitCode !== 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo sincronizar con Novik.',
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Listas de precio sincronizadas con Novik',
        ]);
    }
}
