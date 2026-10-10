<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compra {{ $pago->codigo }}</title>
</head>
<body style="margin:0; padding:0; background:#f4f5f7; font-family: Arial, Helvetica, sans-serif; color:#333;">
@php
    $simbolo = $pago->moneda === 'd' ? 'US$' : 'S/';
    $dinero = fn ($v) => $simbolo . ' ' . number_format((float) $v, 2, '.', ',');
    $nombreEmpresa = $empresa->nombre_empresa ?? config('app.name');
@endphp
<div style="max-width:620px; margin:0 auto; padding:24px;">
    <div style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08);">

        <div style="background:#c22026; color:#ffffff; padding:22px 28px;">
            <div style="font-size:20px; font-weight:bold;">{{ $nombreEmpresa }}</div>
            <div style="font-size:14px; margin-top:4px;">
                {{ $paraEmpresa ? 'Nueva compra en línea' : 'Confirmación de tu compra' }}
            </div>
        </div>

        <div style="padding:26px 28px;">
            @if($pago->simulado)
                <div style="background:#fff8e1; border:1px solid #ffe08a; color:#7a5b00; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:20px;">
                    <strong>Compra de prueba.</strong> Se realizó con la pasarela en modo de prueba:
                    no se hizo ningún cobro real a la tarjeta.
                </div>
            @endif

            @if($paraEmpresa)
                <p style="margin:0 0 16px; font-size:15px;">
                    <strong>{{ $pago->cliente_nombre }}</strong> realizó una compra por la pasarela de pago.
                </p>
            @else
                <p style="margin:0 0 16px; font-size:15px;">
                    Hola <strong>{{ $pago->cliente_nombre }}</strong>, recibimos tu compra. Estos son los datos:
                </p>
            @endif

            <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:22px;">
                <tr>
                    <td style="padding:6px 0; color:#777; width:42%;">N° de compra</td>
                    <td style="padding:6px 0;"><strong>{{ $pago->codigo }}</strong></td>
                </tr>
                <tr>
                    <td style="padding:6px 0; color:#777;">N° de operación</td>
                    <td style="padding:6px 0;">{{ $pago->referencia_pasarela }}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0; color:#777;">Fecha</td>
                    <td style="padding:6px 0;">{{ $pago->created_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') }}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0; color:#777;">Método de pago</td>
                    <td style="padding:6px 0;">
                        Tarjeta {{ $pago->tarjeta_marca }} terminada en {{ $pago->tarjeta_ultimos4 }}
                    </td>
                </tr>
                @if($paraEmpresa)
                    <tr>
                        <td style="padding:6px 0; color:#777;">Correo del cliente</td>
                        <td style="padding:6px 0;">{{ $pago->cliente_email }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#777;">Documento</td>
                        <td style="padding:6px 0;">{{ $pago->numero_documento ?: '—' }}</td>
                    </tr>
                @endif
            </table>

            <div style="font-size:15px; font-weight:bold; border-bottom:2px solid #c22026; padding-bottom:6px; margin-bottom:10px;">
                Productos
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:8px;">
                @foreach($pago->items as $item)
                    <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #eee;">
                            {{ $item['nombre'] }}<br>
                            <span style="color:#888; font-size:12px;">
                                {{ $item['cantidad'] }} x {{ $dinero($item['precio_unitario']) }}
                            </span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #eee; text-align:right; white-space:nowrap;">
                            {{ $dinero($item['subtotal']) }}
                        </td>
                    </tr>
                @endforeach
            </table>

            <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:22px;">
                <tr>
                    <td style="padding:4px 0; color:#777;">Subtotal</td>
                    <td style="padding:4px 0; text-align:right;">{{ $dinero($pago->subtotal) }}</td>
                </tr>
                @if($pago->descuento > 0)
                    <tr>
                        <td style="padding:4px 0; color:#2e7d32;">Cupón {{ $pago->cupon_codigo }}</td>
                        <td style="padding:4px 0; text-align:right; color:#2e7d32;">- {{ $dinero($pago->descuento) }}</td>
                    </tr>
                @endif
                <tr>
                    <td style="padding:4px 0; color:#777;">Envío</td>
                    <td style="padding:4px 0; text-align:right;">
                        {{ $pago->costo_envio > 0 ? $dinero($pago->costo_envio) : 'Por coordinar' }}
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 0; font-size:16px;"><strong>Total pagado</strong></td>
                    <td style="padding:8px 0; text-align:right; font-size:16px;"><strong>{{ $dinero($pago->total) }}</strong></td>
                </tr>
                @if($pago->igv > 0)
                    <tr>
                        <td colspan="2" style="padding:0; text-align:right; font-size:12px; color:#888;">
                            Incluye IGV {{ $dinero($pago->igv) }}
                        </td>
                    </tr>
                @endif
            </table>

            <div style="font-size:15px; font-weight:bold; border-bottom:2px solid #c22026; padding-bottom:6px; margin-bottom:10px;">
                Entrega a domicilio
            </div>
            <p style="margin:0 0 4px; font-size:14px;">{{ $pago->cliente_nombre }} · {{ $pago->telefono_contacto }}</p>
            <p style="margin:0 0 4px; font-size:14px;">{{ $pago->direccion_envio }}</p>
            <p style="margin:0 0 18px; font-size:14px; color:#777;">
                {{ collect([$pago->distrito_nombre, $pago->provincia_nombre, $pago->departamento_nombre])->filter()->implode(', ') }}
            </p>

            @if($pago->observaciones)
                <p style="margin:0 0 18px; font-size:13px; color:#555;">
                    <strong>Observaciones:</strong> {{ $pago->observaciones }}
                </p>
            @endif

            @unless($paraEmpresa)
                <p style="margin:0; font-size:13px; color:#777;">
                    El costo y la fecha del envío te los confirmaremos por teléfono o WhatsApp.
                    @if($empresa && ($empresa->telefono || $empresa->email))
                        Si tienes dudas escríbenos a
                        {{ collect([$empresa->email, $empresa->telefono])->filter()->implode(' · ') }}.
                    @endif
                </p>
            @endunless
        </div>
    </div>

    <p style="text-align:center; font-size:12px; color:#999; margin-top:16px;">
        {{ $nombreEmpresa }}
    </p>
</div>
</body>
</html>
