<?php

namespace App\Services;

use App\Models\Recompensa;
use App\Models\UserCliente;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\RecompensaPuntos;
use App\Models\RecompensaDescuento;
use App\Models\RecompensaEnvio;
use App\Models\RecompensaRegalo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AsignadorRecompensas
{
    /**
     * Aplicar una recompensa específica a un cliente y pedido
     */
    public function aplicarRecompensa(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        try {
            switch ($recompensa->tipo) {
                case Recompensa::TIPO_PUNTOS:
                    return $this->aplicarPuntos($recompensa, $cliente, $pedido);
                    
                case Recompensa::TIPO_DESCUENTO:
                    return $this->aplicarDescuento($recompensa, $cliente, $pedido);
                    
                case Recompensa::TIPO_ENVIO_GRATIS:
                    return $this->aplicarEnvioGratis($recompensa, $cliente, $pedido);
                    
                case Recompensa::TIPO_REGALO:
                    return $this->aplicarRegalos($recompensa, $cliente, $pedido);
                    
                default:
                    return [
                        'exito' => false,
                        'error' => 'Tipo de recompensa no soportado'
                    ];
            }
        } catch (\Exception $e) {
            Log::error("Error aplicando recompensa {$recompensa->id}: " . $e->getMessage());
            return [
                'exito' => false,
                'error' => 'Error interno al aplicar recompensa'
            ];
        }
    }

    /**
     * Aplicar puntos por registro de nuevo cliente
     */
    public function aplicarPuntosRegistro(
        Recompensa $recompensa,
        UserCliente $cliente
    ): array {
        try {
            $configuracionPuntos = $recompensa->puntos->first();
            
            if (!$configuracionPuntos || !$configuracionPuntos->otorga_puntos_por_registro) {
                return [
                    'exito' => false,
                    'error' => 'Recompensa no otorga puntos por registro'
                ];
            }

            $puntosOtorgados = $configuracionPuntos->calcularPuntosPorRegistro();
            
            return [
                'exito' => true,
                'tipo' => 'puntos_registro',
                'puntos_otorgados' => $puntosOtorgados,
                'descripcion' => "Puntos de bienvenida: {$puntosOtorgados} puntos por registrarte",
                'configuracion_aplicada' => [
                    'puntos_registro' => $configuracionPuntos->puntos_registro
                ]
            ];
            
        } catch (\Exception $e) {
            Log::error("Error aplicando puntos de registro: " . $e->getMessage());
            return [
                'exito' => false,
                'error' => 'Error al calcular puntos de registro'
            ];
        }
    }

    /**
     * Simular aplicación de recompensa sin persistir cambios
     */
    public function simularRecompensa(
        Recompensa $recompensa,
        UserCliente $cliente,
        array $productosCarrito,
        float $montoTotal
    ): array {
        switch ($recompensa->tipo) {
            case Recompensa::TIPO_PUNTOS:
                return $this->simularPuntos($recompensa, $montoTotal, count($productosCarrito));
                
            case Recompensa::TIPO_DESCUENTO:
                return $this->simularDescuento($recompensa, $montoTotal);
                
            case Recompensa::TIPO_ENVIO_GRATIS:
                return $this->simularEnvioGratis($recompensa, $montoTotal);
                
            case Recompensa::TIPO_REGALO:
                return $this->simularRegalos($recompensa);
                
            default:
                return [
                    'tipo' => $recompensa->tipo,
                    'simulacion_disponible' => false
                ];
        }
    }

    // Métodos para aplicar cada tipo de recompensa

    /**
     * Aplicar recompensa de puntos
     */
    private function aplicarPuntos(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        $configuracionPuntos = $recompensa->puntos->first();
        
        if (!$configuracionPuntos) {
            return [
                'exito' => false,
                'error' => 'Configuración de puntos no encontrada'
            ];
        }

        // Calcular puntos basados en el pedido
        $puntosCalculados = $configuracionPuntos->calcularPuntosPorCompra(
            $pedido->total,
            $pedido->detalles()->sum('cantidad')
        );

        if ($puntosCalculados <= 0) {
            return [
                'exito' => false,
                'error' => 'No se generaron puntos con esta configuración'
            ];
        }

        return [
            'exito' => true,
            'tipo' => 'puntos',
            'puntos_otorgados' => $puntosCalculados,
            'descripcion' => "Ganaste {$puntosCalculados} puntos por tu compra",
            'desglose' => [
                'puntos_por_compra' => $configuracionPuntos->otorga_puntos_por_compra ? $configuracionPuntos->puntos_por_compra : 0,
                'puntos_por_monto' => $configuracionPuntos->otorga_puntos_por_monto ? ($pedido->total * $configuracionPuntos->puntos_por_monto) : 0,
                'monto_pedido' => $pedido->total
            ]
        ];
    }

    /**
     * Aplicar recompensa de descuento
     */
    private function aplicarDescuento(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        $configuracionDescuento = $recompensa->descuentos->first();
        
        if (!$configuracionDescuento) {
            return [
                'exito' => false,
                'error' => 'Configuración de descuento no encontrada'
            ];
        }

        $descuentoCalculado = $configuracionDescuento->calcularDescuento($pedido->total);
        $montoFinal = $configuracionDescuento->calcularMontoFinal($pedido->total);
        
        if ($descuentoCalculado <= 0) {
            return [
                'exito' => false,
                'error' => 'No se aplicó descuento'
            ];
        }

        // Actualizar el pedido con el descuento
        $pedido->descuento_total += $descuentoCalculado;
        $pedido->total = $montoFinal;
        $pedido->save();

        return [
            'exito' => true,
            'tipo' => 'descuento',
            'descuento_aplicado' => $descuentoCalculado,
            'monto_original' => $pedido->total + $descuentoCalculado,
            'monto_final' => $montoFinal,
            'porcentaje_descuento' => $configuracionDescuento->getPorcentajeDescuentoEfectivo($pedido->total + $descuentoCalculado),
            'descripcion' => $configuracionDescuento->descripcion_descuento,
            'configuracion_aplicada' => [
                'tipo_descuento' => $configuracionDescuento->tipo_descuento,
                'valor_descuento' => $configuracionDescuento->valor_descuento
            ]
        ];
    }

    /**
     * Aplicar recompensa de envío gratis
     */
    private function aplicarEnvioGratis(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        $configuracionEnvio = $recompensa->envios->first();
        
        if (!$configuracionEnvio) {
            return [
                'exito' => false,
                'error' => 'Configuración de envío no encontrada'
            ];
        }

        // Aplicar envío gratis al pedido
        $costoEnvioOriginal = $pedido->costo_envio;
        $pedido->costo_envio = 0;
        $pedido->total -= $costoEnvioOriginal;
        $pedido->save();

        return [
            'exito' => true,
            'tipo' => 'envio_gratis',
            'envio_gratis' => true,
            'ahorro_envio' => $costoEnvioOriginal,
            'descripcion' => "Envío gratis aplicado - Ahorro: S/ {$costoEnvioOriginal}",
            'configuracion_aplicada' => [
                'minimo_compra' => $configuracionEnvio->minimo_compra,
                'zonas_aplicables' => $configuracionEnvio->aplica_todas_zonas ? 'Todas las zonas' : 'Zonas específicas'
            ]
        ];
    }

    /**
     * Aplicar recompensa de regalos
     */
    private function aplicarRegalos(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        $configuracionRegalos = $recompensa->regalos;
        
        if ($configuracionRegalos->isEmpty()) {
            return [
                'exito' => false,
                'error' => 'No hay regalos configurados'
            ];
        }

        $regalosOtorgados = [];
        $valorTotalRegalos = 0;
        $erroresStock = [];

        foreach ($configuracionRegalos as $regalo) {
            if ($regalo->puedeSerOtorgado()) {
                // Reducir stock del producto regalo
                if ($regalo->reducirStock()) {
                    $regalosOtorgados[] = [
                        'producto_id' => $regalo->producto_id,
                        'nombre_producto' => $regalo->nombre_producto,
                        'cantidad' => $regalo->cantidad,
                        'valor_unitario' => $regalo->precio_producto,
                        'valor_total' => $regalo->valor_total_regalo
                    ];
                    
                    $valorTotalRegalos += $regalo->valor_total_regalo;
                    
                    // Agregar el regalo como detalle del pedido
                    $pedido->detalles()->create([
                        'producto_id' => $regalo->producto_id,
                        'codigo_producto' => $regalo->codigo_producto,
                        'nombre_producto' => $regalo->nombre_producto . ' (REGALO)',
                        'cantidad' => $regalo->cantidad,
                        'precio_unitario' => 0, // Los regalos tienen precio 0
                        'subtotal_linea' => 0
                    ]);
                } else {
                    $erroresStock[] = [
                        'producto' => $regalo->nombre_producto,
                        'error' => 'No se pudo reducir el stock'
                    ];
                }
            } else {
                $erroresStock[] = [
                    'producto' => $regalo->nombre_producto,
                    'error' => 'Stock insuficiente o producto inactivo'
                ];
            }
        }

        if (empty($regalosOtorgados)) {
            return [
                'exito' => false,
                'error' => 'No se pudieron otorgar regalos',
                'errores_stock' => $erroresStock
            ];
        }

        return [
            'exito' => true,
            'tipo' => 'regalos',
            'regalos' => $regalosOtorgados,
            'cantidad_regalos' => count($regalosOtorgados),
            'valor_total_regalos' => $valorTotalRegalos,
            'descripcion' => "Se agregaron " . count($regalosOtorgados) . " regalo(s) a tu pedido",
            'errores_stock' => $erroresStock
        ];
    }

    // Métodos para simulación

    /**
     * Simular puntos
     */
    private function simularPuntos(Recompensa $recompensa, float $monto, int $cantidadItems): array
    {
        $configuracionPuntos = $recompensa->puntos->first();
        
        if (!$configuracionPuntos) {
            return ['puntos_estimados' => 0];
        }

        $puntosEstimados = $configuracionPuntos->calcularPuntosPorCompra($monto, $cantidadItems);
        
        return [
            'puntos_estimados' => $puntosEstimados,
            'desglose' => [
                'puntos_por_compra' => $configuracionPuntos->otorga_puntos_por_compra ? $configuracionPuntos->puntos_por_compra : 0,
                'puntos_por_monto' => $configuracionPuntos->otorga_puntos_por_monto ? ($monto * $configuracionPuntos->puntos_por_monto) : 0
            ],
            'descripcion' => "Ganarías {$puntosEstimados} puntos con esta compra"
        ];
    }

    /**
     * Simular descuento
     */
    private function simularDescuento(Recompensa $recompensa, float $monto): array
    {
        $configuracionDescuento = $recompensa->descuentos->first();
        
        if (!$configuracionDescuento) {
            return ['descuento_estimado' => 0];
        }

        $descuentoEstimado = $configuracionDescuento->calcularDescuento($monto);
        $montoFinal = $configuracionDescuento->calcularMontoFinal($monto);
        
        return [
            'descuento_estimado' => $descuentoEstimado,
            'monto_original' => $monto,
            'monto_final' => $montoFinal,
            'porcentaje_descuento' => $configuracionDescuento->getPorcentajeDescuentoEfectivo($monto),
            'cumple_minima' => $configuracionDescuento->cumpleCompraMinima($monto),
            'descripcion' => $descuentoEstimado > 0 ? 
                "Ahorrarías S/ {$descuentoEstimado} con este descuento" : 
                "No cumples el monto mínimo para el descuento"
        ];
    }

    /**
     * Simular envío gratis
     */
    private function simularEnvioGratis(Recompensa $recompensa, float $monto): array
    {
        $configuracionEnvio = $recompensa->envios->first();
        
        if (!$configuracionEnvio) {
            return ['envio_gratis' => false];
        }

        $cumpleMinimo = $configuracionEnvio->cumpleMontoMinimo($monto);
        
        return [
            'envio_gratis' => $cumpleMinimo,
            'cumple_minimo' => $cumpleMinimo,
            'monto_minimo_requerido' => $configuracionEnvio->minimo_compra,
            'descripcion' => $cumpleMinimo ? 
                'Calificarías para envío gratis' : 
                "Necesitas S/ " . ($configuracionEnvio->minimo_compra - $monto) . " más para envío gratis"
        ];
    }

    /**
     * Simular regalos
     */
    private function simularRegalos(Recompensa $recompensa): array
    {
        $configuracionRegalos = $recompensa->regalos;
        
        if ($configuracionRegalos->isEmpty()) {
            return ['regalos' => []];
        }

        $regalosDisponibles = [];
        $valorTotalRegalos = 0;
        
        foreach ($configuracionRegalos as $regalo) {
            if ($regalo->puedeSerOtorgado()) {
                $regalosDisponibles[] = [
                    'producto' => $regalo->nombre_producto,
                    'cantidad' => $regalo->cantidad,
                    'valor' => $regalo->valor_total_regalo,
                    'disponible' => true
                ];
                $valorTotalRegalos += $regalo->valor_total_regalo;
            } else {
                $regalosDisponibles[] = [
                    'producto' => $regalo->nombre_producto,
                    'cantidad' => $regalo->cantidad,
                    'valor' => $regalo->valor_total_regalo,
                    'disponible' => false,
                    'razon' => 'Stock insuficiente'
                ];
            }
        }
        
        return [
            'regalos' => $regalosDisponibles,
            'cantidad_regalos_disponibles' => collect($regalosDisponibles)->where('disponible', true)->count(),
            'valor_total_regalos' => $valorTotalRegalos,
            'descripcion' => count($regalosDisponibles) > 0 ? 
                'Recibirías ' . count($regalosDisponibles) . ' regalo(s) con esta compra' : 
                'No hay regalos disponibles'
        ];
    }

    /**
     * Revertir aplicación de recompensa (para cancelaciones)
     */
    public function revertirRecompensa(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido,
        array $datosAplicacion
    ): array {
        try {
            switch ($recompensa->tipo) {
                case Recompensa::TIPO_DESCUENTO:
                    return $this->revertirDescuento($pedido, $datosAplicacion);
                    
                case Recompensa::TIPO_ENVIO_GRATIS:
                    return $this->revertirEnvioGratis($pedido, $datosAplicacion);
                    
                case Recompensa::TIPO_REGALO:
                    return $this->revertirRegalos($pedido, $datosAplicacion);
                    
                case Recompensa::TIPO_PUNTOS:
                    // Los puntos no se revierten automáticamente
                    return [
                        'exito' => true,
                        'mensaje' => 'Puntos no revertidos - requiere proceso manual'
                    ];
                    
                default:
                    return [
                        'exito' => false,
                        'error' => 'Tipo de recompensa no soportado para reversión'
                    ];
            }
        } catch (\Exception $e) {
            Log::error("Error revirtiendo recompensa: " . $e->getMessage());
            return [
                'exito' => false,
                'error' => 'Error interno al revertir recompensa'
            ];
        }
    }

    /**
     * Revertir descuento aplicado
     */
    private function revertirDescuento(Pedido $pedido, array $datosAplicacion): array
    {
        if (isset($datosAplicacion['descuento_aplicado'])) {
            $pedido->descuento_total -= $datosAplicacion['descuento_aplicado'];
            $pedido->total += $datosAplicacion['descuento_aplicado'];
            $pedido->save();
            
            return [
                'exito' => true,
                'mensaje' => 'Descuento revertido exitosamente'
            ];
        }
        
        return [
            'exito' => false,
            'error' => 'No se encontraron datos de descuento para revertir'
        ];
    }

    /**
     * Revertir envío gratis
     */
    private function revertirEnvioGratis(Pedido $pedido, array $datosAplicacion): array
    {
        if (isset($datosAplicacion['ahorro_envio'])) {
            $pedido->costo_envio = $datosAplicacion['ahorro_envio'];
            $pedido->total += $datosAplicacion['ahorro_envio'];
            $pedido->save();
            
            return [
                'exito' => true,
                'mensaje' => 'Envío gratis revertido exitosamente'
            ];
        }
        
        return [
            'exito' => false,
            'error' => 'No se encontraron datos de envío para revertir'
        ];
    }

    /**
     * Revertir regalos otorgados
     */
    private function revertirRegalos(Pedido $pedido, array $datosAplicacion): array
    {
        if (isset($datosAplicacion['regalos'])) {
            foreach ($datosAplicacion['regalos'] as $regalo) {
                // Restaurar stock
                $producto = Producto::find($regalo['producto_id']);
                if ($producto) {
                    $producto->stock += $regalo['cantidad'];
                    $producto->save();
                }
                
                // Remover del pedido
                $pedido->detalles()
                    ->where('producto_id', $regalo['producto_id'])
                    ->where('precio_unitario', 0) // Solo regalos
                    ->delete();
            }
            
            return [
                'exito' => true,
                'mensaje' => 'Regalos revertidos exitosamente'
            ];
        }
        
        return [
            'exito' => false,
            'error' => 'No se encontraron datos de regalos para revertir'
        ];
    }
}