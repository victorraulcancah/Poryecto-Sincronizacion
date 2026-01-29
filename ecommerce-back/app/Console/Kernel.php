<?php

namespace App\Console;

use App\Console\Commands\ManageRewardsLifecycle;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // ===== SINCRONIZACIÓN AUTOMÁTICA CON 7POWER =====
        // Sincronizar marcas y categorías cada 5 minutos
        $schedule->command('sync:7power')
            ->everyFiveMinutes()
            ->withoutOverlapping()
            ->name('sync-7power')
            ->appendOutputTo(storage_path('logs/sync-7power.log'));

        // Gestión diaria del ciclo de vida de recompensas
        // Se ejecuta todos los días a las 6:00 AM
        $schedule->command(ManageRewardsLifecycle::class)
            ->dailyAt('06:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->emailOutputOnFailure(config('mail.admin_email', 'admin@example.com'))
            ->appendOutputTo(storage_path('logs/rewards-lifecycle.log'));

        // Limpieza semanal de logs de recompensas (opcional)
        $schedule->call(function () {
            $this->cleanupRewardsLogs();
        })
        ->weekly()
        ->sundays()
        ->at('02:00')
        ->name('cleanup-rewards-logs')
        ->withoutOverlapping();

        // Reporte mensual de uso de recompensas (opcional)
        $schedule->call(function () {
            $this->generateMonthlyRewardsReport();
        })
        ->monthlyOn(1, '08:00')
        ->name('monthly-rewards-report')
        ->withoutOverlapping();

        // Verificación de salud del sistema de recompensas cada hora
        $schedule->call(function () {
            $this->checkRewardsSystemHealth();
        })
        ->hourly()
        ->name('rewards-health-check')
        ->withoutOverlapping()
        ->skip(function () {
            // Saltar durante las horas de mantenimiento (2-4 AM)
            $hour = now()->hour;
            return $hour >= 2 && $hour <= 4;
        });

        // ===== TAREAS DE FACTURACIÓN ELECTRÓNICA =====
        
        // Reintentar facturas fallidas cada 30 minutos
        $schedule->command('facturacion:maintenance --task=retry-failed')
            ->everyThirtyMinutes()
            ->withoutOverlapping()
            ->name('retry-failed-invoices')
            ->appendOutputTo(storage_path('logs/facturacion-retry.log'));

        // Limpieza diaria de logs (2:00 AM)
        $schedule->command('facturacion:maintenance --task=cleanup-logs --days=30')
            ->dailyAt('02:00')
            ->withoutOverlapping()
            ->name('cleanup-facturacion-logs')
            ->appendOutputTo(storage_path('logs/facturacion-cleanup.log'));

        // Backup diario de archivos importantes (3:00 AM)
        $schedule->command('facturacion:maintenance --task=backup-files')
            ->dailyAt('03:00')
            ->withoutOverlapping()
            ->name('backup-facturacion-files')
            ->appendOutputTo(storage_path('logs/facturacion-backup.log'));

        // Verificación de certificado cada 6 horas
        $schedule->command('facturacion:maintenance --task=check-certificate')
            ->everySixHours()
            ->withoutOverlapping()
            ->name('check-certificate')
            ->appendOutputTo(storage_path('logs/facturacion-certificate.log'));

        // Mantenimiento completo semanal (domingos 1:00 AM)
        $schedule->command('facturacion:maintenance --task=all')
            ->weekly()
            ->sundays()
            ->at('01:00')
            ->withoutOverlapping()
            ->name('weekly-facturacion-maintenance')
            ->appendOutputTo(storage_path('logs/facturacion-weekly.log'));
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }

    /**
     * Limpiar logs antiguos de recompensas
     */
    protected function cleanupRewardsLogs(): void
    {
        try {
            $logFile = storage_path('logs/rewards-lifecycle.log');
            
            if (file_exists($logFile)) {
                $lines = file($logFile);
                $maxLines = 10000; // Mantener solo las últimas 10,000 líneas
                
                if (count($lines) > $maxLines) {
                    $recentLines = array_slice($lines, -$maxLines);
                    file_put_contents($logFile, implode('', $recentLines));
                    
                    \Illuminate\Support\Facades\Log::info('Limpieza de logs de recompensas completada', [
                        'lines_removed' => count($lines) - $maxLines,
                        'lines_kept' => $maxLines
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error en limpieza de logs de recompensas: ' . $e->getMessage());
        }
    }

    /**
     * Generar reporte mensual de uso de recompensas
     */
    protected function generateMonthlyRewardsReport(): void
    {
        try {
            $recompensaService = app(\App\Services\RecompensaService::class);
            
            $fechaInicio = now()->subMonth()->startOfMonth();
            $fechaFin = now()->subMonth()->endOfMonth();
            
            $reporte = $recompensaService->obtenerReporteUso($fechaInicio, $fechaFin);
            
            \Illuminate\Support\Facades\Log::info('Reporte mensual de recompensas generado', [
                'periodo' => $fechaInicio->format('Y-m'),
                'reporte' => $reporte
            ]);
            
            // Aquí se puede implementar el envío del reporte por email
            // Mail::to(config('mail.admin_email'))->send(new MonthlyRewardsReport($reporte));
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error generando reporte mensual de recompensas: ' . $e->getMessage());
        }
    }

    /**
     * Verificar salud del sistema de recompensas
     */
    protected function checkRewardsSystemHealth(): void
    {
        try {
            $issues = [];
            
            // Verificar recompensas activas sin configuración
            $recompensasSinConfig = \App\Models\Recompensa::where('activo', true)
                ->whereDoesntHave('puntos')
                ->whereDoesntHave('descuentos')
                ->whereDoesntHave('envios')
                ->whereDoesntHave('regalos')
                ->count();
                
            if ($recompensasSinConfig > 0) {
                $issues[] = "Hay {$recompensasSinConfig} recompensas activas sin configuración";
            }
            
            // Verificar regalos sin stock
            $regalosSinStock = \App\Models\RecompensaRegalo::whereHas('recompensa', function($query) {
                    $query->where('activo', true);
                })
                ->whereHas('producto', function($query) {
                    $query->where('stock', '<=', 0);
                })
                ->count();
                
            if ($regalosSinStock > 0) {
                $issues[] = "Hay {$regalosSinStock} regalos configurados sin stock disponible";
            }
            
            // Verificar productos inactivos en recompensas activas
            $productosInactivos = \App\Models\RecompensaProducto::whereHas('recompensa', function($query) {
                    $query->where('activo', true);
                })
                ->whereHas('producto', function($query) {
                    $query->where('activo', false);
                })
                ->count();
                
            if ($productosInactivos > 0) {
                $issues[] = "Hay {$productosInactivos} productos inactivos en recompensas activas";
            }
            
            if (!empty($issues)) {
                \Illuminate\Support\Facades\Log::warning('Problemas detectados en el sistema de recompensas', [
                    'issues' => $issues,
                    'timestamp' => now()->toISOString()
                ]);
                
                // Opcional: Enviar notificación a administradores
                // $this->notifyAdministrators($issues);
            } else {
                \Illuminate\Support\Facades\Log::debug('Verificación de salud del sistema de recompensas: OK');
            }
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error en verificación de salud de recompensas: ' . $e->getMessage());
        }
    }

    /**
     * Notificar a administradores sobre problemas (método auxiliar)
     */
    protected function notifyAdministrators(array $issues): void
    {
        try {
            // Aquí se puede implementar la notificación a administradores
            // Por ejemplo, envío de email, Slack, etc.
            
            \Illuminate\Support\Facades\Log::info('Notificación de problemas enviada a administradores', [
                'issues_count' => count($issues)
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error notificando a administradores: ' . $e->getMessage());
        }
    }

    /**
     * Get the timezone that should be used by default for scheduled events.
     */
    protected function scheduleTimezone(): string
    {
        return config('app.timezone', 'UTC');
    }
}