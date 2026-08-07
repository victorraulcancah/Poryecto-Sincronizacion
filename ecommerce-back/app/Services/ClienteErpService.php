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
}
