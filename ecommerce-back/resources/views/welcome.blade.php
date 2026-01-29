<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido a MarketPro!</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 0; 
            border-radius: 12px; 
            box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .logo { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header p {
            font-size: 16px;
            opacity: 0.95;
            margin: 0;
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting {
            font-size: 24px;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .welcome-text {
            font-size: 16px;
            margin-bottom: 30px;
            color: #555;
        }
        .highlight { 
            background-color: #f8f9ff; 
            padding: 25px; 
            border-radius: 10px; 
            border-left: 5px solid #667eea; 
            margin: 30px 0; 
        }
        .highlight h3 {
            margin-top: 0;
            color: #667eea;
            font-size: 20px;
        }
        .highlight ul {
            margin: 15px 0;
            padding-left: 0;
            list-style: none;
        }
        .highlight li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
            font-size: 15px;
            line-height: 1.5;
        }
        .highlight li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
            font-size: 16px;
        }
        .products { 
            display: table; 
            width: 100%;
            margin: 40px 0; 
        }
        .product { 
            display: table-cell;
            text-align: center; 
            padding: 20px 15px; 
            background-color: #fafbff;
            border-radius: 10px;
            width: 33.33%;
        }
        .product img { 
            width: 80px; 
            height: 80px; 
            border-radius: 10px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .product p {
            margin: 15px 0 0 0;
            font-weight: 600;
            color: #667eea;
            font-size: 14px;
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 25px; 
            text-align: center; 
            color: #666; 
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer p:last-child {
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎮 MarketPro</div>
            <p>Tu tienda especializada en tecnología gaming</p>
        </div>
        
        <div class="content">
            <div class="greeting">¡Hola {{ Auth::user()->nombres ?? Auth::user()->name ?? 'Usuario' }}! 👋</div>
            
            <div class="welcome-text">
                ¡Bienvenido a <strong>MarketPro</strong>! Nos emociona tenerte como parte de nuestra comunidad de gamers y tech lovers.
            </div>
            
            <div class="highlight">
                <h3>🚀 ¿Qué puedes encontrar en MarketPro?</h3>
                <ul>
                    <li><strong>🎮 Gaming:</strong> Tarjetas gráficas de última generación, periféricos gaming, y accesorios</li>
                    <li><strong>💻 Laptops:</strong> Equipos de alto rendimiento para gaming y trabajo profesional</li>
                    <li><strong>🖥️ Componentes:</strong> Procesadores, RAM, almacenamiento y todo para tu build</li>
                    <li><strong>⚡ Accesorios:</strong> Teclados mecánicos, mouse gaming, headsets y más</li>
                </ul>
            </div>

            <div class="products">
                <div class="product">
                    <img src="https://images.pexels.com/photos/2399840/pexels-photo-2399840.jpeg?auto=compress&cs=tinysrgb&w=150" alt="Gaming Setup">
                    <p>Setups Gaming</p>
                </div>
                <div class="product">
                    <img src="https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150" alt="Laptops">
                    <p>Laptops Gaming</p>
                </div>
                <div class="product">
                    <img src="https://images.pexels.com/photos/2148217/pexels-photo-2148217.jpeg?auto=compress&cs=tinysrgb&w=150" alt="Componentes">
                    <p>Componentes PC</p>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://magus-ecommerce.com/" class="btn">🛒 Explorar Nuestra Tienda</a>
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