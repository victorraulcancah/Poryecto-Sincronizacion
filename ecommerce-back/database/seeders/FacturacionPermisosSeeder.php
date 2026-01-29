<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FacturacionPermisosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear permisos del módulo de facturación
        $this->crearPermisos();
        
        // Asignar permisos según el tipo de usuario
        $this->asignarPermisosPorRol();
        
        $this->command->info('✅ Permisos del módulo de facturación configurados correctamente');
    }
    
    /**
     * Crear los permisos necesarios para el módulo de facturación
     */
    private function crearPermisos(): void
    {
        $permisos = [
            // Permisos básicos de gestión
            [
                'name' => 'facturacion.ver',
                'guard_name' => 'web',
                'description' => 'Ver módulo de facturación y consultar información'
            ],
            [
                'name' => 'facturacion.create',
                'guard_name' => 'web', 
                'description' => 'Crear nuevos comprobantes (facturas/boletas)'
            ],
            [
                'name' => 'facturacion.show',
                'guard_name' => 'web',
                'description' => 'Ver detalle de comprobante específico'
            ],
            [
                'name' => 'facturacion.edit',
                'guard_name' => 'web',
                'description' => 'Editar comprobantes existentes'
            ],
            [
                'name' => 'facturacion.delete',
                'guard_name' => 'web',
                'description' => 'Eliminar o anular comprobantes'
            ],
            [
                'name' => 'facturacion.enviar',
                'guard_name' => 'web',
                'description' => 'Enviar comprobantes a SUNAT'
            ],
            [
                'name' => 'facturacion.descargar',
                'guard_name' => 'web',
                'description' => 'Descargar PDF/XML/CDR de comprobantes'
            ],
            
            // Permisos de series y configuración
            [
                'name' => 'facturacion.series',
                'guard_name' => 'web',
                'description' => 'Gestionar series de comprobantes'
            ],
            
            // Permisos de notas de crédito/débito
            [
                'name' => 'facturacion.notas',
                'guard_name' => 'web',
                'description' => 'Gestionar notas de crédito y débito'
            ],
            [
                'name' => 'facturacion.guias',
                'guard_name' => 'web',
                'description' => 'Gestionar guías de remisión'
            ],
            
            // Permisos de resúmenes y bajas
            [
                'name' => 'facturacion.resumenes',
                'guard_name' => 'web',
                'description' => 'Generar resúmenes diarios y comunicaciones de baja'
            ],
            
            // Permisos de reportes
            [
                'name' => 'facturacion.reportes',
                'guard_name' => 'web',
                'description' => 'Acceder a reportes y estadísticas de facturación'
            ],
            
            // Permisos de configuración
            [
                'name' => 'facturacion.configuracion',
                'guard_name' => 'web',
                'description' => 'Configurar parámetros de facturación electrónica'
            ],
            
            // Permisos de logs y auditoría
            [
                'name' => 'facturacion.logs',
                'guard_name' => 'web',
                'description' => 'Ver logs de SUNAT y auditoría de facturación'
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
                    'facturacion.ver', 'facturacion.create', 'facturacion.show', 'facturacion.edit', 
                    'facturacion.delete', 'facturacion.enviar', 'facturacion.descargar', 
                    'facturacion.series', 'facturacion.notas', 'facturacion.guias', 'facturacion.resumenes', 
                    'facturacion.reportes', 'facturacion.configuracion', 'facturacion.logs'
                ],
                'descripcion' => 'Acceso completo al módulo de facturación'
            ],
            'admin' => [
                'permisos' => [
                    'facturacion.ver', 'facturacion.create', 'facturacion.show', 'facturacion.edit', 
                    'facturacion.enviar', 'facturacion.descargar', 'facturacion.series', 
                    'facturacion.notas', 'facturacion.guias', 'facturacion.resumenes', 'facturacion.reportes', 
                    'facturacion.logs'
                ],
                'descripcion' => 'Gestión completa excepto eliminación y configuración'
            ],
            'vendedor' => [
                'permisos' => [
                    'facturacion.ver', 'facturacion.create', 'facturacion.show', 
                    'facturacion.descargar', 'facturacion.reportes'
                ],
                'descripcion' => 'Crear comprobantes y consultar información'
            ]
        ];
        
        foreach ($configuracionRoles as $rol => $config) {
            $this->asignarPermisosAUsuarios($rol, $config['permisos'], $config['descripcion']);
        }
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
                    // Revocar permisos existentes del módulo de facturación
                    $permisosFacturacion = Permission::where('name', 'like', 'facturacion.%')->pluck('name');
                    $usuario->revokePermissionTo($permisosFacturacion->toArray());
                    
                    // Asignar nuevos permisos
                    $usuario->givePermissionTo($permisos);
                    
                    $this->command->info("✅ {$rol}: {$usuario->email} - {$descripcion}");
                    $this->command->info("   Permisos: " . implode(', ', $permisos));
                    
                } catch (\Exception $e) {
                    $this->command->error("❌ Error asignando permisos a {$usuario->email}: " . $e->getMessage());
                }
            }
        } else {
            $this->command->warn("⚠️ No se encontraron usuarios con rol '{$rol}'");
            $this->command->info("   Permisos que se asignarían: " . implode(', ', $permisos));
            $this->command->info("   Descripción: {$descripcion}");
        }
    }
}
