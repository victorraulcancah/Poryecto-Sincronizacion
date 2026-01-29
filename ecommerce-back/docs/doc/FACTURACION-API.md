# 🧾 API de Facturación Electrónica SUNAT

## 📋 Índice
- [Empresa Emisora](#empresa-emisora)
- [Series y Correlativos](#series-y-correlativos)
- [Ventas y Comprobantes](#ventas-y-comprobantes)
- [Notas de Crédito](#notas-de-crédito)
- [Notas de Débito](#notas-de-débito)
- [Resúmenes Diarios](#resúmenes-diarios)
- [Comunicaciones de Baja](#comunicaciones-de-baja)
- [Certificados Digitales](#certificados-digitales)
- [Auditoría y Reintentos](#auditoría-y-reintentos)

---

## 🏢 EMPRESA EMISORA

### Obtener Configuración del Emisor
```http
GET /api/empresa-emisora
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "id": 1,
  "ruc": "20123456789",
  "razon_social": "MI EMPRESA S.A.C.",
  "nombre_comercial": "MI EMPRESA",
  "direccion": "AV. PRINCIPAL 123",
  "distrito": "LIMA",
  "provincia": "LIMA",
  "departamento": "LIMA",
  "ubigeo": "150101",
  "telefono": "01-1234567",
  "email": "facturacion@miempresa.com",
  "certificado_activo": true,
  "certificado_vigencia": "2026-12-31"
}
```

### Actualizar Configuración del Emisor
```http
PUT /api/empresa-emisora
Authorization: Bearer {token}
Content-Type: application/json

{
  "ruc": "20123456789",
  "razon_social": "MI EMPRESA S.A.C.",
  "direccion": "AV. PRINCIPAL 123",
  "distrito": "LIMA",
  "provincia": "LIMA",
  "departamento": "LIMA",
  "ubigeo": "150101",
  "telefono": "01-1234567",
  "email": "facturacion@miempresa.com"
}
```

### Subir Certificado Digital
```http
POST /api/certificados
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "certificado": File,
  "password": "password_del_certificado",
  "descripcion": "Certificado de producción 2025"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Certificado cargado exitosamente",
  "data": {
    "id": 1,
    "nombre": "certificado_2025.pfx",
    "vigencia_desde": "2025-01-01",
    "vigencia_hasta": "2026-12-31",
    "estado": "activo"
  }
}
```

---

## 📝 SERIES Y CORRELATIVOS

### Listar Series
```http
GET /api/series?estado=activo&tipo_comprobante=03
Authorization: Bearer {token}
```

**Parámetros:**
- `estado` (opcional): `activo`, `inactivo`
- `tipo_comprobante` (opcional): `01` (Factura), `03` (Boleta), `07` (Nota Crédito), `08` (Nota Débito)

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo_comprobante": "03",
      "serie": "B001",
      "correlativo_actual": 5,
      "correlativo_inicio": 1,
      "correlativo_fin": 99999999,
      "activo": true,
      "descripcion": "Boletas de venta"
    }
  ]
}
```

### Crear Nueva Serie
```http
POST /api/series
Authorization: Bearer {token}
Content-Type: application/json

{
  "tipo_comprobante": "03",
  "serie": "B002",
  "correlativo_inicio": 1,
  "correlativo_fin": 99999999,
  "descripcion": "Boletas sucursal 2",
  "activo": true
}
```

### Actualizar Serie
```http
PATCH /api/series/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "descripcion": "Serie actualizada",
  "activo": false
}
```

### Reservar Correlativo
```http
POST /api/series/reservar-correlativo
Authorization: Bearer {token}
Content-Type: application/json

{
  "serie_id": 1
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "serie": "B001",
    "correlativo": 6,
    "numero_completo": "B001-6"
  }
}
```

### Estadísticas de Series
```http
GET /api/series/estadisticas
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": {
    "total_series": 4,
    "series_activas": 3,
    "comprobantes_emitidos_mes": 150,
    "por_tipo": {
      "01": 50,
      "03": 100
    }
  }
}
```

---

## 🛒 VENTAS Y COMPROBANTES

### Crear Venta (con Facturación Automática)
```http
POST /api/ventas
Authorization: Bearer {token}
Content-Type: application/json

{
  "cliente_id": 1,
  "productos": [
    {
      "producto_id": 10,
      "cantidad": 2,
      "precio_unitario": 100.00,
      "descuento_unitario": 5.00
    }
  ],
  "descuento_total": 0,
  "metodo_pago": "efectivo",
  "observaciones": "Entrega inmediata",
  "requiere_factura": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Venta registrada y comprobante generado exitosamente",
  "data": {
    "venta": {
      "id": 100,
      "codigo_venta": "V-2025-100",
      "fecha_venta": "2025-10-23 10:30:00",
      "subtotal": "160.68",
      "igv": "28.92",
      "total": "189.60",
      "estado": "FACTURADO"
    },
    "comprobante": {
      "id": 50,
      "tipo_comprobante": "03",
      "serie": "B001",
      "correlativo": "6",
      "numero_completo": "B001-6",
      "fecha_emision": "2025-10-23",
      "estado": "ACEPTADO",
      "xml_firmado": true,
      "pdf_generado": true,
      "enviado_sunat": true,
      "mensaje_sunat": "El comprobante ha sido aceptado"
    }
  }
}
```

### Facturar Venta Existente
```http
POST /api/ventas/{id}/facturar
Authorization: Bearer {token}
Content-Type: application/json

{
  "cliente_datos": {
    "tipo_documento": "6",
    "numero_documento": "20123456789",
    "razon_social": "EMPRESA CLIENTE S.A.C.",
    "direccion": "AV. CLIENTE 456",
    "email": "cliente@empresa.com"
  }
}
```

### Obtener Detalle de Venta
```http
GET /api/ventas/{id}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": {
    "id": 100,
    "codigo_venta": "V-2025-100",
    "fecha_venta": "2025-10-23 10:30:00",
    "cliente": {
      "id": 1,
      "tipo_documento": "1",
      "numero_documento": "12345678",
      "razon_social": "JUAN PEREZ"
    },
    "detalles": [
      {
        "producto_id": 10,
        "codigo_producto": "PROD-001",
        "nombre_producto": "Laptop HP",
        "cantidad": 2,
        "precio_unitario": "100.00",
        "descuento_unitario": "5.00",
        "subtotal_linea": "160.68",
        "igv_linea": "28.92",
        "total_linea": "189.60"
      }
    ],
    "subtotal": "160.68",
    "igv": "28.92",
    "descuento_total": "0.00",
    "total": "189.60",
    "metodo_pago": "efectivo",
    "estado": "FACTURADO",
    "comprobante": {
      "id": 50,
      "numero_completo": "B001-6",
      "estado": "ACEPTADO",
      "tiene_xml": true,
      "tiene_pdf": true,
      "tiene_cdr": true
    }
  }
}
```

### Listar Ventas
```http
GET /api/ventas?estado=FACTURADO&fecha_inicio=2025-01-01&fecha_fin=2025-12-31&page=1
Authorization: Bearer {token}
```

**Parámetros:**
- `estado`: `PENDIENTE`, `FACTURADO`, `ANULADO`
- `fecha_inicio`: Formato `YYYY-MM-DD`
- `fecha_fin`: Formato `YYYY-MM-DD`
- `search`: Búsqueda por código, cliente, etc.
- `page`: Número de página
- `per_page`: Registros por página (default: 15)

### Descargar PDF del Comprobante
```http
GET /api/ventas/{id}/pdf
Authorization: Bearer {token}
```

**Respuesta:** Archivo PDF (application/pdf)

### Descargar XML Firmado
```http
GET /api/ventas/{id}/xml
Authorization: Bearer {token}
```

**Respuesta:** Archivo XML (application/xml)

### Descargar CDR (Constancia de Recepción SUNAT)
```http
GET /api/ventas/{id}/cdr
Authorization: Bearer {token}
```

**Respuesta:** Archivo ZIP (application/zip)

### Enviar Comprobante por Email
```http
POST /api/ventas/{id}/email
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "cliente@email.com",
  "mensaje": "Adjunto encontrará su comprobante electrónico"
}
```

### Anular Venta
```http
PUT /api/ventas/{id}/anular
Authorization: Bearer {token}
Content-Type: application/json

{
  "motivo": "Error en el registro"
}
```

**Nota:** Esta operación restaura el stock y marca la venta como ANULADA.

### Reenviar Comprobante a SUNAT
```http
POST /api/ventas/{id}/reenviar-sunat
Authorization: Bearer {token}
```

### Consultar Estado en SUNAT
```http
POST /api/ventas/{id}/consultar-sunat
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "estado": "ACEPTADO",
    "codigo_sunat": "0",
    "mensaje_sunat": "La Factura número B001-6, ha sido aceptada",
    "fecha_consulta": "2025-10-23 11:00:00"
  }
}
```

---

## 📄 COMPROBANTES

### Listar Comprobantes
```http
GET /api/comprobantes?tipo=03&estado=ACEPTADO&cliente_id=1
Authorization: Bearer {token}
```

**Parámetros:**
- `tipo`: `01`, `03`, `07`, `08`
- `estado`: `PENDIENTE`, `ACEPTADO`, `RECHAZADO`, `ANULADO`
- `cliente_id`: ID del cliente
- `fecha_inicio`: Formato `YYYY-MM-DD`
- `fecha_fin`: Formato `YYYY-MM-DD`

### Obtener Comprobante por ID
```http
GET /api/comprobantes/{id}
Authorization: Bearer {token}
```

### Reenviar Comprobante
```http
POST /api/comprobantes/{id}/reenviar
Authorization: Bearer {token}
```

### Consultar Estado en SUNAT
```http
POST /api/comprobantes/{id}/consultar
Authorization: Bearer {token}
```

### Anular Comprobante
```http
PATCH /api/comprobantes/{id}/anular
Authorization: Bearer {token}
Content-Type: application/json

{
  "motivo": "Error en emisión"
}
```

**Nota:** Esta operación genera una Comunicación de Baja para SUNAT.

### Estadísticas de Comprobantes
```http
GET /api/comprobantes/estadisticas?fecha_inicio=2025-01-01&fecha_fin=2025-12-31
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": {
    "total_comprobantes": 150,
    "por_tipo": {
      "01": 50,
      "03": 100
    },
    "por_estado": {
      "ACEPTADO": 145,
      "RECHAZADO": 3,
      "PENDIENTE": 2
    },
    "total_facturado": "50000.00",
    "comprobantes_mes_actual": 25
  }
}
```

---

## 💳 NOTAS DE CRÉDITO

### Emitir Nota de Crédito
```http
POST /api/notas-credito
Authorization: Bearer {token}
Content-Type: application/json

{
  "comprobante_referencia_id": 50,
  "motivo_nota": "01",
  "motivo_nota_descripcion": "Anulación de la operación",
  "productos": [
    {
      "producto_id": 10,
      "cantidad": 2,
      "precio_unitario": 100.00
    }
  ]
}
```

**Motivos de Nota de Crédito (Catálogo 09 SUNAT):**
- `01`: Anulación de la operación
- `02`: Anulación por error en el RUC
- `03`: Corrección por error en la descripción
- `04`: Descuento global
- `05`: Descuento por ítem
- `06`: Devolución total
- `07`: Devolución por ítem
- `08`: Bonificación
- `09`: Disminución en el valor
- `10`: Otros conceptos

**Respuesta:**
```json
{
  "success": true,
  "message": "Nota de crédito generada exitosamente",
  "data": {
    "id": 51,
    "tipo_comprobante": "07",
    "serie": "BC01",
    "correlativo": "1",
    "numero_completo": "BC01-1",
    "comprobante_afectado": "B001-6",
    "motivo": "01",
    "estado": "ACEPTADO",
    "total": "189.60"
  }
}
```

### Listar Notas de Crédito
```http
GET /api/notas-credito?page=1
Authorization: Bearer {token}
```

### Obtener Nota de Crédito por ID
```http
GET /api/notas-credito/{id}
Authorization: Bearer {token}
```

### Descargar PDF de Nota de Crédito
```http
GET /api/notas-credito/{id}/pdf
Authorization: Bearer {token}
```

---

## 📈 NOTAS DE DÉBITO

### Emitir Nota de Débito
```http
POST /api/notas-debito
Authorization: Bearer {token}
Content-Type: application/json

{
  "comprobante_referencia_id": 50,
  "motivo_nota": "01",
  "motivo_nota_descripcion": "Intereses por mora",
  "productos": [
    {
      "descripcion": "Intereses por mora",
      "cantidad": 1,
      "precio_unitario": 50.00
    }
  ]
}
```

**Motivos de Nota de Débito (Catálogo 10 SUNAT):**
- `01`: Intereses por mora
- `02`: Aumento en el valor
- `03`: Penalidades/otros conceptos

**Respuesta:**
```json
{
  "success": true,
  "message": "Nota de débito generada exitosamente",
  "data": {
    "id": 52,
    "tipo_comprobante": "08",
    "serie": "BD01",
    "correlativo": "1",
    "numero_completo": "BD01-1",
    "comprobante_afectado": "B001-6",
    "motivo": "01",
    "estado": "ACEPTADO",
    "total": "59.00"
  }
}
```

### Listar Notas de Débito
```http
GET /api/notas-debito?page=1
Authorization: Bearer {token}
```

---

## 📊 RESÚMENES DIARIOS

Los Resúmenes Diarios se usan para reportar boletas de venta emitidas en contingencia.

### Crear Resumen Diario
```http
POST /api/facturacion/resumenes
Authorization: Bearer {token}
Content-Type: application/json

{
  "fecha_resumen": "2025-10-23",
  "comprobantes_ids": [50, 51, 52]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Resumen diario enviado exitosamente",
  "data": {
    "fecha": "2025-10-23",
    "cantidad_comprobantes": 3,
    "ticket": "1234567890",
    "estado": "EN_PROCESO"
  }
}
```

### Listar Resúmenes
```http
GET /api/facturacion/resumenes
Authorization: Bearer {token}
```

### Consultar Estado de Resumen
```http
GET /api/facturacion/resumenes/{ticket}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "ticket": "1234567890",
    "estado": "ACEPTADO",
    "codigo_sunat": "0",
    "mensaje_sunat": "Resumen procesado correctamente"
  }
}
```

---

## 🗑️ COMUNICACIONES DE BAJA

### Enviar Comunicación de Baja
```http
POST /api/facturacion/bajas
Authorization: Bearer {token}
Content-Type: application/json

{
  "comprobantes_ids": [50, 51],
  "motivo": "Error en emisión"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Comunicación de baja enviada exitosamente",
  "data": {
    "cantidad_comprobantes": 2,
    "motivo": "Error en emisión",
    "ticket": "9876543210",
    "estado": "EN_PROCESO"
  }
}
```

### Listar Comunicaciones de Baja
```http
GET /api/facturacion/bajas
Authorization: Bearer {token}
```

### Consultar Estado de Baja
```http
GET /api/facturacion/bajas/{ticket}
Authorization: Bearer {token}
```

---

## 🔐 CERTIFICADOS DIGITALES

### Listar Certificados
```http
GET /api/facturacion/certificados
Authorization: Bearer {token}
```

### Subir Certificado
```http
POST /api/facturacion/certificados
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "certificado": File (.pfx o .p12),
  "password": "password123",
  "descripcion": "Certificado de producción"
}
```

### Validar Certificado
```http
GET /api/facturacion/certificados/{id}/validar
Authorization: Bearer {token}
```

### Activar Certificado
```http
POST /api/facturacion/certificados/{id}/activar
Authorization: Bearer {token}
```

### Eliminar Certificado
```http
DELETE /api/facturacion/certificados/{id}
Authorization: Bearer {token}
```

---

## 🔍 AUDITORÍA Y REINTENTOS

### Obtener Auditoría SUNAT
```http
GET /api/facturacion/auditoria?fecha_inicio=2025-01-01&fecha_fin=2025-12-31
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "comprobante_id": 50,
      "accion": "ENVIO_SUNAT",
      "request_xml": "<?xml...",
      "response_xml": "<?xml...",
      "codigo_respuesta": "0",
      "mensaje_respuesta": "Aceptado",
      "tiempo_respuesta_ms": 1250,
      "fecha_operacion": "2025-10-23 10:30:00",
      "usuario_id": 1,
      "ip_origen": "192.168.1.100"
    }
  ]
}
```

### Obtener Cola de Reintentos
```http
GET /api/facturacion/reintentos
Authorization: Bearer {token}
```

### Reintentar Operación
```http
POST /api/cola-reintentos/{id}/reintentar
Authorization: Bearer {token}
```

### Procesar Todos los Reintentos
```http
POST /api/facturacion/reintentos/reintentar-todo
Authorization: Bearer {token}
```

---

## 🎯 UTILIDADES

### Validar RUC con SUNAT
```http
GET /api/utilidades/validar-ruc/{ruc}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "ruc": "20123456789",
    "razon_social": "MI EMPRESA S.A.C.",
    "estado": "ACTIVO",
    "condicion": "HABIDO",
    "direccion": "AV. PRINCIPAL 123 - LIMA - LIMA - LIMA",
    "ubigeo": "150101"
  }
}
```

### Verificar Estado del Sistema
```http
GET /api/facturacion/status
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "sistema": "OPERATIVO",
    "ambiente": "BETA",
    "conexion_sunat": true,
    "certificado_activo": true,
    "certificado_vigencia": "2026-12-31",
    "series_configuradas": 4,
    "ultima_factura": "B001-6"
  }
}
```

### Verificar Conexión con SUNAT
```http
GET /api/facturacion/test/estado-sunat
Authorization: Bearer {token}
```

---

## ⚡ KPIs y Dashboard

### Obtener KPIs de Facturación
```http
GET /api/facturacion/kpis?fecha_inicio=2025-01-01&fecha_fin=2025-12-31
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": {
    "total_facturado": "150000.00",
    "comprobantes_emitidos": 150,
    "tasa_aceptacion": 97.33,
    "tasa_rechazo": 2.67,
    "tiempo_promedio_respuesta_ms": 1500,
    "por_tipo": {
      "facturas": {
        "cantidad": 50,
        "monto": "50000.00"
      },
      "boletas": {
        "cantidad": 100,
        "monto": "100000.00"
      }
    },
    "ultimos_7_dias": [
      {
        "fecha": "2025-10-23",
        "cantidad": 10,
        "monto": "5000.00"
      }
    ]
  }
}
```

---

## 🚨 Códigos de Error SUNAT Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 0100 | El sistema no puede responder | Reintentar en unos minutos |
| 0101 | El encabezado de seguridad no es válido | Verificar certificado |
| 0102 | El certificado no es válido | Renovar certificado |
| 2000 | No se puede leer el archivo XML | Verificar estructura del XML |
| 2001 | RUC del emisor no existe | Verificar RUC de la empresa |
| 2010 | El número de RUC del archivo no corresponde al RUC del certificado | Verificar concordancia RUC-Certificado |
| 2324 | El documento electrónico ya ha sido enviado | El comprobante ya existe en SUNAT |
| 3127 | Código de detracción requerido | Agregar código de detracción |

---

**Última actualización:** 2025-10-23
**Versión:** 2.0.0
