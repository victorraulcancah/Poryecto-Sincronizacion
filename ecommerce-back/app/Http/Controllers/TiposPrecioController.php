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
                'productos_count' => $t->precios()->count(),
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

        DB::transaction(function () use ($tipo) {
            TipoPrecio::where('es_predeterminado', true)->update(['es_predeterminado' => false]);
            $tipo->es_predeterminado = true;
            $tipo->save();
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
            TipoPrecio::where('es_para_invitados', true)->update(['es_para_invitados' => false]);
            $tipo->es_para_invitados = true;
            $tipo->save();
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
}
