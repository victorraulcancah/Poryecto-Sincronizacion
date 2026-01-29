# API de Contabilidad

Sistema completo de gestión contable, cajas, cuentas y reportes financieros.

**Base URL:** `/api/contabilidad`

**Autenticación:** Todas las rutas requieren `auth:sanctum`

---

## 👥 Roles y Acceso Rápido

| Rol | Acceso Principal | Permisos |
|-----|------------------|----------|
| **Superadmin / Admin / Gerente / Contador** | Acceso total | 28 permisos completos |
| **Cajero** | Solo cajas | Apertura, cierre y transacciones |
| **Vendedor** | CxC y reportes | Ver y cobrar cuentas por cobrar |
| **Compras** | Proveedores y CxP | Gestión de compras y pagos |

📖 Ver [Permisos y Roles Detallados](#permisos-y-roles-del-sistema)

---

## Índice

1. [Cajas](#cajas)
2. [Caja Chica](#caja-chica)
3. [Flujo de Caja](#flujo-de-caja)
4. [Kardex](#kardex)
5. [Cuentas por Cobrar](#cuentas-por-cobrar)
6. [Cuentas por Pagar](#cuentas-por-pagar)
7. [Proveedores](#proveedores)
8. [Reportes Contables](#reportes-contables)
9. [Utilidades y Rentabilidad](#utilidades-y-rentabilidad)
10. [Vouchers](#vouchers)
11. [Exportaciones](#exportaciones)
12. [Permisos y Roles](#permisos-y-roles-del-sistema)

---

## Cajas

Control de efectivo diario por punto de venta.

### Listar Cajas

```http
GET /api/contabilidad/cajas
```

**Permisos:** `contabilidad.cajas.ver`

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Caja Principal",
    "codigo": "CAJ-001",
    "tienda_id": 1,
    "activo": true,
    "tienda": { "id": 1, "nombre": "Tienda Central" },
    "movimientoActual": {
      "id": 5,
      "fecha": "2026-01-12",
      "monto_inicial": 500.00,
      "estado": "ABIERTA"
    }
  }
]
```


### Crear Caja

```http
POST /api/contabilidad/cajas
```

**Permisos:** `contabilidad.cajas.crear`

**Body:**
```json
{
  "nombre": "Caja Sucursal Norte",
  "tienda_id": 2,
  "activo": true
}
```

**Respuesta:** `201 Created`
```json
{
  "id": 2,
  "nombre": "Caja Sucursal Norte",
  "codigo": "CAJ-002",
  "tienda_id": 2,
  "activo": true
}
```

### Ver Detalle de Caja

```http
GET /api/contabilidad/cajas/{id}
```

**Permisos:** `contabilidad.cajas.ver`

### Actualizar Caja

```http
PUT /api/contabilidad/cajas/{id}
```

**Permisos:** `contabilidad.cajas.editar`

**Body:**
```json
{
  "nombre": "Caja Principal Actualizada",
  "activo": false
}
```

### Cajas Abiertas

```http
GET /api/contabilidad/cajas/abiertas
```

**Permisos:** `contabilidad.cajas.ver`

**Respuesta:** Lista de cajas con movimiento activo (estado ABIERTA).


### Estado Actual de Caja

```http
GET /api/contabilidad/cajas/{id}/estado
```

**Permisos:** `contabilidad.cajas.ver`

**Respuesta:**
```json
{
  "caja_id": 1,
  "nombre": "Caja Principal",
  "estado": "ABIERTA",
  "movimiento": {
    "id": 5,
    "fecha": "2026-01-12",
    "monto_inicial": 500.00,
    "user_id": 1
  }
}
```

### Aperturar Caja

```http
POST /api/contabilidad/cajas/{id}/aperturar
```

**Permisos:** `contabilidad.cajas.crear`

**Body:**
```json
{
  "monto_inicial": 500.00,
  "observaciones": "Apertura del día"
}
```

**Respuesta:** `201 Created`

**Validaciones:**
- La caja no debe estar ya abierta
- El monto inicial debe ser >= 0

### Cerrar Caja

```http
POST /api/contabilidad/cajas/{id}/cerrar
```

**Permisos:** `contabilidad.cajas.editar`

**Body:**
```json
{
  "monto_final": 1250.00,
  "observaciones": "Cierre del día"
}
```

**Respuesta:**
```json
{
  "id": 5,
  "monto_inicial": 500.00,
  "monto_final": 1250.00,
  "monto_sistema": 1245.00,
  "diferencia": 5.00,
  "estado": "CERRADA"
}
```


### Registrar Transacción

```http
POST /api/contabilidad/cajas/{id}/transacciones
```

**Permisos:** `contabilidad.cajas.crear`

**Body:**
```json
{
  "tipo": "INGRESO",
  "categoria": "VENTA",
  "monto": 150.00,
  "metodo_pago": "EFECTIVO",
  "referencia": "V-001",
  "venta_id": 123,
  "descripcion": "Venta de productos"
}
```

**Campos:**
- `tipo`: `INGRESO` | `EGRESO`
- `categoria`: `VENTA` | `COBRO` | `GASTO` | `RETIRO` | `OTRO`
- `metodo_pago`: Texto libre (EFECTIVO, TARJETA, YAPE, etc.)
- `venta_id`: Opcional, ID de venta relacionada
- `comprobante_id`: Opcional, ID de comprobante

**Respuesta:** `201 Created`

### Historial de Transacciones

```http
GET /api/contabilidad/cajas/{id}/transacciones
```

**Permisos:** `contabilidad.cajas.ver`

**Respuesta:**
```json
{
  "movimiento": { "id": 5, "fecha": "2026-01-12" },
  "transacciones": [
    {
      "id": 1,
      "tipo": "INGRESO",
      "categoria": "VENTA",
      "monto": 150.00,
      "metodo_pago": "EFECTIVO",
      "created_at": "2026-01-12T10:30:00"
    }
  ],
  "resumen": {
    "monto_inicial": 500.00,
    "total_ingresos": 750.00,
    "total_egresos": 50.00,
    "saldo_actual": 1200.00
  }
}
```


### Anular Transacción

```http
DELETE /api/contabilidad/cajas/{id}/transacciones/{txId}
```

**Permisos:** `contabilidad.cajas.eliminar`

**Respuesta:**
```json
{
  "message": "Transacción anulada correctamente"
}
```

### Reporte del Día

```http
GET /api/contabilidad/cajas/{id}/reporte
```

**Permisos:** `contabilidad.cajas.ver`

**Respuesta:**
```json
{
  "movimiento": {
    "id": 5,
    "fecha": "2026-01-12",
    "monto_inicial": 500.00,
    "monto_final": 1250.00
  },
  "resumen": {
    "monto_inicial": 500.00,
    "total_ingresos": 800.00,
    "total_egresos": 50.00,
    "monto_sistema": 1250.00,
    "monto_final": 1250.00,
    "diferencia": 0.00
  },
  "por_metodo_pago": [
    { "metodo_pago": "EFECTIVO", "total": 600.00 },
    { "metodo_pago": "TARJETA", "total": 200.00 }
  ]
}
```

---

## Caja Chica

Gestión de gastos menores y fondos fijos.

### Listar Cajas Chicas

```http
GET /api/contabilidad/caja-chica
```

**Permisos:** `contabilidad.caja_chica.ver`

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Caja Chica Administración",
    "codigo": "CCH-001",
    "fondo_fijo": 1000.00,
    "saldo_actual": 650.00,
    "responsable_id": 2,
    "activo": true
  }
]
```


### Crear Caja Chica

```http
POST /api/contabilidad/caja-chica
```

**Permisos:** `contabilidad.caja_chica.crear`

**Body:**
```json
{
  "nombre": "Caja Chica Ventas",
  "fondo_fijo": 500.00,
  "responsable_id": 3,
  "activo": true
}
```

**Respuesta:** `201 Created` - El código se genera automáticamente (CCH-002, CCH-003, etc.)

### Ver Detalle

```http
GET /api/contabilidad/caja-chica/{id}
```

**Permisos:** `contabilidad.caja_chica.ver`

### Consultar Saldo

```http
GET /api/contabilidad/caja-chica/{id}/saldo
```

**Permisos:** `contabilidad.caja_chica.ver`

**Respuesta:**
```json
{
  "caja_id": 1,
  "nombre": "Caja Chica Administración",
  "fondo_fijo": 1000.00,
  "saldo_actual": 650.00,
  "porcentaje_disponible": 65.0
}
```

### Registrar Gasto

```http
POST /api/contabilidad/caja-chica/{id}/gastos
```

**Permisos:** `contabilidad.caja_chica.crear`

**Body (multipart/form-data):**
```json
{
  "fecha": "2026-01-12",
  "monto": 50.00,
  "categoria": "UTILES_OFICINA",
  "descripcion": "Compra de papel y lapiceros",
  "comprobante_tipo": "BOLETA",
  "comprobante_numero": "B001-123",
  "proveedor": "Librería San José",
  "archivo_adjunto": "[FILE]"
}
```

**Categorías:**
- `VIATICOS`
- `UTILES_OFICINA`
- `SERVICIOS`
- `MANTENIMIENTO`
- `TRANSPORTE`
- `OTROS`

**Validaciones:**
- El monto no debe exceder el saldo actual
- Archivo máximo 5MB (jpg, jpeg, png, pdf)

**Respuesta:** `201 Created`


### Listar Gastos

```http
GET /api/contabilidad/caja-chica/{id}/gastos
```

**Permisos:** `contabilidad.caja_chica.ver`

**Respuesta:**
```json
[
  {
    "id": 1,
    "fecha": "2026-01-12",
    "monto": 50.00,
    "categoria": "UTILES_OFICINA",
    "descripcion": "Compra de papel",
    "estado": "APROBADO",
    "user": { "id": 1, "name": "Juan Pérez" }
  }
]
```

### Editar Gasto

```http
PUT /api/contabilidad/caja-chica/gastos/{gastoId}
```

**Permisos:** `contabilidad.caja_chica.editar`

**Nota:** Solo se pueden editar gastos con estado `PENDIENTE`

### Aprobar/Rechazar Gasto

```http
POST /api/contabilidad/caja-chica/gastos/{gastoId}/aprobar
```

**Permisos:** `contabilidad.caja_chica.editar`

**Body:**
```json
{
  "estado": "APROBADO",
  "observaciones": "Gasto aprobado correctamente"
}
```

**Estados:** `APROBADO` | `RECHAZADO`

**Nota:** Si se rechaza, el monto se devuelve al saldo de la caja chica.

### Gastos Pendientes

```http
GET /api/contabilidad/caja-chica/gastos-pendientes
```

**Permisos:** `contabilidad.caja_chica.ver`

**Respuesta:** Lista de todos los gastos pendientes de aprobación.


### Reposición de Fondo

```http
POST /api/contabilidad/caja-chica/{id}/reposicion
```

**Permisos:** `contabilidad.caja_chica.editar`

**Body:**
```json
{
  "monto": 350.00
}
```

**Respuesta:**
```json
{
  "message": "Reposición registrada",
  "saldo_actual": 1000.00
}
```

### Rendición

```http
GET /api/contabilidad/caja-chica/{id}/rendicion
```

**Permisos:** `contabilidad.caja_chica.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:**
```json
{
  "caja": {
    "id": 1,
    "nombre": "Caja Chica Administración",
    "fondo_fijo": 1000.00
  },
  "movimientos": [...],
  "resumen": {
    "fondo_fijo": 1000.00,
    "total_gastos": 350.00,
    "total_reposiciones": 0.00,
    "saldo_actual": 650.00
  }
}
```

---

## Flujo de Caja

Proyecciones y control de flujo de efectivo.

### Listar Proyecciones

```http
GET /api/contabilidad/flujo-caja
```

**Permisos:** `contabilidad.flujo_caja.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)
- `tipo` (opcional): `INGRESO` | `EGRESO`

**Respuesta:**
```json
[
  {
    "id": 1,
    "fecha": "2026-01-15",
    "tipo": "INGRESO",
    "categoria": "VENTAS",
    "concepto": "Ventas proyectadas enero",
    "monto_proyectado": 50000.00,
    "monto_real": null,
    "estado": "PROYECTADO",
    "recurrente": true
  }
]
```


### Crear Proyección

```http
POST /api/contabilidad/flujo-caja
```

**Permisos:** `contabilidad.flujo_caja.crear`

**Body:**
```json
{
  "fecha": "2026-01-20",
  "tipo": "EGRESO",
  "categoria": "SUELDOS",
  "concepto": "Pago de planilla enero",
  "monto_proyectado": 15000.00,
  "recurrente": true,
  "frecuencia": "MENSUAL",
  "observaciones": "Pago el día 20 de cada mes"
}
```

**Categorías de Ingresos:**
- `VENTAS`
- `COBROS`
- `PRESTAMOS`
- `OTROS_INGRESOS`

**Categorías de Egresos:**
- `COMPRAS`
- `PAGOS_PROVEEDORES`
- `SUELDOS`
- `SERVICIOS`
- `IMPUESTOS`
- `PRESTAMOS_PAGO`
- `OTROS_EGRESOS`

**Respuesta:** `201 Created`

### Ver Detalle

```http
GET /api/contabilidad/flujo-caja/{id}
```

**Permisos:** `contabilidad.flujo_caja.ver`

### Actualizar Proyección

```http
PUT /api/contabilidad/flujo-caja/{id}
```

**Permisos:** `contabilidad.flujo_caja.editar`

### Eliminar Proyección

```http
DELETE /api/contabilidad/flujo-caja/{id}
```

**Permisos:** `contabilidad.flujo_caja.eliminar`


### Registrar Monto Real

```http
POST /api/contabilidad/flujo-caja/{id}/real
```

**Permisos:** `contabilidad.flujo_caja.editar`

**Body:**
```json
{
  "monto_real": 48500.00,
  "observaciones": "Ventas reales del mes"
}
```

**Respuesta:**
```json
{
  "id": 1,
  "monto_proyectado": 50000.00,
  "monto_real": 48500.00,
  "estado": "REALIZADO",
  "desviacion_porcentaje": -3.0
}
```

### Comparativa Proyectado vs Real

```http
GET /api/contabilidad/flujo-caja/comparativa
```

**Permisos:** `contabilidad.flujo_caja.ver`

**Query Params:**
- `fecha_inicio` (opcional, default: inicio del mes actual)
- `fecha_fin` (opcional, default: fin del mes actual)

**Respuesta:**
```json
{
  "periodo": {
    "fecha_inicio": "2026-01-01",
    "fecha_fin": "2026-01-31"
  },
  "ingresos": {
    "proyectado": 50000.00,
    "real": 48500.00,
    "desviacion": -1500.00
  },
  "egresos": {
    "proyectado": 30000.00,
    "real": 31200.00,
    "desviacion": 1200.00
  },
  "flujo_neto": {
    "proyectado": 20000.00,
    "real": 17300.00,
    "desviacion": -2700.00
  }
}
```


### Alertas de Desviación

```http
GET /api/contabilidad/flujo-caja/alertas
```

**Permisos:** `contabilidad.flujo_caja.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Descripción:** Retorna proyecciones con desviación > 10% entre monto proyectado y real.

**Respuesta:**
```json
{
  "total_alertas": 5,
  "criticas": 2,
  "moderadas": 3,
  "alertas": [
    {
      "id": 3,
      "concepto": "Ventas enero",
      "monto_proyectado": 50000.00,
      "monto_real": 38000.00,
      "desviacion_porcentaje": -24.0
    }
  ]
}
```

**Clasificación:**
- **Críticas:** Desviación > 20%
- **Moderadas:** Desviación entre 10% y 20%

---

## Kardex

Control de inventario valorizado con método de costo promedio.

### Ver Kardex de Producto

```http
GET /api/contabilidad/kardex/producto/{productoId}
```

**Permisos:** `contabilidad.kardex.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:**
```json
{
  "producto": {
    "id": 1,
    "nombre": "Laptop HP",
    "codigo_producto": "PROD-001",
    "stock": 15
  },
  "movimientos": [
    {
      "id": 1,
      "fecha": "2026-01-10",
      "tipo_movimiento": "ENTRADA",
      "tipo_operacion": "COMPRA",
      "cantidad": 10,
      "costo_unitario": 2500.00,
      "costo_total": 25000.00,
      "stock_anterior": 5,
      "stock_actual": 15,
      "costo_promedio": 2450.00
    }
  ],
  "stock_actual": 15,
  "costo_promedio": 2450.00
}
```


### Registrar Ajuste de Inventario

```http
POST /api/contabilidad/kardex/ajuste
```

**Permisos:** `contabilidad.kardex.ajustar`

**Body:**
```json
{
  "producto_id": 1,
  "cantidad": 2,
  "tipo": "AJUSTE_POSITIVO",
  "costo_unitario": 2500.00,
  "observaciones": "Ajuste por inventario físico"
}
```

**Tipos:**
- `AJUSTE_POSITIVO`: Incrementa el stock
- `AJUSTE_NEGATIVO`: Reduce el stock

**Respuesta:**
```json
{
  "message": "Ajuste registrado correctamente"
}
```

**Nota:** El ajuste actualiza automáticamente el stock del producto y recalcula el costo promedio.

### Inventario Valorizado

```http
GET /api/contabilidad/kardex/inventario-valorizado
```

**Permisos:** `contabilidad.kardex.ver`

**Respuesta:**
```json
{
  "inventario": [
    {
      "producto_id": 1,
      "codigo": "PROD-001",
      "nombre": "Laptop HP",
      "categoria": "Electrónica",
      "stock": 15,
      "costo_promedio": 2450.00,
      "valor_total": 36750.00
    }
  ],
  "total_valorizado": 125000.00
}
```

---

## Cuentas por Cobrar

Gestión de créditos otorgados a clientes.

### Listar Cuentas por Cobrar

```http
GET /api/contabilidad/cuentas-por-cobrar
```

**Permisos:** `contabilidad.cuentas-cobrar.ver`

**Query Params:**
- `estado` (opcional): `PENDIENTE` | `PARCIAL` | `PAGADO` | `VENCIDO`
- `cliente_id` (opcional)
- `vencidas` (opcional): `true` para filtrar solo vencidas

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "cliente_id": 5,
      "numero_documento": "F001-123",
      "fecha_emision": "2026-01-01",
      "fecha_vencimiento": "2026-01-31",
      "monto_total": 5000.00,
      "monto_pagado": 2000.00,
      "saldo_pendiente": 3000.00,
      "estado": "PARCIAL",
      "dias_credito": 30
    }
  ],
  "total": 1,
  "per_page": 20
}
```


### Crear Cuenta por Cobrar

```http
POST /api/contabilidad/cuentas-por-cobrar
```

**Permisos:** `contabilidad.cuentas-cobrar.crear`

**Body:**
```json
{
  "cliente_id": 5,
  "numero_documento": "F001-125",
  "fecha_emision": "2026-01-12",
  "fecha_vencimiento": "2026-02-11",
  "monto_total": 3500.00,
  "dias_credito": 30,
  "venta_id": 150,
  "comprobante_id": 75
}
```

**Respuesta:** `201 Created`

### Ver Detalle

```http
GET /api/contabilidad/cuentas-por-cobrar/{id}
```

**Permisos:** `contabilidad.cuentas-cobrar.ver`

**Respuesta:**
```json
{
  "id": 1,
  "cliente": {
    "id": 5,
    "nombre_completo": "Juan Pérez",
    "documento": "12345678"
  },
  "numero_documento": "F001-123",
  "monto_total": 5000.00,
  "saldo_pendiente": 3000.00,
  "estado": "PARCIAL",
  "pagos": [
    {
      "id": 1,
      "fecha_pago": "2026-01-10",
      "monto": 2000.00,
      "metodo_pago": "TRANSFERENCIA"
    }
  ]
}
```

### Registrar Pago

```http
POST /api/contabilidad/cuentas-por-cobrar/{id}/pago
```

**Permisos:** `contabilidad.cuentas-cobrar.pagar`

**Body:**
```json
{
  "monto": 1500.00,
  "fecha_pago": "2026-01-15",
  "metodo_pago": "TRANSFERENCIA",
  "referencia": "OP-123456",
  "numero_operacion": "123456789",
  "observaciones": "Pago parcial"
}
```

**Validaciones:**
- El monto no debe exceder el saldo pendiente
- Actualiza automáticamente el estado de la cuenta

**Respuesta:**
```json
{
  "id": 1,
  "monto_pagado": 3500.00,
  "saldo_pendiente": 1500.00,
  "estado": "PARCIAL"
}
```


### Antigüedad de Saldos

```http
GET /api/contabilidad/cuentas-por-cobrar/antiguedad-saldos
```

**Permisos:** `contabilidad.cuentas-cobrar.ver`

**Respuesta:**
```json
{
  "detalle": [
    {
      "id": 1,
      "cliente": { "nombre_completo": "Juan Pérez" },
      "saldo_pendiente": 3000.00,
      "dias_vencidos": 15
    }
  ],
  "rangos": {
    "0-30": 5000.00,
    "31-60": 3000.00,
    "61-90": 1500.00,
    "91+": 2000.00
  },
  "total_pendiente": 11500.00
}
```

### Historial de Pagos

```http
GET /api/contabilidad/cuentas-por-cobrar/{cuentaId}/pagos
```

**Permisos:** `contabilidad.cuentas-cobrar.ver`

**Respuesta:**
```json
[
  {
    "id": 1,
    "fecha_pago": "2026-01-10",
    "monto": 2000.00,
    "metodo_pago": "TRANSFERENCIA",
    "referencia": "OP-123456",
    "user": { "id": 1, "name": "Admin" }
  }
]
```

---

## Cuentas por Pagar

Gestión de deudas con proveedores.

### Listar Cuentas por Pagar

```http
GET /api/contabilidad/cuentas-por-pagar
```

**Permisos:** `contabilidad.cuentas-pagar.ver`

**Query Params:**
- `estado` (opcional): `PENDIENTE` | `PARCIAL` | `PAGADO` | `VENCIDO`
- `proveedor_id` (opcional)
- `vencidas` (opcional): `true`

**Respuesta:** Similar a cuentas por cobrar


### Crear Cuenta por Pagar

```http
POST /api/contabilidad/cuentas-por-pagar
```

**Permisos:** `contabilidad.cuentas-pagar.crear`

**Body:**
```json
{
  "proveedor_id": 3,
  "numero_documento": "F001-456",
  "fecha_emision": "2026-01-12",
  "fecha_vencimiento": "2026-02-11",
  "monto_total": 8000.00,
  "dias_credito": 30,
  "compra_id": 25
}
```

### Ver Detalle

```http
GET /api/contabilidad/cuentas-por-pagar/{id}
```

**Permisos:** `contabilidad.cuentas-pagar.ver`

### Actualizar

```http
PUT /api/contabilidad/cuentas-por-pagar/{id}
```

**Permisos:** `contabilidad.cuentas-pagar.editar`

**Body:**
```json
{
  "fecha_vencimiento": "2026-02-20",
  "observaciones": "Extensión de plazo acordada"
}
```

### Eliminar

```http
DELETE /api/contabilidad/cuentas-por-pagar/{id}
```

**Permisos:** `contabilidad.cuentas-pagar.eliminar`

**Validación:** No se puede eliminar si tiene pagos registrados.

### Registrar Pago

```http
POST /api/contabilidad/cuentas-por-pagar/{id}/pago
```

**Permisos:** `contabilidad.cuentas-pagar.pagar`

**Body:** Igual que cuentas por cobrar


### Antigüedad de Saldos

```http
GET /api/contabilidad/cuentas-por-pagar/antiguedad-saldos
```

**Permisos:** `contabilidad.cuentas-pagar.ver`

**Respuesta:** Similar a cuentas por cobrar

### Historial de Pagos

```http
GET /api/contabilidad/cuentas-por-pagar/{id}/pagos
```

**Permisos:** `contabilidad.cuentas-pagar.ver`

### Estadísticas

```http
GET /api/contabilidad/cuentas-por-pagar/estadisticas
```

**Permisos:** `contabilidad.cuentas-pagar.ver`

**Respuesta:**
```json
{
  "total_pendiente": 25000.00,
  "vencidas": 8000.00,
  "por_vencer_30_dias": 12000.00
}
```

---

## Proveedores

Gestión de proveedores (endpoints básicos).

### Listar Proveedores

```http
GET /api/contabilidad/proveedores
```

**Permisos:** `contabilidad.proveedores.ver`

### Ver Detalle

```http
GET /api/contabilidad/proveedores/{id}
```

**Permisos:** `contabilidad.proveedores.ver`

### Crear Proveedor

```http
POST /api/contabilidad/proveedores
```

**Permisos:** `contabilidad.proveedores.crear`

### Actualizar Proveedor

```http
PUT /api/contabilidad/proveedores/{id}
```

**Permisos:** `contabilidad.proveedores.editar`

---

## Tiendas

Gestión de tiendas/sucursales para el sistema de cajas.

**Base URL:** `/api/tiendas`

**Autenticación:** Requiere `auth:sanctum`

**Nota:** Actualmente no tiene permisos específicos. Todos los usuarios autenticados tienen acceso.

### Listar Tiendas

```http
GET /api/tiendas
```

**Descripción:** Obtener todas las tiendas ordenadas por nombre.

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Tienda Central",
    "descripcion": "Tienda principal",
    "logo": "https://ejemplo.com/logo.png",
    "estado": "ACTIVA",
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-01T00:00:00"
  }
]
```

### Crear Tienda

```http
POST /api/tiendas
```

**Body:**
```json
{
  "nombre": "Tienda Norte",
  "descripcion": "Sucursal del norte",
  "logo": "https://ejemplo.com/logo.png",
  "estado": "ACTIVA"
}
```

**Validaciones:**
- `nombre`: Requerido, máximo 100 caracteres
- `descripcion`: Opcional
- `logo`: Opcional, máximo 255 caracteres (URL)
- `estado`: Opcional, valores: `ACTIVA` | `INACTIVA` (default: `ACTIVA`)

**Respuesta:** `201 Created`

### Ver Detalle de Tienda

```http
GET /api/tiendas/{id}
```

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Tienda Central",
  "descripcion": "Tienda principal",
  "logo": "https://ejemplo.com/logo.png",
  "estado": "ACTIVA",
  "cajas": [
    {
      "id": 1,
      "nombre": "Caja Principal",
      "codigo": "CAJ-001",
      "activo": true
    }
  ],
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-01-01T00:00:00"
}
```

### Actualizar Tienda

```http
PUT /api/tiendas/{id}
```

**Body:**
```json
{
  "nombre": "Tienda Central Actualizada",
  "descripcion": "Nueva descripción",
  "estado": "INACTIVA"
}
```

**Nota:** Todos los campos son opcionales.

### Eliminar Tienda

```http
DELETE /api/tiendas/{id}
```

**Validación:** No se puede eliminar si tiene cajas asociadas.

**Respuesta Error:**
```json
{
  "error": "No se puede eliminar la tienda porque tiene cajas asociadas"
}
```

**Respuesta Exitosa:**
```json
{
  "message": "Tienda eliminada correctamente"
}
```

### Recomendaciones de Seguridad

Se recomienda agregar permisos específicos para tiendas:
- `tiendas.ver`
- `tiendas.crear`
- `tiendas.editar`
- `tiendas.eliminar`

---

## Reportes Contables

Reportes financieros y análisis de ventas.


### Ventas Diarias

```http
GET /api/contabilidad/reportes/ventas-diarias
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha` (opcional, default: hoy)

**Respuesta:**
```json
{
  "fecha": "2026-01-12",
  "ventas": [...],
  "resumen": {
    "cantidad_ventas": 25,
    "total_ventas": 12500.00,
    "ticket_promedio": 500.00
  }
}
```

### Ventas Mensuales

```http
GET /api/contabilidad/reportes/ventas-mensuales
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `mes` (opcional, default: mes actual)
- `anio` (opcional, default: año actual)

**Respuesta:**
```json
{
  "mes": 1,
  "anio": 2026,
  "ventas_diarias": [
    { "fecha": "2026-01-01", "cantidad": 10, "total": 5000.00 },
    { "fecha": "2026-01-02", "cantidad": 15, "total": 7500.00 }
  ],
  "total_mes": 150000.00
}
```

### Productos Más Vendidos

```http
GET /api/contabilidad/reportes/productos-mas-vendidos
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional, default: inicio del mes)
- `fecha_fin` (opcional, default: hoy)

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Laptop HP",
    "codigo_producto": "PROD-001",
    "cantidad_vendida": 50,
    "total_vendido": 125000.00
  }
]
```

**Nota:** Retorna top 20 productos.


### Rentabilidad por Producto

```http
GET /api/contabilidad/reportes/rentabilidad-productos
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:**
```json
{
  "productos": [
    {
      "producto_id": 1,
      "codigo": "PROD-001",
      "nombre": "Laptop HP",
      "categoria": "Electrónica",
      "cantidad_vendida": 50,
      "total_ventas": 125000.00,
      "costo_promedio": 2000.00,
      "costo_total": 100000.00,
      "utilidad": 25000.00,
      "margen_porcentaje": 20.0
    }
  ],
  "resumen": {
    "total_ventas": 250000.00,
    "total_costos": 180000.00,
    "utilidad_total": 70000.00
  }
}
```

### Dashboard Financiero

```http
GET /api/contabilidad/reportes/dashboard-financiero
```

**Permisos:** `contabilidad.reportes.ver`

**Respuesta:**
```json
{
  "ventas": {
    "hoy": 5000.00,
    "mes": 150000.00
  },
  "cuentas_por_cobrar": {
    "pendiente": 25000.00,
    "vencidas": 8000.00
  },
  "cuentas_por_pagar": {
    "pendiente": 35000.00,
    "vencidas": 12000.00
  },
  "inventario": {
    "valor_total": 500000.00,
    "productos_activos": 250
  }
}
```

---

## Utilidades y Rentabilidad

Análisis de utilidades, gastos operativos y punto de equilibrio.


### Calcular Utilidad de Venta

```http
GET /api/contabilidad/utilidades/venta/{ventaId}
```

**Permisos:** `contabilidad.utilidades.ver`

**Respuesta:**
```json
{
  "venta_id": 150,
  "fecha": "2026-01-12",
  "total_venta": 5000.00,
  "costo_total": 3500.00,
  "utilidad_bruta": 1500.00,
  "margen_porcentaje": 30.0,
  "detalles": [
    {
      "producto": "Laptop HP",
      "cantidad": 2,
      "precio_venta": 2500.00,
      "costo_unitario": 1750.00,
      "subtotal_venta": 5000.00,
      "subtotal_costo": 3500.00,
      "utilidad": 1500.00,
      "margen": 30.0
    }
  ]
}
```

**Nota:** Este endpoint también guarda el cálculo en la tabla `utilidad_ventas`.

### Reporte de Utilidades

```http
GET /api/contabilidad/utilidades/reporte
```

**Permisos:** `contabilidad.utilidades.ver`

**Query Params:**
- `fecha_inicio` (opcional, default: inicio del mes)
- `fecha_fin` (opcional, default: hoy)

**Respuesta:**
```json
{
  "periodo": {
    "fecha_inicio": "2026-01-01",
    "fecha_fin": "2026-01-12"
  },
  "ventas": {
    "total": 150000.00,
    "cantidad": 75
  },
  "costos": {
    "costo_ventas": 105000.00,
    "gastos_operativos": 15000.00,
    "total_costos": 120000.00
  },
  "utilidad": {
    "utilidad_bruta": 45000.00,
    "margen_bruto": 30.0,
    "utilidad_operativa": 30000.00,
    "margen_operativo": 20.0,
    "utilidad_neta": 30000.00,
    "margen_neto": 20.0
  }
}
```


### Utilidad por Producto

```http
GET /api/contabilidad/utilidades/por-producto
```

**Permisos:** `contabilidad.utilidades.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:**
```json
{
  "productos": [
    {
      "producto_id": 1,
      "codigo": "PROD-001",
      "nombre": "Laptop HP",
      "cantidad_vendida": 50,
      "precio_promedio": 2500.00,
      "costo_promedio": 1750.00,
      "total_ventas": 125000.00,
      "total_costos": 87500.00,
      "utilidad": 37500.00,
      "margen_porcentaje": 30.0
    }
  ],
  "resumen": {
    "total_ventas": 250000.00,
    "total_costos": 175000.00,
    "utilidad_total": 75000.00
  }
}
```

### Registrar Gasto Operativo

```http
POST /api/contabilidad/utilidades/gastos
```

**Permisos:** `contabilidad.utilidades.crear`

**Body:**
```json
{
  "fecha": "2026-01-12",
  "categoria": "ALQUILER",
  "concepto": "Alquiler de local enero",
  "monto": 3000.00,
  "comprobante_tipo": "RECIBO",
  "comprobante_numero": "R-001",
  "proveedor_id": 5,
  "es_fijo": true,
  "es_recurrente": true,
  "descripcion": "Pago mensual de alquiler"
}
```

**Categorías:**
- `ALQUILER`
- `SERVICIOS`
- `SUELDOS`
- `MARKETING`
- `TRANSPORTE`
- `MANTENIMIENTO`
- `IMPUESTOS`
- `OTROS`

**Respuesta:** `201 Created`


### Listar Gastos Operativos

```http
GET /api/contabilidad/utilidades/gastos
```

**Permisos:** `contabilidad.utilidades.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)
- `categoria` (opcional)

**Respuesta:** Paginada (20 por página)

### Gastos por Categoría

```http
GET /api/contabilidad/utilidades/gastos/por-categoria
```

**Permisos:** `contabilidad.utilidades.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:**
```json
{
  "periodo": {
    "fecha_inicio": "2026-01-01",
    "fecha_fin": "2026-01-31"
  },
  "gastos_por_categoria": [
    { "categoria": "ALQUILER", "total": 3000.00 },
    { "categoria": "SERVICIOS", "total": 1500.00 },
    { "categoria": "SUELDOS", "total": 15000.00 }
  ],
  "total_gastos": 19500.00
}
```

### Calcular Utilidad Mensual

```http
POST /api/contabilidad/utilidades/mensual/{mes}/{anio}
```

**Permisos:** `contabilidad.utilidades.editar`

**Ejemplo:** `POST /api/contabilidad/utilidades/mensual/1/2026`

**Respuesta:**
```json
{
  "mes": 1,
  "anio": 2026,
  "total_ventas": 150000.00,
  "total_costos": 105000.00,
  "utilidad_bruta": 45000.00,
  "margen_bruto_porcentaje": 30.0,
  "gastos_operativos": 15000.00,
  "utilidad_operativa": 30000.00,
  "margen_operativo_porcentaje": 20.0,
  "utilidad_neta": 30000.00,
  "margen_neto_porcentaje": 20.0
}
```

**Nota:** Guarda el resumen en la tabla `utilidad_mensual`.


### Comparativa Mensual

```http
GET /api/contabilidad/utilidades/comparativa/{anio}
```

**Permisos:** `contabilidad.utilidades.ver`

**Ejemplo:** `GET /api/contabilidad/utilidades/comparativa/2026`

**Respuesta:**
```json
{
  "anio": 2026,
  "meses": [
    {
      "mes": 1,
      "total_ventas": 150000.00,
      "utilidad_bruta": 45000.00,
      "utilidad_neta": 30000.00
    },
    {
      "mes": 2,
      "total_ventas": 180000.00,
      "utilidad_bruta": 54000.00,
      "utilidad_neta": 38000.00
    }
  ],
  "totales": {
    "total_ventas": 330000.00,
    "total_costos": 231000.00,
    "utilidad_bruta": 99000.00,
    "gastos_operativos": 31000.00,
    "utilidad_neta": 68000.00
  }
}
```

### Punto de Equilibrio

```http
GET /api/contabilidad/utilidades/punto-equilibrio
```

**Permisos:** `contabilidad.utilidades.ver`

**Query Params:**
- `mes` (opcional, default: mes actual)
- `anio` (opcional, default: año actual)

**Respuesta:**
```json
{
  "mes": 1,
  "anio": 2026,
  "gastos_fijos": 18000.00,
  "margen_contribucion_porcentaje": 30.0,
  "punto_equilibrio_ventas": 60000.00,
  "ventas_actuales": 150000.00,
  "diferencia": 90000.00,
  "alcanzado": true
}
```

**Fórmula:** Punto de Equilibrio = Gastos Fijos / Margen de Contribución

---

## Vouchers

Gestión de comprobantes de pago y transferencias bancarias.


### Listar Vouchers

```http
GET /api/contabilidad/vouchers
```

**Permisos:** `contabilidad.vouchers.ver`

**Query Params:**
- `tipo` (opcional): `PAGO_CLIENTE` | `PAGO_PROVEEDOR` | `DEPOSITO` | `TRANSFERENCIA` | `OTRO`
- `estado` (opcional): `PENDIENTE` | `VERIFICADO` | `RECHAZADO`
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)
- `search` (opcional): Busca por número de operación o banco

**Respuesta:** Paginada (20 por página)

### Registrar Voucher

```http
POST /api/contabilidad/vouchers
```

**Permisos:** `contabilidad.vouchers.crear`

**Content-Type:** `multipart/form-data`

**Body:**
```json
{
  "tipo": "PAGO_PROVEEDOR",
  "numero_operacion": "OP-123456789",
  "fecha": "2026-01-12",
  "monto": 5000.00,
  "metodo_pago": "TRANSFERENCIA",
  "banco": "BCP",
  "cuenta_origen": "191-1234567-0-01",
  "cuenta_destino": "191-9876543-0-02",
  "archivo_voucher": "[FILE]",
  "cuenta_por_pagar_id": 5
}
```

**Validaciones:**
- Archivo máximo 5MB
- Formatos permitidos: jpg, jpeg, png, pdf

**Respuesta:** `201 Created`

### Ver Voucher

```http
GET /api/contabilidad/vouchers/{id}
```

**Permisos:** `contabilidad.vouchers.ver`

### Actualizar Voucher

```http
PUT /api/contabilidad/vouchers/{id}
```

**Permisos:** `contabilidad.vouchers.editar`

**Content-Type:** `multipart/form-data`

**Nota:** Si se envía un nuevo archivo, reemplaza el anterior.


### Verificar Voucher

```http
POST /api/contabilidad/vouchers/{id}/verificar
```

**Permisos:** `contabilidad.vouchers.verificar`

**Body:**
```json
{
  "estado": "VERIFICADO",
  "observaciones": "Voucher verificado correctamente"
}
```

**Estados:** `VERIFICADO` | `RECHAZADO`

**Respuesta:**
```json
{
  "id": 1,
  "estado": "VERIFICADO",
  "verificado_por": 1,
  "verificado_at": "2026-01-12T15:30:00"
}
```

### Descargar Archivo

```http
GET /api/contabilidad/vouchers/{id}/descargar
```

**Permisos:** `contabilidad.vouchers.ver`

**Respuesta:** Descarga directa del archivo adjunto

### Eliminar Voucher

```http
DELETE /api/contabilidad/vouchers/{id}
```

**Permisos:** `contabilidad.vouchers.eliminar`

**Nota:** Elimina también el archivo adjunto del storage.

### Vouchers Pendientes

```http
GET /api/contabilidad/vouchers/pendientes
```

**Permisos:** `contabilidad.vouchers.ver`

**Respuesta:** Lista de vouchers con estado `PENDIENTE`

**Nota:** Se recomienda usar `GET /vouchers?estado=PENDIENTE` en su lugar.

---

## Exportaciones

Exportación de reportes en PDF, Excel y TXT (PLE SUNAT).


### Exportar Caja PDF

```http
GET /api/contabilidad/exportar/caja/{id}/pdf
```

**Permisos:** `contabilidad.reportes.ver`

**Respuesta:** Descarga PDF del reporte de caja

### Exportar Caja Excel

```http
GET /api/contabilidad/exportar/caja/{id}/excel
```

**Permisos:** `contabilidad.reportes.ver`

**Respuesta:** Descarga CSV del reporte de caja

### Exportar Kardex PDF

```http
GET /api/contabilidad/exportar/kardex/{productoId}/pdf
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga PDF del kardex

### Exportar Kardex Excel

```http
GET /api/contabilidad/exportar/kardex/{productoId}/excel
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga CSV del kardex

### Exportar Kardex TXT

```http
GET /api/contabilidad/exportar/kardex/{productoId}/txt
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga TXT formateado del kardex


### Exportar Cuentas por Cobrar PDF

```http
GET /api/contabilidad/exportar/cxc/pdf
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `estado` (opcional)

**Respuesta:** Descarga PDF de cuentas por cobrar

### Exportar Cuentas por Cobrar Excel

```http
GET /api/contabilidad/exportar/cxc/excel
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `estado` (opcional)

**Respuesta:** Descarga CSV de cuentas por cobrar

### Exportar Utilidades PDF

```http
GET /api/contabilidad/exportar/utilidades/pdf
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga PDF del reporte de utilidades

### Exportar Utilidades Excel

```http
GET /api/contabilidad/exportar/utilidades/excel
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga CSV del reporte de utilidades


### Exportar Registro de Ventas PLE (TXT)

```http
POST /api/contabilidad/exportar/ple/registro-ventas
```

**Permisos:** `contabilidad.reportes.ver`

**Body:**
```json
{
  "periodo": "202601",
  "ruc": "20123456789"
}
```

**Formato:** Programa de Libros Electrónicos (PLE) - Formato 14.1 SUNAT

**Respuesta:** Descarga TXT con formato oficial SUNAT

**Nombre archivo:** `LE{RUC}{PERIODO}140100{INDICADOR}{ESTADO}{FECHA}{HORA}.txt`

Ejemplo: `LE20123456789202601140100001112012026150000.txt`

### Exportar Registro de Compras PLE (TXT)

```http
POST /api/contabilidad/exportar/ple/registro-compras
```

**Permisos:** `contabilidad.reportes.ver`

**Body:**
```json
{
  "periodo": "202601",
  "ruc": "20123456789"
}
```

**Formato:** Programa de Libros Electrónicos (PLE) - Formato 8.1 SUNAT

**Respuesta:** Descarga TXT con formato oficial SUNAT

**Nombre archivo:** `LE{RUC}{PERIODO}080100{INDICADOR}{ESTADO}{FECHA}{HORA}.txt`

### Exportar Ventas TXT (Simple)

```http
GET /api/contabilidad/exportar/ventas/txt
```

**Permisos:** `contabilidad.reportes.ver`

**Query Params:**
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Respuesta:** Descarga TXT con reporte simple de ventas

---


## Permisos y Roles del Sistema

El módulo de contabilidad utiliza un sistema de permisos basado en roles. A continuación se detallan los permisos disponibles y qué roles tienen acceso a cada uno.

### Roles Disponibles

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| **Superadmin** | Administrador del sistema | Acceso total a todos los módulos |
| **Administrador** | Administrador de la empresa | Acceso total a contabilidad |
| **Gerente** | Gerente general | Acceso total a contabilidad |
| **Contador** | Contador de la empresa | Acceso completo a contabilidad |
| **Cajero** | Operador de caja | Solo gestión de cajas |
| **Vendedor** | Personal de ventas | Ver reportes y gestionar CxC |
| **Compras** | Encargado de compras | Proveedores, CxP y kardex |

---

## Matriz de Permisos por Rol

### Permisos del Sistema

### Tabla de Permisos por Módulo

| Permiso | Descripción | Superadmin | Admin | Gerente | Contador | Cajero | Vendedor | Compras |
|---------|-------------|:----------:|:-----:|:-------:|:--------:|:------:|:--------:|:-------:|
| **CAJAS** |
| `contabilidad.cajas.ver` | Ver cajas y transacciones | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `contabilidad.cajas.crear` | Crear cajas y registrar transacciones | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `contabilidad.cajas.editar` | Actualizar cajas y cerrar movimientos | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `contabilidad.cajas.eliminar` | Eliminar transacciones | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CAJA CHICA** |
| `contabilidad.caja_chica.ver` | Ver cajas chicas y gastos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.caja_chica.crear` | Crear cajas chicas y registrar gastos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.caja_chica.editar` | Aprobar/rechazar gastos y reposiciones | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **FLUJO DE CAJA** |
| `contabilidad.flujo_caja.ver` | Ver proyecciones y comparativas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.flujo_caja.crear` | Crear proyecciones | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.flujo_caja.editar` | Actualizar y registrar montos reales | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.flujo_caja.eliminar` | Eliminar proyecciones | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **KARDEX** |
| `contabilidad.kardex.ver` | Ver movimientos de inventario | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.kardex.ajustar` | Registrar ajustes de inventario | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CUENTAS POR COBRAR** |
| `contabilidad.cuentas-cobrar.ver` | Ver cuentas y pagos | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `contabilidad.cuentas-cobrar.crear` | Crear cuentas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.cuentas-cobrar.pagar` | Registrar pagos | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **CUENTAS POR PAGAR** |
| `contabilidad.cuentas-pagar.ver` | Ver cuentas y pagos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.cuentas-pagar.crear` | Crear cuentas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.cuentas-pagar.editar` | Actualizar cuentas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.cuentas-pagar.eliminar` | Eliminar cuentas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.cuentas-pagar.pagar` | Registrar pagos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **PROVEEDORES** |
| `contabilidad.proveedores.ver` | Ver proveedores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.proveedores.crear` | Crear proveedores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `contabilidad.proveedores.editar` | Actualizar proveedores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **REPORTES** |
| `contabilidad.reportes.ver` | Ver todos los reportes y exportaciones | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **UTILIDADES** |
| `contabilidad.utilidades.ver` | Ver utilidades y gastos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.utilidades.crear` | Registrar gastos operativos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `contabilidad.utilidades.editar` | Calcular utilidades mensuales | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Resumen de Acceso por Rol

#### 🔴 Superadmin / Administrador / Gerente / Contador
**Acceso Total** - Todos los permisos de contabilidad (28 permisos)

#### 🟡 Cajero
**Acceso Limitado** - Solo gestión de cajas (3 permisos):
- Ver, crear y editar cajas
- Aperturar y cerrar cajas
- Registrar transacciones de caja

#### 🟢 Vendedor
**Acceso Parcial** - Cuentas por cobrar y reportes (3 permisos):
- Ver y gestionar cuentas por cobrar
- Registrar pagos de clientes
- Ver reportes de ventas

#### 🔵 Compras
**Acceso Especializado** - Proveedores y compras (7 permisos):
- Gestión completa de proveedores
- Gestión completa de cuentas por pagar
- Ver kardex de inventario

### Notas sobre Permisos

1. **Vouchers**: Actualmente los endpoints de vouchers no tienen permisos específicos definidos en el seeder. Se recomienda agregar permisos como `contabilidad.vouchers.ver`, `contabilidad.vouchers.crear`, etc.

2. **Guard API**: Todos los permisos están configurados con `guard_name: 'api'` para autenticación mediante Sanctum.

3. **Verificación de Permisos**: El sistema usa el middleware `permission:nombre.permiso` en las rutas para validar el acceso.

### Verificar Permisos del Usuario Actual

Para verificar qué permisos tiene el usuario autenticado:

```php
// En el controlador
$user = auth()->user();
$permissions = $user->getAllPermissions()->pluck('name');

// Verificar un permiso específico
if ($user->can('contabilidad.cajas.ver')) {
    // Usuario tiene acceso
}

// Verificar múltiples permisos
if ($user->hasAnyPermission(['contabilidad.cajas.ver', 'contabilidad.cajas.crear'])) {
    // Usuario tiene al menos uno de los permisos
}
```

### Endpoint para Consultar Permisos

```http
GET /api/user/permissions
```

**Respuesta:**
```json
{
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "roles": ["Contador"]
  },
  "permissions": [
    "contabilidad.cajas.ver",
    "contabilidad.cajas.crear",
    "contabilidad.reportes.ver"
  ]
}
```

---


## Códigos de Estado HTTP

- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Error de validación o lógica de negocio
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - Sin permisos suficientes
- `404 Not Found` - Recurso no encontrado
- `500 Internal Server Error` - Error del servidor

---

## Notas Importantes

### Cálculo de Costo Promedio (Kardex)
El sistema utiliza el método de **costo promedio ponderado** para valorizar el inventario:

```
Costo Promedio = (Stock Anterior × Costo Anterior + Cantidad Nueva × Costo Nuevo) / Stock Total
```

### Estados de Cuentas por Cobrar/Pagar
- `PENDIENTE` - Sin pagos registrados
- `PARCIAL` - Con pagos parciales
- `PAGADO` - Totalmente pagado
- `VENCIDO` - Fecha de vencimiento superada (calculado dinámicamente)

### Flujo de Caja - Estados
- `PROYECTADO` - Monto proyectado sin realizar
- `REALIZADO` - Monto real registrado

### Caja Chica - Estados de Gastos
- `PENDIENTE` - Esperando aprobación
- `APROBADO` - Gasto aprobado
- `RECHAZADO` - Gasto rechazado (monto devuelto al saldo)

### Vouchers - Estados
- `PENDIENTE` - Sin verificar
- `VERIFICADO` - Verificado por supervisor
- `RECHAZADO` - Rechazado por supervisor

### Formato PLE SUNAT
Los archivos TXT de Registro de Ventas y Compras siguen el formato oficial del Programa de Libros Electrónicos de SUNAT:
- Separador: `|` (pipe)
- Codificación: UTF-8
- Estructura según tablas SUNAT vigentes

---

## Ejemplos de Uso

### Flujo Completo: Apertura y Cierre de Caja

```bash
# 1. Aperturar caja
POST /api/contabilidad/cajas/1/aperturar
{
  "monto_inicial": 500.00,
  "observaciones": "Apertura del día"
}

# 2. Registrar ventas del día
POST /api/contabilidad/cajas/1/transacciones
{
  "tipo": "INGRESO",
  "categoria": "VENTA",
  "monto": 150.00,
  "metodo_pago": "EFECTIVO",
  "venta_id": 123
}

# 3. Consultar estado actual
GET /api/contabilidad/cajas/1/transacciones

# 4. Cerrar caja
POST /api/contabilidad/cajas/1/cerrar
{
  "monto_final": 1250.00,
  "observaciones": "Cierre del día"
}

# 5. Exportar reporte
GET /api/contabilidad/exportar/caja/1/pdf
```


### Flujo Completo: Gestión de Cuenta por Cobrar

```bash
# 1. Crear cuenta por cobrar
POST /api/contabilidad/cuentas-por-cobrar
{
  "cliente_id": 5,
  "numero_documento": "F001-125",
  "fecha_emision": "2026-01-12",
  "fecha_vencimiento": "2026-02-11",
  "monto_total": 5000.00,
  "dias_credito": 30,
  "venta_id": 150
}

# 2. Registrar pago parcial
POST /api/contabilidad/cuentas-por-cobrar/1/pago
{
  "monto": 2000.00,
  "fecha_pago": "2026-01-20",
  "metodo_pago": "TRANSFERENCIA",
  "referencia": "OP-123456"
}

# 3. Registrar pago final
POST /api/contabilidad/cuentas-por-cobrar/1/pago
{
  "monto": 3000.00,
  "fecha_pago": "2026-02-05",
  "metodo_pago": "EFECTIVO"
}

# 4. Consultar historial
GET /api/contabilidad/cuentas-por-cobrar/1/pagos

# 5. Reporte de antigüedad
GET /api/contabilidad/cuentas-por-cobrar/antiguedad-saldos
```

### Flujo Completo: Análisis de Utilidades

```bash
# 1. Calcular utilidad de una venta
GET /api/contabilidad/utilidades/venta/150

# 2. Registrar gastos operativos
POST /api/contabilidad/utilidades/gastos
{
  "fecha": "2026-01-12",
  "categoria": "ALQUILER",
  "concepto": "Alquiler enero",
  "monto": 3000.00,
  "es_fijo": true
}

# 3. Reporte de utilidades del mes
GET /api/contabilidad/utilidades/reporte?fecha_inicio=2026-01-01&fecha_fin=2026-01-31

# 4. Calcular punto de equilibrio
GET /api/contabilidad/utilidades/punto-equilibrio?mes=1&anio=2026

# 5. Guardar utilidad mensual
POST /api/contabilidad/utilidades/mensual/1/2026

# 6. Comparativa anual
GET /api/contabilidad/utilidades/comparativa/2026
```

---

## Soporte y Contacto

Para consultas sobre la API de Contabilidad, contactar al equipo de desarrollo.

**Versión:** 1.0  
**Última actualización:** Enero 2026

