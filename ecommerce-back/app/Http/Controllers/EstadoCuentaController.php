<?php

namespace App\Http\Controllers;

use App\Models\UserCliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Datos del estado de cuenta que el endpoint público del ERP no devuelve.
 *
 * El listado de movimientos lo pide el front directo a 7Power; acá solo se
 * completa lo que falta leyendo la base del ERP por la conexión
 * `mysql_7power` (solo lectura, sin modificar nada del ERP).
 */
class EstadoCuentaController extends Controller
{
    /**
     * Documentos de venta a los que se aplicó cada pago del cliente.
     *
     * Respuesta: { "132": ["V001-3929", "V001-3930"], "160": ["V001-3997"] }
     * donde la clave es el id del PaymentSeller en el ERP.
     *
     * Un pago puede repartirse entre cuotas de varias ventas, por eso es una
     * lista; un pago que solo dejó saldo a favor no aparece en el mapa.
     */
    public function documentosDePagos(): JsonResponse
    {
        $cliente = $this->clienteAutenticado();
        if (! $cliente || ! $cliente->codigo_erp) {
            return response()->json([]);
        }

        // El código de cliente no es único globalmente (se genera por empresa);
        // el e-commerce corresponde a la empresa 1.
        $clientId = DB::connection('mysql_7power')->table('clients')
            ->where('codigo', $cliente->codigo_erp)
            ->where('company_id', 1)
            ->value('id');

        if (! $clientId) {
            return response()->json([]);
        }

        // El pago no apunta a la venta: se llega por
        // fee_payment_sellers -> installments -> payment_method_sale -> sales.
        $filas = DB::connection('mysql_7power')->table('fee_payment_sellers as fps')
            ->join('payment_sellers as ps', 'ps.id', '=', 'fps.payment_seller_id')
            ->join('installments as i', 'i.id', '=', 'fps.installment_id')
            ->join('payment_method_sale as pms', 'pms.id', '=', 'i.payment_method_sale_id')
            ->join('sales as s', 's.id', '=', 'pms.sale_id')
            ->leftJoin('boletas as b', 'b.sale_id', '=', 's.id')
            ->where('ps.client_id', $clientId)
            ->where('ps.estado', 1)
            ->where('fps.estado', 1)
            ->whereNull('fps.deleted_at')
            ->orderBy('s.id')
            ->get([
                'fps.payment_seller_id as pago_id',
                's.nro_documento',
                'b.tipo as boleta_tipo',
                'b.serie as boleta_serie',
                'b.numero as boleta_numero',
            ]);

        $mapa = [];
        foreach ($filas as $fila) {
            $documento = $this->formatearDocumento($fila);
            if (! $documento) {
                continue;
            }
            $pagoId = (string) $fila->pago_id;
            if (! in_array($documento, $mapa[$pagoId] ?? [], true)) {
                $mapa[$pagoId][] = $documento;
            }
        }

        return response()->json($mapa);
    }

    /**
     * Nombre visible del documento: la boleta/factura si la venta la tiene
     * ("BOL001-0123"), y si no el correlativo interno ("V001-5876"). Es el
     * mismo formato que ya arma el front para las filas de venta.
     */
    private function formatearDocumento(object $fila): ?string
    {
        if ($fila->boleta_tipo !== null) {
            return strtoupper($fila->boleta_tipo)
                .str_pad((string) ($fila->boleta_serie ?? '1'), 3, '0', STR_PAD_LEFT)
                .'-'.str_pad((string) ($fila->boleta_numero ?? '0'), 4, '0', STR_PAD_LEFT);
        }

        if ($fila->nro_documento === null) {
            return null;
        }

        return 'V001-'.str_pad((string) $fila->nro_documento, 4, '0', STR_PAD_LEFT);
    }

    private function clienteAutenticado(): ?UserCliente
    {
        $user = auth('sanctum')->user();

        return $user instanceof UserCliente ? $user : null;
    }
}
