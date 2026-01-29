# 📚 API Completa - Sistema E-commerce con Facturación Electrónica

## 🌐 Base URL
```
Desarrollo:  http://localhost:8000/api
Producción:  https://api.tudominio.com/api
```

## 🔐 Autenticación
```
Authorization: Bearer {token}
```

---

## 📋 ÍNDICE COMPLETO DE ENDPOINTS

### 🔑 AUTENTICACIÓN
```
POST   /api/login                              - Iniciar sesión
POST   /api/register                           - Registrar usuario
POST   /api/logout                             - Cerrar sesión
GET    /api/user                               - Obtener usuario autenticado
POST   /api/refresh                            - Refrescar token
POST   /api/forgot-password                    - Solicitar recuperación de contraseña
POST   /api/reset-password                     - Restablecer contraseña
```

### 🧾 FACTURACIÓN Y VENTAS
```
# Ventas
GET    /api/ventas                             - Listar ventas
GET    /api/ventas/{id}                        - Detalle de venta
POST   /api/ventas                             - Crear venta
POST   /api/ventas/{id}/facturar               - Facturar venta existente
PUT    /api/ventas/{id}/anular                 - Anular venta
GET    /api/ventas/{id}/pdf                    - Descargar PDF
GET    /api/ventas/{id}/xml                    - Descargar XML
GET    /api/ventas/{id}/cdr                    - Descargar CDR
POST   /api/ventas/{id}/email                  - Enviar por email
POST   /api/ventas/{id}/reenviar-sunat         - Reenviar a SUNAT
POST   /api/ventas/{id}/consultar-sunat        - Consultar en SUNAT
GET    /api/ventas/mis-ventas                  - Ventas del cliente
POST   /api/ventas/ecommerce                   - Venta desde e-commerce

# Comprobantes
GET    /api/comprobantes                       - Listar comprobantes
GET    /api/comprobantes/{id}                  - Detalle de comprobante
POST   /api/comprobantes/{id}/reenviar         - Reenviar comprobante
POST   /api/comprobantes/{id}/consultar        - Consultar estado
GET    /api/comprobantes/{id}/xml              - Descargar XML
GET    /api/comprobantes/{id}/cdr              - Descargar CDR
GET    /api/comprobantes/{id}/pdf              - Descargar PDF
POST   /api/comprobantes/{id}/email            - Enviar por email
POST   /api/comprobantes/{id}/enviar-whatsapp  - Enviar por WhatsApp
PATCH  /api/comprobantes/{id}/anular           - Anular comprobante
GET    /api/comprobantes/estadisticas          - Estadísticas

# Series
GET    /api/series                             - Listar series
POST   /api/series                             - Crear serie
PATCH  /api/series/{id}                        - Actualizar serie
POST   /api/series/reservar-correlativo        - Reservar correlativo
GET    /api/series/estadisticas                - Estadísticas de series

# Notas de Crédito
POST   /api/notas-credito                      - Emitir nota de crédito
GET    /api/notas-credito                      - Listar notas de crédito
GET    /api/notas-credito/{id}                 - Detalle
GET    /api/notas-credito/{id}/pdf             - Descargar PDF

# Notas de Débito
POST   /api/notas-debito                       - Emitir nota de débito
GET    /api/notas-debito                       - Listar notas de débito

# Resúmenes y Bajas
POST   /api/facturacion/resumenes              - Crear resumen diario
GET    /api/facturacion/resumenes              - Listar resúmenes
GET    /api/facturacion/resumenes/{ticket}     - Consultar estado
POST   /api/facturacion/bajas                  - Comunicación de baja
GET    /api/facturacion/bajas                  - Listar bajas
GET    /api/facturacion/bajas/{ticket}         - Consultar estado

# Empresa Emisora
GET    /api/empresa-emisora                    - Obtener configuración
PUT    /api/empresa-emisora                    - Actualizar configuración
POST   /api/certificados                       - Subir certificado

# Certificados Digitales
GET    /api/facturacion/certificados           - Listar certificados
POST   /api/facturacion/certificados           - Subir certificado
GET    /api/facturacion/certificados/{id}/validar - Validar certificado
POST   /api/facturacion/certificados/{id}/activar - Activar certificado
DELETE /api/facturacion/certificados/{id}      - Eliminar certificado

# Auditoría y Reintentos
GET    /api/facturacion/auditoria              - Auditoría SUNAT
GET    /api/facturacion/reintentos             - Cola de reintentos
POST   /api/cola-reintentos/{id}/reintentar    - Reintentar operación
POST   /api/facturacion/reintentos/reintentar-todo - Procesar todos

# Utilidades
GET    /api/utilidades/validar-ruc/{ruc}       - Validar RUC con SUNAT
GET    /api/utilidades/buscar-empresa/{ruc}    - Buscar empresa
GET    /api/facturacion/status                 - Estado del sistema
GET    /api/health-check                       - Health check
GET    /api/facturacion/test/estado-sunat      - Test conexión SUNAT
GET    /api/facturacion/kpis                   - KPIs de facturación
GET    /api/facturacion/catalogos/{tipo}       - Catálogos SUNAT
```

### 📦 ALMACÉN Y PRODUCTOS
```
# Productos
GET    /api/productos                          - Listar productos
GET    /api/productos/{id}                     - Detalle de producto
POST   /api/productos                          - Crear producto
POST   /api/productos/{id}                     - Actualizar producto (_method=PUT)
PATCH  /api/productos/{id}/toggle-estado       - Cambiar estado
DELETE /api/productos/{id}                     - Eliminar producto
GET    /api/productos-publicos                 - Productos públicos
GET    /api/productos-publicos/{id}            - Detalle público
GET    /api/productos/{id}/detalles            - Obtener detalles
POST   /api/productos/{id}/detalles            - Guardar detalles
DELETE /api/productos/{id}/detalles/imagenes   - Eliminar imagen
PATCH  /api/productos/{id}/toggle-destacado    - Marcar destacado
GET    /api/productos-destacados               - Productos destacados

# Categorías
GET    /api/categorias                         - Listar categorías
GET    /api/categorias/{id}                    - Detalle de categoría
POST   /api/categorias                         - Crear categoría
POST   /api/categorias/{id}                    - Actualizar (_method=PUT)
PATCH  /api/categorias/{id}/toggle-estado      - Cambiar estado
DELETE /api/categorias/{id}                    - Eliminar categoría
GET    /api/categorias-sidebar                 - Categorías para sidebar
PATCH  /api/categorias/{id}/migrar-seccion     - Migrar a otra sección

# Marcas
GET    /api/marcas                             - Listar marcas
GET    /api/marcas/{id}                        - Detalle de marca
POST   /api/marcas                             - Crear marca
POST   /api/marcas/{id}                        - Actualizar (_method=PUT)
PATCH  /api/marcas/{id}/toggle-estado          - Cambiar estado
DELETE /api/marcas/{id}                        - Eliminar marca
GET    /api/marcas/activas                     - Marcas activas
GET    /api/marcas/publicas                    - Marcas públicas
GET    /api/marcas/por-categoria               - Marcas por categoría

# Secciones
GET    /api/secciones                          - Listar secciones
POST   /api/secciones                          - Crear sección
PUT    /api/secciones/{id}                     - Actualizar sección
DELETE /api/secciones/{id}                     - Eliminar sección

# Cupones
POST   /api/cupones/validar                    - Validar cupón
```

### 👥 CLIENTES
```
GET    /api/clientes                           - Listar clientes
POST   /api/clientes                           - Crear cliente
PUT    /api/clientes/{id}                      - Actualizar cliente
GET    /api/clientes/buscar-por-documento      - Buscar por documento
GET    /api/clientes/{tipo}/{numero}           - Obtener por tipo y número
```

### 📧 NOTIFICACIONES
```
GET    /api/notificaciones                     - Listar notificaciones
POST   /api/notificaciones/enviar              - Enviar notificación
GET    /api/notificaciones/plantillas          - Listar plantillas
GET    /api/notificaciones/plantillas/{id}     - Detalle de plantilla
POST   /api/notificaciones/plantillas          - Crear plantilla
PUT    /api/notificaciones/plantillas/{id}     - Actualizar plantilla
DELETE /api/notificaciones/plantillas/{id}     - Eliminar plantilla
GET    /api/notificaciones/estadisticas        - Estadísticas
```

### 🏢 EMPRESA
```
GET    /api/empresa-info                       - Información de empresa
POST   /api/empresa-info                       - Crear información
POST   /api/empresa-info/{id}                  - Actualizar (_method=PUT)
GET    /api/empresa-info/{id}                  - Obtener por ID
GET    /api/empresa-info/publica               - Info pública
GET    /api/facturacion/empresa                - Datos para facturación
PUT    /api/facturacion/empresa                - Actualizar datos
```

### 🎨 PERSONALIZACIÓN
```
# Banners
GET    /api/banners                            - Listar banners
POST   /api/banners                            - Crear banner
POST   /api/banners/{id}                       - Actualizar (_method=PUT)
DELETE /api/banners/{id}                       - Eliminar banner
GET    /api/banners/publicos                   - Banners públicos

# Pop-ups
GET    /api/popups                             - Listar pop-ups
POST   /api/popups                             - Crear pop-up
POST   /api/popups/{id}                        - Actualizar (_method=PUT)
DELETE /api/popups/{id}                        - Eliminar pop-up
GET    /api/popups/activos                     - Pop-ups activos
```

### 🎁 RECOMPENSAS
```
# Programas de Recompensas
GET    /api/programas-recompensas              - Listar programas
POST   /api/programas-recompensas              - Crear programa
PUT    /api/programas-recompensas/{id}         - Actualizar programa
DELETE /api/programas-recompensas/{id}         - Eliminar programa
POST   /api/programas-recompensas/{id}/activar - Activar/desactivar

# Puntos de Clientes
GET    /api/puntos-clientes                    - Puntos de clientes
GET    /api/puntos-clientes/{clienteId}        - Puntos por cliente
POST   /api/puntos-clientes/asignar            - Asignar puntos
POST   /api/puntos-clientes/canjear            - Canjear puntos
GET    /api/puntos-clientes/historial/{clienteId} - Historial de puntos
GET    /api/mis-puntos                         - Mis puntos (cliente autenticado)
```

### 📄 DOCUMENTOS
```
GET    /api/mis-documentos                     - Documentos del cliente
GET    /api/mis-documentos/{id}                - Detalle de documento
GET    /api/mis-documentos/{id}/descargar      - Descargar documento
```

### 📊 REPORTES Y ESTADÍSTICAS
```
GET    /api/reportes/ventas                    - Reporte de ventas
GET    /api/reportes/productos                 - Reporte de productos
GET    /api/reportes/clientes                  - Reporte de clientes
GET    /api/reportes/facturacion               - Reporte de facturación
GET    /api/dashboard/kpis                     - KPIs del dashboard
```

---

## 📝 MODELOS DE DATOS PRINCIPALES

### Venta
```json
{
  "id": 100,
  "codigo_venta": "V-2025-100",
  "cliente_id": 1,
  "fecha_venta": "2025-10-23 10:30:00",
  "subtotal": "169.49",
  "igv": "30.51",
  "descuento_total": "0.00",
  "total": "200.00",
  "estado": "FACTURADO",
  "metodo_pago": "efectivo",
  "observaciones": "Venta de prueba",
  "comprobante_id": 50
}
```

### Comprobante
```json
{
  "id": 50,
  "tipo_comprobante": "03",
  "serie": "B001",
  "correlativo": "6",
  "numero_completo": "B001-6",
  "fecha_emision": "2025-10-23",
  "cliente_tipo_documento": "1",
  "cliente_numero_documento": "12345678",
  "cliente_razon_social": "JUAN PEREZ",
  "moneda": "PEN",
  "operacion_gravada": "169.49",
  "total_igv": "30.51",
  "importe_total": "200.00",
  "estado": "ACEPTADO",
  "xml_firmado": "<?xml...",
  "pdf_base64": "JVBERi0...",
  "codigo_hash": "abc123...",
  "mensaje_sunat": "El comprobante ha sido aceptado"
}
```

### Producto
```json
{
  "id": 1,
  "codigo_producto": "PROD-001",
  "nombre": "Laptop HP",
  "descripcion": "Laptop con Intel i7",
  "precio_compra": "2500.00",
  "precio_venta": "3500.00",
  "stock": 10,
  "stock_minimo": 5,
  "categoria_id": 1,
  "marca_id": 1,
  "seccion_id": 1,
  "activo": true,
  "destacado": true,
  "imagen_url": "http://..."
}
```

### Cliente
```json
{
  "id": 1,
  "tipo_documento": "1",
  "numero_documento": "12345678",
  "razon_social": "JUAN PEREZ",
  "nombre_comercial": "JUAN",
  "direccion": "AV. PRINCIPAL 123",
  "email": "juan@email.com",
  "telefono": "987654321",
  "activo": true,
  "puntos_acumulados": 150
}
```

---

## 🔄 CÓDIGOS DE ESTADO HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 204 | No Content - Solicitud exitosa sin contenido |
| 400 | Bad Request - Solicitud incorrecta |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 422 | Validation Error - Error de validación |
| 500 | Server Error - Error del servidor |

---

## 🚀 EJEMPLOS DE USO

### Ejemplo Completo: Flujo de Venta en POS

```bash
# 1. Autenticarse
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# 2. Buscar cliente
curl -X GET "http://localhost:8000/api/clientes/buscar-por-documento?numero_documento=12345678" \
  -H "Authorization: Bearer {token}"

# 3. Listar productos
curl -X GET "http://localhost:8000/api/productos?estado=activo" \
  -H "Authorization: Bearer {token}"

# 4. Crear venta con facturación
curl -X POST "http://localhost:8000/api/ventas" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "productos": [
      {"producto_id": 10, "cantidad": 2, "precio_unitario": 100}
    ],
    "metodo_pago": "efectivo",
    "requiere_factura": true
  }'

# 5. Descargar PDF
curl -X GET "http://localhost:8000/api/ventas/100/pdf" \
  -H "Authorization: Bearer {token}" \
  --output comprobante.pdf
```

---

## 📚 DOCUMENTACIÓN DETALLADA

Para más detalles sobre cada módulo, consulta:

- **[FACTURACION-API.md](./FACTURACION-API.md)** - API de Facturación Electrónica
- **[VENTAS-API.md](./VENTAS-API.md)** - API de Ventas y POS
- **[ALMACEN-API.md](./ALMACEN-API.md)** - API de Almacén y Productos
- **[NOTIFICACIONES-API.md](./NOTIFICACIONES-API.md)** - API de Notificaciones
- **[EMPRESA-API.md](./EMPRESA-API.md)** - API de Empresa

---

**Última actualización:** 2025-10-23
**Versión:** 2.0.0
**Total de Endpoints:** 150+
