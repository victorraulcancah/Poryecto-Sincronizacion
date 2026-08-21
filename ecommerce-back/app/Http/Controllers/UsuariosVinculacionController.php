<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Vinculación de un usuario del panel con un usuario (vendedor) de Novik.
 *
 * Mismo flujo que la vinculación de clientes: buscar en el ERP → confirmar con
 * la contraseña del administrador logueado → guardar el `codigo_erp`.
 *
 * Los datos del ERP se leen por la conexión `mysql_7power` (solo lectura); el
 * backend de Novik no se modifica.
 */
class UsuariosVinculacionController extends Controller
{
    /** La tienda corresponde a la empresa 1 del ERP. */
    private const COMPANY_ID = 1;

    private const POR_PAGINA = 20;

    /**
     * Busca usuarios de Novik para vincular (por código, nombre, usuario o
     * correo). Devuelve también el rol, para distinguir a los vendedores.
     */
    public function buscar(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $offset = max(0, (int) $request->query('offset', 0));
        // Con `solo_vendedores=1` se acota a la cartera comercial.
        $soloVendedores = $request->boolean('solo_vendedores');

        try {
            $base = DB::connection('mysql_7power')->table('users as u')
                ->where('u.company_id', self::COMPANY_ID)
                ->where('u.estado', 1);

            if ($soloVendedores) {
                $base->whereExists(function ($sub) {
                    $sub->select(DB::raw(1))
                        ->from('model_has_roles as mhr')
                        ->join('roles as r', 'r.id', '=', 'mhr.role_id')
                        ->whereColumn('mhr.model_id', 'u.id')
                        ->where('mhr.model_type', 'App\\Models\\User')
                        ->where('r.name', 'Vendedor');
                });
            }

            if ($q !== '') {
                $base->where(function ($sub) use ($q) {
                    $sub->where('u.codigo', 'LIKE', "%{$q}%")
                        ->orWhere('u.name', 'LIKE', "%{$q}%")
                        ->orWhere('u.usuario', 'LIKE', "%{$q}%")
                        ->orWhere('u.email', 'LIKE', "%{$q}%");
                });
            }

            $total = (clone $base)->count();

            $filas = $base->orderBy('u.name')
                ->offset($offset)
                ->limit(self::POR_PAGINA)
                ->get(['u.id', 'u.codigo', 'u.name', 'u.usuario', 'u.email', 'u.telefono']);

            $roles = $this->rolesDe($filas->pluck('id')->all());

            $usuarios = $filas->map(fn ($f) => [
                'id' => $f->id,
                'codigo' => $f->codigo,
                'nombre' => $f->name,
                'usuario' => $f->usuario,
                'email' => $f->email,
                'telefono' => $f->telefono,
                'rol' => $roles[$f->id] ?? null,
                // Un mismo usuario de Novik no puede quedar en dos cuentas.
                'ya_vinculado' => $f->codigo
                    ? User::where('codigo_erp', $f->codigo)->exists()
                    : false,
            ])->values();

            return response()->json([
                'status' => 'success',
                'total' => $total,
                'offset' => $offset,
                'hay_mas' => ($offset + $usuarios->count()) < $total,
                'usuarios' => $usuarios,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo conectar con el ERP Novik.',
            ], 503);
        }
    }

    /** Usuario de Novik al que está vinculada una cuenta del panel. */
    public function vinculado($id): JsonResponse
    {
        $usuario = User::findOrFail($id);

        if (! $usuario->codigo_erp) {
            return response()->json(['status' => 'success', 'vinculado' => false, 'usuario' => null]);
        }

        $datos = $this->buscarEnErpPorCodigo($usuario->codigo_erp);

        // El código quedó guardado pero el usuario ya no está en el ERP: se
        // avisa en vez de mostrar la cuenta como si no tuviera vinculación.
        return response()->json([
            'status' => 'success',
            'vinculado' => true,
            'codigo_erp' => $usuario->codigo_erp,
            'usuario' => $datos,
        ]);
    }

    /**
     * Confirma la vinculación. Pide la contraseña del administrador logueado,
     * no la del usuario que se está vinculando.
     */
    public function vincular(Request $request, $id): JsonResponse
    {
        $request->validate([
            'codigo_erp' => 'required|string|max:20',
            'password' => 'required|string',
        ]);

        if (! Hash::check($request->password, $request->user()->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'La contraseña no es correcta.',
            ], 422);
        }

        $usuario = User::findOrFail($id);
        $codigo = strtoupper(trim($request->codigo_erp));

        $yaUsado = User::where('codigo_erp', $codigo)->where('id', '!=', $id)->exists();
        if ($yaUsado) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ese usuario de Novik ya está vinculado a otra cuenta.',
            ], 422);
        }

        $datos = $this->buscarEnErpPorCodigo($codigo);
        if (! $datos) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ese código no existe en Novik o el usuario está inhabilitado.',
            ], 422);
        }

        $usuario->codigo_erp = $codigo;
        $usuario->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Vinculación realizada.',
            'codigo_erp' => $codigo,
            'usuario' => $datos,
        ]);
    }

    /** Quita la vinculación (también pide la contraseña del administrador). */
    public function desvincular(Request $request, $id): JsonResponse
    {
        $request->validate(['password' => 'required|string']);

        if (! Hash::check($request->password, $request->user()->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'La contraseña no es correcta.',
            ], 422);
        }

        $usuario = User::findOrFail($id);
        $usuario->codigo_erp = null;
        $usuario->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Se quitó la vinculación.',
        ]);
    }

    /** Datos del usuario de Novik con ese código, o null si no existe. */
    private function buscarEnErpPorCodigo(string $codigo): ?array
    {
        try {
            $fila = DB::connection('mysql_7power')->table('users')
                ->where('codigo', $codigo)
                ->where('company_id', self::COMPANY_ID)
                ->where('estado', 1)
                ->first(['id', 'codigo', 'name', 'usuario', 'email', 'telefono']);
        } catch (\Exception $e) {
            return null;
        }

        if (! $fila) return null;

        return [
            'id' => $fila->id,
            'codigo' => $fila->codigo,
            'nombre' => $fila->name,
            'usuario' => $fila->usuario,
            'email' => $fila->email,
            'telefono' => $fila->telefono,
            'rol' => $this->rolesDe([$fila->id])[$fila->id] ?? null,
        ];
    }

    /**
     * Rol de cada usuario del ERP, indexado por id. Si tiene varios se toma el
     * primero: en el panel solo se muestra como referencia.
     *
     * @param  array<int>  $ids
     * @return array<int,string>
     */
    private function rolesDe(array $ids): array
    {
        if (empty($ids)) return [];

        try {
            return DB::connection('mysql_7power')->table('model_has_roles as mhr')
                ->join('roles as r', 'r.id', '=', 'mhr.role_id')
                ->where('mhr.model_type', 'App\\Models\\User')
                ->whereIn('mhr.model_id', $ids)
                ->orderBy('r.id')
                ->get(['mhr.model_id', 'r.name'])
                ->groupBy('model_id')
                ->map(fn ($g) => $g->first()->name)
                ->all();
        } catch (\Exception $e) {
            return [];
        }
    }
}
