<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $tipo_comprobante }} {{ $numero_completo }}</title>
    <style>
        /* CSS optimizado para DomPDF - Diseño formal y profesional */
        @page {
            margin: 10mm 10mm;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 9px;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            color: #000;
            background-color: #f0f0f0;
        }

        .header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #000;
        }

        .header table {
            border-collapse: collapse;
            width: 100%;
        }

        .header td {
            border: none;
            vertical-align: top;
        }

        .logo-container {
            width: 180px;
            padding-right: 15px;
        }

        .logo-container img {
            max-width: 160px;
            max-height: 100px;
        }

        .empresa-info {
            width: 300px;
            padding-right: 15px;
        }

        .empresa-info h2 {
            margin: 0 0 3px 0;
            font-size: 13px;
            color: #000;
            font-weight: bold;
            text-transform: uppercase;
        }

        .empresa-info p {
            margin: 2px 0;
            font-size: 8.5px;
            color: #000;
            line-height: 1.3;
        }

        .comprobante-box {
            width: 200px;
            text-align: center;
            border: 2px solid #000;
            padding: 10px;
            background-color: #d9d9d9;
        }

        .comprobante-box .ruc {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: #000;
        }

        .comprobante-box .tipo {
            font-size: 13px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: #000;
        }

        .comprobante-box .numero {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            color: #000;
        }

        .info-section {
            margin: 15px 0;
        }

        .info-section table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-box {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 10px;
        }

        .info-box h3 {
            margin: 0 0 8px 0;
            font-size: 10px;
            color: #000;
            font-weight: bold;
            text-transform: uppercase;
        }

        .info-box p {
            margin: 3px 0;
            font-size: 9px;
            color: #000;
            line-height: 1.4;
        }

        .info-box strong {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }

        .info-row {
            display: table;
            width: 100%;
        }

        .info-col {
            display: table-cell;
            width: 50%;
            padding-right: 10px;
        }

        .tabla-productos {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 8.5px;
        }

        .tabla-productos th,
        .tabla-productos td {
            border: 1px solid #000;
            padding: 5px 4px;
            text-align: left;
        }

        .tabla-productos thead {
            background-color: #c0c0c0;
        }

        .tabla-productos th {
            color: #000;
            font-weight: bold;
            text-align: center;
            font-size: 8.5px;
            padding: 6px 4px;
            text-transform: uppercase;
        }

        .tabla-productos tbody tr {
            background-color: #fff;
        }

        .tabla-productos .text-center { text-align: center; }
        .tabla-productos .text-right { text-align: right; }

        .totales-section {
            margin-top: 15px;
        }

        .totales {
            float: right;
            width: 280px;
            border: 1px solid #000;
        }

        .totales table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }

        .totales td {
            padding: 5px 8px;
            border-bottom: 1px solid #ccc;
            color: #000;
        }

        .totales tr:last-child td {
            border-bottom: none;
        }

        .totales .total-final {
            font-weight: bold;
            font-size: 11px;
            border-top: 2px solid #000 !important;
            background-color: #c0c0c0;
            padding: 8px !important;
        }

        .footer {
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 10px;
            font-size: 8px;
            clear: both;
        }

        .qr-section {
            float: left;
            width: 120px;
            text-align: center;
            padding: 5px;
            border: 1px solid #000;
        }

        .qr-section img {
            max-width: 110px;
            max-height: 110px;
        }

        .qr-section p {
            margin: 5px 0 0 0;
            font-size: 7px;
            color: #000;
            font-weight: bold;
        }

        .info-legal {
            float: right;
            width: 380px;
            background-color: #e8e8e8;
            padding: 8px;
            border: 1px solid #000;
        }

        .info-legal h4 {
            margin: 0 0 6px 0;
            font-size: 9px;
            color: #000;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
        }

        .info-legal p {
            margin: 4px 0;
            line-height: 1.3;
            font-size: 7.5px;
            color: #000;
        }

        .info-legal strong {
            color: #000;
            font-weight: bold;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }

        .clearfix { clear: both; }

        /* Evitar saltos de página no deseados */
        .info-section,
        .tabla-productos,
        .totales-section {
            page-break-inside: avoid;
        }

        /* Estilos para impresión */
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <!-- ENCABEZADO CON DATOS EMPRESA -->
    <div class="header">
        <table>
            <tr>
                <td class="logo-container">
                    @if(!empty($datos_empresa['logo_path']) && file_exists($datos_empresa['logo_path']))
                        @php
                            // Convertir imagen a base64 para DomPDF
                            $logoPath = $datos_empresa['logo_path'];
                            $imageData = base64_encode(file_get_contents($logoPath));
                            $imageType = pathinfo($logoPath, PATHINFO_EXTENSION);
                            $mimeType = $imageType === 'png' ? 'image/png' : 'image/jpeg';
                            $logoSrc = "data:{$mimeType};base64,{$imageData}";
                        @endphp
                        <img src="{{ $logoSrc }}" alt="Logo Empresa">
                    @endif
                </td>
                <td class="empresa-info">
                    <h2>{{ $datos_empresa['razon_social'] }}</h2>
                    <p>{{ $datos_empresa['direccion_fiscal'] }}</p>
                    @if(!empty($datos_empresa['distrito']) && !empty($datos_empresa['provincia']))
                        <p>{{ $datos_empresa['distrito'] }}, {{ $datos_empresa['provincia'] }}@if(!empty($datos_empresa['departamento'])) - {{ $datos_empresa['departamento'] }}@endif</p>
                    @endif
                    @if(!empty($datos_empresa['telefono']))
                        <p>Tel: {{ $datos_empresa['telefono'] }}</p>
                    @endif
                    @if(!empty($datos_empresa['email']))
                        <p>{{ $datos_empresa['email'] }}</p>
                    @endif
                    @if(!empty($datos_empresa['web']))
                        <p>{{ $datos_empresa['web'] }}</p>
                    @endif
                </td>
                <td class="comprobante-box">
                    <p class="ruc">RUC {{ $datos_empresa['ruc'] }}</p>
                    <p class="tipo">{{ $tipo_comprobante }}</p>
                    <p class="numero">{{ $numero_completo }}</p>
                </td>
            </tr>
        </table>
    </div>

    <!-- INFORMACIÓN DEL CLIENTE Y FECHA -->
    <div class="info-section">
        <table style="width: 100%;">
            <tr>
                <td style="width: 60%; vertical-align: top; padding-right: 10px;">
                    <div class="info-box">
                        <h3>DATOS DEL CLIENTE</h3>
                        <p><strong>{{ $datos_cliente['tipo_documento'] === '6' ? 'RUC' : 'DNI' }}:</strong> {{ $datos_cliente['numero_documento'] }}</p>
                        <p><strong>NOMBRE:</strong> {{ $datos_cliente['razon_social'] }}</p>
                        <p><strong>TELÉFONO:</strong> {{ $comprobante->cliente->telefono ?? 'No especificado' }}</p>
                    </div>
                </td>
                <td style="width: 40%; vertical-align: top;">
                    <div class="info-box">
                        <h3>INFORMACIÓN</h3>
                        <p><strong>FECHA EMISIÓN:</strong> {{ \Carbon\Carbon::parse($fecha_emision)->format('d/m/Y') }}</p>
                        <p><strong>CONDICIÓN PAGO:</strong> CONTADO</p>
                        <p><strong>MEDIO DE PAGO:</strong> Efectivo</p>
                        <p><strong>MONEDA:</strong> PEN</p>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- DETALLE DE PRODUCTOS -->
    @if(!empty($productos))
    <table class="tabla-productos">
        <thead>
            <tr>
                <th style="width: 12%;">Código</th>
                <th style="width: 40%;">Descripción</th>
                <th style="width: 8%;">Unidad</th>
                <th style="width: 8%;">Cant</th>
                <th style="width: 11%;">V.Unitario</th>
                <th style="width: 11%;">P.Unitario</th>
                <th style="width: 10%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($productos as $producto)
            <tr>
                <td class="text-center">{{ $producto['codigo'] }}</td>
                <td>{{ $producto['descripcion'] }}</td>
                <td class="text-center">{{ $producto['unidad_medida'] }}</td>
                <td class="text-center">{{ $producto['cantidad'] }}</td>
                <td class="text-right">{{ $producto['precio_unitario'] }}</td>
                <td class="text-right">{{ $producto['precio_unitario'] }}</td>
                <td class="text-right">S/ {{ $producto['total_linea'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <!-- TOTALES DETALLADOS -->
    <div class="totales-section">
        <div class="totales">
            <table>
                <tr>
                    <td>Op. Gravada</td>
                    <td class="text-right">S/ {{ $totales['operacion_gravada'] }}</td>
                </tr>
                <tr>
                    <td>Op. Gratuita</td>
                    <td class="text-right">S/ 0.00</td>
                </tr>
                <tr>
                    <td>Op. Exonerada</td>
                    <td class="text-right">S/ 0.00</td>
                </tr>
                <tr>
                    <td>Op. Inafecta</td>
                    <td class="text-right">S/ 0.00</td>
                </tr>
                @if(!empty($totales['descuentos']))
                <tr>
                    <td>Descuento</td>
                    <td class="text-right">- S/ {{ $totales['descuentos'] }}</td>
                </tr>
                @endif
                <tr>
                    <td>IGV</td>
                    <td class="text-right">S/ {{ $totales['igv_18'] }}</td>
                </tr>
                <tr class="total-final">
                    <td><strong>IMPORTE TOTAL</strong></td>
                    <td class="text-right"><strong>S/ {{ $totales['total_numeros'] }}</strong></td>
                </tr>
            </table>
        </div>
        <div class="clearfix"></div>
    </div>

    <!-- PIE DE PÁGINA CON INFORMACIÓN LEGAL -->
    <div class="footer">
        <div class="qr-section">
            @if(!empty($codigo_qr))
                @php
                    // El QR viene como binario, necesita codificarse para data URL
                    if (strpos($codigo_qr, '<svg') === 0) {
                        // Es SVG, renderizar directamente
                        $qrOutput = $codigo_qr;
                    } else {
                        // Es imagen PNG binaria, codificar a base64
                        $qrBase64 = is_string($codigo_qr) && !ctype_print($codigo_qr)
                            ? base64_encode($codigo_qr)
                            : $codigo_qr;
                        $qrOutput = '<img src="data:image/png;base64,' . $qrBase64 . '" alt="Código QR" style="max-width: 90px; max-height: 90px;">';
                    }
                @endphp
                {!! $qrOutput !!}
                <p><strong>Código QR SUNAT</strong></p>
            @else
                <div style="width: 80px; height: 80px; border: 1px dashed #999; text-align: center; line-height: 20px; font-size: 8px; padding: 5px; background-color: #fafafa;">
                    <strong>Código QR</strong><br>
                    SUNAT
                </div>
            @endif
        </div>

        <div class="info-legal">
            <h4>INFORMACIÓN LEGAL</h4>
            <p><strong>{{ $info_legal['leyenda_legal'] }}</strong></p>
            <p><strong>Hash:</strong> {{ substr($info_legal['hash_xml'], 0, 50) }}...</p>
            <p><strong>Consulte:</strong> https://e-consultaruc.sunat.gob.pe</p>
            @if(!empty($info_legal['estado_cdr']))
                <p><strong>Estado:</strong> {{ $info_legal['estado_cdr'] }}</p>
            @endif
            <p><strong>Generado:</strong> {{ now()->format('d/m/Y H:i') }}</p>
        </div>
        <div class="clearfix"></div>
    </div>
</body>
</html>