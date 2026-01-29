<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de contraseña</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MarketPro</h1>
        </div>
        
        <div class="content">
            <h2>Hola, {{ $user->nombres }}</h2>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en MarketPro.</p>
            
            <p>Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
            
            <a href="{{ $resetUrl }}" class="button">Restablecer Contraseña</a>
            
            <p>Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px;">{{ $resetUrl }}</p>
            
            <p><strong>Este enlace expirará en 1 hora por seguridad.</strong></p>
            
            <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.</p>
            
            <p>Gracias,<br>El equipo de MarketPro</p>
        </div>
        
        <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
