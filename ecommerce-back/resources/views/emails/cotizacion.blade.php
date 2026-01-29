<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización - {{ $numero_cotizacion }}</title>
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
            text-align: center;
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 120px;
            max-height: 60px;
            margin-bottom: 15px;
        }
        .empresa-nombre {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .cotizacion-numero {
            font-size: 18px;
            color: #e74c3c;
            font-weight: bold;
        }
        .content {
            background-color: #ffffff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .info-row {
            margin-bottom: 8px;
        }
        .label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 120px;
        }
        .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .productos-table th {
            background-color: #ecf0f1;
            padding: 12px;
            text-align: left;
            border: 1px solid #bdc3c7;
            font-weight: bold;
            color: #2c3e50;
        }
        .productos-table td {
            padding: 10px;
            border: 1px solid #bdc3c7;
        }
        .totales {
            text-align: right;
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .total-row {
            margin: 8px 0;
            font-size: 14px;
        }
        .total-final {
            font-size: 18px;
            font-weight: bold;
            color: #e74c3c;
            border-top: 2px solid #bdc3c7;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: #34495e;
            color: #ffffff;
            border-radius: 8px;
        }
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
        .observaciones {
            background-color: #e8f4fd;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
            border-radius: 5px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
            font-weight: bold;
        }
        .btn:hover {
            background-color: #2980b9;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        @if($empresa->logo)
            <img src="{{ asset('storage/' . $empresa->logo) }}" alt="Logo" class="logo">
        @endif
        <div class="empresa-nombre">{{ $empresa->nombre_empresa }}</div>
        <div class="cotizacion-numero">{{ $numero_cotizacion }}</div>
    </div>

    <!-- Contenido principal -->
    <div class="content">
        <p>Estimado/a <strong>{{ $cliente }}</strong>,</p>
        
        <p>Hemos generado su cotización según los productos seleccionados. A continuación encontrará todos los detalles:</p>

        <!-- Información del cliente -->
        <div class="section">
            <div class="section-title">📋 Datos del Cliente</div>
            <div class="info-row">
                <span class="label">Nombre:</span>
                <span>{{ $cliente }}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span>{{ $email }}</span>
            </div>
            <div class="info-row">
                <span class="label">Teléfono:</span>
                <span>{{ $telefono }}</span>
            </div>
            <div class="info-row">
                <span class="label">Dirección:</span>
                <span>{{ $direccion }}</span>
            </div>
            <div class="info-row">
                <span class="label">Ubicación:</span>
                <span>{{ $departamento }}, {{ $provincia }}, {{ $distrito }}</span>
            </div>
        </div>

        <!-- Detalles de la cotización -->
        <div class="section">
            <div class="section-title">📄 Detalles de la Cotización</div>
            <div class="info-row">
                <span class="label">Número:</span>
                <span>{{ $numero_cotizacion }}</span>
            </div>
            <div class="info-row">
                <span class="label">Fecha:</span>
                <span>{{ $fecha }}</span>
            </div>
            <div class="info-row">
                <span class="label">Forma de Envío:</span>
                <span>
                    @switch($forma_envio)
                        @case('delivery')
                            🚚 Delivery en Lima
                            @break
                        @case('envio_provincia')
                            📦 Envío a Provincia
                            @break
                        @case('recojo_tienda')
                            🏪 Recojo en Tienda
                            @break
                        @default
                            {{ $forma_envio }}
                    @endswitch
                </span>
            </div>
            <div class="info-row">
                <span class="label">Tipo de Pago:</span>
                <span>
                    @switch($tipo_pago)
                        @case('efectivo')
                            💰 Efectivo
                            @break
                        @case('tarjeta')
                            💳 Tarjeta de crédito/débito
                            @break
                        @case('transferencia')
                            🏦 Transferencia bancaria
                            @break
                        @case('yape')
                            📱 Yape
                            @break
                        @case('plin')
                            📱 Plin
                            @break
                        @default
                            {{ $tipo_pago }}
                    @endswitch
                </span>
            </div>
        </div>

        <!-- Productos -->
        <div class="section">
            <div class="section-title">🛍️ Productos Cotizados</div>
            <table class="productos-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($productos as $producto)
                        <tr>
                            <td>{{ $producto['nombre'] }}</td>
                            <td>{{ $producto['cantidad'] }}</td>
                            <td>S/ {{ number_format($producto['precio'], 2) }}</td>
                            <td>S/ {{ number_format($producto['precio'] * $producto['cantidad'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Observaciones -->
        @if($observaciones)
            <div class="observaciones">
                <strong>📝 Observaciones:</strong><br>
                {{ $observaciones }}
            </div>
        @endif

        <!-- Totales -->
        <div class="totales">
            <div class="total-row">
                <strong>Subtotal:</strong> S/ {{ number_format($total - ($total * 0.18), 2) }}
            </div>
            <div class="total-row">
                <strong>IGV (18%):</strong> S/ {{ number_format($total * 0.18, 2) }}
            </div>
            <div class="total-row total-final">
                <strong>TOTAL:</strong> S/ {{ number_format($total, 2) }}
            </div>
        </div>

        <!-- Información adicional -->
        <div class="section">
            <div class="section-title">ℹ️ Información Importante</div>
            <ul>
                <li>Esta cotización es válida por <strong>30 días</strong> desde su emisión.</li>
                <li>Para confirmar su pedido, contáctenos a través de los medios indicados.</li>
                <li>Los precios incluyen IGV.</li>
                <li>El costo de envío ya está incluido en el total.</li>
            </ul>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p><strong>{{ $empresa->nombre_empresa }}</strong></p>
        <p>📞 <strong>Contacto:</strong></p>
        <p>
            @if($empresa->telefono)📱 Tel: {{ $empresa->telefono }}@endif
            @if($empresa->celular) | 📱 Cel: {{ $empresa->celular }}@endif
            @if($empresa->email) | 📧 Email: {{ $empresa->email }}@endif
        </p>
        @if($empresa->whatsapp)
            <p>💬 WhatsApp: {{ $empresa->whatsapp }}</p>
        @endif
        @if($empresa->website)
            <p>🌐 <a href="{{ $empresa->website }}" target="_blank">{{ $empresa->website }}</a></p>
        @endif
        @if($empresa->direccion)
            <p>📍 {{ $empresa->direccion }}</p>
        @endif
        
        <p style="margin-top: 20px; font-size: 12px; color: #bdc3c7;">
            Este es un email automático, por favor no responda a este mensaje.
        </p>
    </div>
</body>
</html>
