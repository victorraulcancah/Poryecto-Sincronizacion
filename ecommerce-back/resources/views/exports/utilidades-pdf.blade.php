<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reporte de Utilidades</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .resumen { margin-top: 20px; padding: 15px; background-color: #f9f9f9; }
        .resumen p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>REPORTE DE UTILIDADES</h2>
        <p>Período: {{ $fecha_inicio }} al {{ $fecha_fin }}</p>
    </div>

    <h3>Ventas</h3>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Número</th>
                <th>Cliente</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($ventas as $venta)
            <tr>
                <td>{{ $venta->created_at->format('d/m/Y') }}</td>
                <td>{{ $venta->numero_venta ?? 'V-' . $venta->id }}</td>
                <td>{{ $venta->cliente->nombre_completo ?? 'CLIENTE GENERAL' }}</td>
                <td class="text-right">S/ {{ number_format($venta->total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h3>Gastos Operativos</h3>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Concepto</th>
                <th class="text-right">Monto</th>
            </tr>
        </thead>
        <tbody>
            @foreach($gastos as $gasto)
            <tr>
                <td>{{ $gasto->fecha }}</td>
                <td>{{ $gasto->categoria }}</td>
                <td>{{ $gasto->concepto }}</td>
                <td class="text-right">S/ {{ number_format($gasto->monto, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="resumen">
        <h3>RESUMEN</h3>
        <p><strong>Total Ventas:</strong> S/ {{ number_format($total_ventas, 2) }}</p>
        <p><strong>Total Gastos:</strong> S/ {{ number_format($total_gastos, 2) }}</p>
        <p><strong>Utilidad:</strong> S/ {{ number_format($total_ventas - $total_gastos, 2) }}</p>
    </div>
</body>
</html>
