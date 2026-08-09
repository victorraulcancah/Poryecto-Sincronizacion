{{--
    Comprobante de una compra hecha en tienda (venta del ERP 7Power).

    Réplica del comprobante que 7Power arma en el navegador
    (7power-front/src/pages/modulos/comprobante-de-pago/boleta.tsx): mismo
    orden de bloques, mismas etiquetas y mismo pie.
--}}
@php
    $emp = $compra['empresa'];
    $cli = $compra['cliente'];
    $simbolo = $compra['moneda'] === 'd' ? '$.' : 'S/.';
    $divisorIgv = 1 + $compra['igv'];

    $totalItems = collect($compra['productos'])->sum('cantidad');
    $total = collect($compra['productos'])->sum('subtotal');
    $descuento = collect($compra['productos'])->sum('descuento');
    $valorVenta = $total / $divisorIgv;
    $montoIgv = $total - $valorVenta;

    $fmt = fn ($n) => number_format($n, 2);
    // La cantidad se muestra sin decimales cuando es entera, igual que el ERP.
    $cant = fn ($n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 20px 24px; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 11px; margin: 0; }
        table { border-collapse: collapse; }
        .w100 { width: 100%; }
        .b { font-weight: bold; }
        .der { text-align: right; }
        .cen { text-align: center; }
        .up { text-transform: uppercase; }
        .gris { color: #6b7280; }

        /* Cabecera: logo | datos de la empresa | recuadro del documento */
        .cab td { vertical-align: middle; }
        .cab .razon { font-size: 15px; font-weight: bold; }
        .cab .contacto { font-size: 9px; line-height: 1.45; }
        .doc {
            border: 1px solid #000; border-radius: 14px; padding: 8px 10px;
            text-align: center; line-height: 1.6;
        }
        .doc .titulo { font-weight: bold; font-size: 14px; text-transform: uppercase; }

        .franja {
            background: #0000001a; font-weight: bold; text-transform: uppercase;
            text-align: center; padding: 3px; margin-top: 8px;
        }
        .info { width: 100%; margin-top: 8px; font-size: 10px; }
        .info td { vertical-align: top; padding: 1px 0; }
        .info .et { font-weight: bold; white-space: nowrap; width: 135px; padding-right: 10px; }

        /* Tabla de productos */
        .items { width: 100%; margin-top: 10px; font-size: 10px; }
        .items th {
            background: #0000001a; text-align: left; padding: 3.5px 8px;
            font-weight: bold; font-size: 10px;
        }
        .items td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
        .items .sim { color: #94a3b8; font-weight: bold; }
        .marca { color: #84cc16; font-weight: bold; padding: 0 4px; }

        .items-count { text-align: right; text-transform: uppercase; font-size: 10px; margin-top: 14px; }
        .totales {
            width: 100%; border-top: 2px solid #000; border-bottom: 2px solid #000;
            margin-top: 10px;
        }
        .totales td { text-align: right; padding: 6px 10px; font-size: 10px; line-height: 1.5; }
        .totales .b { display: block; }
        .total-final {
            width: 100%; border-bottom: 2px solid #000; padding: 10px 10px 10px 0;
            text-align: right; font-weight: bold; font-size: 12px;
        }
        .tc { text-align: right; font-size: 9px; color: #6b7280; margin-top: 6px; }

        .anulada {
            border: 2px solid #dc2626; color: #dc2626; text-align: center;
            padding: 4px; font-weight: bold; margin-bottom: 8px; border-radius: 6px;
        }

        .gracias { text-align: right; font-weight: bold; font-size: 10px; margin: 16px 0 12px; }
        .pie { border-top: 2px solid #000; padding-top: 12px; }
        .pie td { vertical-align: top; font-size: 10px; }
        .pie .legal { text-align: center; line-height: 1.5; }
    </style>
</head>
<body>

@if ($compra['anulada'])
    <div class="anulada">COMPROBANTE ANULADO</div>
@endif

<table class="cab w100">
    <tr>
        <td style="width: 18%;" class="cen">
            @if ($emp['logo'])
                <img src="{{ $emp['logo'] }}" style="max-width: 110px;">
            @endif
        </td>
        <td style="width: 47%; padding-left: 10px;">
            <div class="razon">{{ $emp['razon_social'] ?? '-' }}</div>
            <div class="contacto">
                <div>{{ $emp['direccion'] ?? '-' }}</div>
                <div><span class="b">Cel: </span>{{ $emp['telefono'] ?? '-' }}</div>
                <div><span class="b">Email: </span>{{ $emp['email'] ?? '-' }}</div>
                <div><span class="b">Web: </span>{{ $emp['web'] ?? '-' }}</div>
            </div>
        </td>
        <td style="width: 35%;">
            <div class="doc">
                <div>RUC: {{ $emp['ruc'] ?? '-' }}</div>
                <div class="titulo">{{ $compra['tipo'] }}</div>
                <div>Nro: {{ $compra['documento'] }}</div>
            </div>
        </td>
    </tr>
</table>

<div class="franja">Información General</div>

<table class="w100" style="margin-top: 6px;">
    <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 16px;">
            <table class="info">
                <tr><td class="et">RUC/DNI :</td><td>{{ $cli['documento'] ?? '-' }}</td></tr>
                <tr><td class="et">CLIENTE :</td><td>{{ $cli['nombre'] ?: '-' }}</td></tr>
                <tr>
                    <td class="et">FECHA DE EMISIÓN :</td>
                    <td>{{ \Carbon\Carbon::parse($compra['fecha'])->format('d/m/Y') }}</td>
                </tr>
                <tr><td class="et">DIRECCIÓN :</td><td>{{ $cli['direccion'] ?? '-' }}</td></tr>
            </table>
        </td>
        <td style="width: 50%; vertical-align: top;">
            <table class="info">
                <tr>
                    <td class="et">MONEDA :</td>
                    <td class="up">{{ $compra['moneda'] === 'd' ? 'Dólares' : 'Soles' }}</td>
                </tr>
                <tr>
                    <td class="et">CONDICIÓN DE PAGO :</td>
                    <td>{{ $compra['condicion_pago'] ?: '-' }}</td>
                </tr>
                <tr><td class="et">VENDEDOR :</td><td>{{ $compra['vendedor'] ?: '-' }}</td></tr>
                <tr><td class="et">SUCURSAL :</td><td>{{ $compra['sucursal'] ?: '-' }}</td></tr>
            </table>
        </td>
    </tr>
</table>

<table class="items">
    <thead>
        <tr>
            <th style="width: 70px;">CANTIDAD</th>
            <th style="width: 95px;">CÓDIGO</th>
            <th>DESCRIPCIÓN</th>
            <th style="width: 85px;">VALOR U.</th>
            <th style="width: 85px;">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($compra['productos'] as $p)
            @php $s = $p['moneda'] === 'd' ? '$.' : 'S/.'; @endphp
            <tr>
                <td>{{ $cant($p['cantidad']) }}</td>
                <td>{{ $p['codigo'] ?? '-' }}</td>
                <td>
                    {{ $p['nombre'] ?? '-' }}
                    @if ($p['marca'])<span class="marca">|</span>{{ $p['marca'] }}@endif
                </td>
                <td><span class="sim">{{ $s }}</span> {{ $fmt($p['precio']) }}</td>
                <td><span class="sim">{{ $s }}</span> {{ $fmt($p['subtotal']) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="cen gris">Sin detalle de productos</td></tr>
        @endforelse
    </tbody>
</table>

<div class="items-count">Nro. de items: {{ $cant($totalItems) }}</div>

<table class="totales">
    <tr>
        @if ($compra['con_igv'])
            <td><span class="b">Sub Total:</span>{{ $simbolo }} {{ $fmt($valorVenta) }}</td>
        @endif
        <td>
            <span class="b">{{ $compra['con_igv'] ? 'Descuento:' : 'Desct. Total:' }}</span>
            {{ $simbolo }} {{ $fmt($descuento) }}
        </td>
        @if ($compra['con_igv'])
            <td><span class="b">Valor Venta:</span>{{ $simbolo }} {{ $fmt($valorVenta) }}</td>
            <td><span class="b">IGV:</span>{{ $simbolo }} {{ $fmt($montoIgv) }}</td>
        @endif
    </tr>
</table>

<div class="total-final">TOTAL: {{ $simbolo }} {{ $fmt($total) }}</div>

{{-- El TC solo se muestra en ventas en dólares; las ventas en soles no lo usan --}}
@if ($compra['moneda'] === 'd')
    <div class="tc">Tipo de Cambio: S/. {{ $compra['tipo_de_cambio'] }}</div>
@endif

<div class="gracias">GRACIAS POR SU COMPRA!</div>

<div class="pie">
    <table class="w100">
        <tr>
            <td style="width: 50%;" class="legal">
                @if ($compra['comentarios_sucursal'])
                    <div class="gris b" style="font-size: 9px; white-space: pre-line;">{{ $compra['comentarios_sucursal'] }}</div>
                @endif
                <div>Representación Impresa de la Factura Electrónica</div>
                <div class="b">Contrata Factura en Novi-k Perú</div>
                <div class="b">GRACIAS POR SU VISITA</div>
                <div class="b">Yo vendo con https://novi-k.com</div>
            </td>
            <td style="width: 50%;">
                @if ($compra['observaciones'])
                    <div class="b">Observaciones:</div>
                    <div>{{ $compra['observaciones'] }}</div>
                @endif
            </td>
        </tr>
    </table>
</div>

</body>
</html>
