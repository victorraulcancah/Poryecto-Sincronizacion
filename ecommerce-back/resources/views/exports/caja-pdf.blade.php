<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reporte de Caja</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .totales { margin-top: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>REPORTE DE CAJA</h2>
        <p>{{ $movimiento->caja->nombre }}</p>
    </div>

    <div class="info">
        <p><strong>Fecha:</strong> {{ $movimiento->fecha }}</p>
        <p><strong>Usuario:</strong> {{ $movimiento->user->name }}</p>
        <p><strong>Monto Inicial:</strong> S/ {{ number_format($movimiento->monto_inicial, 2) }}</p>
    </div>

    <h3>Transacciones</h3>
    <table>
        <thead>
            <tr>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Método Pago</th>
                <th class="text-right">Monto</th>
            </tr>
        </thead>
        <tbody>
            @foreach($movimiento->transacciones as $trans)
            <tr>
                <td>{{ $trans->tipo }}</td>
                <td>{{ $trans->categoria }}</td>
                <td>{{ $trans->descripcion }}</td>
                <td>{{ $trans->metodo_pago }}</td>
                <td class="text-right">S/ {{ number_format($trans->monto, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totales">
        <p>Total Ingresos: S/ {{ number_format($ingresos, 2) }}</p>
        <p>Total Egresos: S/ {{ number_format($egresos, 2) }}</p>
        <p>Monto Sistema: S/ {{ number_format($monto_sistema, 2) }}</p>
        <p>Monto Final: S/ {{ number_format($movimiento->monto_final, 2) }}</p>
        @if($movimiento->diferencia != 0)
        <p style="color: red;">Diferencia: S/ {{ number_format($movimiento->diferencia, 2) }}</p>
        @endif
    </div>
</body>
</html>
