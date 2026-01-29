<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $tipo_documento }} Electrónica</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
        }
        .info-box {
            background-color: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #555;
        }
        .value {
            color: #333;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            color: #777;
            font-size: 12px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
        }
        .alert {
            padding: 12px;
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tipo_documento }} Electrónica</h1>
        <p style="margin: 0; font-size: 18px;">{{ $numero_completo }}</p>
    </div>

    <div class="content">
        <p>Estimado(a) <strong>{{ $comprobante->cliente_razon_social }}</strong>,</p>

        @if($mensaje_personalizado)
        <div class="alert">
            {{ $mensaje_personalizado }}
        </div>
        @endif

        <p>Adjunto encontrará su {{ strtolower($tipo_documento) }} electrónica en formato PDF y XML.</p>

        <div class="info-box">
            <h3 style="margin-top: 0; color: #4CAF50;">Información del Comprobante</h3>

            <div class="info-row">
                <span class="label">Tipo:</span>
                <span class="value">{{ $tipo_documento }}</span>
            </div>

            <div class="info-row">
                <span class="label">Número:</span>
                <span class="value">{{ $numero_completo }}</span>
            </div>

            <div class="info-row">
                <span class="label">Fecha de Emisión:</span>
                <span class="value">{{ \Carbon\Carbon::parse($comprobante->fecha_emision)->format('d/m/Y') }}</span>
            </div>

            <div class="info-row">
                <span class="label">Cliente:</span>
                <span class="value">{{ $comprobante->cliente_razon_social }}</span>
            </div>

            <div class="info-row">
                <span class="label">{{ $comprobante->cliente_tipo_documento === '6' ? 'RUC' : 'DNI' }}:</span>
                <span class="value">{{ $comprobante->cliente_numero_documento }}</span>
            </div>

            <div class="info-row">
                <span class="label">Moneda:</span>
                <span class="value">{{ $comprobante->moneda === 'PEN' ? 'Soles' : $comprobante->moneda }}</span>
            </div>

            <div class="info-row">
                <span class="label">Subtotal:</span>
                <span class="value">S/ {{ number_format($comprobante->operacion_gravada, 2) }}</span>
            </div>

            <div class="info-row">
                <span class="label">IGV (18%):</span>
                <span class="value">S/ {{ number_format($comprobante->total_igv, 2) }}</span>
            </div>

            <div class="info-row" style="font-size: 18px; font-weight: bold; color: #4CAF50;">
                <span class="label">TOTAL:</span>
                <span class="value">S/ {{ number_format($comprobante->importe_total, 2) }}</span>
            </div>
        </div>

        @if($comprobante->estado === 'ACEPTADO')
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 15px 0;">
            <strong style="color: #155724;">✓ Comprobante aceptado por SUNAT</strong>
        </div>
        @endif

        @if($comprobante->observaciones)
        <div class="info-box">
            <h4 style="margin-top: 0;">Observaciones:</h4>
            <p>{{ $comprobante->observaciones }}</p>
        </div>
        @endif

        <p style="margin-top: 20px;">Si tiene alguna consulta sobre este comprobante, no dude en contactarnos.</p>

        <p style="margin-top: 30px;">
            Saludos cordiales,<br>
            <strong>{{ config('app.name', 'Equipo de Facturación') }}</strong>
        </p>
    </div>

    <div class="footer">
        <p>Este es un correo electrónico automático, por favor no responda a este mensaje.</p>
        <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.</p>
    </div>
</body>
</html>
