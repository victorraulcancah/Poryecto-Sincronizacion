<?php

namespace App\Http\Controllers\Concerns;

use App\Models\TipoPrecio;
use App\Models\UserCliente;

/**
 * Resolución del precio visible de un producto.
 *
 * Un producto puede estar cotizado solo en soles, solo en dólares, o en las
 * dos. Por eso no se resuelve una sola lista de precio para todo el catálogo:
 * se prueban las listas aplicables producto por producto y se devuelve la
 * moneda de la que realmente tuvo precio.
 *
 * Lo usan el catálogo (ProductosController) y el carrito (CartController), que
 * tienen que coincidir: si la ficha muestra US$ 35, el carrito no puede
 * mostrar S/ 0.00.
 */
trait ResuelvePreciosPorMoneda
{
    /**
     * Cliente autenticado (UserCliente) o null si es invitado.
     */
    protected function clienteAutenticado(): ?UserCliente
    {
        $user = auth('sanctum')->user();

        return $user instanceof UserCliente ? $user : null;
    }

    /**
     * Listas activas para invitados, una por moneda como máximo, en orden
     * soles primero (para que sea la opción por defecto en el selector).
     */
    protected function opcionesPrecioInvitado(): array
    {
        $opciones = [];
        foreach (['s', 'd'] as $moneda) {
            $tp = TipoPrecio::paraInvitados($moneda);
            if ($tp) {
                $opciones[] = ['moneda' => $moneda, 'tipo_precio_id' => $tp->id];
            }
        }

        return $opciones;
    }

    /**
     * TODAS las listas de precio aplicables (soles primero), no solo la
     * primera. Es lo que permite que un producto cotizado únicamente en una
     * moneda muestre su precio en vez de 0.
     *
     * - Cliente logueado: sus listas asignadas (PEN y USD); si no tiene
     *   ninguna, cae en la predeterminada por moneda.
     * - Invitado: las configuradas en "Clientes visitantes".
     */
    protected function listasPrecioAplicables(?UserCliente $cliente = null): array
    {
        $cliente = $cliente ?: $this->clienteAutenticado();

        if ($cliente) {
            $ids = array_values(array_filter([
                $cliente->tipo_precio_id,
                $cliente->tipo_precio_id_usd,
            ]));

            if (! empty($ids)) {
                return TipoPrecio::whereIn('id', $ids)
                    ->where('activo', true)
                    ->get()
                    // Soles primero: es la moneda por defecto del catálogo.
                    ->sortBy(fn ($t) => $t->tipo_moneda === 's' ? 0 : 1)
                    ->map(fn ($t) => ['moneda' => $t->tipo_moneda, 'tipo_precio_id' => $t->id])
                    ->values()
                    ->all();
            }

            // Sin listas propias: la predeterminada de cada moneda.
            $opciones = [];
            foreach (['s', 'd'] as $moneda) {
                $tp = TipoPrecio::predeterminado($moneda);
                if ($tp) {
                    $opciones[] = ['moneda' => $moneda, 'tipo_precio_id' => $tp->id];
                }
            }

            return $opciones;
        }

        return $this->opcionesPrecioInvitado();
    }

    /**
     * Precio y moneda de un producto recorriendo las listas aplicables.
     *
     * Antes se usaba una sola lista (siempre soles) y, si el producto no
     * tenía precio ahí, caía al campo `precio_venta` de la tabla productos
     * —que está en 0— así que los productos cotizados solo en dólares se
     * mostraban en "S/ 0.00". Ahora se prueba lista por lista y se devuelve
     * la moneda de la que realmente tuvo precio.
     */
    protected function precioYMonedaProducto($producto, array $listas): array
    {
        foreach ($listas as $op) {
            $precio = $producto->precioPara($op['tipo_precio_id']);
            if ($precio !== null && $precio > 0) {
                return ['precio' => $precio, 'moneda' => $op['moneda']];
            }
        }

        // Sin precio en ninguna lista: se muestra 0 en la moneda por defecto.
        return ['precio' => 0, 'moneda' => $listas[0]['moneda'] ?? null];
    }
}
