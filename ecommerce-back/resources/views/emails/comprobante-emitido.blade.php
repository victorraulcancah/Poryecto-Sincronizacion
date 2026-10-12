<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante {{ $pago->codigo }}</title>
</head>
<body style="margin:0; padding:0; background:#f4f5f7; font-family: Arial, Helvetica, sans-serif; color:#333;">
@php
    $simbolo = $pago->moneda === 'd' ? 'US$' : 'S/';
    $nombreEmpresa = $empresa->nombre_empresa ?? config('app.name');
@endphp
<div style="max-width:620px; margin:0 auto; padding:24px;">
    <div style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08);">

        <div style="background:#c22026; color:#ffffff; padding:22px 28px;">
            <div style="font-size:20px; font-weight:bold;">{{ $nombreEmpresa }}</div>
            <div style="font-size:14px; margin-top:4px;">Tu comprobante de compra</div>
        </div>

        <div style="padding:26px 28px;">
            <p style="margin:0 0 14px; font-size:15px;">
                Hola <strong>{{ $pago->cliente_nombre }}</strong>,
            </p>

            <p style="margin:0 0 14px; font-size:14px;">
                Te enviamos adjunto el comprobante de tu compra
                <strong>{{ $pago->codigo }}</strong> por
                <strong>{{ $simbolo }} {{ number_format((float) $pago->total, 2, '.', ',') }}</strong>.
            </p>

            @if($mensaje)
                <div style="margin:0 0 16px; padding:12px 14px; background:#f9fafb; border-left:3px solid #c22026; font-size:14px; white-space:pre-line;">{{ $mensaje }}</div>
            @endif

            <p style="margin:0 0 6px; font-size:13px; color:#555;">
                <strong>Entrega a domicilio:</strong> {{ $pago->direccion_envio }}
                @php $zona = collect([$pago->distrito_nombre, $pago->provincia_nombre, $pago->departamento_nombre])->filter()->implode(', '); @endphp
                @if($zona) — {{ $zona }} @endif
            </p>
            <p style="margin:0 0 18px; font-size:13px; color:#777;">
                Nos comunicaremos contigo para coordinar la fecha del envío.
                @if($empresa && ($empresa->telefono || $empresa->email))
                    Si tienes dudas escríbenos a
                    {{ collect([$empresa->email, $empresa->telefono])->filter()->implode(' · ') }}.
                @endif
            </p>
        </div>
    </div>

    <p style="text-align:center; font-size:12px; color:#999; margin-top:16px;">{{ $nombreEmpresa }}</p>
</div>
</body>
</html>
