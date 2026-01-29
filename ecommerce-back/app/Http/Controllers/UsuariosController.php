<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UsuariosController extends Controller
{
        
    public function index()
    {
        // Antes:
        // $usuarios = User::with('role');
        // Después:
        $usuarios = User::with(['roles', 'profile'])->get();
        
        return response()->json($usuarios);
    }

    public function show($id)
    {
        try {
            $usuario = User::with(['roles', 'profile.documentType', 'addresses'])->findOrFail($id);
            
            // Transformamos el usuario para incluir role_id y role_nombre
            $usuarioTransformado = $usuario->toArray();
            $usuarioTransformado['role_id'] = $usuario->roles->isNotEmpty() ? $usuario->roles->first()->id : null;
            $usuarioTransformado['role_nombre'] = $usuario->roles->isNotEmpty() ? $usuario->roles->first()->name : '';

            return response()->json($usuarioTransformado);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {

            \Log::info('=== DEBUG UPDATE USUARIO ===');
            \Log::info('Usuario ID: ' . $id);
            \Log::info('Datos recibidos:', ['data' => $request->all()]);
            \Log::info('Archivos recibidos:', ['files' => $request->allFiles()]);
         
            \Log::info('Datos originales antes de transformar:', ['data' => $request->all()]);
           



            $isFormData = $request->hasFile('avatar') || $request->has('remove_avatar') || 
            collect($request->all())->keys()->contains(function($key) {
                return strpos($key, 'profile[') === 0 || strpos($key, 'addresses[') === 0;
            });

            // AGREGADO: Debug para verificar que los datos llegan
            \Log::info('Método HTTP detectado:', ['method' => $request->method()]);
            \Log::info('¿Tiene _method?', ['has_method' => $request->has('_method'), '_method' => $request->input('_method')]);


            if ($isFormData) {
                \Log::info('Detectado FormData - transformando estructura');
                \Log::info('Datos originales antes de transformar:', $request->all());
                
                // Crear nueva estructura de datos
                $transformedData = [];
                
                // Datos básicos del usuario - CORREGIDO
                $transformedData['name'] = $request->input('name', '');
                $transformedData['email'] = $request->input('email', '');
                $transformedData['role_id'] = $request->input('role_id', '');
                
                // AGREGAR ESTA LÍNEA PARA CONSERVAR EL ARCHIVO AVATAR
                if ($request->hasFile('avatar')) {
                    $transformedData['avatar'] = $request->file('avatar'); // ← LÍNEA AGREGADA
                }

                // Transformar profile[campo] a estructura anidada
                $profileData = [];
                foreach ($request->all() as $key => $value) {
                    if (strpos($key, 'profile[') === 0 && strpos($key, ']') !== false) {
                        $profileKey = str_replace(['profile[', ']'], '', $key);
                        $profileData[$profileKey] = $value;
                        \Log::info("Transformando profile: {$key} -> profile.{$profileKey} = {$value}");
                    }
                }
                
                if (!empty($profileData)) {
                    $transformedData['profile'] = $profileData;
                }
                
                // Transformar addresses[index][campo] a estructura anidada
                $addressesData = [];
                foreach ($request->all() as $key => $value) {
                    if (strpos($key, 'addresses[') === 0) {
                        // Extraer índice y campo: addresses[0][city] -> 0, city
                        if (preg_match('/addresses\[(\d+)\]\[([^\]]+)\]/', $key, $matches)) {
                            $index = intval($matches[1]);
                            $field = $matches[2];
                            $addressesData[$index][$field] = $value;
                            \Log::info("Transformando address: {$key} -> addresses.{$index}.{$field} = {$value}");
                        }
                    }
                }
                
                // Convertir a array indexado y agregarlo solo si hay datos
                if (!empty($addressesData)) {
                    ksort($addressesData); // Asegurar orden correcto
                    $transformedData['addresses'] = array_values($addressesData);
                }
                
                \Log::info('Datos después de transformar:', $transformedData);
                
                // CORREGIDO: Merge en lugar de replace para mantener archivos
                $request->merge($transformedData);
                
                \Log::info('Request final después de transformación:', $request->all());
            }

            $usuario = User::findOrFail($id);

            // Y reemplaza toda la validación hasta el bloque de errores con esto:
            $validator = \Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $id,
                'role_id' => 'required|exists:roles,id',
                'profile.first_name' => 'required|string|max:255',
                'profile.phone' => 'nullable|string|max:20',
                'profile.document_type' => 'required|exists:document_types,id',
                'profile.document_number' => 'required|string|max:20',
                'profile.birth_date' => 'required|date',
                'profile.genero' => 'required|in:masculino,femenino,otro',
                'addresses' => 'required|array|min:1',
                'addresses.*.label' => 'required|string|max:255',
                'addresses.*.address_line' => 'nullable|string|max:255',
                'addresses.*.city' => 'required|string',
                'addresses.*.province' => 'required|string',
                'addresses.*.department' => 'required|string',
                'addresses.*.postal_code' => 'nullable|string|max:255',
                'addresses.*.is_default' => 'sometimes|boolean',
            ]);

            // Agregar logging adicional para debug
            \Log::info('Datos finales para validación:', [
                'all_data' => $request->all(),
                'profile_exists' => $request->has('profile'),
                'addresses_exists' => $request->has('addresses'),
                'profile_data' => $request->input('profile'),
                'addresses_data' => $request->input('addresses')
            ]);

            // ← AGREGAR ESTE BLOQUE PARA MOSTRAR ERRORES DETALLADOS:
            if ($validator->fails()) {
                \Log::error('Errores de validación:', $validator->errors()->toArray());
                return response()->json([
                    'error' => 'Error de validación',
                    'details' => $validator->errors()->toArray()
                ], 422);
            }

            // Actualizar usuario
            $usuario->update([
                'name' => $request->name,
                'email' => $request->email,
            ]);

            // Asegurar que role_id sea un número entero
            $roleId = is_string($request->role_id) ? intval($request->role_id) : $request->role_id;

            if (!is_int($roleId) || $roleId <= 0) {
                \Log::error('Role ID inválido:', ['role_id' => $request->role_id]);
                return response()->json(['error' => 'Role ID debe ser un número entero válido'], 422);
            }

            $usuario->syncRoles([$roleId]);

            // Actualizar o crear perfil
            $profileData = $request->input('profile');
            
            // Manejar avatar si se subió uno nuevo
            if ($request->hasFile('avatar')) {
                \Log::info('Procesando archivo de avatar');
                
                if ($usuario->profile && $usuario->profile->avatar_url) {
                    $oldAvatarPath = public_path(str_replace('/storage/', 'storage/', $usuario->profile->avatar_url));
                    \Log::info('Ruta absoluta para eliminar con unlink: ' . $oldAvatarPath);
                    if (file_exists($oldAvatarPath)) {
                        $unlinkSuccess = unlink($oldAvatarPath);
                        \Log::info('Resultado de unlink:', ['success' => $unlinkSuccess]);
                    } else {
                        \Log::warning('El archivo anterior no existe en: ' . $oldAvatarPath);
                    }
                }

                try {
                    $uploadController = new \App\Http\Controllers\UserRegistrationController();
                $avatarPath = $uploadController->uploadAvatar($request->file('avatar'), $usuario->id);

                    $profileData['avatar_url'] = $avatarPath;
                } catch (\Exception $e) {
                    \Log::error('Error al subir nuevo avatar: ' . $e->getMessage());
                }

               \Log::info('Ruta de almacenamiento: ' . $avatarPath);
                
                if (isset($avatarPath)) {
                    $storagePath = str_replace('/storage/', 'public/', $avatarPath);

                    if (\Storage::exists($storagePath)) {
                        \Log::info('Archivo guardado correctamente en: ' . $storagePath);
                    } else {
                        \Log::error('No se encontró el archivo guardado en: ' . storage_path('app/' . $storagePath));
                    }

                    $profileData['avatar_url'] = $avatarPath;
                }

            }

            // Si se solicita eliminar avatar
            if ($request->has('remove_avatar') && $request->remove_avatar) {
                \Log::info('Eliminando avatar por solicitud');
                
                if ($usuario->profile && $usuario->profile->avatar_url) {
                    $oldAvatarPath = str_replace('/storage/', '', $usuario->profile->avatar_url); // ← MODIFICADO: corregimos el path eliminando solo '/storage/'

                    \Log::info('Intentando eliminar avatar anterior: ' . $oldAvatarPath);

                    $oldAvatarPathFull = public_path('storage/' . $oldAvatarPath);
                    \Log::info('Ruta absoluta para eliminar con unlink: ' . $oldAvatarPathFull);

                    if (file_exists($oldAvatarPathFull)) {
                        $unlinkSuccess = unlink($oldAvatarPathFull);
                        \Log::info('Resultado de eliminación con unlink:', ['success' => $unlinkSuccess]);
                    } else {
                        \Log::warning('El archivo anterior no existe en: ' . $oldAvatarPathFull);
                    }

                    // コード - Definir la variable $exists correctamente
                    $exists = \Storage::disk('public')->exists($oldAvatarPath);
                    \Log::info('¿Existe el archivo anterior?', ['exists' => $exists]); // ← MODIFICADO: verificación real en disco correcto

                    if ($exists) {
                        $deleteResult = \Storage::disk('public')->delete($oldAvatarPath); // ← MODIFICADO: eliminamos en disco 'public'
                        \Log::info('Resultado de eliminación:', ['success' => $deleteResult]); // ← MODIFICADO
                    } else {
                        \Log::warning('El archivo anterior no existe en: ' . $oldAvatarPath); // ← MANTENIDO
                    }
                }

                
                $profileData['avatar_url'] = null;
            }

            $usuario->profile()->updateOrCreate(
                ['user_id' => $usuario->id],
                $profileData
            );

            // Actualizar direcciones
            
            $usuario->addresses()->delete(); // Eliminar todas las direcciones existentes

            foreach ($request->input('addresses') as $addressData) { // Cambio de $request->addresses a $request->input('addresses')
                $usuario->addresses()->create($addressData);
            }


            // Asegurar que solo una dirección sea principal
            if ($request->has('default_address_index')) {
                $usuario->addresses()->update(['is_default' => false]);
                $usuario->addresses()->skip($request->default_address_index)->first()->update(['is_default' => true]);
            }

            return response()->json([
                'message' => 'Usuario actualizado correctamente',
                'usuario' => $usuario->load(['roles', 'profile.documentType', 'addresses'])
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al actualizar usuario: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $usuario = User::findOrFail($id);
            
            // Eliminar avatar si existe
           if ($usuario->profile && $usuario->profile->avatar_url) {
            $oldAvatarPath = str_replace('/storage/', '', $usuario->profile->avatar_url); // ← MODIFICADO
            \Log::info('Intentando eliminar: ' . $oldAvatarPath);

            if (\Storage::disk('public')->exists($oldAvatarPath)) { // ← MODIFICADO
                \Storage::disk('public')->delete($oldAvatarPath); // ← MODIFICADO
                \Log::info('Avatar eliminado correctamente'); // ← MANTENIDO
            } else {
                \Log::warning('No se encontró el archivo a eliminar'); // ← MANTENIDO
            }
        }

            
            // Eliminar perfil y direcciones (se eliminan automáticamente por las relaciones)
            $usuario->delete();
            
            return response()->json(['message' => 'Usuario eliminado correctamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al eliminar usuario'], 500);
        }
    }

    public function cambiarEstado(Request $request, $id)
    {
        try {
            $usuario = User::findOrFail($id);

            $request->validate([
                'is_enabled' => 'required|boolean'
            ]);

            $usuario->is_enabled = $request->is_enabled;
            $usuario->save();

            return response()->json([
                'message' => 'Estado del usuario actualizado correctamente',
                'usuario' => $usuario
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al cambiar estado del usuario'], 500);
        }
    }
}
