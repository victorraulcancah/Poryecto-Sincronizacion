<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MenuController extends Controller
{
    /**
     * Obtener menús públicos por tipo
     */
    public function obtenerMenusPublicos(Request $request)
    {
        $tipo = $request->query('tipo', 'header');

        $menus = Menu::visibles()
            ->porTipo($tipo)
            ->principales()
            ->with(['hijos' => function($query) {
                $query->orderBy('orden');
            }])
            ->orderBy('orden')
            ->get();

        return response()->json(['menus' => $menus]);
    }

    /**
     * Listar todos los menús (admin)
     */
    public function index(Request $request)
    {
        $tipo = $request->query('tipo');

        $query = Menu::with(['hijos', 'padre']);

        if ($tipo) {
            $query->porTipo($tipo);
        }

        $menus = $query->orderBy('tipo')->orderBy('orden')->get();

        return response()->json($menus);
    }

    /**
     * Crear un nuevo menú
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'url' => 'required|string|max:255',
            'icono' => 'nullable|string|max:100',
            'orden' => 'integer|min:0',
            'padre_id' => 'nullable|exists:menus,id',
            'tipo' => 'required|in:header,footer,sidebar',
            'target' => 'in:_self,_blank',
            'visible' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $menu = Menu::create($request->all());

        return response()->json([
            'message' => 'Menú creado correctamente',
            'data' => $menu
        ], 201);
    }

    /**
     * Mostrar un menú específico
     */
    public function show($id)
    {
        $menu = Menu::with(['hijos', 'padre'])->findOrFail($id);
        return response()->json($menu);
    }

    /**
     * Actualizar un menú
     */
    public function update(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre' => 'string|max:100',
            'url' => 'string|max:255',
            'icono' => 'nullable|string|max:100',
            'orden' => 'integer|min:0',
            'padre_id' => 'nullable|exists:menus,id',
            'tipo' => 'in:header,footer,sidebar',
            'target' => 'in:_self,_blank',
            'visible' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $menu->update($request->all());

        return response()->json([
            'message' => 'Menú actualizado correctamente',
            'data' => $menu
        ]);
    }

    /**
     * Eliminar un menú
     */
    public function destroy($id)
    {
        $menu = Menu::findOrFail($id);
        $menu->delete();

        return response()->json(['message' => 'Menú eliminado correctamente']);
    }

    /**
     * Toggle estado visible
     */
    public function toggleVisible($id)
    {
        $menu = Menu::findOrFail($id);
        $menu->visible = !$menu->visible;
        $menu->save();

        return response()->json([
            'message' => 'Estado actualizado correctamente',
            'data' => $menu
        ]);
    }

    /**
     * Reordenar menús
     */
    public function reordenar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'menus' => 'required|array',
            'menus.*.id' => 'required|exists:menus,id',
            'menus.*.orden' => 'required|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->menus as $menuData) {
            Menu::where('id', $menuData['id'])->update(['orden' => $menuData['orden']]);
        }

        return response()->json(['message' => 'Menús reordenados correctamente']);
    }
}
