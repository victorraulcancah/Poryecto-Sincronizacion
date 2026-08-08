<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Datos de los clientes tal como están en el ERP 7Power.
 *
 * Se leen por la conexión `mysql_7power` (solo lectura); no se modifica nada
 * del ERP. Lo usan el checkout ("Datos del Titular") y el detalle de pedido del
 * dashboard, que tienen que mostrar lo mismo.
 */
class ClienteErpService
{
    /**
     * Empresa del e-commerce: el código de cliente no es único globalmente,
     * se genera por empresa.
     */
    private const COMPANY_ID = 1;

    /**
     * Clientes del ERP indexados por código, en una sola consulta.
     *
     * @param  array<int,string>  $codigos
     * @return array<string,array>
     */
    public function porCodigos(array $codigos): array
    {
        $codigos = array_values(array_filter(array_unique($codigos)));

        if (empty($codigos)) {
            return [];
        }

        $filas = DB::connection('mysql_7power')->table('clients')
            ->whereIn('codigo', $codigos)
            ->where('company_id', self::COMPANY_ID)
            ->get(['codigo', 'tipo', 'dni_ruc', 'name', 'last_name', 'razon_social', 'direccion', 'email', 'telefono']);

        $mapa = [];
        foreach ($filas as $fila) {
            $mapa[$fila->codigo] = [
                'codigo_erp' => $fila->codigo,
                'nombre' => $this->nombre($fila),
                'documento' => $fila->dni_ruc ?: null,
                // Las empresas se identifican con RUC; las personas, con DNI.
                'es_empresa' => $fila->tipo === 'e',
                'telefono' => $fila->telefono ?: null,
                'email' => $fila->email ?: null,
                'direccion' => $fila->direccion ?: null,
            ];
        }

        return $mapa;
    }

    /** Un solo cliente, o null si el código no existe en el ERP. */
    public function porCodigo(?string $codigo): ?array
    {
        if (!$codigo) {
            return null;
        }

        return $this->porCodigos([$codigo])[$codigo] ?? null;
    }

    /**
     * Las empresas se identifican por razón social; las personas, por nombre y
     * apellido.
     */
    private function nombre(object $fila): string
    {
        return trim($fila->razon_social ?: trim($fila->name . ' ' . $fila->last_name));
    }

    /** Id interno del cliente en el ERP, o null si el código no existe. */
    public function idPorCodigo(?string $codigo): ?int
    {
        if (!$codigo) {
            return null;
        }

        $id = DB::connection('mysql_7power')->table('clients')
            ->where('codigo', $codigo)
            ->where('company_id', self::COMPANY_ID)
            ->value('id');

        return $id ? (int) $id : null;
    }

    /**
     * Compras que el cliente hizo en la tienda (ventas registradas en el ERP).
     *
     * No incluye las del e-commerce: esas ya se ven como pedidos. Cada venta
     * trae su comprobante, su moneda y sus productos.
     *
     * @return array<int,array>
     */
    public function comprasDeCliente(int $clientIdErp, int $limite = 100): array
    {
        $db = DB::connection('mysql_7power');

        $ventas = $db->table('sales as s')
            ->leftJoin('boletas as b', 'b.sale_id', '=', 's.id')
            ->where('s.client_id', $clientIdErp)
            ->where('s.company_id', self::COMPANY_ID)
            ->orderByDesc('s.created_at')
            ->limit($limite)
            ->get([
                's.id', 's.nro_documento', 's.total_soles', 's.total_dolares',
                's.estado', 's.observaciones', 's.created_at',
                'b.tipo as boleta_tipo', 'b.serie as boleta_serie', 'b.numero as boleta_numero',
            ]);

        if ($ventas->isEmpty()) {
            return [];
        }

        // Productos de todas las ventas en una sola consulta.
        $detalles = $db->table('product_sale as ps')
            ->leftJoin('products as p', 'p.id', '=', 'ps.product_id')
            ->whereIn('ps.sale_id', $ventas->pluck('id'))
            ->get([
                'ps.sale_id', 'ps.cantidad', 'ps.precio', 'ps.subtotal_con_dto', 'ps.dolares',
                'ps.concepto_libre', 'p.codigo', 'p.name',
            ])
            ->groupBy('sale_id');

        return $ventas->map(function ($venta) use ($detalles) {
            // El total sale de la moneda que tenga importe; una venta del ERP
            // es siempre de una sola moneda.
            $enDolares = (float) $venta->total_dolares > 0;

            return [
                'id' => (int) $venta->id,
                'documento' => $this->documentoDeVenta($venta),
                'fecha' => $venta->created_at,
                'moneda' => $enDolares ? 'd' : 's',
                'total' => (float) ($enDolares ? $venta->total_dolares : $venta->total_soles),
                // `estado` en falso es una venta anulada.
                'anulada' => !$venta->estado,
                'observaciones' => $venta->observaciones,
                'productos' => collect($detalles[$venta->id] ?? [])->map(fn ($d) => [
                    'codigo' => $d->codigo,
                    'nombre' => $d->name ?: $d->concepto_libre,
                    'cantidad' => (float) $d->cantidad,
                    'precio' => (float) $d->precio,
                    'subtotal' => (float) $d->subtotal_con_dto,
                    'moneda' => $d->dolares ? 'd' : 's',
                ])->values()->all(),
            ];
        })->values()->all();
    }

    /**
     * Nombre visible del comprobante: la boleta/factura si la venta la tiene
     * ("BOL001-0123"), y si no el correlativo interno ("V001-5876").
     */
    private function documentoDeVenta(object $venta): string
    {
        if ($venta->boleta_tipo !== null) {
            return strtoupper($venta->boleta_tipo)
                . str_pad((string) ($venta->boleta_serie ?? '1'), 3, '0', STR_PAD_LEFT)
                . '-' . str_pad((string) ($venta->boleta_numero ?? '0'), 4, '0', STR_PAD_LEFT);
        }

        return 'V001-' . str_pad((string) ($venta->nro_documento ?? '0'), 4, '0', STR_PAD_LEFT);
    }
}
