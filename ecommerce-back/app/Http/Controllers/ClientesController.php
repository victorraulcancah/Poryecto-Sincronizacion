<?php

namespace App\Http\Controllers;

use App\Models\UserCliente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ClientesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = UserCliente::with(['tipoDocumento', 'direccionPredeterminada']);

            // Filtros
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('nombres', 'like', "%{$search}%")
                      ->orWhere('apellidos', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('numero_documento', 'like', "%{$search}%");
                });
            }

            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            // Agregar tipo_login si existe en la tabla
            if ($request->filled('tipo_login')) {
                // Si no tienes este campo, puedes comentar esta línea
                // $query->where('tipo_login', $request->tipo_login);
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('created_at', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('created_at', '<=', $request->fecha_hasta);
            }

            $perPage = $request->get('per_page', 15);
            $clientes = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Transformar los datos para que coincidan con el frontend
            $clientesTransformados = $clientes->getCollection()->map(function ($cliente) {
                return [
                    'id_cliente' => $cliente->id,
                    'nombres' => $cliente->nombres,
                    'apellidos' => $cliente->apellidos,
                    'nombre_completo' => $cliente->nombre_completo,
                    'email' => $cliente->email,
                    'telefono' => $cliente->telefono,
                    'numero_documento' => $cliente->numero_documento,
                    'tipo_documento' => $cliente->tipoDocumento ? [
                        'id' => $cliente->tipoDocumento->id,
                        'nombre' => $cliente->tipoDocumento->nombre
                    ] : null,
                    'estado' => $cliente->estado,
                    'fecha_registro' => $cliente->created_at->toISOString(),
                    'foto' => $cliente->foto_url,
                    'tipo_login' => 'manual', // Por defecto manual, ajusta según tu lógica
                    'genero' => $cliente->genero,
                    'fecha_nacimiento' => $cliente->fecha_nacimiento?->format('Y-m-d'),
                ];
            });

            // Reemplazar la colección transformada
            $clientes->setCollection($clientesTransformados);

            return response()->json([
                'status' => 'success',
                'data' => $clientes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener clientes: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $cliente = UserCliente::with(['tipoDocumento', 'direcciones'])
                                 ->findOrFail($id);

            // Transformar datos del cliente
            $clienteData = [
                'id_cliente' => $cliente->id,
                'nombres' => $cliente->nombres,
                'apellidos' => $cliente->apellidos,
                'nombre_completo' => $cliente->nombre_completo,
                'email' => $cliente->email,
                'telefono' => $cliente->telefono,
                'numero_documento' => $cliente->numero_documento,
                'tipo_documento' => $cliente->tipoDocumento ? [
                    'id' => $cliente->tipoDocumento->id,
                    'nombre' => $cliente->tipoDocumento->nombre
                ] : null,
                'estado' => $cliente->estado,
                'fecha_registro' => $cliente->created_at->toISOString(),
                'foto' => $cliente->foto_url,
                'genero' => $cliente->genero,
                'fecha_nacimiento' => $cliente->fecha_nacimiento?->format('Y-m-d'),
                'direcciones' => $cliente->direcciones->map(function($direccion) {
                    return [
                        'id' => $direccion->id,
                        'nombre_destinatario' => $direccion->nombre_destinatario,
                        'direccion_completa' => $direccion->direccion_completa,
                        'referencia' => $direccion->referencia,
                        'predeterminada' => $direccion->predeterminada,
                        'activa' => $direccion->activa,
                    ];
                })
            ];

            // Estadísticas ficticias (puedes reemplazar con datos reales cuando tengas el módulo de ventas)
            $estadisticas = [
                'total_pedidos' => rand(0, 20),
                'total_gastado' => rand(0, 5000),
                'ultima_compra' => now()->subDays(rand(1, 180))->format('Y-m-d'),
                'productos_favoritos' => ['Producto A', 'Producto B'],
                'porcentaje_entregados' => rand(80, 100)
            ];

            // Historial ficticio
            $pedidos = collect([
                [
                    'id' => 1,
                    'fecha' => now()->subDays(5)->format('Y-m-d'),
                    'estado' => 'Entregado',
                    'monto' => 189.90,
                    'metodo_pago' => 'Tarjeta'
                ],
                [
                    'id' => 2,
                    'fecha' => now()->subDays(15)->format('Y-m-d'),
                    'estado' => 'Pendiente',
                    'monto' => 65.00,
                    'metodo_pago' => 'Yape'
                ]
            ]);

            $cupones = collect([]);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'cliente' => $clienteData,
                    'estadisticas' => $estadisticas,
                    'pedidos' => $pedidos,
                    'cupones' => $cupones
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cliente no encontrado: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear un nuevo cliente
     * POST /api/clientes
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'tipo_documento' => 'required|in:1,4,6,7,0',
                'numero_documento' => 'required|string|max:20|unique:clientes,numero_documento',
                'nombres' => 'nullable|string|max:255',
                'apellidos' => 'nullable|string|max:255',
                'nombre_completo' => 'nullable|string|max:255',
                'razon_social' => 'nullable|string|max:255',
                'nombre_comercial' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'telefono' => 'nullable|string|max:20',
                'direccion' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de validación incorrectos',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Determinar razon_social según los datos proporcionados
            $razonSocial = null;

            if ($request->filled('razon_social')) {
                $razonSocial = $request->razon_social;
            } elseif ($request->filled('nombre_completo')) {
                $razonSocial = $request->nombre_completo;
            } elseif ($request->filled('nombres') && $request->filled('apellidos')) {
                $razonSocial = $request->nombres . ' ' . $request->apellidos;
            } elseif ($request->filled('nombres')) {
                $razonSocial = $request->nombres;
            } else {
                $razonSocial = 'Cliente';
            }

            // Determinar nombre_comercial
            $nombreComercial = null;
            if ($request->filled('nombre_comercial')) {
                $nombreComercial = $request->nombre_comercial;
            } elseif ($request->filled('nombre_completo')) {
                $nombreComercial = $request->nombre_completo;
            } else {
                $nombreComercial = $razonSocial;
            }

            // Crear cliente
            $cliente = \App\Models\Cliente::create([
                'tipo_documento' => $request->tipo_documento,
                'numero_documento' => $request->numero_documento,
                'razon_social' => $razonSocial,
                'nombre_comercial' => $nombreComercial,
                'direccion' => $request->direccion ?? 'Sin dirección',
                'email' => $request->email,
                'telefono' => $request->telefono,
                'activo' => true,
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
            ]);

            // Preparar respuesta en el formato esperado
            $nombres = null;
            $apellidos = null;

            // Intentar separar nombres y apellidos si es DNI
            if ($cliente->tipo_documento === '1') {
                $partesNombre = explode(' ', $razonSocial, 2);
                if (count($partesNombre) === 2) {
                    $nombres = $partesNombre[0];
                    $apellidos = $partesNombre[1];
                } else {
                    $nombres = $razonSocial;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id_cliente' => $cliente->id,
                    'numero_documento' => $cliente->numero_documento,
                    'nombre_completo' => $cliente->nombre_completo,
                    'nombres' => $nombres,
                    'apellidos' => $apellidos,
                    'email' => $cliente->email,
                    'telefono' => $cliente->telefono,
                    'direccion' => $cliente->direccion,
                    'estado' => $cliente->activo,
                ],
                'message' => 'Cliente registrado exitosamente'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar cliente: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $cliente = UserCliente::findOrFail($id);

            $request->validate([
                'nombres' => 'required|string|max:255',
                'apellidos' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:user_clientes,email,' . $id,
                'telefono' => 'nullable|string|max:20',
                'fecha_nacimiento' => 'nullable|date',
                'genero' => 'nullable|in:masculino,femenino,otro',
                'estado' => 'required|boolean'
            ]);

            $cliente->update($request->only([
                'nombres', 'apellidos', 'email', 'telefono', 
                'fecha_nacimiento', 'genero', 'estado'
            ]));

            // Transformar respuesta
            $clienteTransformado = [
                'id_cliente' => $cliente->id,
                'nombres' => $cliente->nombres,
                'apellidos' => $cliente->apellidos,
                'nombre_completo' => $cliente->nombre_completo,
                'email' => $cliente->email,
                'telefono' => $cliente->telefono,
                'numero_documento' => $cliente->numero_documento,
                'tipo_documento' => $cliente->tipoDocumento ? [
                    'id' => $cliente->tipoDocumento->id,
                    'nombre' => $cliente->tipoDocumento->nombre
                ] : null,
                'estado' => $cliente->estado,
                'fecha_registro' => $cliente->created_at->toISOString(),
                'foto' => $cliente->foto_url,
                'genero' => $cliente->genero,
                'fecha_nacimiento' => $cliente->fecha_nacimiento?->format('Y-m-d'),
            ];

            return response()->json([
                'status' => 'success',
                'message' => 'Cliente actualizado correctamente',
                'data' => $clienteTransformado
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $cliente = UserCliente::findOrFail($id);
            
            // Soft delete - cambiar estado a inactivo
            $cliente->update(['estado' => false]);

            return response()->json([
                'status' => 'success',
                'message' => 'Cliente desactivado correctamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al desactivar cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    public function toggleEstado($id): JsonResponse
    {
        try {
            $cliente = UserCliente::findOrFail($id);
            $cliente->update(['estado' => !$cliente->estado]);

            return response()->json([
                'status' => 'success',
                'message' => 'Estado actualizado correctamente',
                'data' => [
                    'id_cliente' => $cliente->id,
                    'estado' => $cliente->estado
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }

    public function estadisticas(): JsonResponse
    {
        try {
            $totalClientes = UserCliente::count();
            $clientesActivos = UserCliente::where('estado', true)->count();
            $clientesNuevos = UserCliente::whereMonth('created_at', now()->month)
                                       ->whereYear('created_at', now()->year)
                                       ->count();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_clientes' => $totalClientes,
                    'clientes_activos' => $clientesActivos,
                    'clientes_nuevos' => $clientesNuevos
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
 * Obtener direcciones del cliente autenticado
 */
public function misDirecciones(Request $request)
{
    try {
        $cliente = $request->user();
        \Log::info('Cliente autenticado:', ['id' => $cliente->id, 'email' => $cliente->email]);
        
        $direcciones = $cliente->direcciones()
            ->with(['ubigeo'])
            ->orderBy('predeterminada', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
        
        \Log::info('Direcciones encontradas:', ['count' => $direcciones->count()]);
        
        // Transformar los datos del ubigeo para mostrar nombres en lugar de códigos
        $direcciones->transform(function ($direccion) {
            if ($direccion->ubigeo) {
                // Obtener el departamento
                $departamento = \App\Models\UbigeoInei::where('departamento', $direccion->ubigeo->departamento)
                    ->where('provincia', '00')
                    ->where('distrito', '00')
                    ->first();
                
                // Obtener la provincia
                $provincia = \App\Models\UbigeoInei::where('departamento', $direccion->ubigeo->departamento)
                    ->where('provincia', $direccion->ubigeo->provincia)
                    ->where('distrito', '00')
                    ->first();
                
                // Asignar los nombres
                $direccion->ubigeo->departamento_nombre = $departamento ? $departamento->nombre : 'N/A';
                $direccion->ubigeo->provincia_nombre = $provincia ? $provincia->nombre : 'N/A';
                $direccion->ubigeo->distrito_nombre = $direccion->ubigeo->nombre; // El distrito ya tiene su nombre correcto
            }
            return $direccion;
        });
        
        // Log de cada dirección para debuggear
        foreach ($direcciones as $index => $direccion) {
            \Log::info("Dirección {$index}:", [
                'id' => $direccion->id,
                'nombre_destinatario' => $direccion->nombre_destinatario,
                'id_ubigeo' => $direccion->id_ubigeo,
                'ubigeo_loaded' => $direccion->relationLoaded('ubigeo'),
                'ubigeo_data' => $direccion->ubigeo
            ]);
        }
        
        return response()->json([
            'status' => 'success',
            'direcciones' => $direcciones
        ]);
    } catch (\Exception $e) {
        \Log::error('Error en misDirecciones:', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'status' => 'error',
            'message' => 'Error al obtener direcciones: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Crear nueva dirección
 */
public function crearDireccion(Request $request)
{
    $request->validate([
        'nombre_destinatario' => 'required|string|max:255',
        'direccion_completa' => 'required|string',
        'id_ubigeo' => 'required|string|exists:ubigeo_inei,id_ubigeo',
        'telefono' => 'nullable|string|max:20',
        'predeterminada' => 'boolean'
    ]);

    $cliente = $request->user();
    
    // Si es predeterminada, quitar predeterminada de las demás
    if ($request->predeterminada) {
        $cliente->direcciones()->update(['predeterminada' => false]);
    }
    
    $direccion = $cliente->direcciones()->create([
        'nombre_destinatario' => $request->nombre_destinatario,
        'direccion_completa' => $request->direccion_completa,
        'id_ubigeo' => $request->id_ubigeo,
        'telefono' => $request->telefono,
        'predeterminada' => $request->predeterminada ?? false,
        'activa' => true
    ]);
    
    $direccion->load('ubigeo');
    
    return response()->json([
        'status' => 'success',
        'message' => 'Dirección creada exitosamente',
        'direccion' => $direccion
    ], 201);
}

/**
 * Actualizar dirección existente
 */
public function actualizarDireccion(Request $request, $id)
{
    $request->validate([
        'nombre_destinatario' => 'required|string|max:255',
        'direccion_completa' => 'required|string',
        'id_ubigeo' => 'required|string|exists:ubigeo_inei,id_ubigeo',
        'telefono' => 'nullable|string|max:20',
        'predeterminada' => 'boolean'
    ]);

    $cliente = $request->user();
    
    // Buscar la dirección que pertenece al cliente autenticado
    $direccion = $cliente->direcciones()->findOrFail($id);
    
    // Si es predeterminada, quitar predeterminada de las demás
    if ($request->predeterminada) {
        $cliente->direcciones()->where('id', '!=', $id)->update(['predeterminada' => false]);
    }
    
    $direccion->update([
        'nombre_destinatario' => $request->nombre_destinatario,
        'direccion_completa' => $request->direccion_completa,
        'id_ubigeo' => $request->id_ubigeo,
        'telefono' => $request->telefono,
        'predeterminada' => $request->predeterminada ?? false
    ]);
    
    // Recargar la dirección con la relación ubigeo
    $direccion->refresh();
    $direccion->load('ubigeo');
    
    return response()->json([
        'status' => 'success',
        'message' => 'Dirección actualizada exitosamente',
        'direccion' => $direccion
    ]);
}

/**
 * Eliminar dirección
 */
public function eliminarDireccion(Request $request, $id)
{
    $cliente = $request->user();
    
    // Buscar la dirección que pertenece al cliente autenticado
    $direccion = $cliente->direcciones()->findOrFail($id);
    
    // No permitir eliminar si es la única dirección
    if ($cliente->direcciones()->count() <= 1) {
        return response()->json([
            'status' => 'error',
            'message' => 'No puedes eliminar tu única dirección'
        ], 400);
    }
    
    $esPredeterminada = $direccion->predeterminada;
    
    $direccion->delete();
    
    // Si era predeterminada, establecer otra como predeterminada
    if ($esPredeterminada) {
        $cliente->direcciones()->first()?->update(['predeterminada' => true]);
    }
    
    return response()->json([
        'status' => 'success',
        'message' => 'Dirección eliminada exitosamente'
    ]);
}

/**
 * Establecer dirección como predeterminada
 */
public function establecerPredeterminada(Request $request, $id)
{
    $cliente = $request->user();
    
    // Buscar la dirección que pertenece al cliente autenticado
    $direccion = $cliente->direcciones()->findOrFail($id);
    
    // Quitar predeterminada de todas las direcciones del cliente
    $cliente->direcciones()->update(['predeterminada' => false]);
    
    // Establecer esta como predeterminada
    $direccion->update(['predeterminada' => true]);
    
    // Recargar la dirección con la relación ubigeo
    $direccion->refresh();
    $direccion->load('ubigeo');
    
    return response()->json([
        'status' => 'success',
        'message' => 'Dirección establecida como predeterminada',
        'direccion' => $direccion
    ]);
}

/**
 * Subir foto de perfil del cliente
 */
public function uploadFoto(Request $request): JsonResponse
{
    try {
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $cliente = Auth::user();

        if (!$cliente || !($cliente instanceof UserCliente)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        $file = $request->file('foto');

        // Crear directorio si no existe
        $directory = 'clientes';
        if (!Storage::disk('public')->exists($directory)) {
            Storage::disk('public')->makeDirectory($directory);
        }

        // Eliminar foto anterior si existe
        if ($cliente->foto) {
            $oldPath = str_replace('/storage/', '', $cliente->foto);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Generar nombre único para el archivo
        $fileName = time() . '_' . $cliente->id . '.' . $file->getClientOriginalExtension();

        // Guardar archivo
        $path = $file->storeAs($directory, $fileName, 'public');

        // Actualizar ruta en la base de datos
        $fotoUrl = '/storage/' . $path;
        $cliente->update(['foto' => $fotoUrl]);

        return response()->json([
            'status' => 'success',
            'message' => 'Foto subida exitosamente',
            'foto_url' => $fotoUrl
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error al subir la foto: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Eliminar foto de perfil del cliente
 */
public function deleteFoto(Request $request): JsonResponse
{
    try {
        $cliente = Auth::user();

        if (!$cliente || !($cliente instanceof UserCliente)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        // Eliminar archivo si existe
        if ($cliente->foto) {
            $oldPath = str_replace('/storage/', '', $cliente->foto);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Limpiar la ruta en la base de datos
        $cliente->update(['foto' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Foto eliminada exitosamente'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error al eliminar la foto: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Buscar cliente por número de documento en ambas tablas (clientes y user_clientes)
     * GET /api/clientes/buscar-por-documento?numero_documento=76165963
     */
    public function buscarPorDocumento(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'numero_documento' => 'required|string'
            ]);

            $numeroDocumento = $request->input('numero_documento');
            $resultado = null;

            // 1. Buscar PRIMERO en 'user_clientes' (usuarios registrados - tiene datos completos)
            $userCliente = UserCliente::select('id', 'numero_documento', 'nombres', 'apellidos', 'email', 'telefono', 'estado')
                ->where('numero_documento', $numeroDocumento)
                ->where('estado', true)
                ->first();

            if ($userCliente) {
                // Obtener dirección predeterminada
                $direccionPredeterminada = $userCliente->direccionPredeterminada;
                $direccionCompleta = $direccionPredeterminada
                    ? $direccionPredeterminada->direccion_completa
                    : null;

                // Cliente encontrado en user_clientes
                $resultado = [
                    'id_cliente' => $userCliente->id,
                    'numero_documento' => $userCliente->numero_documento,
                    'nombre_completo' => $userCliente->nombres . ' ' . $userCliente->apellidos,
                    'nombres' => $userCliente->nombres,
                    'apellidos' => $userCliente->apellidos,
                    'email' => $userCliente->email,
                    'telefono' => $userCliente->telefono,
                    'direccion' => $direccionCompleta,
                    'estado' => $userCliente->estado
                ];
            }

            // 2. Si no se encuentra, buscar en 'clientes' (facturación - solo para empresas/RUC)
            if (!$resultado) {
                $clienteFacturacion = \App\Models\Cliente::select('id', 'tipo_documento', 'numero_documento', 'razon_social', 'nombre_comercial', 'email', 'telefono', 'direccion', 'activo')
                    ->where('numero_documento', $numeroDocumento)
                    ->where('activo', true)
                    ->first();

                if ($clienteFacturacion) {
                    // Determinar nombre completo
                    $nombreCompleto = $clienteFacturacion->nombre_comercial ?: $clienteFacturacion->razon_social;

                    // Intentar separar nombres y apellidos si es DNI (tipo_documento = 1)
                    $nombres = null;
                    $apellidos = null;

                    if ($clienteFacturacion->tipo_documento === '1') {
                        // Es DNI, intentar parsear razon_social
                        $partesNombre = explode(' ', $nombreCompleto, 2);
                        if (count($partesNombre) === 2) {
                            $nombres = $partesNombre[0];
                            $apellidos = $partesNombre[1];
                        } else {
                            $nombres = $nombreCompleto;
                        }
                    }

                    // Cliente encontrado en tabla clientes (facturación)
                    $resultado = [
                        'id_cliente' => $clienteFacturacion->id,
                        'numero_documento' => $clienteFacturacion->numero_documento,
                        'nombre_completo' => $nombreCompleto,
                        'nombres' => $nombres,
                        'apellidos' => $apellidos,
                        'email' => $clienteFacturacion->email,
                        'telefono' => $clienteFacturacion->telefono,
                        'direccion' => $clienteFacturacion->direccion,
                        'estado' => $clienteFacturacion->activo
                    ];
                }
            }

            // 3. Retornar resultado
            if ($resultado) {
                return response()->json([
                    'success' => true,
                    'data' => [$resultado], // Envuelto en array para consistencia con el frontend
                    'message' => 'Cliente encontrado'
                ]);
            }

            // No se encontró en ninguna tabla
            return response()->json([
                'success' => false,
                'message' => 'No se encontró cliente con el número de documento: ' . $numeroDocumento,
                'data' => []
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar cliente: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }
}