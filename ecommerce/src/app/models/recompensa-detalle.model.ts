

import { 
  Recompensa,
  RecompensaCliente,
  RecompensaProducto,
  RecompensaPuntos,
  RecompensaDescuento,
  RecompensaEnvio,
  RecompensaRegalo,
  RecompensaHistorial,
  EstadisticasRecompensa
} from './recompensa.model';

/**
 * Modelo completo para el detalle de una recompensa
 * Basado en la documentación de la API: GET /api/admin/recompensas/{id}
 */
export interface RecompensaDetalle {
  recompensa: Recompensa;
  configuracion: {
    clientes?: RecompensaCliente[];
    productos?: RecompensaProducto[];
    puntos?: RecompensaPuntos[];
    descuentos?: RecompensaDescuento[];
    envios?: RecompensaEnvio[];
    regalos?: RecompensaRegalo[];
  };
  historial_reciente?: RecompensaHistorial[];
  estadisticas?: EstadisticasRecompensa;
  dias_restantes?: number;
  es_vigente: boolean;
  configuracion_completa: boolean;
  total_clientes_aplicables: number;
  total_productos_aplicables: number;
  valor_total_recompensa: number;
}

// ============================================================================
// INTERFACES PARA INFORMACIÓN ADICIONAL
// ============================================================================

export interface ProductoInfo {
  id: number;
  nombre: string;
  codigo_producto: string;
  precio_venta: number;
  stock: number;
  activo: boolean;
  imagen_url?: string;
  categoria?: {
    id: number;
    nombre: string;
  };
}

export interface CategoriaInfo {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  productos_count: number;
}

export interface ClienteInfo {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  segmento?: string;
  ultima_compra?: string;
  total_compras: number;
}

// ============================================================================
// INTERFACES PARA ESTADÍSTICAS DETALLADAS
// ============================================================================

export interface EstadisticasDetalladas {
  resumen: {
    total_aplicaciones: number;
    total_clientes_beneficiados: number;
    valor_total_beneficios: number;
    conversion_rate: number;
    efectividad: number;
    ultima_aplicacion?: string;
    tendencia: 'creciente' | 'decreciente' | 'estable';
  };
  por_tipo: {
    tipo: string;
    aplicaciones: number;
    valor_beneficios: number;
    conversion_rate: number;
  }[];
  por_segmento: {
    segmento: string;
    clientes: number;
    aplicaciones: number;
    conversion_rate: number;
  }[];
  por_producto: {
    producto: string;
    aplicaciones: number;
    valor_beneficios: number;
  }[];
  temporal: {
    fecha: string;
    aplicaciones: number;
    valor_beneficios: number;
  }[];
}

// ============================================================================
// INTERFACES PARA ACCIONES EN DETALLE
// ============================================================================

export interface AccionRecompensa {
  tipo: 'activar' | 'pausar' | 'editar' | 'duplicar' | 'eliminar';
  disponible: boolean;
  mensaje?: string;
  confirmacion_requerida: boolean;
  mensaje_confirmacion?: string;
}

export interface HistorialAcciones {
  id: number;
  accion: string;
  usuario: string;
  fecha: string;
  detalles: string;
  ip_address: string;
}
