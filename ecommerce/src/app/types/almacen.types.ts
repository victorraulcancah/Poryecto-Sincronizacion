// src\app\pages\types\almacen.types.ts
// *categorias
export interface Categoria {
  id: number
  nombre: string
  id_seccion?: number;
  seccion?: Seccion;
  descripcion?: string
  imagen?: string
  imagen_url?: string
  activo: boolean
  created_at: string
  updated_at: string
}
// create
export interface CategoriaCreate {
  nombre: string
  id_seccion: number
  descripcion?: string
  imagen?: File
  activo: boolean
}

// Interfaces para Marcas
export interface MarcaProducto {
  id: number
  nombre: string
  slug?: string  // ✅ NUEVO: Slug para URLs amigables
  descripcion?: string
  imagen?: string
  imagen_url?: string
  activo: boolean
  productos_count?: number
  created_at: string
  updated_at: string
}

export interface MarcaProductoCreate {
  nombre: string
  descripcion?: string
  imagen?: File
  activo: boolean
}

// Interfaces para Productos
export interface Producto {
  id: number
  nombre: string
  descripcion?: string
  codigo_producto: string
  categoria_id: number
  marca_id?: number
  categoria?: Categoria
  marca?: MarcaProducto
  precio_compra: number
  precio_venta: number
  stock: number
  stock_minimo: number
  imagen?: string
  imagen_url?: string
  activo: boolean
  destacado: boolean
  mostrar_igv:boolean
  created_at: string
  updated_at: string
}

export interface ProductoCreate {
  nombre: string
  descripcion?: string
  codigo_producto: string
  categoria_id: number
  marca_id?: number
  precio_compra: number
  precio_venta: number
  stock: number
  stock_minimo: number
  imagen?: File
  activo: boolean
  destacado: boolean
}

// Interfaces para productos públicos
export interface ProductoPublico {
  id: number
  nombre: string
  slug?: string // ✅ NUEVO: Slug para URLs SEO-friendly (ej: "laptop-gamer-asus-rog")
  descripcion: string
  codigo_producto?: string // ✅ NUEVO: Código del producto
  precio: string | number
  precio_oferta?: string | number
  stock: number
  imagen_principal: string
  categoria: string
  categoria_id: number
  marca?: string
  marca_id?: number
  rating: number
  total_reviews: string
  reviews_count: number
  sold_count: number
  total_stock: number
  is_on_sale: boolean
  discount_percentage: number
}

export interface ProductosPublicosResponse {
  productos: ProductoPublico[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CategoriaParaSidebar {
  id: number
  nombre: string
  productos_count: number
}

export interface Seccion {
  id: number;
  nombre: string;
  descripcion?: string;
  categorias_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SeccionCreate {
  nombre: string;
  descripcion?: string;
}
