<?php

namespace App\Http\Controllers;

use App\Models\Motorizado;
use App\Models\UserMotorizado;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class MotorizadosController extends Controller
{
    public function index()
    {
        try {
            $motorizados = Motorizado::with(['tipoDocumento', 'registradoPor', 'ubicacion', 'userMotorizado'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($motorizado) {
                    return [
                        'id' => $motorizado->id,
                        'numero_unidad' => $motorizado->numero_unidad,
                        'nombre_completo' => $motorizado->nombre_completo,
                        'foto_perfil' => $motorizado->foto_perfil,
                        'tipo_documento' => $motorizado->tipoDocumento,
                        'numero_documento' => $motorizado->numero_documento,
                        'licencia_numero' => $motorizado->licencia_numero,
                        'licencia_categoria' => $motorizado->licencia_categoria,
                        'telefono' => $motorizado->telefono,
                        'correo' => $motorizado->correo,
                        'direccion_detalle' => $motorizado->direccion_detalle,
                        'ubicacion' => $motorizado->ubicacion,
                        'vehiculo_marca' => $motorizado->vehiculo_marca,
                        'vehiculo_modelo' => $motorizado->vehiculo_modelo,
                        'vehiculo_ano' => $motorizado->vehiculo_ano,
                        'vehiculo_cilindraje' => $motorizado->vehiculo_cilindraje,
                        'vehiculo_color_principal' => $motorizado->vehiculo_color_principal,
                        'vehiculo_color_secundario' => $motorizado->vehiculo_color_secundario,
                        'vehiculo_placa' => $motorizado->vehiculo_placa,
                        'vehiculo_motor' => $motorizado->vehiculo_motor,
                        'vehiculo_chasis' => $motorizado->vehiculo_chasis,
                        'comentario' => $motorizado->comentario,
                        'estado' => $motorizado->estado,
                        'registrado_por' => $motorizado->registradoPor,
                        'created_at' => $motorizado->created_at,
                        'updated_at' => $motorizado->updated_at,
                        // Información de usuario de acceso
                        'tiene_usuario' => $motorizado->tiene_usuario,
                        'username' => $motorizado->username,
                        'estado_usuario' => $motorizado->estado_usuario,
                        'ultimo_login' => $motorizado->userMotorizado?->last_login_at,
                    ];
                });

            return response()->json($motorizados);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al cargar motorizados'], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre_completo' => 'required|string|max:255',
            'foto_perfil' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'tipo_documento_id' => 'required|exists:document_types,id',
            'numero_documento' => 'required|string|max:20|unique:motorizados',
            'licencia_numero' => 'required|string|max:50',
            'licencia_categoria' => 'required|in:A1,A2a,A2b,A3a,A3b,A3c',
            'telefono' => 'required|string|max:20',
            'correo' => 'required|email|unique:motorizados',
            'direccion_detalle' => 'required|string',
            'ubigeo' => 'required|string|exists:ubigeo_inei,id_ubigeo',
            'vehiculo_marca' => 'required|string|max:100',
            'vehiculo_modelo' => 'required|string|max:100',
            'vehiculo_ano' => 'required|integer|min:1950|max:' . (date('Y') + 1),
            'vehiculo_cilindraje' => 'required|string|max:50',
            'vehiculo_color_principal' => 'required|string|max:50',
            'vehiculo_color_secundario' => 'nullable|string|max:50',
            'vehiculo_placa' => 'required|string|max:20|unique:motorizados',
            'vehiculo_motor' => 'required|string|max:100',
            'vehiculo_chasis' => 'required|string|max:100',
            'comentario' => 'nullable|string',
            // Campos para crear usuario
            'crear_usuario' => 'nullable|in:true,false,1,0',
            'password' => 'nullable|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Error de validación',
                'details' => $validator->errors()
            ], 422);
        }

        try {
            $motorizado = new Motorizado();
            
            // Generar número de unidad
            $motorizado->numero_unidad = Motorizado::getProximoNumeroUnidad();
            
            // Llenar datos básicos
            $motorizado->fill($request->except(['foto_perfil']));
            $motorizado->registrado_por = auth()->id();

            // Manejar foto de perfil
            if ($request->hasFile('foto_perfil')) {
                $foto = $request->file('foto_perfil');
                $nombreFoto = time() . '_' . $foto->getClientOriginalName();
                $rutaFoto = $foto->storeAs('motorizados/fotos', $nombreFoto, 'public');
                $motorizado->foto_perfil = config('app.url') . '/storage/' . $rutaFoto;
            }

            $motorizado->save();

            $response = [
                'message' => 'Motorizado registrado exitosamente',
                'motorizado' => $motorizado->load(['tipoDocumento', 'registradoPor', 'ubicacion'])
            ];

            // Si se solicita crear usuario
            if ($request->input('crear_usuario', false)) {
                try {
                    // Usar contraseña proporcionada o generar automáticamente
                    $passwordPersonalizada = $request->input('password');
                    if (!empty($passwordPersonalizada) && strlen(trim($passwordPersonalizada)) >= 6) {
                        $password = trim($passwordPersonalizada);
                        Log::info('🔑 Usando contraseña personalizada para motorizado', ['motorizado_id' => $motorizado->id]);
                    } else {
                        $password = Str::upper(Str::random(4)) . rand(1000, 9999);
                        Log::info('🔑 Generando contraseña automática para motorizado', ['motorizado_id' => $motorizado->id]);
                    }

                    $userMotorizado = UserMotorizado::create([
                        'motorizado_id' => $motorizado->id,
                        'username' => $motorizado->correo,
                        'password' => Hash::make($password),
                        'is_active' => true
                    ]);

                    // Asignar rol motorizado
                    $userMotorizado->assignRole('motorizado-app');

                    // Actualizar referencia en motorizado
                    $motorizado->update(['user_motorizado_id' => $userMotorizado->id]);

                    // Enviar email con credenciales
                    try {
                        Mail::to($motorizado->correo)->send(
                            new \App\Mail\MotorizadoCredentialsMail($userMotorizado, $motorizado, $password)
                        );
                        $emailEnviado = true;
                    } catch (\Exception $e) {
                        Log::error('Error enviando email a motorizado: ' . $e->getMessage());
                        $emailEnviado = false;
                    }

                    $response['usuario_creado'] = true;
                    $response['email_enviado'] = $emailEnviado;
                    $response['credenciales'] = [
                        'username' => $userMotorizado->username,
                        'correo' => $motorizado->correo,
                        'password' => $password // Solo se muestra una vez
                    ];

                    Log::info('Usuario motorizado creado exitosamente', [
                        'motorizado_id' => $motorizado->id,
                        'username' => $userMotorizado->username
                    ]);

                } catch (\Exception $e) {
                    Log::error('Error al crear usuario motorizado', [
                        'motorizado_id' => $motorizado->id,
                        'error' => $e->getMessage()
                    ]);

                    $response['warning'] = 'Motorizado creado pero hubo un error al crear el usuario de acceso';
                }
            }

            return response()->json($response, 201);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al registrar motorizado'], 500);
        }
    }

    public function show($id)
    {
        try {
            $motorizado = Motorizado::with(['tipoDocumento', 'registradoPor', 'ubicacion'])
                ->findOrFail($id);
            
            return response()->json($motorizado);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Motorizado no encontrado'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        // Debug inicial
        Log::info('=== INICIO UPDATE MOTORIZADO ===');
        Log::info('ID recibido: ' . $id);
        Log::info('Método HTTP: ' . $request->method());
        Log::info('Content-Type: ' . $request->header('Content-Type'));
        
        // NUEVO: Verificar si Laravel está interpretando correctamente el _method
        if ($request->has('_method')) {
            Log::info('_method encontrado: ' . $request->get('_method'));
        }
        
        Log::info('Todos los datos del request:', $request->all());
        Log::info('Archivos recibidos:', $request->allFiles());
        Log::info('Request tiene datos?', ['empty' => empty($request->all())]);

        $validator = Validator::make($request->all(), [
            'nombre_completo' => 'required|string|max:255',
            'foto_perfil' => 'nullable|sometimes|image|mimes:jpeg,png,jpg|max:2048',
            'tipo_documento_id' => 'required|exists:document_types,id',
            'numero_documento' => 'required|string|max:20|unique:motorizados,numero_documento,' . $id,
            'licencia_numero' => 'required|string|max:50',
            'licencia_categoria' => 'required|in:A1,A2a,A2b,A3a,A3b,A3c',
            'telefono' => 'required|string|max:20',
            'correo' => 'required|email|unique:motorizados,correo,' . $id,
            'direccion_detalle' => 'required|string',
            'ubigeo' => 'required|string|exists:ubigeo_inei,id_ubigeo',
            'vehiculo_marca' => 'required|string|max:100',
            'vehiculo_modelo' => 'required|string|max:100',
            'vehiculo_ano' => 'required|integer|min:1950|max:' . (date('Y') + 1),
            'vehiculo_cilindraje' => 'required|string|max:50',
            'vehiculo_color_principal' => 'required|string|max:50',
            'vehiculo_color_secundario' => 'nullable|string|max:50',
            'vehiculo_placa' => 'required|string|max:20|unique:motorizados,vehiculo_placa,' . $id,
            'vehiculo_motor' => 'required|string|max:100',
            'vehiculo_chasis' => 'required|string|max:100',
            'comentario' => 'nullable|string',
            'eliminar_foto' => 'nullable|string',            
        ]);

        // NUEVO: Verificar si hay archivo válido antes de validar
        if ($request->has('foto_perfil') && !$request->hasFile('foto_perfil')) {
            // Si existe el campo pero no es un archivo válido, removerlo del request
            $request->request->remove('foto_perfil');
            
            // Volver a validar sin el campo foto_perfil problemático
            $validator = Validator::make($request->all(), [
                'nombre_completo' => 'required|string|max:255',
                'tipo_documento_id' => 'required|exists:document_types,id',
                'numero_documento' => 'required|string|max:20|unique:motorizados,numero_documento,' . $id,
                'licencia_numero' => 'required|string|max:50',
                'licencia_categoria' => 'required|in:A1,A2a,A2b,A3a,A3b,A3c',
                'telefono' => 'required|string|max:20',
                'correo' => 'required|email|unique:motorizados,correo,' . $id,
                'direccion_detalle' => 'required|string',
                'ubigeo' => 'required|string|exists:ubigeo_inei,id_ubigeo',
                'vehiculo_marca' => 'required|string|max:100',
                'vehiculo_modelo' => 'required|string|max:100',
                'vehiculo_ano' => 'required|integer|min:1950|max:' . (date('Y') + 1),
                'vehiculo_cilindraje' => 'required|string|max:50',
                'vehiculo_color_principal' => 'required|string|max:50',
                'vehiculo_color_secundario' => 'nullable|string|max:50',
                'vehiculo_placa' => 'required|string|max:20|unique:motorizados,vehiculo_placa,' . $id,
                'vehiculo_motor' => 'required|string|max:100',
                'vehiculo_chasis' => 'required|string|max:100',
                'comentario' => 'nullable|string',
                'eliminar_foto' => 'nullable|string',            
            ]);
        }
        
        if ($validator->fails()) {
            Log::error('Validación falló:', $validator->errors()->toArray());
            return response()->json([
                'error' => 'Error de validación',
                'details' => $validator->errors(),
                'received_data' => $request->all()
            ], 422);
        }

        try {
             $motorizado = Motorizado::findOrFail($id);
    
            Log::info('Datos recibidos en update:', $request->all());

            // Debug: verificar qué datos llegan
            Log::info('FormData recibida:', $request->all());
            Log::info('Archivos recibidos:', $request->allFiles());
            // AGREGAR ESTA LÓGICA NUEVA AQUÍ:
            // Manejar eliminación de foto
            if ($request->has('eliminar_foto') && $request->eliminar_foto === 'true') {
                // Eliminar foto actual del storage
                if ($motorizado->foto_perfil) {
                    $rutaAnterior = str_replace('/storage/', '', $motorizado->foto_perfil);
                    Storage::disk('public')->delete($rutaAnterior);
                }
                $motorizado->foto_perfil = null;
            }
            
            // Manejar nueva foto (código existente)
            if ($request->hasFile('foto_perfil')) {
                // Eliminar foto anterior
                if ($motorizado->foto_perfil) {
                    $rutaAnterior = str_replace('/storage/', '', $motorizado->foto_perfil);
                    Storage::disk('public')->delete($rutaAnterior);
                }
                
                $foto = $request->file('foto_perfil');
                $nombreFoto = time() . '_' . $foto->getClientOriginalName();
                $rutaFoto = $foto->storeAs('motorizados/fotos', $nombreFoto, 'public');
                $motorizado->foto_perfil = config('app.url') . '/storage/' . $rutaFoto;
            }

            // Actualizar datos (excluir foto_perfil y eliminar_foto de mass assignment)
            $motorizado->fill($request->except(['foto_perfil', 'eliminar_foto']));
            $motorizado->save();

            return response()->json([
                'message' => 'Motorizado actualizado exitosamente',
                'motorizado' => $motorizado->load(['tipoDocumento', 'registradoPor', 'ubicacion'])
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al actualizar motorizado'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $motorizado = Motorizado::findOrFail($id);
            
            // Eliminar foto si existe
            if ($motorizado->foto_perfil) {
                $rutaFoto = str_replace('/storage/', '', $motorizado->foto_perfil);
                Storage::disk('public')->delete($rutaFoto);
            }
            
            $motorizado->delete();
            
            return response()->json(['message' => 'Motorizado eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al eliminar motorizado'], 500);
        }
    }

    public function toggleEstado($id)
    {
        try {
            $motorizado = Motorizado::findOrFail($id);
            $motorizado->estado = !$motorizado->estado;
            $motorizado->save();
            
            return response()->json([
                'message' => 'Estado actualizado exitosamente',
                'estado' => $motorizado->estado
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al actualizar estado'], 500);
        }
    }

    public function getCategoriasLicencia()
    {
        $motorizado = new Motorizado();
        return response()->json($motorizado->getCategoriasLicencia());
    }

    /**
     * Crear usuario para motorizado existente
     */
    public function crearUsuario(Request $request, $id)
    {
        try {
            $motorizado = Motorizado::findOrFail($id);

            if ($motorizado->userMotorizado) {
                return response()->json([
                    'error' => 'Este motorizado ya tiene un usuario asignado'
                ], 400);
            }

            // Generar contraseña automáticamente (8 caracteres alfanuméricos)
            $password = Str::upper(Str::random(4)) . rand(1000, 9999);

            $userMotorizado = UserMotorizado::create([
                'motorizado_id' => $motorizado->id,
                'username' => $motorizado->correo,
                'password' => Hash::make($password),
                'is_active' => true
            ]);

            // Asignar rol motorizado
            $userMotorizado->assignRole('motorizado-app');

            // Actualizar referencia en motorizado
            $motorizado->update(['user_motorizado_id' => $userMotorizado->id]);

            // Enviar email con credenciales
            $emailEnviado = false;
            try {
                Mail::to($motorizado->correo)->send(
                    new \App\Mail\MotorizadoCredentialsMail($userMotorizado, $motorizado, $password)
                );
                $emailEnviado = true;
            } catch (\Exception $e) {
                Log::error('Error enviando email a motorizado: ' . $e->getMessage());
            }

            return response()->json([
                'message' => $emailEnviado ?
                    'Usuario creado exitosamente. Se han enviado las credenciales al correo del motorizado.' :
                    'Usuario creado exitosamente. No se pudo enviar el email, pero las credenciales se muestran a continuación.',
                'email_enviado' => $emailEnviado,
                'credenciales' => [
                    'username' => $userMotorizado->username,
                    'password' => $password,
                    'correo' => $motorizado->correo
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear usuario motorizado', [
                'motorizado_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json(['error' => 'Error al crear usuario'], 500);
        }
    }

    /**
     * Activar/Desactivar usuario de motorizado
     */
    public function toggleUsuario($id)
    {
        try {
            $motorizado = Motorizado::findOrFail($id);

            if (!$motorizado->userMotorizado) {
                return response()->json([
                    'error' => 'Este motorizado no tiene usuario asignado'
                ], 400);
            }

            $nuevoEstado = !$motorizado->userMotorizado->is_active;
            $motorizado->userMotorizado->update(['is_active' => $nuevoEstado]);

            return response()->json([
                'message' => 'Estado de usuario actualizado exitosamente',
                'estado_usuario' => $nuevoEstado
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al actualizar estado de usuario'], 500);
        }
    }

    /**
     * Resetear contraseña de usuario motorizado
     */
    public function resetearPassword(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'nullable|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Error de validación',
                'details' => $validator->errors()
            ], 422);
        }

        try {
            $motorizado = Motorizado::findOrFail($id);

            if (!$motorizado->userMotorizado) {
                return response()->json([
                    'error' => 'Este motorizado no tiene usuario asignado'
                ], 400);
            }

            // Generar nueva contraseña automática (8 caracteres alfanuméricos)
            $password = Str::upper(Str::random(4)) . rand(1000, 9999);

            // Actualizar contraseña en la base de datos
            $motorizado->userMotorizado->update([
                'password' => Hash::make($password)
            ]);

            // Enviar email con nueva contraseña
            $emailEnviado = false;
            try {
                Mail::to($motorizado->correo)->queue(
                    new \App\Mail\MotorizadoPasswordResetMail($motorizado->userMotorizado, $motorizado, $password)
                );
                $emailEnviado = true;
                Log::info('📧 Email de reseteo encolado exitosamente', [
                    'motorizado_id' => $motorizado->id,
                    'correo' => $motorizado->correo
                ]);
            } catch (\Exception $e) {
                Log::error('📧 Error enviando email de reseteo: ' . $e->getMessage(), [
                    'motorizado_id' => $motorizado->id,
                    'correo' => $motorizado->correo
                ]);
            }

            return response()->json([
                'message' => $emailEnviado ?
                    'Contraseña reseteada exitosamente. Se ha enviado la nueva contraseña por correo electrónico.' :
                    'Contraseña reseteada exitosamente. Error al enviar email, pero se generó nueva contraseña.',
                'email_enviado' => $emailEnviado,
                'nueva_password' => $emailEnviado ? null : $password // Solo mostrar si no se envió email
            ]);

        } catch (\Exception $e) {
            Log::error('Error al resetear contraseña: ' . $e->getMessage());
            return response()->json(['error' => 'Error al resetear contraseña'], 500);
        }
    }
}
