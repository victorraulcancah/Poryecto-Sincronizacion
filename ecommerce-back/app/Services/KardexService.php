<?php

namespace App\Services;

use App\Models\Kardex;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;

class KardexService
{
    /**
     * Registrar entrada por compra
     */
    public function registrarEntradaCompra($compra, $detalleCompra)
    {
        $producto = Producto::findOrFail($detalleCompra->producto_id);
        $stockAnterior = $producto->stock;
        $stockActual = $stockAnterior + $detalleCompra->cantidad;

        // Calcular costo promedio ponderado
        $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
        $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $detalleCompra->precio_unitario;

        if ($stockActual > 0) {
            $costoPromedio = (($stockAnterior * $costoPromedio) + ($detalleCompra->cantidad * $detalleCompra->precio_unitario)) / $stockActual;
        }

        // Registrar en kardex
        Kardex::create([
            'producto_id' => $producto->id,
            'fecha' => $compra->fecha_compra ?? now()->toDateString(),
            'tipo_movimiento' => 'ENTRADA',
            'tipo_operacion' => 'COMPRA',
            'documento_tipo' => 'COMPRA',
            'documento_numero' => $compra->numero_compra ?? 'COMP-' . $compra->id,
            'cantidad' => $detalleCompra->cantidad,
            'costo_unitario' => $detalleCompra->precio_unitario,
            'costo_total' => $detalleCompra->cantidad * $detalleCompra->precio_unitario,
            'stock_anterior' => $stockAnterior,
            'stock_actual' => $stockActual,
            'costo_promedio' => $costoPromedio,
            'compra_id' => $compra->id,
            'user_id' => auth()->id() ?? 1,
            'observaciones' => 'Entrada por compra'
        ]);

        // Actualizar stock del producto
        $producto->update(['stock' => $stockActual]);

        return $costoPromedio;
    }

    /**
     * Registrar salida por venta
     */
    public function registrarSalidaVenta($venta, $detalleVenta)
    {
        $producto = Producto::findOrFail($detalleVenta->producto_id);
        $stockAnterior = $producto->stock;
        $stockActual = $stockAnterior - $detalleVenta->cantidad;

        // Obtener costo promedio actual
        $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
        $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;

        // Registrar en kardex
        Kardex::create([
            'producto_id' => $producto->id,
            'fecha' => $venta->fecha_venta ?? now()->toDateString(),
            'tipo_movimiento' => 'SALIDA',
            'tipo_operacion' => 'VENTA',
            'documento_tipo' => 'VENTA',
            'documento_numero' => $venta->numero_venta ?? 'VENTA-' . $venta->id,
            'cantidad' => $detalleVenta->cantidad,
            'costo_unitario' => $costoPromedio,
            'costo_total' => $detalleVenta->cantidad * $costoPromedio,
            'stock_anterior' => $stockAnterior,
            'stock_actual' => $stockActual,
            'costo_promedio' => $costoPromedio,
            'venta_id' => $venta->id,
            'user_id' => auth()->id() ?? 1,
            'observaciones' => 'Salida por venta'
        ]);

        // Actualizar stock del producto
        $producto->update(['stock' => $stockActual]);

        return $costoPromedio;
    }

    /**
     * Registrar devolución de venta
     */
    public function registrarDevolucionVenta($venta, $detalleVenta, $cantidad)
    {
        $producto = Producto::findOrFail($detalleVenta->producto_id);
        $stockAnterior = $producto->stock;
        $stockActual = $stockAnterior + $cantidad;

        $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
        $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;

        Kardex::create([
            'producto_id' => $producto->id,
            'fecha' => now()->toDateString(),
            'tipo_movimiento' => 'ENTRADA',
            'tipo_operacion' => 'DEVOLUCION_VENTA',
            'documento_tipo' => 'DEVOLUCION',
            'documento_numero' => 'DEV-VENTA-' . $venta->id,
            'cantidad' => $cantidad,
            'costo_unitario' => $costoPromedio,
            'costo_total' => $cantidad * $costoPromedio,
            'stock_anterior' => $stockAnterior,
            'stock_actual' => $stockActual,
            'costo_promedio' => $costoPromedio,
            'venta_id' => $venta->id,
            'user_id' => auth()->id() ?? 1,
            'observaciones' => 'Devolución de venta'
        ]);

        $producto->update(['stock' => $stockActual]);
    }
}
