# 📱 URL Pública de Comprobante para WhatsApp

## 🎯 Resumen

El sistema genera URLs públicas (sin autenticación) para compartir comprobantes electrónicos por WhatsApp.

**Formato de URL:**
```
https://tu-dominio.com/api/venta/comprobante/pdf/{ventaId}/{ruc}-{tipoComprobante}-{serie}-{correlativo}
```

**Ejemplo real:**
```
https://industriajvc.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607
```

---

## 🔧 ENDPOINTS DISPONIBLES

### 1. Generar URL Pública

**Endpoint:** `GET /api/ventas/{id}/url-publica`

**Autenticación:** Requerida (Bearer Token)

**Descripción:** Genera la URL pública para compartir el comprobante

#### Request:
```
GET /api/ventas/3/url-publica
Authorization: Bearer {token}
```

#### Response exitoso (200):
```json
{
  "success": true,
  "data": {
    "url_publica": "https://tu-dominio.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607",
    "numero_completo": "20538381978-03-B001-607",
    "venta_id": 3,
    "comprobante_id": 15,
    "tipo_comprobante": "03",
    "serie": "B001",
    "correlativo": 607
  }
}
```

#### Response error (404):
```json
{
  "success": false,
  "message": "Esta venta no tiene un comprobante electrónico"
}
```

---

### 2. Descargar PDF Público (Sin autenticación)

**Endpoint:** `GET /api/venta/comprobante/pdf/{ventaId}/{numeroCompleto}`

**Autenticación:** NO requerida (público)

**Descripción:** Descarga el PDF del comprobante sin necesidad de autenticación

#### Request:
```
GET /api/venta/comprobante/pdf/3/20538381978-03-B001-607
```

#### Response exitoso:
- Content-Type: `application/pdf`
- Content-Disposition: `inline; filename="comprobante-20538381978-03-B001-607.pdf"`
- Cache-Control: `public, max-age=3600`
- Body: Contenido binario del PDF

#### Response error (404):
```json
{
  "success": false,
  "message": "Esta venta no tiene un comprobante electrónico"
}
```

#### Response error (403):
```json
{
  "success": false,
  "message": "Número de comprobante no válido"
}
```

---

### 3. Enviar por WhatsApp (Actualizado)

**Endpoint:** `POST /api/ventas/{id}/whatsapp`

**Autenticación:** Requerida (Bearer Token)

**Descripción:** Genera el link de WhatsApp con la URL pública del comprobante

#### Request:
```json
{
  "telefono": "987654321",
  "mensaje": "Hola, aquí está tu comprobante"
}
```

#### Response exitoso (200):
```json
{
  "success": true,
  "message": "Comprobante enviado por WhatsApp exitosamente",
  "data": {
    "whatsapp_url": "https://wa.me/51987654321?text=Hola%2C%20aqu%C3%AD%20est%C3%A1%20tu%20comprobante%0A%0A%F0%9F%93%84%20Ver%20comprobante%3A%20https%3A%2F%2Ftu-dominio.com%2Fapi%2Fventa%2Fcomprobante%2Fpdf%2F3%2F20538381978-03-B001-607",
    "telefono": "51987654321",
    "mensaje": "Hola, aquí está tu comprobante\n\n📄 Ver comprobante: https://tu-dominio.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607",
    "comprobante": "20538381978-03-B001-607",
    "pdf_url": "https://tu-dominio.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607",
    "fecha_envio": "2025-10-31 15:30:00"
  }
}
```

---

## 🔐 SEGURIDAD

### Validaciones implementadas:

1. **Validación de número de comprobante:** La URL incluye el número completo del comprobante. Si no coincide con el de la base de datos, se rechaza el acceso.

2. **Validación de existencia:** Se verifica que la venta y el comprobante existan.

3. **Validación de PDF:** Se verifica que el comprobante tenga PDF generado.

4. **Sin autenticación:** La URL es pública para facilitar el compartir por WhatsApp, pero incluye el número completo como medida de seguridad.

### Formato del número completo:
```
{RUC}-{TIPO_COMPROBANTE}-{SERIE}-{CORRELATIVO}

Ejemplo:
20538381978-03-B001-607

Donde:
- 20538381978 = RUC del emisor
- 03 = Tipo de comprobante (01=Factura, 03=Boleta)
- B001 = Serie
- 607 = Correlativo
```

---

## 📱 FLUJO DE USO EN FRONTEND

### Paso 1: Obtener URL pública

```
Usuario hace clic en "Enviar por WhatsApp"
  ↓
Frontend llama: GET /api/ventas/{id}/url-publica
  ↓
Backend genera URL pública
  ↓
Frontend recibe: url_publica
```

### Paso 2: Enviar por WhatsApp

**Opción A: Abrir WhatsApp Web directamente**
```
Frontend construye URL de WhatsApp:
https://wa.me/{telefono}?text={mensaje_con_url_publica}

Frontend abre en nueva pestaña
```

**Opción B: Usar endpoint del backend**
```
Frontend llama: POST /api/ventas/{id}/whatsapp
Body: { telefono, mensaje }

Backend genera whatsapp_url

Frontend abre whatsapp_url en nueva pestaña
```

---

## 💡 EJEMPLOS DE USO

### Ejemplo 1: Generar URL y compartir manualmente

```
1. GET /api/ventas/3/url-publica
   
2. Copiar url_publica del response

3. Compartir URL por cualquier medio:
   - WhatsApp
   - Email
   - SMS
   - Redes sociales
```

### Ejemplo 2: Enviar automáticamente por WhatsApp

```
1. POST /api/ventas/3/whatsapp
   Body: {
     "telefono": "987654321",
     "mensaje": "Hola, aquí está tu comprobante"
   }

2. Obtener whatsapp_url del response

3. Abrir whatsapp_url en nueva pestaña:
   window.open(whatsapp_url, '_blank')
```

### Ejemplo 3: Compartir en redes sociales

```
URL pública puede compartirse en:
- Facebook
- Twitter
- LinkedIn
- Telegram
- Email
- SMS
```

---

## 🎨 MENSAJE DE WHATSAPP

### Formato del mensaje:

```
{mensaje_personalizado}

📄 Ver comprobante: {url_publica}
```

### Ejemplo real:

```
Hola Juan Pérez, aquí está tu comprobante electrónico B001-607

📄 Ver comprobante: https://industriajvc.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607
```

---

## 🔄 COMPARACIÓN: URL Pública vs URL Privada

| Aspecto | URL Pública | URL Privada |
|---------|-------------|-------------|
| **Autenticación** | No requerida | Requerida (Bearer Token) |
| **Formato** | `/api/venta/comprobante/pdf/{id}/{numero}` | `/api/ventas/{id}/pdf` |
| **Uso** | Compartir por WhatsApp/Email | Descargar desde panel admin |
| **Seguridad** | Validación por número completo | Validación por token |
| **Cache** | Sí (1 hora) | No |
| **Ejemplo** | `https://dominio.com/api/venta/comprobante/pdf/3/20538381978-03-B001-607` | `https://dominio.com/api/ventas/3/pdf` |

---

## ⚙️ CONFIGURACIÓN

### Variables de entorno necesarias:

```env
APP_URL=https://tu-dominio.com
```

La URL pública se genera automáticamente usando `url()` de Laravel, que toma el valor de `APP_URL`.

---

## 📊 LOGS Y AUDITORÍA

### Logs generados:

```php
// Al descargar PDF público
\Log::info('PDF público descargado', [
    'venta_id' => 3,
    'numero_completo' => '20538381978-03-B001-607',
    'ip' => '192.168.1.1',
    'user_agent' => 'WhatsApp/2.0'
]);

// Al enviar por WhatsApp
\Log::info('WhatsApp enviado', [
    'venta_id' => 3,
    'telefono' => '51987654321',
    'comprobante' => '20538381978-03-B001-607'
]);
```

### Tabla de notificaciones:

Se registra en `notificaciones_enviadas`:
- venta_id
- canal: 'whatsapp'
- destinatario: teléfono
- mensaje
- estado: 'ENVIADO' o 'ERROR'
- fecha_envio

---

## 🚀 VENTAJAS DE LA URL PÚBLICA

1. ✅ **Sin autenticación:** El cliente puede ver el PDF sin necesidad de login
2. ✅ **Compartible:** Se puede compartir por cualquier medio
3. ✅ **Segura:** Incluye validación por número completo
4. ✅ **Cacheable:** Mejora el rendimiento
5. ✅ **SEO friendly:** URL legible y descriptiva
6. ✅ **Compatible con WhatsApp:** Se puede previsualizar en el chat

---

## ⚠️ CONSIDERACIONES

### 1. Privacidad
- La URL es pública, cualquiera con el link puede ver el PDF
- No compartir URLs en lugares públicos
- Considerar implementar expiración de URLs si es necesario

### 2. Performance
- El PDF se cachea por 1 hora
- Considerar usar CDN para mejor rendimiento
- Monitorear el uso de ancho de banda

### 3. Seguridad adicional (opcional)
- Implementar tokens de un solo uso
- Implementar expiración de URLs
- Implementar rate limiting
- Registrar IPs que acceden

---

## 🔧 TROUBLESHOOTING

### Problema: URL no funciona

**Solución:**
1. Verificar que `APP_URL` esté configurado correctamente
2. Verificar que el comprobante tenga PDF generado
3. Verificar que el número completo coincida

### Problema: PDF no se muestra en WhatsApp

**Solución:**
1. Verificar que el Content-Type sea `application/pdf`
2. Verificar que el PDF no esté corrupto
3. Probar abrir la URL directamente en el navegador

### Problema: Error 403 (Forbidden)

**Solución:**
1. Verificar que el número completo en la URL sea correcto
2. Verificar que la venta exista
3. Verificar que el comprobante esté asociado a la venta

---

**Fecha de creación:** 2025-10-31  
**Versión:** 1.0  
**Autor:** Sistema de Facturación
