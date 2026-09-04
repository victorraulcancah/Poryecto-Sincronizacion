<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    // El carrito resuelve el precio igual que el catálogo: si la ficha muestra
    // US$ 35, acá no puede salir S/ 0.00.
    use \App\Http\Controllers\Concerns\ResuelvePreciosPorMoneda;

    /**
     * Obtener todos los items del carrito del usuario autenticado.
     */
    public function index(Request $request)
    {
        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return response()->json([], 200); // Retornar carrito vacío si no está autenticado
        }
        
        // Cargar también la relación precios para resolver el precio según la
        // lista del cliente (mismo principio que ProductosController).
        $query = CartItem::with([
            'producto:id,nombre,precio_venta,stock,codigo_producto,imagen,mostrar_igv',
            'producto.precios',
        ]);

        // Listas de precio aplicables (soles y dólares). El precio y la moneda
        // se resuelven producto por producto: el carrito puede tener uno
        // cotizado en soles y otro en dólares a la vez.
        if ($authenticatedUser instanceof \App\Models\User) {
            // Usuario del sistema (admin/vendedor): usa la lista predeterminada global.
            $query->where('user_id', $authenticatedUser->id);
            $listas = [];
            foreach (['s', 'd'] as $m) {
                $tp = \App\Models\TipoPrecio::predeterminado($m);
                if ($tp) {
                    $listas[] = ['moneda' => $m, 'tipo_precio_id' => $tp->id];
                }
            }
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $query->where('user_cliente_id', $authenticatedUser->id);
            $listas = $this->listasPrecioAplicables($authenticatedUser);
        } else {
            return response()->json(['message' => 'Tipo de usuario no válido.'], 401);
        }

        $cartItems = $query->get();

        $formattedItems = $cartItems->map(function ($item) use ($listas) {
            $pm = $this->precioYMonedaProducto($item->producto, $listas);

            return [
                'id' => $item->id, // ID del item del carrito
                'producto_id' => $item->producto->id,
                'nombre' => $item->producto->nombre,
                'imagen_url' => $item->producto->imagen ? asset('storage/productos/' . $item->producto->imagen) : null,
                'precio' => (float) $pm['precio'],
                'moneda' => $pm['moneda'],
                'cantidad' => (int) $item->cantidad,
                'stock_disponible' => (int) $item->producto->stock,
                'codigo_producto' => $item->producto->codigo_producto,
                'mostrar_igv' => (bool) $item->producto->mostrar_igv,
                'guardado_para_despues' => (bool) $item->guardado_para_despues,
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

        /*
         * Stock contra Novik, no contra la copia de la tienda.
         *
         * La copia se refresca con el cron y puede ir atrasada: la tienda decia
         * 94 cuando en Novik ya quedaban 90, y se dejaba agregar de mas.
         * `sincronizar` lee el ERP en el momento y ademas guarda ese valor en
         * `productos.stock`, asi que el catalogo y el buscador quedan al dia sin
         * esperar al cron. Si Novik no responde devuelve null y se sigue con la
         * copia: es preferible vender con un dato de hace un minuto a bloquear
         * la tienda porque el ERP esta caido.
         */
        $stockReal = \App\Support\StockEnVivo::sincronizar($producto->id);
        if ($stockReal !== null) {
            $producto->stock = $stockReal;
        }

        // Verificar stock
        if ($producto->stock < $request->cantidad) {
            return response()->json([
                'message' => 'Stock insuficiente.',
                // Lo que hay de verdad, para que el front corrija lo que muestra.
                'stock_disponible' => (int) $producto->stock,
            ], 409);
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
                return response()->json([
                    'message' => 'Stock insuficiente para la cantidad total.',
                    'stock_disponible' => (int) $producto->stock,
                ], 409);
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
     * Resuelve el CartItem del usuario autenticado para un producto dado,
     * sin importar si está en el carrito o guardado para después.
     */
    private function resolverCartItem(Request $request, $producto_id): ?CartItem
    {
        $authenticatedUser = $request->user();

        if (!$authenticatedUser) {
            return null;
        }

        $query = CartItem::where('producto_id', $producto_id);

        if ($authenticatedUser instanceof \App\Models\User) {
            $query->where('user_id', $authenticatedUser->id);
        } elseif ($authenticatedUser instanceof \App\Models\UserCliente) {
            $query->where('user_cliente_id', $authenticatedUser->id);
        } else {
            return null;
        }

        return $query->first();
    }

    /**
     * Marcar un producto del carrito como "guardado para después".
     */
    public function saveForLater(Request $request, $producto_id)
    {
        $cartItem = $this->resolverCartItem($request, $producto_id);

        if (!$cartItem) {
            return response()->json(['message' => 'Producto no encontrado en el carrito.'], 404);
        }

        $cartItem->guardado_para_despues = true;
        $cartItem->save();

        return response()->json(['message' => 'Producto guardado para después.']);
    }

    /**
     * Devolver un producto guardado para después al carrito activo.
     */
    public function moveToCart(Request $request, $producto_id)
    {
        $cartItem = $this->resolverCartItem($request, $producto_id);

        if (!$cartItem) {
            return response()->json(['message' => 'Producto no encontrado en guardados.'], 404);
        }

        $producto = Producto::find($producto_id);
        if ($producto && $producto->stock < $cartItem->cantidad) {
            return response()->json(['message' => 'Stock insuficiente para mover este producto al carrito.'], 409);
        }

        $cartItem->guardado_para_despues = false;
        $cartItem->save();

        return response()->json(['message' => 'Producto movido al carrito.']);
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

        // ✅ Solo se vacían los items ACTIVOS del carrito; los "guardados para
        // después" no se tocan (vaciar el carrito no debe borrar la lista guardada).
        $query = CartItem::where('guardado_para_despues', false);

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