<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nota de Débito {{ $nota->serie }}-{{ $nota->numero }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header h2 { font-size: 18px; color: #00c; margin-bottom: 10px; }
        .info-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
        .info-row { display: flex; margin-bottom: 5px; }
        .info-label { font-weight: bold; width: 150px; }
        .info-value { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .text-right { text-align: right; }
        .totales { margin-top: 20px; float: right; width: 300px; }
        .totales table { width: 100%; }
        .footer { margin-top: 50px; font-size: 10px; color: #666; text-align: center; clear: both; }
        .estado { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .estado-aceptado { background-color: #d4edda; color: #155724; }
        .estado-pendiente { background-color: #fff3cd; color: #856404; }
        .estado-rechazado { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $empresa['razon_social'] }}</h1>
        <p>RUC: {{ $empresa['ruc'] }}</p>
        <p>{{ $empresa['direccion'] }}</p>
        <h2>NOTA DE DÉBITO ELECTRÓNICA</h2>
        <h2>{{ $nota->serie }}-{{ $nota->numero }}</h2>
    </div>

    <div class="info-box">
        <div class="info-row">
            <div class="info-label">Fecha de Emisión:</div>
            <div class="info-value">{{ \Carbon\Carbon::parse($nota->fecha_emision)->format('d/m/Y') }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Estado:</div>
            <div class="info-value">
                <span class="estado estado-{{ $nota->estado }}">{{ strtoupper($nota->estado) }}</span>
            </div>
        </div>
        <div class="info-row">
            <div class="info-label">Comprobante Afectado:</div>
            <div class="info-value">{{ $nota->serie_comprobante_ref }}-{{ $nota->numero_comprobante_ref }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Motivo:</div>
            <div class="info-value">{{ $nota->motivo }}</div>
        </div>
    </div>

    <div class="info-box">
        <h3 style="margin-bottom: 10px;">DATOS DEL CLIENTE</h3>
        <div class="info-row">
            <div class="info-label">Razón Social:</div>
            <div class="info-value">{{ $cliente->razon_social }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">{{ $cliente->tipo_documento == '6' ? 'RUC' : 'DNI' }}:</div>
            <div class="info-value">{{ $cliente->numero_documento }}</div>
        </div>
        @if($cliente->direccion)
        <div class="info-row">
            <div class="info-label">Dirección:</div>
            <div class="info-value">{{ $cliente->direccion }}</div>
        </div>
        @endif
    </div>

    <div class="totales">
        <table>
            <tr>
                <td><strong>Subtotal:</strong></td>
                <td class="text-right">{{ $nota->moneda }} {{ number_format($nota->subtotal, 2) }}</td>
            </tr>
            <tr>
                <td><strong>IGV (18%):</strong></td>
                <td class="text-right">{{ $nota->moneda }} {{ number_format($nota->igv, 2) }}</td>
            </tr>
            <tr style="background-color: #f2f2f2;">
                <td><strong>TOTAL:</strong></td>
                <td class="text-right"><strong>{{ $nota->moneda }} {{ number_format($nota->total, 2) }}</strong></td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <p>Documento generado electrónicamente</p>
        @if($nota->hash)
        <p>Hash: {{ $nota->hash }}</p>
        @endif
        @if($nota->mensaje_sunat)
        <p>{{ $nota->mensaje_sunat }}</p>
        @endif
    </div>
</body>
</html>
