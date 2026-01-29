<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Credenciales de Acceso</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .credentials-box {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .credential-label {
            font-weight: 600;
            color: #495057;
        }
        .credential-value {
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            border: 1px solid #ced4da;
            color: #007bff;
            font-weight: 600;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .btn {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-motorcycle"></i> {{ $empresaInfo->nombre_empresa }}</h1>
            <p>Bienvenido al Sistema de Delivery</p>
        </div>

        <div class="content">
            <h2>¡Hola {{ $motorizado->nombre_completo }}!</h2>

            <p>Te damos la bienvenida al equipo de delivery de <strong>{{ $empresaInfo->nombre_empresa }}</strong>.
            Hemos creado tu cuenta de acceso al sistema con las siguientes credenciales:</p>

            <div class="credentials-box">
                <h3>🔐 Credenciales de Acceso</h3>

                <div class="credential-item">
                    <span class="credential-label">Correo de Acceso:</span>
                    <span class="credential-value">{{ $motorizado->correo }}</span>
                </div>

                <div class="credential-item">
                    <span class="credential-label">Contraseña:</span>
                    <span class="credential-value">{{ $plainPassword }}</span>
                </div>
            </div>

            <div class="warning">
                <strong>⚠️ Importante:</strong> Por tu seguridad, te recomendamos cambiar tu contraseña la primera vez que ingreses al sistema.
            </div>

            <p><strong>📱 Cómo Acceder al Sistema:</strong></p>
            <p>Para ingresar al sistema, usa tu <strong>correo electrónico</strong> y la contraseña proporcionada arriba. Puedes acceder desde cualquier dispositivo móvil o computadora.</p>

            <p><strong>🚚 Funciones Disponibles:</strong></p>
            <ul>
                <li>Ver tus pedidos asignados</li>
                <li>Actualizar el estado de las entregas</li>
                <li>Gestionar tu perfil y datos</li>
                <li>Consultar tu historial de entregas</li>
                <li>Ver rutas optimizadas</li>
            </ul>

            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar con el equipo administrativo.</p>

            <p>¡Que tengas un excelente día de trabajo!</p>
        </div>

        <div class="footer">
            <p><strong>{{ $empresaInfo->nombre_empresa }}</strong></p>
            <p>{{ $empresaInfo->direccion ?? '' }}</p>
            <p>{{ $empresaInfo->telefono ?? '' }} | {{ $empresaInfo->email ?? '' }}</p>
        </div>
    </div>
</body>
</html>