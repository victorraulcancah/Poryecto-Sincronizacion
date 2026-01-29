<?php

namespace App\Services;

use App\Models\Recompensa;
use App\Models\UserCliente;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\RecompensaCliente;
use App\Models\RecompensaProducto;
use Carbon\Carbon;

class ValidadorRecompensas
{
    /**
     * Validar si una recompensa aplica para un pedido específico
     */
    public function validarRecompensaParaPedido(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        $validaciones = [
            'aplica' => false,
            'razones' => [],
            'validaciones_detalle' => []
        ];

        // 1. Validar que la recompensa esté activa
        $activaValidacion = $this->validarRecompensaActiva($recompensa);
        $validaciones['validaciones_detalle']['activa'] = $activaValidacion;
        if (!$activaValidacion['valida']) {
            $validaciones['razones'][] = $activaValidacion['razon'];
            return $validaciones;
        }

        // 2. Validar fechas de vigencia
        $fechasValidacion = $this->validarFechasVigencia($recompensa);
        $validaciones['validaciones_detalle']['fechas'] = $fechasValidacion;
        if (!$fechasValidacion['valida']) {
            $validaciones['razones'][] = $fechasValidacion['razon'];
            return $validaciones;
        }

        // 3. Validar segmentación de cliente
        $segmentoValidacion = $this->validarSegmentoCliente($recompensa, $cliente);
        $validaciones['validaciones_detalle']['segmento'] = $segmentoValidacion;
        if (!$segmentoValidacion['valida']) {
            $validaciones['razones'][] = $segmentoValidacion['razon'];
            return $validaciones;
        }

        // 4. Validar productos del pedido
        $productosValidacion = $this->validarProductosPedido($recompensa, $pedido);
        $validaciones['validaciones_detalle']['productos'] = $productosValidacion;
        if (!$productosValidacion['valida']) {
            $validaciones['razones'][] = $productosValidacion['razon'];
            return $validaciones;
        }

        // 5. Validaciones específicas por tipo de recompensa
        $tipoValidacion = $this->validarPorTipoRecompensa($recompensa, $cliente, $pedido);
        $validaciones['validaciones_detalle']['tipo_especifico'] = $tipoValidacion;
        if (!$tipoValidacion['valida']) {
            $validaciones['razones'][] = $tipoValidacion['razon'];
            return $validaciones;
        }

        // 6. Validar límites de uso (si aplica)
        $limitesValidacion = $this->validarLimitesUso($recompensa, $cliente);
        $validaciones['validaciones_detalle']['limites'] = $limitesValidacion;
        if (!$limitesValidacion['valida']) {
            $validaciones['razones'][] = $limitesValidacion['razon'];
            return $validaciones;
        }

        // Si llegamos aquí, todas las validaciones pasaron
        $validaciones['aplica'] = true;
        $validaciones['razones'][] = 'Todas las validaciones pasaron correctamente';

        return $validaciones;
    }

    /**
     * Validar si una recompensa aplica para un cliente (sin pedido)
     */
    public function validarRecompensaParaCliente(
        Recompensa $recompensa,
        UserCliente $cliente
    ): array {
        $validaciones = [
            'aplica' => false,
            'razones' => []
        ];

        // Validaciones básicas
        if (!$this->validarRecompensaActiva($recompensa)['valida']) {
            $validaciones['razones'][] = 'Recompensa no activa';
            return $validaciones;
        }

        if (!$this->validarFechasVigencia($recompensa)['valida']) {
            $validaciones['razones'][] = 'Recompensa fuera de vigencia';
            return $validaciones;
        }

        if (!$this->validarSegmentoCliente($recompensa, $cliente)['valida']) {
            $validaciones['razones'][] = 'Cliente no cumple segmentación';
            return $validaciones;
        }

        $validaciones['aplica'] = true;
        return $validaciones;
    }

    /**
     * Validar para simulación de carrito
     */
    public function validarRecompensaParaSimulacion(
        Recompensa $recompensa,
        UserCliente $cliente,
        array $productosCarrito,
        float $montoTotal
    ): array {
        $validaciones = [
            'aplica' => false,
            'razones' => []
        ];

        // Validaciones básicas
        if (!$this->validarRecompensaActiva($recompensa)['valida'] ||
            !$this->validarFechasVigencia($recompensa)['valida'] ||
            !$this->validarSegmentoCliente($recompensa, $cliente)['valida']) {
            return $validaciones;
        }

        // Validar productos en carrito
        $productosValidos = $this->validarProductosEnCarrito($recompensa, $productosCarrito);
        if (!$productosValidos['valida']) {
            $validaciones['razones'][] = $productosValidos['razon'];
            return $validaciones;
        }

        // Validar monto mínimo según tipo
        $montoValidacion = $this->validarMontoMinimoPorTipo($recompensa, $montoTotal);
        if (!$montoValidacion['valida']) {
            $validaciones['razones'][] = $montoValidacion['razon'];
            return $validaciones;
        }

        $validaciones['aplica'] = true;
        return $validaciones;
    }

    /**
     * Validar si un producto específico está en una recompensa
     */
    public function validarProductoEnRecompensa(
        Producto $producto,
        Recompensa $recompensa,
        ?UserCliente $cliente = null
    ): array {
        $validaciones = [
            'aplica' => false,
            'razones' => []
        ];

        // Validaciones básicas de recompensa
        if (!$this->validarRecompensaActiva($recompensa)['valida'] ||
            !$this->validarFechasVigencia($recompensa)['valida']) {
            return $validaciones;
        }

        // Validar cliente si se proporciona
        if ($cliente && !$this->validarSegmentoCliente($recompensa, $cliente)['valida']) {
            $validaciones['razones'][] = 'Cliente no cumple segmentación';
            return $validaciones;
        }

        // Verificar si el producto está en la configuración de la recompensa
        $productoEnRecompensa = false;
        foreach ($recompensa->productos as $recompensaProducto) {
            if ($recompensaProducto->productoAplica($producto)) {
                $productoEnRecompensa = true;
                break;
            }
        }

        if (!$productoEnRecompensa) {
            $validaciones['razones'][] = 'Producto no incluido en la recompensa';
            return $validaciones;
        }

        $validaciones['aplica'] = true;
        return $validaciones;
    }

    // Métodos de validación específicos

    /**
     * Validar que la recompensa esté activa
     */
    private function validarRecompensaActiva(Recompensa $recompensa): array
    {
        return [
            'valida' => $recompensa->activo,
            'razon' => $recompensa->activo ? 'Recompensa activa' : 'Recompensa inactiva'
        ];
    }

    /**
     * Validar fechas de vigencia
     */
    private function validarFechasVigencia(Recompensa $recompensa): array
    {
        $ahora = now();
        $vigente = $recompensa->fecha_inicio <= $ahora && $recompensa->fecha_fin >= $ahora;

        $razon = 'Recompensa vigente';
        if ($recompensa->fecha_inicio > $ahora) {
            $razon = 'Recompensa aún no ha iniciado';
        } elseif ($recompensa->fecha_fin < $ahora) {
            $razon = 'Recompensa ya venció';
        }

        return [
            'valida' => $vigente,
            'razon' => $razon,
            'fecha_inicio' => $recompensa->fecha_inicio,
            'fecha_fin' => $recompensa->fecha_fin,
            'fecha_actual' => $ahora
        ];
    }

    /**
     * Validar segmentación de cliente
     */
    private function validarSegmentoCliente(Recompensa $recompensa, UserCliente $cliente): array
    {
        $segmentos = $recompensa->clientes;
        
        // Si no hay segmentos configurados, aplica a todos
        if ($segmentos->isEmpty()) {
            return [
                'valida' => true,
                'razon' => 'Sin restricciones de segmento - aplica a todos'
            ];
        }

        // Verificar cada segmento configurado
        foreach ($segmentos as $segmento) {
            if ($segmento->clienteCumpleSegmento($cliente)) {
                return [
                    'valida' => true,
                    'razon' => "Cliente cumple segmento: {$segmento->segmento_nombre}",
                    'segmento_cumplido' => $segmento->segmento
                ];
            }
        }

        return [
            'valida' => false,
            'razon' => 'Cliente no cumple ningún segmento configurado',
            'segmento_cliente' => $cliente->getSegmentoCliente(),
            'segmentos_requeridos' => $segmentos->pluck('segmento')->toArray()
        ];
    }

    /**
     * Validar productos del pedido
     */
    private function validarProductosPedido(Recompensa $recompensa, Pedido $pedido): array
    {
        $productosRecompensa = $recompensa->productos;
        
        // Si no hay productos configurados, aplica a todos
        if ($productosRecompensa->isEmpty()) {
            return [
                'valida' => true,
                'razon' => 'Sin restricciones de productos - aplica a todos'
            ];
        }

        // Obtener productos del pedido
        $productosPedido = $pedido->detalles()->with('producto')->get();
        $productosValidos = [];

        foreach ($productosPedido as $detalle) {
            foreach ($productosRecompensa as $recompensaProducto) {
                if ($recompensaProducto->productoAplica($detalle->producto)) {
                    $productosValidos[] = [
                        'producto_id' => $detalle->producto->id,
                        'nombre' => $detalle->producto->nombre,
                        'cantidad' => $detalle->cantidad,
                        'subtotal' => $detalle->subtotal_linea
                    ];
                    break;
                }
            }
        }

        if (empty($productosValidos)) {
            return [
                'valida' => false,
                'razon' => 'Ningún producto del pedido aplica para esta recompensa'
            ];
        }

        return [
            'valida' => true,
            'razon' => 'Productos del pedido aplican para la recompensa',
            'productos_validos' => $productosValidos,
            'cantidad_productos_validos' => count($productosValidos)
        ];
    }

    /**
     * Validar productos en carrito (para simulación)
     */
    private function validarProductosEnCarrito(Recompensa $recompensa, array $productosCarrito): array
    {
        $productosRecompensa = $recompensa->productos;
        
        if ($productosRecompensa->isEmpty()) {
            return [
                'valida' => true,
                'razon' => 'Sin restricciones de productos'
            ];
        }

        $productosValidos = [];
        foreach ($productosCarrito as $itemCarrito) {
            $producto = Producto::find($itemCarrito['producto_id']);
            if ($producto) {
                foreach ($productosRecompensa as $recompensaProducto) {
                    if ($recompensaProducto->productoAplica($producto)) {
                        $productosValidos[] = $itemCarrito;
                        break;
                    }
                }
            }
        }

        return [
            'valida' => !empty($productosValidos),
            'razon' => empty($productosValidos) ? 
                'Ningún producto del carrito aplica' : 
                'Productos del carrito aplican',
            'productos_validos' => $productosValidos
        ];
    }

    /**
     * Validaciones específicas por tipo de recompensa
     */
    private function validarPorTipoRecompensa(
        Recompensa $recompensa,
        UserCliente $cliente,
        Pedido $pedido
    ): array {
        switch ($recompensa->tipo) {
            case Recompensa::TIPO_PUNTOS:
                return $this->validarRecompensaPuntos($recompensa, $pedido);
                
            case Recompensa::TIPO_DESCUENTO:
                return $this->validarRecompensaDescuento($recompensa, $pedido);
                
            case Recompensa::TIPO_ENVIO_GRATIS:
                return $this->validarRecompensaEnvio($recompensa, $pedido);
                
            case Recompensa::TIPO_REGALO:
                return $this->validarRecompensaRegalo($recompensa, $pedido);
                
            default:
                return [
                    'valida' => true,
                    'razon' => 'Tipo de recompensa sin validaciones específicas'
                ];
        }
    }

    /**
     * Validar recompensa de puntos
     */
    private function validarRecompensaPuntos(Recompensa $recompensa, Pedido $pedido): array
    {
        $configuracionPuntos = $recompensa->puntos->first();
        
        if (!$configuracionPuntos) {
            return [
                'valida' => false,
                'razon' => 'Recompensa de puntos sin configuración'
            ];
        }

        if (!$configuracionPuntos->esConfiguracionValida()) {
            return [
                'valida' => false,
                'razon' => 'Configuración de puntos inválida'
            ];
        }

        return [
            'valida' => true,
            'razon' => 'Configuración de puntos válida',
            'configuracion' => $configuracionPuntos->getResumenConfiguracion()
        ];
    }

    /**
     * Validar recompensa de descuento
     */
    private function validarRecompensaDescuento(Recompensa $recompensa, Pedido $pedido): array
    {
        $configuracionDescuento = $recompensa->descuentos->first();
        
        if (!$configuracionDescuento) {
            return [
                'valida' => false,
                'razon' => 'Recompensa de descuento sin configuración'
            ];
        }

        // Validar compra mínima
        if (!$configuracionDescuento->cumpleCompraMinima($pedido->total)) {
            return [
                'valida' => false,
                'razon' => "Pedido no cumple compra mínima de S/ {$configuracionDescuento->compra_minima}",
                'monto_pedido' => $pedido->total,
                'monto_minimo_requerido' => $configuracionDescuento->compra_minima
            ];
        }

        return [
            'valida' => true,
            'razon' => 'Pedido cumple requisitos para descuento',
            'descuento_calculado' => $configuracionDescuento->calcularDescuento($pedido->total)
        ];
    }

    /**
     * Validar recompensa de envío gratis
     */
    private function validarRecompensaEnvio(Recompensa $recompensa, Pedido $pedido): array
    {
        $configuracionEnvio = $recompensa->envios->first();
        
        if (!$configuracionEnvio) {
            return [
                'valida' => false,
                'razon' => 'Recompensa de envío sin configuración'
            ];
        }

        // Validar monto mínimo
        if (!$configuracionEnvio->cumpleMontoMinimo($pedido->total)) {
            return [
                'valida' => false,
                'razon' => "Pedido no cumple monto mínimo para envío gratis: S/ {$configuracionEnvio->minimo_compra}"
            ];
        }

        // Validar zona de entrega (si está configurada)
        if ($configuracionEnvio->tiene_zonas_especificas && $pedido->distrito_id) {
            if (!$configuracionEnvio->incluyeZona($pedido->distrito_id)) {
                return [
                    'valida' => false,
                    'razon' => 'Zona de entrega no incluida en envío gratis'
                ];
            }
        }

        return [
            'valida' => true,
            'razon' => 'Pedido cumple requisitos para envío gratis'
        ];
    }

    /**
     * Validar recompensa de regalo
     */
    private function validarRecompensaRegalo(Recompensa $recompensa, Pedido $pedido): array
    {
        $regalos = $recompensa->regalos;
        
        if ($regalos->isEmpty()) {
            return [
                'valida' => false,
                'razon' => 'Recompensa de regalo sin productos configurados'
            ];
        }

        $regalosDisponibles = [];
        $regalosNoDisponibles = [];

        foreach ($regalos as $regalo) {
            if ($regalo->puedeSerOtorgado()) {
                $regalosDisponibles[] = $regalo;
            } else {
                $regalosNoDisponibles[] = [
                    'producto' => $regalo->nombre_producto,
                    'razon' => 'Stock insuficiente o producto inactivo'
                ];
            }
        }

        if (empty($regalosDisponibles)) {
            return [
                'valida' => false,
                'razon' => 'Ningún regalo disponible por stock o estado de productos',
                'regalos_no_disponibles' => $regalosNoDisponibles
            ];
        }

        return [
            'valida' => true,
            'razon' => 'Regalos disponibles para otorgar',
            'regalos_disponibles' => count($regalosDisponibles),
            'regalos_no_disponibles' => count($regalosNoDisponibles)
        ];
    }

    /**
     * Validar límites de uso de recompensa
     */
    private function validarLimitesUso(Recompensa $recompensa, UserCliente $cliente): array
    {
        // Por ahora, no hay límites implementados en el modelo
        // Esta función está preparada para futuras implementaciones
        
        return [
            'valida' => true,
            'razon' => 'Sin límites de uso configurados'
        ];
    }

    /**
     * Validar monto mínimo según tipo de recompensa
     */
    private function validarMontoMinimoPorTipo(Recompensa $recompensa, float $monto): array
    {
        switch ($recompensa->tipo) {
            case Recompensa::TIPO_DESCUENTO:
                $descuento = $recompensa->descuentos->first();
                if ($descuento && !$descuento->cumpleCompraMinima($monto)) {
                    return [
                        'valida' => false,
                        'razon' => "Monto insuficiente para descuento. Mínimo: S/ {$descuento->compra_minima}"
                    ];
                }
                break;
                
            case Recompensa::TIPO_ENVIO_GRATIS:
                $envio = $recompensa->envios->first();
                if ($envio && !$envio->cumpleMontoMinimo($monto)) {
                    return [
                        'valida' => false,
                        'razon' => "Monto insuficiente para envío gratis. Mínimo: S/ {$envio->minimo_compra}"
                    ];
                }
                break;
        }

        return [
            'valida' => true,
            'razon' => 'Monto cumple requisitos'
        ];
    }
}