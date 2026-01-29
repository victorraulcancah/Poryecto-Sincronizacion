<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización - {{ $numero_cotizacion }}</title>
    <style>
        @page {
            margin: 12px;
            size: A4;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            font-size: 9px;
            line-height: 1.2;
        }
        
        /* Header principal - Usar table para mejor compatibilidad con DomPDF */
        .header-main {
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 12px;
        }
        
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .header-left {
            width: 65%;
            vertical-align: top;
            padding-right: 20px;
        }
        
        .header-right {
            width: 35%;
            vertical-align: top;
            text-align: right;
        }
        
        .company-info {
            display: block;
        }
        
        .company-logo {
            font-size: 20px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .company-subtitle {
            font-size: 9px;
            color: #666;
            margin-bottom: 4px;
            font-style: italic;
        }
        
        .company-details {
            font-size: 7px;
            color: #555;
            line-height: 1.1;
        }
        
        .company-details div {
            margin-bottom: 1px;
        }
        
        .quotation-info {
            border: 2px solid #2c5aa0;
            padding: 8px 12px;
            border-radius: 4px;
            background: #f8f9fa;
            display: inline-block;
            min-width: 140px;
        }
        
        .quotation-title {
            font-size: 12px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 3px;
            text-transform: uppercase;
            text-align: center;
        }
        
        .quotation-number {
            font-size: 10px;
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 3px;
            text-align: center;
        }
        
        .quotation-date {
            font-size: 7px;
            color: #666;
            text-align: center;
        }
        
        /* Logo real */
        .company-logo-img {
            width: 70px;
            height: 50px;
            object-fit: contain;
            margin-bottom: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background: white;
            display: block;
        }
        
        /* Logo placeholder */
        .logo-placeholder {
            width: 70px;
            height: 50px;
            background: linear-gradient(135deg, #2c5aa0 0%, #1e3a8a 100%);
            border-radius: 4px;
            color: white;
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 6px;
            text-align: center;
            line-height: 50px;
            display: block;
        }
        
        /* Secciones principales en 2 columnas */
        .main-sections {
            width: 100%;
            margin-bottom: 12px;
        }
        
        .sections-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .section-left, .section-right {
            width: 50%;
            vertical-align: top;
            padding-right: 5px;
        }
        
        .section-right {
            padding-right: 0;
            padding-left: 5px;
        }
        
        .section {
            border: 1px solid #ddd;
            border-radius: 3px;
            overflow: hidden;
            width: 100%;
        }
        
        .section-header {
            background: linear-gradient(135deg, #2c5aa0 0%, #1e3a8a 100%);
            color: white;
            padding: 6px 8px;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
        }
        
        .section-content {
            padding: 8px;
            background: #f8f9fa;
        }
        
        .info-row {
            margin-bottom: 3px;
        }
        
        .info-label {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 7px;
            display: inline-block;
            width: 60px;
        }
        
        .info-value {
            color: #333;
            font-size: 7px;
        }
        
        .condition-item {
            margin-bottom: 3px;
        }
        
        .condition-label {
            font-weight: bold;
            color: #fd7e14;
            font-size: 7px;
            display: inline-block;
            width: 60px;
        }
        
        .condition-value {
            color: #333;
            font-size: 7px;
        }
        
        /* Productos */
        .products-section {
            margin-bottom: 12px;
        }
        
        .products-header {
            background: linear-gradient(135deg, #2c5aa0 0%, #1e3a8a 100%);
            color: white;
            padding: 6px 8px;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            border-radius: 3px 3px 0 0;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-top: none;
            font-size: 7px;
        }
        
        .products-table th {
            background: #e9ecef;
            color: #2c5aa0;
            padding: 4px 3px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
            font-size: 7px;
        }
        
        .products-table td {
            padding: 3px;
            border: 1px solid #ddd;
            font-size: 7px;
        }
        
        .products-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        /* Totales */
        .totals-section {
            text-align: right;
            margin-bottom: 12px;
            padding: 8px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        
        .total-row {
            margin-bottom: 3px;
            font-size: 8px;
        }
        
        .total-final {
            font-size: 11px;
            font-weight: bold;
            color: #e74c3c;
            border-top: 2px solid #2c5aa0;
            padding-top: 5px;
            margin-top: 5px;
        }
        
        /* Observaciones */
        .observations-section {
            margin-bottom: 12px;
            border: 1px solid #ddd;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .observations-header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 6px 8px;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
        }
        
        .observations-content {
            padding: 8px;
            background: #f8fff9;
            min-height: 20px;
            font-size: 8px;
        }
        
        /* Footer */
        .footer {
            margin-top: 12px;
            text-align: center;
            padding: 12px;
            background: linear-gradient(135deg, #343a40 0%, #495057 100%);
            color: white;
            border-radius: 4px;
        }
        
        .footer-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
            color: #fff;
        }
        
        .footer-contact {
            font-size: 8px;
            line-height: 1.3;
        }
        
        .footer-contact div {
            margin-bottom: 2px;
        }
        
        .validity-notice {
            margin-top: 8px;
            font-size: 7px;
            color: #adb5bd;
            font-style: italic;
        }
    </style>
</head>
<body>
    <!-- Header principal con logo y información de cotización -->
    <div class="header-main">
        <table class="header-table">
            <tr>
                <td class="header-left">
                    <div class="company-info">
                        <!-- Logo de la empresa -->
                        @if($logo_base64)
                            <img src="{{ $logo_base64 }}" alt="Logo" class="company-logo-img">
                        @else
                            <!-- Logo placeholder -->
                            <div class="logo-placeholder">
                                LOGO
                            </div>
                        @endif
                        
                        <div class="company-logo">{{ $empresa->nombre_empresa }}</div>
                        @if($empresa->razon_social)
                            <div class="company-subtitle">{{ $empresa->razon_social }}</div>
                        @endif
                        <div class="company-details">
                            @if($empresa->ruc)
                                <div><strong>RUC:</strong> {{ $empresa->ruc }}</div>
                            @endif
                            @if($empresa->direccion)
                                <div><strong>Dirección:</strong> {{ $empresa->direccion }}</div>
                            @endif
                            @if($empresa->telefono)
                                <div><strong>Teléfono:</strong> {{ $empresa->telefono }}</div>
                            @endif
                            @if($empresa->celular)
                                <div><strong>Celular:</strong> {{ $empresa->celular }}</div>
                            @endif
                            @if($empresa->email)
                                <div><strong>Email:</strong> {{ $empresa->email }}</div>
                            @endif
                            @if($empresa->website)
                                <div><strong>Web:</strong> {{ $empresa->website }}</div>
                            @endif
                        </div>
                    </div>
                </td>
                <td class="header-right">
                    <div class="quotation-info">
                        <div class="quotation-title">COTIZACIÓN</div>
                        <div class="quotation-number">{{ $numero_cotizacion }}</div>
                        <div class="quotation-date">{{ $fecha }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Secciones principales en 2 columnas -->
    <div class="main-sections">
        <table class="sections-table">
            <tr>
                <td class="section-left">
                    <!-- Datos del cliente -->
                    <div class="section">
                        <div class="section-header">DATOS DEL CLIENTE</div>
                        <div class="section-content">
                            <div class="info-row">
                                <span class="info-label">Nombre:</span>
                                <span class="info-value">{{ $cliente }}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Email:</span>
                                <span class="info-value">{{ $email }}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Teléfono:</span>
                                <span class="info-value">{{ $telefono }}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Dirección:</span>
                                <span class="info-value">{{ $direccion }}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Ubicación:</span>
                                <span class="info-value">{{ $departamento }}, {{ $provincia }}, {{ $distrito }}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="section-right">
                    <!-- Condiciones generales -->
                    <div class="section">
                        <div class="section-header">CONDICIONES GENERALES</div>
                        <div class="section-content">
                            <div class="condition-item">
                                <span class="condition-label">Precios:</span>
                                <span class="condition-value">INCLUYE I.G.V. 18%</span>
                            </div>
                            <div class="condition-item">
                                <span class="condition-label">Validez:</span>
                                <span class="condition-value">30 días</span>
                            </div>
                            <div class="condition-item">
                                <span class="condition-label">Entrega:</span>
                                <span class="condition-value">
                                    @switch($forma_envio)
                                        @case('delivery')
                                            Inmediata (Lima)
                                            @break
                                        @case('envio_provincia')
                                            2-3 días hábiles
                                            @break
                                        @case('recojo_tienda')
                                            Inmediata
                                            @break
                                        @default
                                            {{ $forma_envio }}
                                    @endswitch
                                </span>
                            </div>
                            <div class="condition-item">
                                <span class="condition-label">Pago:</span>
                                <span class="condition-value">
                                    @switch($tipo_pago)
                                        @case('efectivo')
                                            CONTADO
                                            @break
                                        @case('tarjeta')
                                            TARJETA
                                            @break
                                        @case('transferencia')
                                            TRANSFERENCIA
                                            @break
                                        @case('yape')
                                            YAPE
                                            @break
                                        @case('plin')
                                            PLIN
                                            @break
                                        @default
                                            {{ $tipo_pago }}
                                    @endswitch
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Productos cotizados -->
    <div class="products-section">
        <div class="products-header">PRODUCTOS COTIZADOS</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 4%;">IT</th>
                    <th style="width: 12%;">CÓDIGO</th>
                    <th style="width: 8%;">CANT.</th>
                    <th style="width: 6%;">UNI</th>
                    <th style="width: 40%;">NOMBRE O DESCRIPCIÓN</th>
                    <th style="width: 10%;">GARANTÍA</th>
                    <th style="width: 10%;">PRECIO UNIT.</th>
                    <th style="width: 10%;">PRECIO TOTAL</th>
                </tr>
            </thead>
            <tbody>
                @foreach($productos as $index => $producto)
                    <tr>
                        <td style="text-align: center;">{{ $index + 1 }}</td>
                        <td>{{ $producto['id'] ?? 'N/A' }}</td>
                        <td style="text-align: center;">{{ $producto['cantidad'] }}</td>
                        <td style="text-align: center;">UNI</td>
                        <td>{{ $producto['nombre'] }}</td>
                        <td style="text-align: center;">12 MESES</td>
                        <td style="text-align: right;">S/ {{ number_format($producto['precio'], 2) }}</td>
                        <td style="text-align: right;">S/ {{ number_format($producto['precio'] * $producto['cantidad'], 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Observaciones -->
    @if($observaciones)
        <div class="observations-section">
            <div class="observations-header">OBSERVACIONES</div>
            <div class="observations-content">
                {{ $observaciones }}
            </div>
        </div>
    @endif

    <!-- Totales -->
    <div class="totals-section">
        <div class="total-row">
            <strong>Subtotal:</strong> S/ {{ number_format($total - ($total * 0.18), 2) }}
        </div>
        <div class="total-row">
            <strong>IGV (18%):</strong> S/ {{ number_format($total * 0.18, 2) }}
        </div>
        <div class="total-row total-final">
            <strong>TOTAL S/:</strong> {{ number_format($total, 2) }}
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-title">{{ $empresa->nombre_empresa }}</div>
        <div class="footer-contact">
            <div><strong>Para confirmar su pedido, contáctenos:</strong></div>
            @if($empresa->telefono)
                <div>📞 Tel: {{ $empresa->telefono }}</div>
            @endif
            @if($empresa->celular)
                <div>📱 Cel: {{ $empresa->celular }}</div>
            @endif
            @if($empresa->email)
                <div>📧 Email: {{ $empresa->email }}</div>
            @endif
            @if($empresa->whatsapp)
                <div>💬 WhatsApp: {{ $empresa->whatsapp }}</div>
            @endif
            @if($empresa->direccion)
                <div>📍 {{ $empresa->direccion }}</div>
            @endif
        </div>
        <div class="validity-notice">
            Esta cotización es válida por 30 días desde su emisión. Los precios incluyen IGV.
        </div>
    </div>
</body>
</html>