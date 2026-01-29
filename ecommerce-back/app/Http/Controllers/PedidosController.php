<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\PedidoDetalle;
use App\Models\EstadoPedido;
use App\Models\PedidoTracking;
use App\Models\UserCliente;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PedidosController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Pedido::with([
                'cliente', 
                'userCliente', 
                'estadoPedido',
                'detalles.producto'
            ]);

            // Filtros
            if ($request->has('estado_pedido_id') && $request->estado_pedido_id !== '') {
                $query->where('estado_pedido_id', $request->estado_pedido_id);
            }

            if ($request->has('cliente_id') && $request->cliente_id !== '') {
                $query->where('cliente_id', $request->cliente_id);
            }

            if ($request->has('user_cliente_id') && $request->user_cliente_id !== '') {
                $query->where('user_cliente_id', $request->user_cliente_id);
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_pedido', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->has('search') && $request->search !== '') {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('codigo_pedido', 'LIKE', "%{$search}%")
                      ->orWhereHas('cliente', function ($clienteQuery) use ($search) {
                          $clienteQuery->where('razon_social', 'LIKE', "%{$search}%")
                                      ->orWhere('numero_documento', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('userCliente', function ($userClienteQuery) use ($search) {
                          $userClienteQuery->where('nombres', 'LIKE', "%{$search}%")
                                          ->orWhere('apellidos', 'LIKE', "%{$search}%")
                                          ->orWhere('email', 'LIKE', "%{$search}%");
                      });
                });
            }

            $pedidos = $query->orderBy('fecha_pedido', 'desc')->get();

            // Transformar los datos para incluir los accessors
            $pedidosTransformados = $pedidos->map(function ($pedido) {
                return [
                    'id' => $pedido->id,
                    'codigo_pedido' => $pedido->codigo_pedido,
                    'cliente_id' => $pedido->cliente_id,
                    'user_cliente_id' => $pedido->user_cliente_id,
                    'fecha_pedido' => $pedido->fecha_pedido,
                    'subtotal' => $pedido->subtotal,
                    'igv' => $pedido->igv,
                    'descuento_total' => $pedido->descuento_total,
                    'total' => $pedido->total,
                    'estado_pedido_id' => $pedido->estado_pedido_id,
                    'metodo_pago' => $pedido->metodo_pago,
                    'observaciones' => $pedido->observaciones,
                    'direccion_envio' => $pedido->direccion_envio,
                    'telefono_contacto' => $pedido->telefono_contacto,
                    'user_id' => $pedido->user_id,
                    'created_at' => $pedido->created_at,
                    'updated_at' => $pedido->updated_at,
                    'cliente_nombre' => $pedido->cliente_nombre,
                    'tipo_pedido' => $pedido->tipo_pedido,
                    // Nuevos campos del checkout
                    'numero_documento' => $pedido->numero_documento,
                    'cliente_email' => $pedido->cliente_email,
                    'forma_envio' => $pedido->forma_envio,
                    'costo_envio' => $pedido->costo_envio,
                    'departamento_id' => $pedido->departamento_id,
                    'provincia_id' => $pedido->provincia_id,
                    'distrito_id' => $pedido->distrito_id,
                    'departamento_nombre' => $pedido->departamento_nombre,
                    'provincia_nombre' => $pedido->provincia_nombre,
                    'distrito_nombre' => $pedido->distrito_nombre,
                    'ubicacion_completa' => $pedido->ubicacion_completa,
                    // Relaciones
                    'cliente' => $pedido->cliente,
                    'user_cliente' => $pedido->userCliente,
                    'estado_pedido' => $pedido->estadoPedido,
                    'detalles' => $pedido->detalles->map(function ($detalle) {
                        return [
                            'id' => $detalle->id,
                            'pedido_id' => $detalle->pedido_id,
                            'producto_id' => $detalle->producto_id,
                            'codigo_producto' => $detalle->codigo_producto,
                            'nombre_producto' => $detalle->nombre_producto,
                            'cantidad' => $detalle->cantidad,
                            'precio_unitario' => $detalle->precio_unitario,
                            'subtotal_linea' => $detalle->subtotal_linea,
                            'imagen_url' => $detalle->imagen_url,
                            'producto' => $detalle->producto
                        ];
                    })
                ];
            });

            return response()->json([
                'status' => 'success',
                'pedidos' => $pedidosTransformados
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener pedidos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $pedido = Pedido::with([
                'cliente', 
                'userCliente',
                'detalles.producto', 
                'estadoPedido'
            ])->findOrFail($id);

            return response()->json($pedido);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Pedido no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function crearPedidoEcommerce(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|numeric|min:1',
            'metodo_pago' => 'required|string|max:50',
            'direccion_envio' => 'required|string',
            'telefono_contacto' => 'required|string|max:20',
            'observaciones' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $userCliente = $request->user();
            
            if (!$userCliente instanceof UserCliente) {
                return response()->json(['message' => 'Acceso no autorizado'], 403);
            }

            DB::beginTransaction();

            // Calcular totales
            $subtotal = 0;
            $productosValidados = [];

            foreach ($request->productos as $prod) {
                $producto = Producto::findOrFail($prod['producto_id']);
                
                // Verificar stock
                if ($producto->stock < $prod['cantidad']) {
                    throw new \Exception("Stock insuficiente para el producto: {$producto->nombre}");
                }

                $cantidad = $prod['cantidad'];
                $precioUnitario = $producto->precio_venta;
                $subtotalLinea = $cantidad * $precioUnitario;
                
                $subtotal += $subtotalLinea;

                $productosValidados[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal_linea' => $subtotalLinea
                ];
            }

            $igv = $subtotal * 0.18;
            $total = $subtotal + $igv;

            // Crear pedido con toda la información
            $pedido = Pedido::create([
                'codigo_pedido' => 'PED-' . date('Ymd') . '-' . str_pad(Pedido::count() + 1, 4, '0', STR_PAD_LEFT),
                'cliente_id' => null, // Para e-commerce usamos user_cliente_id
                'user_cliente_id' => $userCliente->id,
                'fecha_pedido' => now(),
                'subtotal' => $subtotal,
                'igv' => $igv,
                'descuento_total' => 0,
                'total' => $total,
                'estado_pedido_id' => 1, // Estado inicial "Pendiente"
                'metodo_pago' => $request->metodo_pago,
                'direccion_envio' => $request->direccion_envio,
                'telefono_contacto' => $request->telefono_contacto,
                'observaciones' => $request->observaciones,
                'user_id' => 1, // ID del sistema para pedidos de e-commerce
                // Información adicional del checkout
                'numero_documento' => $request->numero_documento,
                'cliente_nombre' => $request->cliente_nombre,
                'cliente_email' => $request->cliente_email,
                'forma_envio' => $request->forma_envio,
                'costo_envio' => $request->costo_envio ?? 0,
                'departamento_id' => $request->departamento_id,
                'provincia_id' => $request->provincia_id,
                'distrito_id' => $request->distrito_id,
                'departamento_nombre' => $request->departamento_nombre,
                'provincia_nombre' => $request->provincia_nombre,
                'distrito_nombre' => $request->distrito_nombre,
                'ubicacion_completa' => $request->ubicacion_completa
            ]);

            // Crear detalles y actualizar stock
            foreach ($productosValidados as $prod) {
                PedidoDetalle::create([
                    'pedido_id' => $pedido->id,
                    'producto_id' => $prod['producto']->id,
                    'codigo_producto' => $prod['producto']->codigo_producto,
                    'nombre_producto' => $prod['producto']->nombre,
                    'cantidad' => $prod['cantidad'],
                    'precio_unitario' => $prod['precio_unitario'],
                    'subtotal_linea' => $prod['subtotal_linea']
                ]);

                // Actualizar stock
                $prod['producto']->decrement('stock', $prod['cantidad']);
            }

            DB::commit();

            return response()->json([
                'message' => 'Pedido creado exitosamente',
                'pedido' => $pedido->load(['detalles', 'estadoPedido']),
                'codigo_pedido' => $pedido->codigo_pedido
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Error al crear pedido',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado del pedido con tracking
     */
    public function cambiarEstado(Request $request, $pedidoId)
    {
        $validator = Validator::make($request->all(), [
            'estado_pedido_id' => 'required|exists:estados_pedido,id',
            'comentario' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $pedido = Pedido::findOrFail($pedidoId);
            $estadoAnterior = $pedido->estado_pedido_id;
            
            DB::beginTransaction();
            
            // Actualizar estado del pedido
            $pedido->update([
                'estado_pedido_id' => $request->estado_pedido_id
            ]);
            
            // Crear registro de tracking
            PedidoTracking::create([
                'pedido_id' => $pedido->id,
                'estado_pedido_id' => $request->estado_pedido_id,
                'comentario' => $request->comentario,
                'usuario_id' => auth()->id(),
                'fecha_cambio' => now()
            ]);
            
            DB::commit();
            
            // Recargar pedido con relaciones
            $pedidoActualizado = Pedido::with(['estadoPedido', 'tracking.estadoPedido', 'tracking.usuario'])
                ->findOrFail($pedidoId);
            
            return response()->json([
                'message' => 'Estado del pedido actualizado exitosamente',
                'pedido' => $pedidoActualizado,
                'tracking' => $pedidoActualizado->tracking
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Error al cambiar estado del pedido: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener tracking de un pedido específico para el cliente
     */
    public function getTrackingPedido($pedidoId)
    {
        try {
            $pedido = Pedido::with([
                'estadoPedido', 
                'tracking.estadoPedido', 
                'tracking.usuario'
            ])->findOrFail($pedidoId);
            
            // Verificar que el pedido pertenece al usuario autenticado
            $user = request()->user();
            if ($pedido->user_cliente_id !== $user->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
            
            return response()->json([
                'status' => 'success',
                'pedido' => [
                    'id' => $pedido->id,
                    'codigo_pedido' => $pedido->codigo_pedido,
                    'forma_envio' => $pedido->forma_envio,
                    'estado_actual' => $pedido->estadoPedido,
                    'es_envio_provincia' => $pedido->esEnvioAProvincia(),
                    'tracking' => $pedido->tracking->map(function($track) {
                        return [
                            'id' => $track->id,
                            'estado' => $track->estadoPedido,
                            'comentario' => $track->comentario,
                            'fecha_cambio' => $track->fecha_cambio,
                            'usuario' => $track->usuario ? $track->usuario->name : 'Sistema'
                        ];
                    })
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener tracking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener pedidos del cliente con información de tracking
     */
    public function misPedidos(Request $request)
    {
        try {
            $userCliente = $request->user();
            
            $pedidos = Pedido::with([
                'estadoPedido',
                'detalles.producto',
                'tracking.estadoPedido'
            ])
            ->where('user_cliente_id', $userCliente->id)
            ->orderBy('fecha_pedido', 'desc')
            ->get();
            
            return response()->json([
                'status' => 'success',
                'pedidos' => $pedidos->map(function($pedido) {
                    return [
                        'id' => $pedido->id,
                        'codigo_pedido' => $pedido->codigo_pedido,
                        'fecha_pedido' => $pedido->fecha_pedido,
                        'total' => $pedido->total,
                        'estado_actual' => $pedido->estadoPedido,
                        'forma_envio' => $pedido->forma_envio,
                        'es_envio_provincia' => $pedido->esEnvioAProvincia(),
                        'tiene_tracking' => $pedido->tracking->count() > 0,
                        'ultimo_estado' => $pedido->tracking->last()?->estadoPedido,
                        'detalles_count' => $pedido->detalles->count()
                    ];
                })
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener pedidos: ' . $e->getMessage()
            ], 500);
        }
    }

    public function actualizarEstado(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'estado_pedido_id' => 'required|exists:estados_pedido,id',
            'comentario' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $pedido = Pedido::findOrFail($id);
            
            DB::beginTransaction();
            
            // Actualizar estado del pedido
            $pedido->update([
                'estado_pedido_id' => $request->estado_pedido_id
            ]);
            
            // Crear registro de tracking (solo si no existe ya un registro para este cambio)
            $existeTracking = PedidoTracking::where('pedido_id', $pedido->id)
                ->where('estado_pedido_id', $request->estado_pedido_id)
                ->whereDate('fecha_cambio', now()->toDateString())
                ->exists();
                
            if (!$existeTracking) {
                PedidoTracking::create([
                    'pedido_id' => $pedido->id,
                    'estado_pedido_id' => $request->estado_pedido_id,
                    'comentario' => $request->comentario ?? 'Estado actualizado desde panel administrativo',
                    'usuario_id' => auth()->id(),
                    'fecha_cambio' => now()
                ]);
            }
            
            DB::commit();

            return response()->json([
                'message' => 'Estado del pedido actualizado correctamente',
                'pedido' => $pedido->load(['estadoPedido', 'tracking'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Error al actualizar estado del pedido',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getEstados(Request $request)
    {
        try {
            $pedidoId = $request->query('pedido_id');
            
            if ($pedidoId) {
                // Si se proporciona un pedido_id, devolver estados específicos para ese pedido
                $pedido = Pedido::findOrFail($pedidoId);
                $estados = $pedido->getEstadosDisponibles();
            } else {
                // Devolver todos los estados
                $estados = EstadoPedido::orderBy('orden')->get();
            }
            
            return response()->json([
                'status' => 'success',
                'estados' => $estados
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estados: ' . $e->getMessage()
            ], 500);
        }
    }

    public function estadisticas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $pendientes = Pedido::where('estado_pedido_id', 1)->count();
            $preparacion = Pedido::where('estado_pedido_id', 3)->count();
            $enviados = Pedido::where('estado_pedido_id', 4)->count();
            $entregados = Pedido::where('estado_pedido_id', 5)->count();

            return response()->json([
                'pendientes' => $pendientes,
                'preparacion' => $preparacion,
                'enviados' => $enviados,
                'entregados' => $entregados,
                'periodo' => ['inicio' => $fechaInicio, 'fin' => $fechaFin]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function destroy($id)
    {
        try {
            $pedido = Pedido::findOrFail($id);
            
            // Restaurar stock antes de eliminar
            foreach ($pedido->detalles as $detalle) {
                $detalle->producto->increment('stock', $detalle->cantidad);
            }
            
            $pedido->delete();

            return response()->json([
                'message' => 'Pedido eliminado correctamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar pedido',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener pedidos de un usuario específico
     */
    public function pedidosPorUsuario($userId)
    {
        try {
            $pedidos = Pedido::with([
                'detalles.producto', 
                'estadoPedido',
                'userCliente'
            ])
            ->where('user_cliente_id', $userId)
            ->orderBy('fecha_pedido', 'desc')
            ->get();

            // Transformar los pedidos para incluir información adicional
            $pedidosTransformados = $pedidos->map(function ($pedido) {
                return [
                    'id' => $pedido->id,
                    'codigo_pedido' => $pedido->codigo_pedido,
                    'fecha_pedido' => $pedido->fecha_pedido,
                    'total' => $pedido->total,
                    'metodo_pago' => $pedido->metodo_pago,
                    'direccion_envio' => $pedido->direccion_envio,
                    'telefono_contacto' => $pedido->telefono_contacto,
                    'observaciones' => $pedido->observaciones,
                    'estado_pedido' => $pedido->estadoPedido,
                    'user_cliente' => $pedido->userCliente,
                    'detalles' => $pedido->detalles->map(function ($detalle) {
                        return [
                            'id' => $detalle->id,
                            'codigo_producto' => $detalle->codigo_producto,
                            'nombre_producto' => $detalle->nombre_producto,
                            'cantidad' => $detalle->cantidad,
                            'precio_unitario' => $detalle->precio_unitario,
                            'subtotal_linea' => $detalle->subtotal_linea,
                            'imagen_url' => $detalle->imagen_url,
                            'producto' => $detalle->producto
                        ];
                    })
                ];
            });

            return response()->json([
                'status' => 'success',
                'pedidos' => $pedidosTransformados
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener pedidos del usuario',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}