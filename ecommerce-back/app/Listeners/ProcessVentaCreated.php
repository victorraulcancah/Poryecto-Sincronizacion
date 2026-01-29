<?php

namespace App\Listeners;

use App\Events\VentaCreated;
use App\Services\KardexService;
use App\Services\NotificacionService;
use App\Services\GreenterService;
use App\Models\CajaMovimiento;
use App\Models\CajaTransaccion;
use App\Models\UtilidadVenta;
use App\Models\Kardex;
use Illuminate\Support\Facades\Log;

class ProcessVentaCreated
{
    /**
     * Handle the event.
     */
    public function handle(VentaCreated $event)
    {
        $venta = $event->venta;

        try {
            // 1. Registrar en Kardex
            $this->registrarEnKardex($venta);

            // 2. Registrar en Caja (si es efectivo)
            if (in_array(strtolower($venta->metodo_pago), ['efectivo', 'cash'])) {
                $this->registrarEnCaja($venta);
            }

            // 3. Calcular y registrar utilidad
            $this->calcularUtilidad($venta);

            // 4. Generar comprobante electrónico LOCAL (si requiere factura)
            // IMPORTANTE: Solo genera el XML localmente, NO envía a SUNAT automáticamente
            // El envío a SUNAT debe hacerse manualmente desde el frontend: POST /api/ventas/{id}/enviar-sunat
            if ($venta->requiere_factura && property_exists($venta, 'tipo_documento') && $venta->tipo_documento) {
                $this->generarComprobanteLocal($venta);
            }

            // 5. NO enviar notificación automáticamente - El usuario debe hacerlo manualmente
            // $this->enviarNotificacion($venta);

        } catch (\Exception $e) {
            Log::error('Error procesando venta creada: ' . $e->getMessage(), [
                'venta_id' => $venta->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Registrar movimientos en kardex
     */
    private function registrarEnKardex($venta)
    {
        $kardexService = app(KardexService::class);

        foreach ($venta->detalles as $detalle) {
            try {
                $kardexService->registrarSalidaVenta($venta, $detalle);
                
                Log::info('Kardex registrado para venta', [
                    'venta_id' => $venta->id,
                    'producto_id' => $detalle->producto_id,
                    'cantidad' => $detalle->cantidad
                ]);
            } catch (\Exception $e) {
                Log::error('Error registrando kardex: ' . $e->getMessage(), [
                    'venta_id' => $venta->id,
                    'producto_id' => $detalle->producto_id
                ]);
            }
        }
    }

    /**
     * Registrar transacción en caja
     */
    private function registrarEnCaja($venta)
    {
        // Buscar caja abierta del usuario
        $cajaAbierta = CajaMovimiento::where('estado', 'ABIERTA')
            ->where('user_id', $venta->user_id)
            ->latest()
            ->first();

        if (!$cajaAbierta) {
            Log::warning('No hay caja abierta para registrar venta en efectivo', [
                'venta_id' => $venta->id,
                'user_id' => $venta->user_id
            ]);
            return;
        }

        try {
            CajaTransaccion::create([
                'caja_movimiento_id' => $cajaAbierta->id,
                'tipo' => 'INGRESO',
                'categoria' => 'VENTA',
                'monto' => $venta->total,
                'metodo_pago' => $venta->metodo_pago,
                'referencia' => $venta->codigo_venta,
                'venta_id' => $venta->id,
                'descripcion' => 'Venta ' . $venta->codigo_venta,
                'user_id' => $venta->user_id
            ]);

            Log::info('Transacción registrada en caja', [
                'venta_id' => $venta->id,
                'caja_movimiento_id' => $cajaAbierta->id,
                'monto' => $venta->total
            ]);
        } catch (\Exception $e) {
            Log::error('Error registrando en caja: ' . $e->getMessage(), [
                'venta_id' => $venta->id
            ]);
        }
    }

    /**
     * Calcular y registrar utilidad de la venta
     */
    private function calcularUtilidad($venta)
    {
        try {
            $costoTotal = 0;

            foreach ($venta->detalles as $detalle) {
                // Obtener costo promedio del kardex
                $kardex = Kardex::where('producto_id', $detalle->producto_id)
                    ->latest('id')
                    ->first();

                $costoUnitario = $kardex ? $kardex->costo_promedio : ($detalle->producto->precio_compra ?? 0);
                $costoTotal += $costoUnitario * $detalle->cantidad;
            }

            $utilidadBruta = $venta->total - $costoTotal;
            $margenPorcentaje = $venta->total > 0 ? ($utilidadBruta / $venta->total) * 100 : 0;

            UtilidadVenta::create([
                'venta_id' => $venta->id,
                'fecha_venta' => $venta->fecha_venta,
                'total_venta' => $venta->total,
                'costo_total' => $costoTotal,
                'utilidad_bruta' => $utilidadBruta,
                'margen_porcentaje' => $margenPorcentaje,
                'utilidad_neta' => $utilidadBruta // Por ahora sin gastos operativos
            ]);

            Log::info('Utilidad calculada para venta', [
                'venta_id' => $venta->id,
                'utilidad_bruta' => $utilidadBruta,
                'margen' => round($margenPorcentaje, 2) . '%'
            ]);
        } catch (\Exception $e) {
            Log::error('Error calculando utilidad: ' . $e->getMessage(), [
                'venta_id' => $venta->id
            ]);
        }
    }

    /**
     * Generar comprobante electrónico
     * - VENTAS MANUALES (POS): Solo genera XML local, envío MANUAL a SUNAT
     * - VENTAS ONLINE (E-commerce): Genera XML y envía AUTOMÁTICAMENTE a SUNAT
     */
    private function generarComprobanteLocal($venta)
    {
        try {
            // Determinar si es venta online (e-commerce) o manual (POS)
            $esVentaOnline = !empty($venta->user_cliente_id);
            
            Log::info('Iniciando generación de comprobante', [
                'venta_id' => $venta->id,
                'tipo_documento' => $venta->tipo_documento,
                'origen' => $esVentaOnline ? 'E-COMMERCE (Online)' : 'POS (Manual)',
                'envio_automatico' => $esVentaOnline ? 'SÍ' : 'NO'
            ]);

            $greenterService = app(GreenterService::class);

            // OPCIÓN 1: VENTA ONLINE (E-commerce) - Envío AUTOMÁTICO a SUNAT
            if ($esVentaOnline) {
                Log::info('🌐 VENTA ONLINE detectada - Enviando AUTOMÁTICAMENTE a SUNAT', [
                    'venta_id' => $venta->id,
                    'user_cliente_id' => $venta->user_cliente_id
                ]);

                // Generar factura Y enviar a SUNAT automáticamente
                $resultado = $greenterService->generarFactura(
                    $venta->id,
                    null, // clienteData (ya está en la venta)
                    $venta->user_id,
                    request()->ip() ?? '127.0.0.1',
                    true  // ← enviarSunat = true (AUTOMÁTICO)
                );

                if ($resultado['success'] && isset($resultado['comprobante'])) {
                    // Actualizar venta con estado FACTURADO (ya fue enviado y aceptado)
                    $venta->update([
                        'comprobante_id' => $resultado['comprobante']->id,
                        'estado' => 'FACTURADO'
                    ]);

                    Log::info('✅ VENTA ONLINE: Comprobante enviado AUTOMÁTICAMENTE a SUNAT', [
                        'venta_id' => $venta->id,
                        'comprobante_id' => $resultado['comprobante']->id,
                        'numero_completo' => $resultado['comprobante']->numero_completo,
                        'comprobante_estado' => $resultado['comprobante']->estado,
                        'venta_estado' => 'FACTURADO',
                        'tiene_xml' => true,
                        'tiene_pdf' => true,
                        'tiene_cdr' => true,
                        'mensaje_sunat' => $resultado['comprobante']->mensaje_sunat ?? 'Aceptado'
                    ]);
                } else {
                    Log::error('❌ VENTA ONLINE: Error al enviar a SUNAT', [
                        'venta_id' => $venta->id,
                        'error' => $resultado['error'] ?? 'Error desconocido'
                    ]);
                }

            } 
            // OPCIÓN 2: VENTA MANUAL (POS) - Envío MANUAL a SUNAT
            else {
                Log::info('🏪 VENTA MANUAL (POS) detectada - Generando XML local (envío MANUAL)', [
                    'venta_id' => $venta->id
                ]);

                // Solo generar factura LOCAL sin enviar a SUNAT
                $resultado = $greenterService->generarFactura(
                    $venta->id,
                    null, // clienteData (ya está en la venta)
                    $venta->user_id,
                    request()->ip() ?? '127.0.0.1',
                    false  // ← enviarSunat = false (MANUAL)
                );

                if ($resultado['success'] && isset($resultado['comprobante'])) {
                    // Actualizar venta con estado PENDIENTE (esperando envío manual)
                    $venta->update([
                        'comprobante_id' => $resultado['comprobante']->id,
                        'estado' => 'PENDIENTE'
                    ]);

                    Log::info('📝 VENTA MANUAL: XML generado localmente (esperando envío manual)', [
                        'venta_id' => $venta->id,
                        'comprobante_id' => $resultado['comprobante']->id,
                        'numero_completo' => $resultado['comprobante']->numero_completo,
                        'comprobante_estado' => $resultado['comprobante']->estado,
                        'venta_estado' => 'PENDIENTE',
                        'tiene_xml' => true,
                        'tiene_pdf' => false,
                        'tiene_cdr' => false,
                        'nota' => 'XML firmado localmente. Usuario debe hacer clic en "Enviar a SUNAT"'
                    ]);
                } else {
                    Log::warning('⚠️ VENTA MANUAL: No se pudo generar comprobante local', [
                        'venta_id' => $venta->id,
                        'error' => $resultado['message'] ?? $resultado['error'] ?? 'Error desconocido'
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('💥 Error generando comprobante electrónico: ' . $e->getMessage(), [
                'venta_id' => $venta->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Enviar notificación al cliente
     * DESHABILITADO: Las notificaciones deben enviarse MANUALMENTE desde el frontend
     * Usar: POST /api/ventas/{id}/email o POST /api/ventas/{id}/whatsapp
     */
    private function enviarNotificacion($venta)
    {
        // MÉTODO DESHABILITADO - No enviar notificaciones automáticas
        Log::info('Notificación NO enviada (deshabilitada)', [
            'venta_id' => $venta->id,
            'nota' => 'Usuario debe enviar manualmente usando POST /api/ventas/{id}/email o /api/ventas/{id}/whatsapp'
        ]);
        
        return;
        
        /* CÓDIGO ORIGINAL COMENTADO
        try {
            $cliente = $venta->cliente ?? $venta->userCliente;

            if (!$cliente) {
                Log::warning('No hay cliente para enviar notificación', [
                    'venta_id' => $venta->id
                ]);
                return;
            }

            // Obtener email del cliente
            $email = null;
            $telefono = null;

            if ($venta->cliente) {
                $email = $venta->cliente->email;
                $telefono = $venta->cliente->telefono;
            } elseif ($venta->userCliente) {
                $email = $venta->userCliente->email;
                $telefono = $venta->userCliente->telefono;
            }

            if (!$email && !$telefono) {
                Log::warning('Cliente sin email ni teléfono', [
                    'venta_id' => $venta->id
                ]);
                return;
            }

            $notificacionService = app(NotificacionService::class);
            $notificacionService->notificarVentaRealizada($venta, $cliente);

            Log::info('Notificación enviada', [
                'venta_id' => $venta->id,
                'email' => $email
            ]);
        } catch (\Exception $e) {
            Log::error('Error enviando notificación: ' . $e->getMessage(), [
                'venta_id' => $venta->id
            ]);
        }
        */
    }
}
