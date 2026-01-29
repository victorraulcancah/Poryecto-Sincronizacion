<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    /**
     * Obtener todos los items del carrito del usuario autenticado.
     */
    public function index(Request $request)
    {
        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json([], 200); // Retornar carrito vacío si no está autenticado
        }
        
        $query = CartItem::with(['producto:id,nombre,precio_venta,stock,codigo_producto,imagen']);
        
        // Verificar si es un User (admin) o UserCliente (cliente e-commerce)
        if ($authenticatedUser instanceof \App\Models\User) {
            // Usuario del sistema (admin/vendedor)
            $query->where('user_id', $authenticatedUser->id);
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            // Cliente del e-commerce
            $query->where('user_cliente_id', $authenticatedUser->id);
        } else {
            return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
        }
        
        
        $cartItems = $query->get();
        
        // \Log::info('Items encontrados en el carrito:', [
        //     'count' => $cartItems->count(),
        //     'items' => $cartItems->toArray()
        // ]);

        $formattedItems = $cartItems->map(function ($item) {
            return [
                'id' => $item->id, // ID del item del carrito
                'producto_id' => $item->producto->id,
                'nombre' => $item->producto->nombre,
                'imagen_url' => $item->producto->imagen ? asset('storage/productos/' . $item->producto->imagen) : null,
                'precio' => (float) $item->producto->precio_venta,
                'cantidad' => (int) $item->cantidad,
                'stock_disponible' => (int) $item->producto->stock,
                'codigo_producto' => $item->producto->codigo_producto,
                'mostrar_igv' => (bool) $item->producto->mostrar_igv,  // <- NUEVA LÍNEA
            ];
        });

        return response()->json($formattedItems);
    }

    /**
     * Añadir un producto al carrito.
     */
    public function add(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'producto_id' => 'required|exists:productos,id',
            'cantidad' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $authenticatedUser = $request->user();

if (!$authenticatedUser) {
    return response()->json(['message' => 'Usuario no autenticado.'], 401);
}

$userId = null;
$userClienteId = null;

if ($authenticatedUser instanceof \App\Models\User) {
    $userId = $authenticatedUser->id;
} elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
    $userClienteId = $authenticatedUser->id;
} else {
    return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
}

        $producto = Producto::find($request->producto_id);

        // Verificar stock
        if ($producto->stock < $request->cantidad) {
            return response()->json(['message' => 'Stock insuficiente.'], 409);
        }

        $query = CartItem::where('producto_id', $request->producto_id);
        
        if ($userId) {
            $query->where('user_id', $userId);
        } else {
            $query->where('user_cliente_id', $userClienteId);
        }
        
        $cartItem = $query->first();

        if ($cartItem) {
            // Si el item ya existe, actualizar la cantidad
            $nuevaCantidad = $cartItem->cantidad + $request->cantidad;
            if ($producto->stock < $nuevaCantidad) {
                return response()->json(['message' => 'Stock insuficiente para la cantidad total.'], 409);
            }
            $cartItem->cantidad = $nuevaCantidad;
            $cartItem->save();
        } else {
            // Si es un item nuevo, crearlo
            $cartItem = CartItem::create([
                'user_id' => $userId,
                'user_cliente_id' => $userClienteId,
                'producto_id' => $request->producto_id,
                'cantidad' => $request->cantidad,
            ]);
        }

        return response()->json([
            'message' => 'Producto añadido al carrito.',
            'cartItem' => $cartItem
        ], 201);
    }

    /**
     * Actualizar la cantidad de un producto en el carrito.
     */
    public function update(Request $request, $producto_id)
    {
        $validator = Validator::make($request->all(), [
            'cantidad' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json(['message' => 'Usuario no autenticado.'], 401);
        }

        $query = CartItem::where('producto_id', $producto_id);
        
        // Verificar si es un User (admin) o UserCliente (cliente e-commerce)
        if ($authenticatedUser instanceof \App\Models\User) {
            $query->where('user_id', $authenticatedUser->id);
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $query->where('user_cliente_id', $authenticatedUser->id);
        } else {
            return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
        }
        
        $cartItem = $query->firstOrFail();

        $producto = Producto::find($producto_id);
        if ($producto->stock < $request->cantidad) {
            return response()->json(['message' => 'Stock insuficiente.'], 409);
        }

        $cartItem->cantidad = $request->cantidad;
        $cartItem->save();

        return response()->json([
            'message' => 'Cantidad actualizada.',
            'cartItem' => $cartItem
        ]);
    }

    /**
     * Eliminar un producto del carrito.
     */
    public function remove(Request $request, $producto_id)
    {
        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json(['message' => 'Usuario no autenticado.'], 401);
        }

        $query = CartItem::where('producto_id', $producto_id);
        
        // Verificar si es un User (admin) o UserCliente (cliente e-commerce)
        if ($authenticatedUser instanceof \App\Models\User) {
            $query->where('user_id', $authenticatedUser->id);
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $query->where('user_cliente_id', $authenticatedUser->id);
        } else {
            return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
        }
        
        $cartItem = $query->firstOrFail();

        $cartItem->delete();

        return response()->json(['message' => 'Producto eliminado del carrito.']);
    }

    /**
     * Vaciar todo el carrito del usuario.
     */
    public function clear(Request $request)
    {
        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json(['message' => 'Usuario no autenticado.'], 401);
        }

        $query = CartItem::query();
        
        // Verificar si es un User (admin) o UserCliente (cliente e-commerce)
        if ($authenticatedUser instanceof \App\Models\User) {
            $query->where('user_id', $authenticatedUser->id);
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $query->where('user_cliente_id', $authenticatedUser->id);
        } else {
            return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
        }
        
        $query->delete();

        return response()->json(['message' => 'Carrito vaciado exitosamente.']);
    }

    /**
     * Sincronizar el carrito de localStorage con la base de datos.
     */
    public function sync(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json(['message' => 'Usuario no autenticado.'], 401);
        }
        
        
        $userId = null;
        $userClienteId = null;
        
        if ($authenticatedUser instanceof \App\Models\User) {
            $userId = $authenticatedUser->id;
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $userClienteId = $authenticatedUser->id;
        } else {
            return response()->json(['message' => 'Usuario no autenticado.'], 401);
        }
        
        $localItems = $request->items;

        foreach ($localItems as $localItem) {
            $producto = Producto::find($localItem['producto_id']);
            if (!$producto) continue;

            $query = CartItem::where('producto_id', $localItem['producto_id']);
            
            if ($userId) {
                $query->where('user_id', $userId);
            } else {
                $query->where('user_cliente_id', $userClienteId);
            }
            
            $cartItem = $query->first();

            $cantidadTotal = $localItem['cantidad'] + ($cartItem ? $cartItem->cantidad : 0);

            if ($producto->stock < $cantidadTotal) {
                // Si no hay stock suficiente, se ajusta la cantidad al máximo disponible
                $cantidadTotal = $producto->stock;
            }
            
            if ($cantidadTotal > 0) {
                 CartItem::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'user_cliente_id' => $userClienteId,
                        'producto_id' => $localItem['producto_id']
                    ],
                    [
                        'cantidad' => $cantidadTotal
                    ]
                );
            }
        }

      return $this->index($request); // Devuelve el carrito actualizado y formateado

    }
}