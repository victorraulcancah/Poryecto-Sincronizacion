<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kardex de Producto</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 10px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
        th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>KARDEX DE PRODUCTO</h2>
        @if($producto)
        <p><strong>{{ $producto->nombre }}</strong></p>
        <p>Código: {{ $producto->codigo_producto }}</p>
        @endif
    </div>

    @if($fecha_inicio && $fecha_fin)
    <div class="info">
        <p><strong>Período:</strong> {{ $fecha_inicio }} al {{ $fecha_fin }}</p>
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Tipo Mov</th>
                <th>Operación</th>
                <th>Documento</th>
                <th class="text-right">Cant</th>
                <th class="text-right">Costo Unit</th>
                <th class="text-right">Costo Total</th>
                <th class="text-right">Stock Ant</th>
                <th class="text-right">Stock Act</th>
                <th class="text-right">Costo Prom</th>
            </tr>
        </thead>
        <tbody>
            @foreach($kardex as $k)
            <tr>
                <td>{{ $k->fecha }}</td>
                <td>{{ $k->tipo_movimiento }}</td>
                <td>{{ $k->tipo_operacion }}</td>
                <td>{{ $k->documento_numero }}</td>
                <td class="text-right">{{ $k->cantidad }}</td>
                <td class="text-right">{{ number_format($k->costo_unitario, 2) }}</td>
                <td class="text-right">{{ number_format($k->costo_total, 2) }}</td>
                <td class="text-right">{{ $k->stock_anterior }}</td>
                <td class="text-right">{{ $k->stock_actual }}</td>
                <td class="text-right">{{ number_format($k->costo_promedio, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
