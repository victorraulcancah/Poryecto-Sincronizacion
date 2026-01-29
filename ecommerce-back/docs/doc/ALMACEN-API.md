# 📦 API de Almacén y Productos

## 📋 Índice
- [Productos](#productos)
- [Categorías](#categorías)
- [Marcas](#marcas)
- [Secciones](#secciones)
- [Cupones](#cupones)

---

## 🏷️ PRODUCTOS

### Listar Productos
```http
GET /api/productos?seccion=1&page=1&per_page=15
Authorization: Bearer {token}
```

**Filtros:**
- `seccion`: ID de la sección
- `categoria`: ID de la categoría
- `marca`: ID de la marca
- `search`: Búsqueda por nombre, código
- `estado`: `activo`, `inactivo`
- `destacado`: `true`, `false`

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "codigo_producto": "PROD-001",
      "nombre": "Laptop HP Pavilion",
      "descripcion": "Laptop HP con procesador Intel i7",
      "precio_compra": "2500.00",
      "precio_venta": "3500.00",
      "stock": 10,
      "stock_minimo": 5,
      "categoria_id": 1,
      "marca_id": 1,
      "seccion_id": 1,
      "activo": true,
      "destacado": true,
      "imagen_url": "http://localhost:8000/storage/productos/laptop.jpg"
    }
  ],
  "current_page": 1,
  "total": 100,
  "per_page": 15
}
```

### Crear Producto
```http
POST /api/productos
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "codigo_producto": "PROD-002",
  "nombre": "Mouse Logitech",
  "descripcion": "Mouse inalámbrico",
  "precio_compra": 50.00,
  "precio_venta": 80.00,
  "stock": 50,
  "stock_minimo": 10,
  "categoria_id": 2,
  "marca_id": 3,
  "seccion_id": 1,
  "activo": true,
  "destacado": false,
  "imagen": File
}
```

### Actualizar Producto
```http
POST /api/productos/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "_method": "PUT",
  "nombre": "Mouse Logitech Actualizado",
  "precio_venta": 85.00,
  "stock": 45,
  "imagen": File (opcional)
}
```

### Obtener Producto por ID
```http
GET /api/productos/{id}
Authorization: Bearer {token}
```

### Cambiar Estado de Producto
```http
PATCH /api/productos/{id}/toggle-estado
Authorization: Bearer {token}
```

### Eliminar Producto
```http
DELETE /api/productos/{id}
Authorization: Bearer {token}
```

### Marcar/Desmarcar como Destacado
```http
PATCH /api/productos/{id}/toggle-destacado
Authorization: Bearer {token}
```

### Productos Destacados
```http
GET /api/productos-destacados?limite=10
```

### Productos Públicos (E-commerce)
```http
GET /api/productos-publicos?categoria=1&marca=2&search=laptop&page=1
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Laptop HP Pavilion",
      "descripcion": "Laptop HP con procesador Intel i7",
      "precio_venta": "3500.00",
      "stock": 10,
      "imagen_url": "http://localhost:8000/storage/productos/laptop.jpg",
      "categoria": {
        "id": 1,
        "nombre": "Laptops"
      },
      "marca": {
        "id": 1,
        "nombre": "HP"
      },
      "descuento_porcentaje": 10,
      "precio_con_descuento": "3150.00"
    }
  ]
}
```

### Obtener Producto Público con Detalles
```http
GET /api/productos-publicos/{id}
```

**Respuesta incluye:**
- Información completa del producto
- Imágenes adicionales
- Especificaciones técnicas
- Productos relacionados

### Gestionar Detalles de Producto
```http
# Obtener detalles
GET /api/productos/{id}/detalles

# Guardar detalles (con imágenes adicionales)
POST /api/productos/{id}/detalles
Content-Type: multipart/form-data

{
  "especificaciones": "Procesador Intel i7, 16GB RAM",
  "garantia": "12 meses",
  "imagenes[]": [File, File, File]
}

# Eliminar imagen de detalle
DELETE /api/productos/{id}/detalles/imagenes?imagen_id=5
```

---

## 📁 CATEGORÍAS

### Listar Categorías
```http
GET /api/categorias?seccion=1
Authorization: Bearer {token}
```

### Crear Categoría
```http
POST /api/categorias
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "nombre": "Laptops",
  "id_seccion": 1,
  "descripcion": "Computadoras portátiles",
  "activo": true,
  "imagen": File
}
```

### Actualizar Categoría
```http
POST /api/categorias/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "_method": "PUT",
  "nombre": "Laptops y Notebooks",
  "descripcion": "Actualizado",
  "imagen": File (opcional)
}
```

### Obtener Categoría por ID
```http
GET /api/categorias/{id}
Authorization: Bearer {token}
```

### Cambiar Estado
```http
PATCH /api/categorias/{id}/toggle-estado
Authorization: Bearer {token}
```

### Eliminar Categoría
```http
DELETE /api/categorias/{id}
Authorization: Bearer {token}
```

### Categorías para Sidebar (E-commerce)
```http
GET /api/categorias-sidebar
```

### Migrar Categoría a Otra Sección
```http
PATCH /api/categorias/{id}/migrar-seccion
Authorization: Bearer {token}
Content-Type: application/json

{
  "nueva_seccion_id": 2
}
```

---

## 🏭 MARCAS

### Listar Marcas
```http
GET /api/marcas?seccion=1
Authorization: Bearer {token}
```

### Crear Marca
```http
POST /api/marcas
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "nombre": "HP",
  "id_seccion": 1,
  "descripcion": "Hewlett-Packard",
  "activo": true,
  "imagen": File
}
```

### Actualizar Marca
```http
POST /api/marcas/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "_method": "PUT",
  "nombre": "HP Inc.",
  "descripcion": "Actualizado"
}
```

### Cambiar Estado
```http
PATCH /api/marcas/{id}/toggle-estado
Authorization: Bearer {token}
```

### Eliminar Marca
```http
DELETE /api/marcas/{id}
Authorization: Bearer {token}
```

### Marcas Activas
```http
GET /api/marcas/activas
```

### Marcas Públicas
```http
GET /api/marcas/publicas
```

### Marcas por Categoría
```http
GET /api/marcas/por-categoria?categoria_id=1
```

---

## 🗂️ SECCIONES

### Listar Secciones
```http
GET /api/secciones
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Electrónica",
      "descripcion": "Productos electrónicos",
      "activo": true,
      "orden": 1
    }
  ]
}
```

### Crear Sección
```http
POST /api/secciones
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Electrónica",
  "descripcion": "Productos electrónicos",
  "activo": true,
  "orden": 1
}
```

### Actualizar Sección
```http
PUT /api/secciones/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Electrónica y Tecnología",
  "descripcion": "Actualizado"
}
```

### Eliminar Sección
```http
DELETE /api/secciones/{id}
Authorization: Bearer {token}
```

---

## 🎫 CUPONES

### Validar Cupón
```http
POST /api/cupones/validar
Authorization: Bearer {token}
Content-Type: application/json

{
  "codigo": "DESCUENTO10",
  "total": 1000.00
}
```

**Respuesta (Cupón Válido):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "codigo": "DESCUENTO10",
    "tipo": "porcentaje",
    "valor": 10,
    "descuento_aplicado": 100.00,
    "total_con_descuento": 900.00,
    "valido_hasta": "2025-12-31"
  }
}
```

**Respuesta (Cupón Inválido):**
```json
{
  "success": false,
  "error": "El cupón ha expirado",
  "codigo": "CUPON_EXPIRADO"
}
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Buscar Productos en el POS

```bash
# 1. Listar todos los productos activos
curl -X GET "http://localhost:8000/api/productos?estado=activo" \
  -H "Authorization: Bearer {token}"

# 2. Buscar por nombre
curl -X GET "http://localhost:8000/api/productos?search=laptop" \
  -H "Authorization: Bearer {token}"

# 3. Filtrar por categoría
curl -X GET "http://localhost:8000/api/productos?categoria=1" \
  -H "Authorization: Bearer {token}"
```

### Ejemplo 2: Crear Producto Completo

```bash
curl -X POST "http://localhost:8000/api/productos" \
  -H "Authorization: Bearer {token}" \
  -F "codigo_producto=LAPTOP-001" \
  -F "nombre=Laptop HP Pavilion 15" \
  -F "descripcion=Laptop con Intel i7, 16GB RAM, 512GB SSD" \
  -F "precio_compra=2500.00" \
  -F "precio_venta=3500.00" \
  -F "stock=10" \
  -F "stock_minimo=5" \
  -F "categoria_id=1" \
  -F "marca_id=2" \
  -F "seccion_id=1" \
  -F "activo=true" \
  -F "destacado=true" \
  -F "imagen=@laptop.jpg"
```

### Ejemplo 3: Gestionar Categorías

```bash
# Crear categoría
curl -X POST "http://localhost:8000/api/categorias" \
  -H "Authorization: Bearer {token}" \
  -F "nombre=Laptops Gaming" \
  -F "id_seccion=1" \
  -F "descripcion=Laptops para videojuegos" \
  -F "activo=true" \
  -F "imagen=@categoria.jpg"

# Cambiar estado
curl -X PATCH "http://localhost:8000/api/categorias/1/toggle-estado" \
  -H "Authorization: Bearer {token}"
```

---

## ⚠️ Validaciones

### Producto
- `codigo_producto`: Único, máx 50 caracteres
- `nombre`: Requerido, máx 200 caracteres
- `precio_compra`: Numérico, >= 0
- `precio_venta`: Numérico, > precio_compra
- `stock`: Entero, >= 0
- `stock_minimo`: Entero, >= 0
- `imagen`: jpg, jpeg, png, máx 2MB

### Categoría
- `nombre`: Único, máx 100 caracteres
- `id_seccion`: Debe existir
- `imagen`: jpg, jpeg, png, máx 2MB

### Marca
- `nombre`: Único, máx 100 caracteres
- `imagen`: jpg, jpeg, png, máx 2MB

---

**Última actualización:** 2025-10-23
**Versión:** 2.0.0
