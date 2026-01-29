<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cuentas por Cobrar</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .totales { margin-top: 20px; font-weight: bold; text-align: right; }
        .vencida { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h2>CUENTAS POR COBRAR</h2>
        <p>Fecha: {{ now()->format('d/m/Y') }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>F. Emisión</th>
                <th>F. Vencimiento</th>
                <th class="text-right">Monto Total</th>
                <th class="text-right">Pagado</th>
                <th class="text-right">Saldo</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($cuentas as $cuenta)
            <tr class="{{ $cuenta->dias_vencidos > 0 ? 'vencida' : '' }}">
                <td>{{ $cuenta->cliente->razon_social ?? $cuenta->cliente->nombre_completo }}</td>
                <td>{{ $cuenta->numero_documento }}</td>
                <td>{{ $cuenta->fecha_emision->format('d/m/Y') }}</td>
                <td>{{ $cuenta->fecha_vencimiento->format('d/m/Y') }}</td>
                <td class="text-right">S/ {{ number_format($cuenta->monto_total, 2) }}</td>
                <td class="text-right">S/ {{ number_format($cuenta->monto_pagado, 2) }}</td>
                <td class="text-right">S/ {{ number_format($cuenta->saldo_pendiente, 2) }}</td>
                <td>{{ $cuenta->estado }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totales">
        <p>TOTAL PENDIENTE: S/ {{ number_format($total_pendiente, 2) }}</p>
    </div>
</body>
</html>
