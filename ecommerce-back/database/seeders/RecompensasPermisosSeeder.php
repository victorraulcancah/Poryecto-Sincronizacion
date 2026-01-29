<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RecompensasPermisosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear permisos del módulo de recompensas
        $this->crearPermisos();
        
        // Asignar permisos según el tipo de usuario
        $this->asignarPermisosPorRol();
        
        $this->command->info(' Permisos del módulo de recompensas configurados correctamente');
    }
    
    /**
     * Crear los permisos necesarios para el módulo de recompensas
     */
    private function crearPermisos(): void
    {
        $permisos = [
            // Permisos básicos de gestión
            [
                'name' => 'recompensas.ver',
                'guard_name' => 'web',
                'description' => 'Ver módulo de recompensas y consultar información'
            ],
            [
                'name' => 'recompensas.create',
                'guard_name' => 'web', 
                'description' => 'Crear nuevas recompensas'
            ],
            [
                'name' => 'recompensas.show',
                'guard_name' => 'web',
                'description' => 'Ver detalle de recompensa específica'
            ],
            [
                'name' => 'recompensas.edit',
                'guard_name' => 'web',
                'description' => 'Editar y configurar recompensas existentes'
            ],
            [
                'name' => 'recompensas.delete',
                'guard_name' => 'web',
                'description' => 'Eliminar o desactivar recompensas'
            ],
            [
                'name' => 'recompensas.activate',
                'guard_name' => 'web',
                'description' => 'Activar, pausar o cambiar estado de recompensas'
            ],
            
            // Permisos de analytics y reportes
            [
                'name' => 'recompensas.analytics',
                'guard_name' => 'web',
                'description' => 'Acceder a analytics, reportes y estadísticas avanzadas'
            ],
            
            // Permisos de segmentación y clientes
            [
                'name' => 'recompensas.segmentos',
                'guard_name' => 'web',
                'description' => 'Gestionar segmentos de clientes y asignaciones'
            ],
            
            // Permisos de productos y categorías
            [
                'name' => 'recompensas.productos',
                'guard_name' => 'web',
                'description' => 'Gestionar productos y categorías aplicables'
            ],
            
            // Permisos de configuración de puntos
            [
                'name' => 'recompensas.puntos',
                'guard_name' => 'web',
                'description' => 'Configurar sistema de puntos y acumulación'
            ],
            
            // Permisos de configuración de descuentos
            [
                'name' => 'recompensas.descuentos',
                'guard_name' => 'web',
                'description' => 'Configurar descuentos y promociones'
            ],
            
            // Permisos de configuración de envíos
            [
                'name' => 'recompensas.envios',
                'guard_name' => 'web',
                'description' => 'Configurar envíos gratuitos y cobertura'
            ],
            
            // Permisos de configuración de regalos
            [
                'name' => 'recompensas.regalos',
                'guard_name' => 'web',
                'description' => 'Configurar regalos y productos promocionales'
            ],
            
            // Permisos de configuración de popups
            [
                'name' => 'recompensas.popups',
                'guard_name' => 'web',
                'description' => 'Gestionar popups y notificaciones de recompensas'
            ],
            
            // Permisos de notificaciones
            [
                'name' => 'recompensas.notificaciones',
                'guard_name' => 'web',
                'description' => 'Enviar y gestionar notificaciones de recompensas'
            ]
        ];
        
        foreach ($permisos as $permiso) {
            Permission::firstOrCreate(
                ['name' => $permiso['name'], 'guard_name' => $permiso['guard_name']]
            );
        }
        
        $this->command->info('📋 Permisos creados: ' . implode(', ', array_column($permisos, 'name')));
    }
    
    /**
     * Asignar permisos según el rol del usuario
     */
    private function asignarPermisosPorRol(): void
    {
        // Configuración de permisos por rol
        $configuracionRoles = [
            'superadmin' => [
                'permisos' => [
                    'recompensas.ver', 'recompensas.create', 'recompensas.show', 'recompensas.edit', 
                    'recompensas.delete', 'recompensas.activate', 'recompensas.analytics', 
                    'recompensas.segmentos', 'recompensas.productos', 'recompensas.puntos', 
                    'recompensas.descuentos', 'recompensas.envios', 'recompensas.regalos',
                    'recompensas.popups', 'recompensas.notificaciones'
                ],
                'descripcion' => 'Acceso completo al módulo de recompensas'
            ],
            'admin' => [
                'permisos' => [
                    'recompensas.ver', 'recompensas.create', 'recompensas.show', 'recompensas.edit', 
                    'recompensas.activate', 'recompensas.analytics', 'recompensas.segmentos', 
                    'recompensas.productos', 'recompensas.puntos', 'recompensas.descuentos', 
                    'recompensas.envios', 'recompensas.regalos', 'recompensas.popups', 
                    'recompensas.notificaciones'
                ],
                'descripcion' => 'Gestión completa excepto eliminación'
            ],
            'vendedor' => [
                'permisos' => [
                    'recompensas.ver', 'recompensas.show', 'recompensas.analytics'
                ],
                'descripcion' => 'Solo consulta, visualización y reportes'
            ]
        ];
        
        foreach ($configuracionRoles as $rol => $config) {
            $this->asignarPermisosAUsuarios($rol, $config['permisos'], $config['descripcion']);
        }
        
        // Revocar permisos de recompensas de otros roles
        $this->revocarPermisosOtrosRoles();
    }
    
    /**
     * Asignar permisos a usuarios de un rol específico
     */
    private function asignarPermisosAUsuarios(string $rol, array $permisos, string $descripcion): void
    {
        // Buscar usuarios por diferentes métodos posibles
        $usuarios = collect();
        
        // Método 1: Buscar por campo 'role' si existe
        try {
            $usuariosPorRole = User::where('role', $rol)->get();
            $usuarios = $usuarios->merge($usuariosPorRole);
        } catch (\Exception $e) {
            // Campo 'role' no existe, continuar con otros métodos
        }
        
        // Método 2: Buscar por roles de Spatie si están configurados
        try {
            $usuariosPorSpatie = User::role($rol)->get();
            $usuarios = $usuarios->merge($usuariosPorSpatie);
        } catch (\Exception $e) {
            // Roles de Spatie no configurados, continuar
        }
        
        // Método 3: Buscar por email que contenga el rol (fallback)
        if ($usuarios->isEmpty()) {
            $usuariosPorEmail = User::where('email', 'like', "%{$rol}%")->get();
            $usuarios = $usuarios->merge($usuariosPorEmail);
        }
        
        // Eliminar duplicados
        $usuarios = $usuarios->unique('id');
        
        if ($usuarios->isNotEmpty()) {
            foreach ($usuarios as $usuario) {
                try {
                    // Revocar permisos existentes del módulo de recompensas
                    $permisosRecompensas = Permission::where('name', 'like', 'recompensas.%')->pluck('name');
                    $usuario->revokePermissionTo($permisosRecompensas->toArray());
                    
                    // Asignar nuevos permisos
                    $usuario->givePermissionTo($permisos);
                    
                    $this->command->info(" {$rol}: {$usuario->email} - {$descripcion}");
                    $this->command->info("   Permisos: " . implode(', ', $permisos));
                    
                } catch (\Exception $e) {
                    $this->command->error(" Error asignando permisos a {$usuario->email}: " . $e->getMessage());
                }
            }
        } else {
            $this->command->warn("  No se encontraron usuarios con rol '{$rol}'");
            $this->command->info("   Permisos que se asignarían: " . implode(', ', $permisos));
            $this->command->info("   Descripción: {$descripcion}");
        }
    }
    
    /**
     * Revocar permisos de recompensas de otros roles (admin, vendedor)
     */
    private function revocarPermisosOtrosRoles(): void
    {
        $rolesSinPermisos = []; // Ya no hay roles sin permisos, todos tienen configuración
        $permisosRecompensas = [
            'recompensas.ver', 'recompensas.create', 'recompensas.show', 'recompensas.edit', 
            'recompensas.delete', 'recompensas.activate', 'recompensas.analytics', 
            'recompensas.segmentos', 'recompensas.productos', 'recompensas.puntos', 
            'recompensas.descuentos', 'recompensas.envios', 'recompensas.regalos',
            'recompensas.popups', 'recompensas.notificaciones'
        ];
        
        foreach ($rolesSinPermisos as $rol) {
            $usuarios = collect();
            
            // Buscar usuarios por diferentes métodos
            try {
                $usuariosPorRole = User::where('role', $rol)->get();
                $usuarios = $usuarios->merge($usuariosPorRole);
            } catch (\Exception $e) {
                // Campo 'role' no existe, continuar
            }
            
            try {
                $usuariosPorSpatie = User::role($rol)->get();
                $usuarios = $usuarios->merge($usuariosPorSpatie);
            } catch (\Exception $e) {
                // Roles de Spatie no configurados
            }
            
            if ($usuarios->isEmpty()) {
                $usuariosPorEmail = User::where('email', 'like', "%{$rol}%")->get();
                $usuarios = $usuarios->merge($usuariosPorEmail);
            }
            
            $usuarios = $usuarios->unique('id');
            
            foreach ($usuarios as $usuario) {
                try {
                    // Revocar todos los permisos de recompensas
                    $usuario->revokePermissionTo($permisosRecompensas);
                    $this->command->info("Permisos de recompensas revocados para {$rol}: {$usuario->email}");
                } catch (\Exception $e) {
                    $this->command->error("Error revocando permisos a {$usuario->email}: " . $e->getMessage());
                }
            }
        }
    }
    
    /**
     * Mostrar resumen de la configuración
     */
    public function mostrarResumen(): void
    {
        $this->command->info('\nRESUMEN DE CONFIGURACIÓN DE PERMISOS:');
        $this->command->info('==========================================');
        
        $roles = ['superadmin', 'admin', 'vendedor'];
        
        foreach ($roles as $rol) {
            $usuarios = User::where('role', $rol)
                ->orWhere('email', 'like', "%{$rol}%")
                ->get();
                
            $this->command->info("\n🔹 {$rol}:");
            
            if ($usuarios->isNotEmpty()) {
                foreach ($usuarios as $usuario) {
                    $permisos = $usuario->getPermissionsViaRoles()
                        ->merge($usuario->getDirectPermissions())
                        ->where('name', 'like', 'recompensas.%')
                        ->pluck('name')
                        ->toArray();
                        
                    $this->command->info("{$usuario->email}");
                    $this->command->info("      Permisos: " . (empty($permisos) ? 'Ninguno' : implode(', ', $permisos)));
                }
            } else {
                $this->command->info("No hay usuarios con este rol");
            }
        }
        
        $this->command->info('\n FUNCIONALIDADES POR ROL:');
        $this->command->info('============================');
        $this->command->info('SuperAdmin: Acceso completo - CRUD + Analytics + Todos los submódulos + Eliminación');
        $this->command->info('Admin: Gestión completa - CRUD + Analytics + Todos los submódulos (sin eliminación)');
        $this->command->info('Vendedor: Solo consulta - Ver recompensas + Analytics y reportes');
        $this->command->info('');
        $this->command->info('CONFIGURACIÓN ACTUAL: Todos los roles tienen acceso configurado al módulo de recompensas');
    }
}