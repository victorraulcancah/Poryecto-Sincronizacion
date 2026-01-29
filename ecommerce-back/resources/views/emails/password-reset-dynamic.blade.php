<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $template ? $template->subject : 'Recuperación de contraseña' }}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: {{ $template ? $template->colors['background'] : '#f4f4f4' }}; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: {{ $template ? $template->colors['content_bg'] : 'white' }}; 
            border-radius: 10px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, {{ $template ? $template->colors['primary'] : '#3B82F6' }} 0%, {{ $template ? $template->colors['secondary'] : '#1E40AF' }} 100%); 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
        }
        .content { 
            padding: 30px; 
            background: #f9f9f9; 
        }
        .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: {{ $template ? $template->colors['primary'] : '#3B82F6' }}; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background: {{ $template ? $template->colors['button_hover'] : '#2563EB' }};
        }
        .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            @if($empresaInfo && $empresaInfo->logo)
                <img src="{{ asset('storage/' . $empresaInfo->logo) }}" alt="{{ $empresaInfo->nombre_empresa }}" style="max-height: 50px; margin-bottom: 10px;">
            @endif
            <h1>{{ $empresaInfo ? $empresaInfo->nombre_empresa : 'MarketPro' }}</h1>
        </div>
        
        <div class="content">
            <h2>{!! $template ? $template->replaceVariables($template->greeting, ['nombres' => $user->nombres]) : "Hola, {$user->nombres}" !!}</h2>
            
            <p>{!! $template ? $template->main_content : 'Recibimos una solicitud para restablecer la contraseña de tu cuenta en MarketPro.' !!}</p>
            
            <p>{!! $template ? $template->secondary_content : 'Para restablecer tu contraseña, haz clic en el siguiente botón:' !!}</p>
            
            <a href="{{ $resetUrl }}" class="button">{{ $template ? $template->button_text : 'Restablecer Contraseña' }}</a>
            
            <p>Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px;">{{ $resetUrl }}</p>
            
            <p><strong>Este enlace expirará en 1 hora por seguridad.</strong></p>
            
            <p>{!! $template ? $template->footer_text : 'Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.' !!}</p>
            
            <p>El equipo de {{ $empresaInfo ? $empresaInfo->nombre_empresa : 'MarketPro' }}</p>
        </div>
        
        <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
