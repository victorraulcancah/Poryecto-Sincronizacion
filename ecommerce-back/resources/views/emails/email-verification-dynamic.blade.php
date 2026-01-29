<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $template ? $template->subject : 'Verifica tu cuenta' }}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: {{ $template ? $template->colors['background'] : '#f4f4f4' }}; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: {{ $template ? $template->colors['content_bg'] : 'white' }}; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, {{ $template ? $template->colors['primary'] : '#667eea' }} 0%, {{ $template ? $template->colors['secondary'] : '#764ba2' }} 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
        }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .verification-box { 
            background: #f8f9ff; 
            padding: 25px; 
            border-radius: 8px; 
            border: 2px solid {{ $template ? $template->colors['primary'] : '#667eea' }}; 
            margin: 25px 0; 
            text-align: center; 
        }
        .btn { 
            display: inline-block; 
            background: {{ $template ? $template->colors['primary'] : '#667eea' }}; 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0; 
            font-weight: bold; 
            transition: background-color 0.3s ease; 
        }
        .btn:hover { 
            background: {{ $template ? $template->colors['button_hover'] : '#5a67d8' }}; 
            color: white !important; 
            text-decoration: none; 
        }
        .warning { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 6px; 
            border-left: 4px solid #ffc107; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                @if($empresaInfo && $empresaInfo->logo)
                    <img src="{{ asset('storage/' . $empresaInfo->logo) }}" alt="{{ $empresaInfo->nombre_empresa }}" style="max-height: 50px; margin-bottom: 10px;">
                    <br>
                @endif
                {{ $empresaInfo ? $empresaInfo->nombre_empresa : 'MarketPro' }}
            </div>
            <p>Verificación de cuenta</p>
        </div>
        
        <div class="content">
            <h2>{!! $template ? $template->replaceVariables($template->greeting, ['nombres' => $user->nombres]) : "¡Hola {$user->nombres}! 👋" !!}</h2>
            
            <p>{!! $template ? $template->main_content : 'Gracias por registrarte en <strong>MarketPro</strong>. Para completar tu registro necesitamos verificar tu dirección de correo electrónico.' !!}</p>
            
            <div class="verification-box">
                <h3>🔐 Verifica tu cuenta</h3>
                <p><strong>Opción 1:</strong> Haz clic en el botón de abajo para verificar automáticamente:</p>
                <a href="{{ $verificationUrl }}" class="btn">{{ $template ? $template->button_text : '✅ Verificar mi cuenta' }}</a>
                
                <div style="margin: 20px 0; text-align: center; color: #666;">
                    <hr style="margin: 15px 0;">
                    <span style="background: white; padding: 0 15px;">O</span>
                    <hr style="margin: 15px 0;">
                </div>
                
                <p><strong>Opción 2:</strong> Ingresa este código en el formulario de verificación:</p>
                <div style="background: {{ $template ? $template->colors['primary'] : '#667eea' }}; color: white; padding: 15px; border-radius: 6px; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin: 15px 0; text-align: center;">
                    {{ $verificationCode }}
                </div>
                <p style="font-size: 12px; color: #666; text-align: center;">
                    Visita: <a href="{{ env('FRONTEND_URL') }}/verify-email" style="color: {{ $template ? $template->colors['primary'] : '#667eea' }};">{{ env('FRONTEND_URL') }}/verify-email</a>
                </p>
            </div>

            <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace de verificación expirará en 24 horas por seguridad.
            </div>

            <p>Una vez verificada tu cuenta, podrás:</p>
            <ul>
                <li>🛒 Realizar compras en nuestra tienda</li>
                <li>🎁 Acceder a ofertas exclusivas</li>
                <li>📦 Hacer seguimiento a tus pedidos</li>
                <li>⭐ Guardar productos en tu lista de deseos</li>
            </ul>

            <p>{{ $template ? $template->footer_text : 'Si no solicitaste esta cuenta, simplemente ignora este correo.' }}</p>
            
            <!-- Después de: <div class="footer"> -->
            <div class="footer">
                <p>{{ $empresaInfo ? $empresaInfo->nombre_empresa : 'MarketPro' }} - {{ $empresaInfo ? $empresaInfo->descripcion : 'Tu partner en tecnología gaming' }}</p>
                <p>Este correo fue enviado a {{ $user->email }}</p>
                <p>© {{ date('Y') }} {{ $empresaInfo ? $empresaInfo->nombre_empresa : 'MarketPro' }}. Todos los derechos reservados.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>MarketPro - Tu partner en tecnología gaming</p>
            <p>Este correo fue enviado a {{ $user->email }}</p>
            <p>© 2024 MarketPro. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
