<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización - {{ $numero_cotizacion }}</title>
    <style>
        /* Red Theme matching the Web App Brand */
        :root {
            --primary-color: #c22026;
            --primary-dark: #a01a1f;
            --primary-light: #fff5f5;
            --text-heading: #121535;
            --text-body: #4b5563;
            --border-color: #f3f4f6;
        }

        @page {
            margin: 0;
            size: A4;
        }
        
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 35px;
            color: #374151;
            font-size: 10px;
            line-height: 1.5;
            background-color: #fff;
        }
        
        /* Header */
        .header {
            display: table;
            width: 100%;
            margin-bottom: 35px;
        }
        
        .header-left {
            display: table-cell;
            width: 60%;
            vertical-align: middle;
        }
        
        .header-right {
            display: table-cell;
            width: 40%;
            vertical-align: middle;
            text-align: right;
        }
        
        .logo {
            max-width: 160px;
            margin-bottom: 12px;
        }
        
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #c22026;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .company-info {
            font-size: 8.5px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .order-badge {
            background-color: #fff5f5;
            padding: 20px;
            border-radius: 16px;
            border: 2px solid #c22026;
            display: inline-block;
            text-align: center;
            min-width: 200px;
        }
        
        .order-title {
            color: #c22026;
            font-size: 11px;
            font-weight: 800;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .order-number {
            font-size: 16px;
            font-weight: 800;
            color: #121535;
            margin-bottom: 6px;
        }
        
        .status-pill {
            background-color: #c22026;
            color: white;
            padding: 4px 14px;
            border-radius: 25px;
            font-size: 9px;
            font-weight: bold;
            display: inline-block;
            text-transform: uppercase;
        }
        
        /* Grid Sections */
        .details-grid {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: separate;
            border-spacing: 15px 0;
            margin-left: -15px;
            margin-right: -15px;
        }
        
        .details-cell {
            width: 50%;
            vertical-align: top;
        }
        
        .card {
            border: 1px solid #f3f4f6;
            border-radius: 14px;
            padding: 18px;
            background-color: #fdfdfd;
        }
        
        .card-title {
            font-size: 10px;
            font-weight: 800;
            color: #c22026;
            margin-bottom: 12px;
            border-bottom: 2px solid #fff5f5;
            padding-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-row {
            margin-bottom: 6px;
        }
        
        .label {
            font-weight: bold;
            color: #1f2937;
            width: 85px;
            display: inline-block;
        }
        
        /* Table */
        .table-container {
            margin-bottom: 35px;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            overflow: hidden;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th {
            background-color: #c22026;
            color: white;
            text-align: left;
            padding: 12px;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .table td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 9px;
            color: #374151;
        }
        
        .table tr:nth-child(even) {
            background-color: #fffafb;
        }
        
        .table tr:last-child td {
            border-bottom: none;
        }
        
        /* Totals */
        .totals-section {
            width: 100%;
        }
        
        .totals-table {
            width: 240px;
            float: right;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 8px 12px;
            font-size: 10px;
        }
        
        .total-row {
            background-color: #c22026;
            color: white;
            font-weight: bold;
            font-size: 13px;
        }
        
        .total-row td {
            padding: 12px;
        }
        
        .footer {
            position: absolute;
            bottom: 40px;
            left: 35px;
            right: 35px;
            text-align: center;
            font-size: 8.5px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            padding-top: 20px;
        }
        
        .clear { clear: both; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            @if($logo_base64)
                <img src="{{ $logo_base64 }}" alt="Logo" class="logo">
            @else
                <div class="company-name">{{ $empresa->nombre_empresa }}</div>
            @endif
            <div class="company-info">
                <strong>RUC:</strong> {{ $empresa->ruc }} | 
                <strong>Dirección:</strong> {{ $empresa->direccion }}<br>
                <strong>Teléfono:</strong> {{ $empresa->telefono }} | 
                <strong>Email:</strong> {{ $empresa->email }}
            </div>
        </div>
        <div class="header-right">
            <div class="order-badge">
                <div class="order-title">Cotización de Venta</div>
                <div class="order-number">{{ $numero_cotizacion }}</div>
                <div style="font-size: 9.5px; margin-bottom: 10px; color: #4b5563;">{{ $fecha }}</div>
                <div class="status-pill">VÁLIDA POR 30 DÍAS</div>
            </div>
        </div>
    </div>

    <table class="details-grid">
        <tr>
            <td class="details-cell">
                <div class="card">
                    <div class="card-title">Información del Cliente</div>
                    <div class="info-row"><span class="label">Cliente:</span> {{ $cliente }}</div>
                    <div class="info-row"><span class="label">Email:</span> {{ $email }}</div>
                    <div class="info-row"><span class="label">Teléfono:</span> {{ $telefono }}</div>
                    <div class="info-row"><span class="label">Ubicación:</span> {{ $departamento }}, {{ $provincia }}, {{ $distrito }}</div>
                </div>
            </td>
            <td class="details-cell">
                <div class="card">
                    <div class="card-title">Condiciones Comerciales</div>
                    <div class="info-row"><span class="label">Forma Envío:</span> {{ strtoupper($forma_envio) }}</div>
                    <div class="info-row"><span class="label">Método Pago:</span> {{ strtoupper($tipo_pago) }}</div>
                    <div class="info-row"><span class="label">Precios:</span> INCLUYE I.G.V. (18%)</div>
                    <div class="info-row"><span class="label">Garantía:</span> 12 MESES</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="table-container">
        <table class="table">
            <thead>
                <tr>
                    <th style="width: 12%">SKU / COD</th>
                    <th style="width: 48%">DESCRIPCIÓN DEL PRODUCTO</th>
                    <th style="width: 10%; text-align: center">CANT.</th>
                    <th style="width: 15%; text-align: right">P. UNIT</th>
                    <th style="width: 15%; text-align: right">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                @foreach($productos as $producto)
                    @php
                        $sim = ($producto['moneda'] ?? $moneda ?? 's') === 'd' ? 'US$' : 'S/';
                    @endphp
                    <tr>
                        <td style="font-weight: bold; color: #111827;">{{ $producto['id'] ?? 'N/A' }}</td>
                        <td>{{ $producto['nombre'] }}</td>
                        <td style="text-align: center; font-weight: bold;">{{ $producto['cantidad'] }}</td>
                        <td style="text-align: right">{{ $sim }} {{ number_format($producto['precio'], 2) }}</td>
                        <td style="text-align: right; font-weight: bold; color: #111827;">{{ $sim }} {{ number_format($producto['precio'] * $producto['cantidad'], 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="totals-section">
        <table class="totals-table">
            <tr>
                <td style="color: #6b7280; font-weight: 500;">Subtotal:</td>
                <td style="text-align: right; font-weight: bold; color: #111827;">{{ $simbolo_moneda }} {{ number_format($subtotal, 2) }}</td>
            </tr>
            <tr>
                <td style="color: #6b7280; font-weight: 500;">IGV (18%):</td>
                <td style="text-align: right; font-weight: bold; color: #111827;">{{ $simbolo_moneda }} {{ number_format($igv, 2) }}</td>
            </tr>
            @if(($costo_envio ?? 0) > 0)
            <tr>
                <td style="color: #6b7280; font-weight: 500;">Envío:</td>
                <td style="text-align: right; font-weight: bold; color: #111827;">{{ $simbolo_moneda }} {{ number_format($costo_envio, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td style="border-radius: 8px 0 0 8px;">TOTAL COTIZADO:</td>
                <td style="text-align: right; border-radius: 0 8px 8px 0;">{{ $simbolo_moneda }} {{ number_format($total, 2) }}</td>
            </tr>
        </table>
        <div class="clear"></div>
    </div>

    @if($observaciones)
    <div style="margin-top: 25px;">
        <div style="font-weight: 800; color: #c22026; font-size: 9px; margin-bottom: 6px; text-transform: uppercase;">Observaciones:</div>
        <div style="font-size: 8.5px; color: #4b5563; background: #fff5f5; padding: 15px; border-radius: 12px; border: 1px solid #fee2e2; line-height: 1.6;">
            {{ $observaciones }}
        </div>
    </div>
    @endif

    <div class="footer">
        <div style="margin-bottom: 4px;">Gracias por confiar en <strong>{{ $empresa->nombre_empresa }}</strong>.</div>
        <div>Esta cotización tiene una validez de 30 días calendario.</div>
        <div style="margin-top: 8px; font-weight: bold; color: #4b5563;">Documento generado el {{ date('d/m/Y H:i:s') }}</div>
    </div>
</body>
</html>