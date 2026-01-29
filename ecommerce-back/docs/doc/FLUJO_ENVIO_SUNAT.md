# Flujo de Envío a SUNAT - Sistema de Facturación Electrónica

## 📋 Resumen

El sistema tiene **DOS MODOS** de envío a SUNAT según el origen de la venta:

1. **🏪 VENTAS MANUALES (POS):** Envío MANUAL a SUNAT
2. **🌐 VENTAS ONLINE (E-commerce):** Envío AUTOMÁTICO a SUNAT

---

## 🏪 VENTAS MANUALES (POS) - Envío MANUAL

### ¿Cuándo se ejecuta?

Cuando se crea una venta **SIN** `user_cliente_id` (venta desde el POS):

1. ✅ Genera el comprobante en la base de datos
2. ✅ Crea el XML firmado localmente
3. ✅ Guarda el XML en el campo `xml_firmado`
4. ✅ Establece el estado del comprobante como `PENDIENTE`
5. ❌ **NO envía a SUNAT** (requiere acción manual del usuario)

### Identificación

```php
$esVentaManual = empty($venta->user_cliente_id);
```

## 🌐 VENTAS ONLINE (E-commerce) - Envío AUTOMÁTICO

### ¿Cuándo se ejecuta?

Cuando se crea una venta **CON** `user_cliente_id` (venta desde e-commerce):

1. ✅ Genera el comprobante en la base de datos
2. ✅ Crea el XML firmado localmente
3. ✅ **Envía AUTOMÁTICAMENTE a SUNAT**
4. ✅ Recibe el CDR de SUNAT
5. ✅ Genera el PDF del comprobante
6. ✅ Establece el estado del comprobante como `ACEPTADO`
7. ✅ Establece el estado de la venta como `FACTURADO`

### Identificación

```php
$esVentaOnline = !empty($venta->user_cliente_id);
```

### Código responsable

**Archivo:** `app/Listeners/ProcessVentaCreated.php`

**Método:** `generarComprobanteLocal()`

```php
// Se ejecuta automáticamente cuando:
if ($venta->requiere_factura && $venta->tipo_documento) {
    $this->generarComprobanteLocal($venta);
}
```

### Resultado

- **Estado del comprobante:** `PENDIENTE`
- **Estado de la venta:** `PENDIENTE`
- **Tiene XML:** ✅ Sí
- **Tiene PDF:** ❌ No (se genera después del envío a SUNAT)
- **Tiene CDR:** ❌ No (se obtiene después del envío a SUNAT)

---

## 📤 Modo MANUAL (Envío a SUNAT)

### ¿Cuándo se ejecuta?

El usuario debe hacer clic en el botón **"Enviar a SUNAT"** desde el frontend.

### Endpoint

```
POST /api/ventas/{id}/enviar-sunat
```

### Requisitos

1. La venta debe tener un comprobante asociado
2. El comprobante debe estar en estado `PENDIENTE`
3. El comprobante debe tener XML firmado

### Proceso

1. ✅ Valida que el comprobante exista y esté en estado `PENDIENTE`
2. ✅ Carga la relación `cliente` del comprobante
3. ✅ Construye el documento Greenter
4. ✅ Envía a SUNAT usando el servicio web
5. ✅ Procesa la respuesta de SUNAT
6. ✅ Guarda el CDR (Constancia de Recepción)
7. ✅ Genera el PDF del comprobante
8. ✅ Actualiza el estado del comprobante a `ACEPTADO` o `RECHAZADO`
9. ✅ Actualiza el estado de la venta a `FACTURADO`

### Código responsable

**Archivo:** `app/Http/Controllers/VentasController.php`

**Método:** `enviarSunat($id)`

### Resultado exitoso

- **Estado del comprobante:** `ACEPTADO`
- **Estado de la venta:** `FACTURADO`
- **Tiene XML:** ✅ Sí
- **Tiene PDF:** ✅ Sí
- **Tiene CDR:** ✅ Sí

### Resultado con error

- **Estado del comprobante:** `RECHAZADO`
- **Estado de la venta:** `PENDIENTE`
- **Mensaje de error:** Se guarda en `mensaje_sunat`
- **Código de error:** Se guarda en `codigo_error_sunat`

---

## 🔁 Reenvío a SUNAT

Si un comprobante fue rechazado, puedes reenviarlo usando:

```
POST /api/ventas/{id}/reenviar-sunat
```

### Estados que permiten reenvío

- `PENDIENTE`
- `RECHAZADO`
- `ERROR`

---

## 🔍 Consultar Estado en SUNAT

Para verificar el estado de un comprobante en SUNAT:

```
POST /api/ventas/{id}/consultar-sunat
```

---

## 📊 Diagrama de Flujo

```
                    ┌─────────────────────────────┐
                    │      CREAR VENTA            │
                    │  (requiere_factura = true)  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  ¿Tiene user_cliente_id?    │
                    └──────────────┬──────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
                ▼                                     ▼
    ┌───────────────────────┐         ┌───────────────────────┐
    │   NO (Venta Manual)   │         │   SÍ (Venta Online)   │
    │      🏪 POS           │         │   🌐 E-commerce       │
    └───────────┬───────────┘         └───────────┬───────────┘
                │                                  │
                ▼                                  ▼
    ┌───────────────────────┐         ┌───────────────────────┐
    │  Generar XML Local    │         │  Generar XML Local    │
    │  Estado: PENDIENTE    │         │  + Enviar a SUNAT     │
    │  ❌ NO envía a SUNAT  │         │  ✅ AUTOMÁTICO        │
    └───────────┬───────────┘         └───────────┬───────────┘
                │                                  │
                ▼                                  ▼
    ┌───────────────────────┐         ┌───────────────────────┐
    │  Usuario hace clic    │         │  Recibe CDR           │
    │  "Enviar a SUNAT"     │         │  Genera PDF           │
    │  (MANUAL)             │         │  Estado: ACEPTADO     │
    └───────────┬───────────┘         │  Venta: FACTURADO     │
                │                     └───────────┬───────────┘
                ▼                                  │
    ┌───────────────────────┐                     │
    │  Enviar a SUNAT       │                     │
    │  Recibir CDR          │                     │
    │  Generar PDF          │                     │
    │  Estado: ACEPTADO     │                     │
    └───────────┬───────────┘                     │
                │                                  │
                └──────────────┬───────────────────┘
                               ▼
                ┌──────────────────────────────────┐
                │     COMPROBANTE LISTO            │
                │  XML ✅  PDF ✅  CDR ✅           │
                │  Listo para descargar/enviar     │
                └──────────────────────────────────┘
```

---

## 🎯 Respuesta a tu pregunta

### ¿Está en automático o manual?

**Respuesta:** **DEPENDE DEL ORIGEN DE LA VENTA**

| Origen | Identificador | Envío a SUNAT | Estado Final |
|--------|--------------|---------------|--------------|
| 🏪 **POS (Manual)** | `user_cliente_id = null` | ❌ MANUAL | `PENDIENTE` |
| 🌐 **E-commerce (Online)** | `user_cliente_id != null` | ✅ AUTOMÁTICO | `FACTURADO` |

### ¿Por qué este diseño?

✅ **Ventajas de MANUAL (POS):**

1. **Control:** El cajero decide cuándo enviar a SUNAT
2. **Revisión:** Permite revisar el comprobante antes de enviarlo
3. **Corrección:** Si hay errores, se pueden corregir antes del envío
4. **Contingencia:** Si SUNAT está caído, no bloquea la venta
5. **Lotes:** Permite enviar múltiples comprobantes juntos al final del día

✅ **Ventajas de AUTOMÁTICO (E-commerce):**

1. **Sin intervención:** El cliente recibe su comprobante inmediatamente
2. **Experiencia:** Mejor UX para el cliente online
3. **Automatización:** No requiere acción del administrador
4. **Tiempo real:** El comprobante está listo al instante
5. **Confianza:** El cliente ve que su comprobante fue aceptado por SUNAT

---

## 🔧 Configuración

### Lógica de detección automática

El sistema detecta automáticamente el origen de la venta:

```php
// En app/Listeners/ProcessVentaCreated.php

// Determinar si es venta online (e-commerce) o manual (POS)
$esVentaOnline = !empty($venta->user_cliente_id);

if ($esVentaOnline) {
    // VENTA ONLINE: Envío AUTOMÁTICO a SUNAT
    $resultado = $greenterService->generarFactura(
        $venta->id, 
        null, 
        $venta->user_id, 
        request()->ip(), 
        true  // ← enviarSunat = true (AUTOMÁTICO)
    );
} else {
    // VENTA MANUAL: Solo genera XML, envío MANUAL
    $resultado = $greenterService->generarFactura(
        $venta->id, 
        null, 
        $venta->user_id, 
        request()->ip(), 
        false  // ← enviarSunat = false (MANUAL)
    );
}
```

### Para forzar un comportamiento específico

Si deseas cambiar el comportamiento por defecto, puedes modificar la condición:

```php
// Ejemplo: Todas las ventas AUTOMÁTICAS
$enviarAutomatico = true;

// Ejemplo: Todas las ventas MANUALES
$enviarAutomatico = false;

// Ejemplo: Solo automático para montos mayores a 100
$enviarAutomatico = $venta->total > 100;
```

### Variables de entorno importantes

```env
# Modo de Greenter (BETA o PRODUCCION)
GREENTER_MODE=BETA

# Credenciales SOL
GREENTER_FE_USER=20000000001MODDATOS
GREENTER_FE_PASSWORD=MODDATOS

# Certificado digital
GREENTER_CERT_PATH=certificates/certificate.pem
```

---

## 📝 Notas importantes

1. **Ambiente BETA:** Usa credenciales de prueba de SUNAT
2. **Ambiente PRODUCCIÓN:** Requiere certificado digital real y credenciales SOL
3. **Logs:** Todos los envíos se registran en `storage/logs/laravel.log`
4. **Auditoría:** Se puede implementar tabla `sunat_logs` para auditoría completa

---

## 🚀 Próximos pasos recomendados

1. ✅ Implementar botón "Enviar a SUNAT" en el frontend
2. ✅ Mostrar estado del comprobante (PENDIENTE/ACEPTADO/RECHAZADO)
3. ✅ Permitir reenvío de comprobantes rechazados
4. ✅ Implementar envío masivo de comprobantes pendientes
5. ✅ Agregar notificaciones cuando un comprobante sea aceptado/rechazado

---

**Fecha de actualización:** 2025-10-24
**Versión del sistema:** 1.0
