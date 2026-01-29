

import { 
  TipoRecompensa, 
  EstadoRecompensa, 
  TipoSegmentacion,
  TipoDescuento,
  ConfiguracionPuntos,
  ConfiguracionDescuento,
  ConfiguracionEnvio,
  ConfiguracionRegalo
} from './recompensa.model';

/**
 * Modelo completo para el wizard de creación de recompensas
 */
export interface RecompensaWizard {
  id?: number;
  datos_generales: DatosGeneralesWizard;
  segmentacion: SegmentacionWizard;
  productos: ProductosWizard;
  configuracion: ConfiguracionWizard;
  resumen: ResumenWizard;
}

/**
 * Paso 1: Datos generales de la recompensa
 */
export interface DatosGeneralesWizard {
  nombre: string;
  descripcion: string;
  tipo: TipoRecompensa;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoRecompensa;
}

/**
 * Paso 2: Segmentación de clientes
 */
export interface SegmentacionWizard {
  tipo_segmentacion: string;
  clientes_especificos: any[];
  segmentos: any[];
}

/**
 * Paso 3: Asignación de productos/categorías
 */
export interface ProductosWizard {
  tipo_asignacion: string;
  productos_especificos: any[];
  categorias_especificas: any[];
}

/**
 * Paso 4: Configuración del beneficio
 */
export interface ConfiguracionWizard {
  puntos: {
    puntos_por_compra: number;
    puntos_por_monto: number;
    puntos_registro: number;
  };
  descuento: ConfiguracionDescuento;
  envio: ConfiguracionEnvio;
  regalo: ConfiguracionRegalo;
}

/**
 * Paso 5: Resumen y confirmación
 */
export interface ResumenWizard {
  nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_clientes: number;
  total_productos: number;
  configuracion_completa: boolean;
}

/**
 * Errores del wizard
 */
export interface ErroresWizard {
  datos_generales: string[];
  segmentacion: string[];
  productos: string[];
  configuracion: string[];
  general: string[];
}

// ============================================================================
// INTERFACES PARA BÚSQUEDAS EN EL WIZARD
// ============================================================================

export interface BusquedaProducto {
  buscar: string;
  limite?: number;
  categoria_id?: number;
  solo_activos?: boolean;
}

export interface BusquedaCategoria {
  buscar: string;
  limite?: number;
  solo_activas?: boolean;
}

export interface BusquedaCliente {
  buscar: string;
  limite?: number;
  segmento_id?: number;
}

// ============================================================================
// INTERFACES PARA RESULTADOS DE BÚSQUEDA
// ============================================================================

export interface ProductoEncontrado {
  id: number;
  nombre: string;
  codigo_producto: string;
  precio_venta: number;
  stock: number;
  categoria: {
    id: number;
    nombre: string;
  };
  activo: boolean;
}

export interface CategoriaEncontrada {
  id: number;
  nombre: string;
  descripcion?: string;
  productos_count: number;
  activo: boolean;
}

export interface ClienteEncontrado {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  segmento?: string;
}

// ============================================================================
// INTERFACES PARA VALIDACIONES DEL WIZARD
// ============================================================================

export interface ValidacionPaso {
  es_valido: boolean;
  errores: string[];
  advertencias: string[];
}

export interface SimulacionPuntos {
  puntos_por_compra_promedio: number;
  puntos_totales_estimados: number;
  clientes_beneficiados: number;
  costo_estimado: number;
}

export interface SimulacionDescuento {
  descuento_promedio: number;
  valor_total_descuentos: number;
  clientes_beneficiados: number;
  impacto_ventas: number;
}

export interface SimulacionEnvio {
  envios_gratis_estimados: number;
  costo_total_envios: number;
  clientes_beneficiados: number;
  zonas_cubiertas: number;
}

export interface SimulacionRegalo {
  regalos_estimados: number;
  costo_total_regalos: number;
  clientes_beneficiados: number;
  stock_disponible: number;
}
