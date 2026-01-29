

import { RecompensaProducto } from './recompensa.model';

export interface ProductoInfo {
  id: number;
  nombre: string;
  codigo_producto: string;
  precio_venta: number;
  stock: number;
  categoria: {
    id: number;
    nombre: string;
  };
  imagen_url?: string;
  descripcion?: string;
}

export interface CategoriaInfo {
  id: number;
  nombre: string;
  descripcion?: string;
  productos_count: number;
  imagen_url?: string;
}

export interface ProductoAsignado {
  id: number;
  tipo_elemento: 'producto' | 'categoria';
  nombre_elemento: string;
  producto?: ProductoInfo;
  categoria?: CategoriaInfo;
  fecha_asignacion: string;
  aplicaciones_totales: number;
  ultima_aplicacion?: string;
}

export interface ProductoFormData {
  tipo_elemento: 'producto' | 'categoria';
  elemento_id: number;
}

export interface ProductoDisponible {
  id: number;
  nombre: string;
  codigo_producto?: string;
  precio_venta?: number;
  stock?: number;
  categoria?: {
    id: number;
    nombre: string;
  };
  tipo: 'producto' | 'categoria';
}

export interface EstadisticasProductos {
  resumen: {
    total_productos_asignados: number;
    total_categorias_asignadas: number;
    productos_con_aplicaciones: number;
    categorias_con_aplicaciones: number;
  };
  cobertura: {
    productos_activos: number;
    productos_sin_stock: number;
    categorias_activas: number;
    porcentaje_cobertura: number;
  };
  top_productos: {
    id: number;
    nombre: string;
    tipo_elemento: string;
    aplicaciones: number;
    ultima_aplicacion: string;
  }[];
  distribucion_por_categoria: {
    categoria_id: number;
    categoria_nombre: string;
    productos_asignados: number;
    aplicaciones_totales: number;
  }[];
  metadata: {
    generado_en: string;
    recompensa_id: number;
    cache_valido_hasta: string;
  };
}

export interface ValidacionProducto {
  producto: ProductoInfo;
  es_aplicable: boolean;
  razones_no_aplicable: string[];
  recomendaciones: string[];
}

export interface FiltrosProductos {
  tipo_elemento?: 'producto' | 'categoria';
  categoria_id?: number;
  buscar?: string;
  con_stock?: boolean;
  con_aplicaciones?: boolean;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface PaginacionProductos {
  current_page: number;
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: any[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface FiltrosReglas {
  categoria_id?: string;
  producto_id?: string;
  activo?: boolean;
  busqueda?: string;
}

export interface PaginacionReglas {
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
}

export interface RespuestaProductos {
  success: boolean;
  message: string;
  data: {
    recompensa: {
      id: number;
      nombre: string;
    };
    productos: ProductoAsignado[];
    estadisticas: EstadisticasProductos;
    paginacion: PaginacionProductos;
  };
}

export interface RespuestaProductosDisponibles {
  success: boolean;
  message: string;
  data: {
    productos: ProductoDisponible[];
    categorias: ProductoDisponible[];
    total_disponibles: number;
  };
}

export interface RespuestaValidacion {
  success: boolean;
  message: string;
  data: ValidacionProducto;
}
