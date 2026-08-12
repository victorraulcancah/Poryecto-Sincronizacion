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

        // La dirección del ERP son varios campos más su ubigeo, no una sola
        // cadena: se traen todos para poder mostrarla completa.
        $filas = DB::connection('mysql_7power')->table('clients as c')
            ->leftJoin('ubigeo_peru_departments as dep', 'dep.id', '=', 'c.department_id')
            ->leftJoin('ubigeo_peru_provinces as pro', 'pro.id', '=', 'c.province_id')
            ->leftJoin('ubigeo_peru_districts as dis', 'dis.id', '=', 'c.district_id')
            ->whereIn('c.codigo', $codigos)
            ->where('c.company_id', self::COMPANY_ID)
            ->get([
                'c.codigo', 'c.tipo', 'c.dni_ruc', 'c.name', 'c.last_name', 'c.razon_social',
                'c.direccion', 'c.calle', 'c.lote', 'c.indicaciones', 'c.email', 'c.telefono',
                'dep.name as departamento', 'pro.name as provincia', 'dis.name as distrito',
            ]);

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
                'calle' => $fila->calle ?: null,
                'lote' => $fila->lote ?: null,
                'indicaciones' => $fila->indicaciones ?: null,
                'departamento' => $fila->departamento ?: null,
                'provincia' => $fila->provincia ?: null,
                'distrito' => $fila->distrito ?: null,
                'direccion_completa' => $this->direccionCompleta($fila),
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
     * La dirección tal como se arma en el ERP: calle, dirección y número o
     * lote en una sola línea. El ubigeo va aparte.
     */
    private function direccionCompleta(object $fila): ?string
    {
        $partes = array_filter([
            $fila->calle ?? null,
            $fila->direccion ?? null,
            $fila->lote ?? null,
        ], fn ($parte) => trim((string) $parte) !== '');

        return $partes ? implode(' ', $partes) : null;
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
     * Una compra puntual del cliente, para el PDF. Devuelve null si la venta
     * no es suya, así que sirve también de control de acceso.
     */
    public function compraDeCliente(int $clientIdErp, int $ventaId): ?array
    {
        $existe = DB::connection('mysql_7power')->table('sales')
            ->where('id', $ventaId)
            ->where('client_id', $clientIdErp)
            ->where('company_id', self::COMPANY_ID)
            ->exists();

        if (!$existe) {
            return null;
        }

        // Se reusa la misma consulta del listado para no repetir el armado.
        foreach ($this->comprasDeCliente($clientIdErp, 500) as $compra) {
            if ($compra['id'] === $ventaId) {
                return $compra;
            }
        }

        return null;
    }

    /**
     * Todo lo que necesita el comprobante para verse igual que en 7Power:
     * empresa, sucursal, vendedor, condición de pago, descuentos e IGV.
     *
     * Devuelve null si la venta no es del cliente, así que sirve también de
     * control de acceso.
     */
    public function comprobanteDeVenta(int $clientIdErp, int $ventaId): ?array
    {
        $db = DB::connection('mysql_7power');

        $venta = $db->table('sales as s')
            ->leftJoin('boletas as b', 'b.sale_id', '=', 's.id')
            ->leftJoin('warehouses as w', 'w.id', '=', 's.warehouse_id')
            ->leftJoin('users as v', 'v.id', '=', 's.vendedor_id')
            ->leftJoin('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('clients as c', 'c.id', '=', 's.client_id')
            ->where('s.id', $ventaId)
            ->where('s.client_id', $clientIdErp)
            ->where('s.company_id', self::COMPANY_ID)
            ->first([
                's.id', 's.nro_documento', 's.total_soles', 's.total_dolares',
                's.tipo_de_cambio', 's.estado', 's.observaciones', 's.created_at',
                'b.tipo as boleta_tipo', 'b.serie as boleta_serie', 'b.numero as boleta_numero',
                'w.name as sucursal', 'w.direccion as w_direccion', 'w.telefono as w_telefono',
                'w.email as w_email', 'w.web as w_web', 'w.datos as w_datos',
                'w.datos_vendedor as w_datos_vendedor', 'w.comentarios as w_comentarios',
                'v.name as vendedor', 'v.telefono as vendedor_telefono', 'v.email as vendedor_email',
                'u.name as usuario', 'u.telefono as usuario_telefono', 'u.email as usuario_email',
                'c.dni_ruc', 'c.razon_social', 'c.name as c_name', 'c.last_name as c_last_name',
                'c.direccion as c_direccion',
            ]);

        if (!$venta) {
            return null;
        }

        $empresa = $db->table('companies')->where('id', self::COMPANY_ID)->first([
            'razon_social', 'ruc', 'direccion', 'telefono', 'email', 'web', 'logo', 'igv',
        ]);

        $productos = $db->table('product_sale as ps')
            ->leftJoin('products as p', 'p.id', '=', 'ps.product_id')
            ->leftJoin('brands as br', 'br.id', '=', 'p.brand_id')
            ->where('ps.sale_id', $venta->id)
            ->get([
                'ps.cantidad', 'ps.precio', 'ps.monto_dto', 'ps.subtotal_con_dto', 'ps.dolares',
                'ps.concepto_libre', 'p.codigo', 'p.name', 'br.name as marca',
            ]);

        $metodos = $db->table('payment_method_sale as pms')
            ->join('payment_methods as pm', 'pm.id', '=', 'pms.payment_method_id')
            ->where('pms.sale_id', $venta->id)
            ->pluck('pm.name')
            ->all();

        $enDolares = (float) $venta->total_dolares > 0;
        // La sucursal puede estar configurada para mostrar sus propios datos de
        // contacto, o los del vendedor, en vez de los de la empresa.
        $usaDatosSucursal = (bool) $venta->w_datos;
        $usaDatosVendedor = (bool) $venta->w_datos_vendedor;

        return [
            'id' => (int) $venta->id,
            'documento' => $this->documentoDeVenta($venta),
            // Rótulo del comprobante, igual que en el ERP.
            'tipo' => $venta->boleta_tipo === 'b'
                ? 'Boleta Electrónica'
                : ($venta->boleta_tipo === 'f' ? 'Factura Electrónica' : 'Nota de Venta'),
            'fecha' => $venta->created_at,
            'moneda' => $enDolares ? 'd' : 's',
            'tipo_de_cambio' => (float) $venta->tipo_de_cambio,
            'anulada' => !$venta->estado,
            'observaciones' => $venta->observaciones,
            // El desglose Sub Total/IGV solo aplica a boleta y factura.
            'con_igv' => in_array($venta->boleta_tipo, ['b', 'f'], true),
            'igv' => (float) ($empresa->igv ?? 0.18),
            'condicion_pago' => implode(', ', $metodos),
            'vendedor' => $venta->vendedor ?: $venta->usuario,
            'sucursal' => $venta->sucursal,
            'comentarios_sucursal' => $usaDatosSucursal ? $venta->w_comentarios : null,
            'empresa' => [
                'razon_social' => $empresa->razon_social ?? null,
                'ruc' => $empresa->ruc ?? null,
                'logo' => $this->logoBase64($empresa->logo ?? null),
                'direccion' => ($usaDatosSucursal ? $venta->w_direccion : null) ?: ($empresa->direccion ?? null),
                'telefono' => ($usaDatosVendedor ? ($venta->vendedor_telefono ?: $venta->usuario_telefono) : null)
                    ?: (($usaDatosSucursal ? $venta->w_telefono : null) ?: ($empresa->telefono ?? null)),
                'email' => ($usaDatosVendedor ? ($venta->vendedor_email ?: $venta->usuario_email) : null)
                    ?: (($usaDatosSucursal ? $venta->w_email : null) ?: ($empresa->email ?? null)),
                'web' => ($usaDatosSucursal ? $venta->w_web : null) ?: ($empresa->web ?? null),
            ],
            'cliente' => [
                'documento' => $venta->dni_ruc ?: null,
                'nombre' => trim($venta->razon_social ?: trim($venta->c_name . ' ' . $venta->c_last_name)),
                'direccion' => $venta->c_direccion ?: null,
            ],
            'productos' => $productos->map(fn ($d) => [
                'codigo' => $d->codigo,
                'nombre' => $d->name ?: $d->concepto_libre,
                'marca' => $d->marca,
                'cantidad' => (float) $d->cantidad,
                'precio' => (float) $d->precio,
                'descuento' => (float) $d->monto_dto,
                'subtotal' => (float) $d->subtotal_con_dto,
                'moneda' => $d->dolares ? 'd' : 's',
            ])->values()->all(),
        ];
    }

    /**
     * Logo de la empresa como data URI: dompdf no puede pedirlo por HTTP y el
     * archivo vive en el storage del ERP, no en el de la tienda.
     */
    private function logoBase64(?string $ruta): ?string
    {
        if (!$ruta) {
            return null;
        }

        // En la BD el logo viene con el prefijo "/storage/" ya incluido; el
        // archivo está en el disco `public` del ERP.
        $relativa = ltrim(str_replace('/storage/', '', $ruta), '/');
        $contenido = false;

        // Si el ERP está en el mismo servidor se lee del disco, que es más
        // confiable que pedirlo por HTTP.
        $carpeta = rtrim((string) env('PATH_7POWER_STORAGE'), '/\\');
        if ($carpeta && is_readable($carpeta . '/' . $relativa)) {
            $contenido = file_get_contents($carpeta . '/' . $relativa);
        }

        if (!$contenido) {
            $base = rtrim(str_replace('/api', '', (string) env('API_7POWER_URL')), '/');
            // Si el ERP no responde no se corta la emisión del comprobante:
            // sale sin logo.
            $contexto = stream_context_create(['http' => ['timeout' => 3]]);

            try {
                $contenido = @file_get_contents($base . '/storage/' . $relativa, false, $contexto);
            } catch (\Throwable $e) {
                $contenido = false;
            }
        }

        if (!$contenido) {
            return null;
        }

        $extension = strtolower(pathinfo($ruta, PATHINFO_EXTENSION)) ?: 'png';

        return 'data:image/' . ($extension === 'jpg' ? 'jpeg' : $extension)
            . ';base64,' . base64_encode($contenido);
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
