

export type TipoRecompensa = 'puntos' | 'descuento' | 'envio_gratis' | 'regalo';
export type EstadoRecompensa = 'programada' | 'activa' | 'pausada' | 'expirada' | 'cancelada';
export type TipoSegmentacion = 'todos' | 'nuevos' | 'recurrentes' | 'vip' | 'no_registrados';
export type TipoDescuento = 'porcentaje' | 'cantidad_fija';

// ============================================================================
// INTERFACES PARA ESTADOS DISPONIBLES
// ============================================================================

/**
 * Estado disponible para una recompensa según su fecha de inicio
 */
export interface EstadoDisponible {
  value: string;
  label: string;
  description: string;
}

/**
 * Respuesta del endpoint de estados disponibles
 */
export interface EstadosDisponiblesResponse {
  estados_disponibles: EstadoDisponible[];
  estado_por_defecto: string;
  mensaje: string;
  fecha_inicio: string;
  fecha_actual: string;
  es_fecha_pasada: boolean;
  es_fecha_hoy: boolean;
  es_fecha_futura: boolean;
}

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Modelo principal de recompensa - Tabla: recompensas
 * Basado en la documentación de la API
 */
export interface Recompensa {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: TipoRecompensa;
  tipo_nombre?: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  es_vigente?: boolean;
  creado_por?: number;
  total_aplicaciones?: number;
  creador?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
  tiene_clientes?: boolean;
  tiene_productos?: boolean;
  tiene_configuracion?: boolean;
}

/**
 * Modelo para segmentación de clientes - Tabla: recompensas_clientes
 * Basado en la documentación de la API
 */
export interface RecompensaCliente {
  id: number;
  recompensa_id: number;
  segmento: string;
  segmento_nombre?: string;
  cliente_id?: number;
  cliente?: {
    id: number;
    nombre: string;
    email: string;
  };
  es_cliente_especifico?: boolean;
}

/**
 * Modelo para productos/categorías - Tabla: recompensas_productos
 * Basado en la documentación de la API
 */
export interface RecompensaProducto {
  id: number;
  recompensa_id: number;
  tipo_elemento?: 'producto' | 'categoria';
  nombre_elemento?: string;
  producto_id?: number;
  categoria_id?: number;
  producto?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  categoria?: {
    id: number;
    nombre: string;
  };
}

/**
 * Modelo para configuración de puntos - Tabla: recompensas_puntos
 * Basado en la documentación de la API
 */
export interface RecompensaPuntos {
  id: number;
  recompensa_id: number;
  tipo_calculo?: 'porcentaje' | 'fijo';
  valor: number;
  minimo_compra?: number;
  maximo_puntos?: number;
  multiplicador_nivel?: number;
  // Campos legacy para compatibilidad
  puntos_por_compra?: number;
  puntos_por_monto?: number;
  puntos_registro?: number;
}

/**
 * Modelo para configuración de descuentos - Tabla: recompensas_descuentos
 */
export interface RecompensaDescuento {
  id: number;
  recompensa_id: number;
  tipo_descuento: TipoDescuento;
  valor_descuento: number;
  compra_minima?: number;
}

/**
 * Modelo para configuración de envíos - Tabla: recompensas_envios
 */
export interface RecompensaEnvio {
  id: number;
  recompensa_id: number;
  minimo_compra: number;
  zonas_aplicables?: string; // JSON con ubigeos
}

/**
 * Modelo para configuración de regalos - Tabla: recompensas_regalos
 */
export interface RecompensaRegalo {
  id: number;
  recompensa_id: number;
  producto_id: number;
  cantidad: number;
}

/**
 * Modelo para historial de aplicaciones - Tabla: recompensas_historial
 * Basado en la documentación de la API
 */
export interface RecompensaHistorial {
  id: number;
  recompensa_id: number;
  cliente_id: number;
  cliente?: string; // Nombre del cliente
  pedido_id?: number;
  puntos_otorgados: number;
  beneficio_aplicado?: string;
  fecha_aplicacion: string;
  tiempo_transcurrido?: string; // Ej: "2 horas"
}

// ============================================================================
// INTERFACES PARA EL WIZARD DE CREACIÓN
// ============================================================================

/**
 * Modelo completo para el wizard de creación de recompensas
 */
export interface RecompensaWizard {
  id?: number;
  paso_actual: number;
  total_pasos: number;
  datos_generales: DatosGeneralesWizard;
  segmentacion: SegmentacionWizard;
  productos: ProductosWizard;
  configuracion: ConfiguracionWizard;
  resumen: ResumenWizard;
  puede_continuar: boolean;
  puede_guardar: boolean;
  errores: ErroresWizard;
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
  valido: boolean;
}

/**
 * Paso 2: Segmentación de clientes
 */
export interface SegmentacionWizard {
  tipo_segmentacion: TipoSegmentacion;
  cliente_id?: number; // Para cliente específico
  total_clientes_aplicables: number;
  valido: boolean;
}

/**
 * Paso 3: Asignación de productos/categorías
 */
export interface ProductosWizard {
  tipo_asignacion: 'todos' | 'productos' | 'categorias' | 'mixto';
  productos_seleccionados: number[];
  categorias_seleccionadas: number[];
  total_productos_aplicables: number;
  valido: boolean;
}

/**
 * Paso 4: Configuración del beneficio
 */
export interface ConfiguracionWizard {
  tipo: TipoRecompensa;
  configuracion: ConfiguracionPuntos | ConfiguracionDescuento | ConfiguracionEnvio | ConfiguracionRegalo;
  valido: boolean;
}

/**
 * Paso 5: Resumen y confirmación
 */
export interface ResumenWizard {
  recompensa_id?: number;
  configuracion_completa: boolean;
  puede_activar: boolean;
  advertencias: string[];
  recomendaciones: string[];
}

/**
 * Configuraciones específicas por tipo
 */

export interface ConfiguracionDescuento {
  tipo_descuento: TipoDescuento;
  valor_descuento: number;
  compra_minima?: number;
}

export interface ConfiguracionEnvio {
  minimo_compra: number;
  zonas_aplicables?: string[]; // Array de ubigeos
}

export interface ConfiguracionRegalo {
  minimo_compra: number;
  productos_regalo: any[];
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
// INTERFACES PARA BÚSQUEDAS Y FILTROS
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
// INTERFACES PARA EL DASHBOARD
// ============================================================================

export interface DashboardStats {
  recompensas_activas: number;
  recompensas_activas_crecimiento: number;
  puntos_canjeados: number;
  puntos_crecimiento: number;
  clientes_beneficiados: number;
  clientes_crecimiento: number;
  tasa_conversion: number;
  conversion_crecimiento: number;
}

/**
 * Respuesta de estadísticas de la API
 * Basado en la documentación: GET /api/admin/recompensas/estadisticas
 */
export interface EstadisticasRecompensas {
  resumen: {
    total_recompensas: number;
    recompensas_activas: number;
    recompensas_vigentes: number;
    tasa_activacion: number;
  };
  por_tipo: {
    [key: string]: {
      total: number;
      activas: number;
    };
  };
  mes_actual: {
    aplicaciones: number;
    puntos_otorgados: number;
    clientes_beneficiados: number;
    promedio_puntos_por_aplicacion: number;
  };
  comparativa_mes_anterior: {
    aplicaciones: TendenciaMetrica;
    puntos_otorgados: TendenciaMetrica;
    clientes_beneficiados: TendenciaMetrica;
  };
  top_recompensas_mes: TopRecompensaMes[];
  metadata: {
    generado_en: string;
    periodo_analisis: {
      mes_actual: string;
      mes_anterior: string;
    };
    cache_valido_hasta: string;
  };
}

export interface TendenciaMetrica {
  actual: number;
  anterior: number;
  tendencia: {
    porcentaje: number;
    direccion: 'subida' | 'bajada' | 'estable';
    diferencia: number;
  };
}

export interface TopRecompensaMes {
  id: number;
  nombre: string;
  tipo: string;
  total_aplicaciones: number;
  clientes_unicos: number;
}

export interface RecompensaReciente {
  id: number;
  nombre: string;
  tipo: TipoRecompensa;
  estado: EstadoRecompensa;
  fecha_inicio: string;
  beneficiarios: number;
}

// ============================================================================
// INTERFACES PARA GESTIÓN Y LISTADO
// ============================================================================

export interface RecompensaLista {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: TipoRecompensa;
  tipo_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoRecompensa;
  estado_nombre: string;
  dias_restantes?: number;
  es_vigente: boolean;
  configuracion_completa: boolean;
  total_clientes_aplicables: number;
  total_productos_aplicables: number;
  valor_total_recompensa: number;
  created_at: string;
  updated_at: string;
}

export interface FiltrosRecompensas {
  tipo?: TipoRecompensa;
  estado?: EstadoRecompensa;
  vigente?: boolean;
  fecha_inicio?: string; // YYYY-MM-DD
  fecha_fin?: string; // YYYY-MM-DD
  buscar?: string;
  order_by?: 'created_at' | 'nombre' | 'fecha_inicio' | 'fecha_fin';
  order_direction?: 'asc' | 'desc';
  per_page?: 10 | 15 | 25 | 50 | 100;
  page?: number;
}

// ============================================================================
// INTERFACES PARA PRODUCTOS Y CATEGORÍAS
// ============================================================================

export interface ProductoAsignado {
  id: number;
  tipo_elemento: 'producto' | 'categoria';
  nombre_elemento: string;
  producto?: ProductoInfo;
  categoria?: CategoriaInfo;
  productos_aplicables_count: number;
}

export interface ProductoInfo {
  id: number;
  nombre: string;
  codigo_producto: string;
  precio_venta: number;
  stock: number;
  activo: boolean;
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

export interface FiltrosProducto {
  buscar: string;
  limite?: number;
  categoria_id?: number;
  solo_activos?: boolean;
}

export interface FiltrosCategoria {
  buscar?: string;
  limite?: number;
  solo_activas?: boolean;
}

// ============================================================================
// INTERFACES PARA SEGMENTOS Y CLIENTES
// ============================================================================

export interface SegmentoAsignado {
  id: number;
  segmento: string;
  segmento_nombre: string;
  cliente_id?: number;
  cliente?: ClienteInfo;
  es_cliente_especifico: boolean;
}

export interface ClienteInfo {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  segmento?: string;
  segmento_actual?: string;
  numero_documento?: string;
  activo: boolean;
}

export interface FiltrosCliente {
  buscar: string;
  limite?: number;
  segmento?: string;
}

// ============================================================================
// INTERFACES PARA CONFIGURACIÓN DE PUNTOS
// ============================================================================

export interface ConfiguracionPuntos {
  id: number;
  tipo_calculo: 'porcentaje' | 'fijo' | 'escalonado';
  valor: number;
  minimo_compra?: number;
  maximo_puntos?: number;
  multiplicador_nivel?: number;
  // Campos legacy para compatibilidad
  puntos_por_compra?: number;
  puntos_por_monto?: number;
  puntos_registro?: number;
  configuracion_valida: boolean;
  descripcion: string;
}

export interface SimulacionPuntos {
  monto_compra: number;
  tipo_calculo: string;
  puntos_calculados: number;
  desglose: {
    puntos_base: number;
    puntos_adicionales: number;
    multiplicador_aplicado: number;
  };
}

// ============================================================================
// INTERFACES PARA DETALLES
// ============================================================================

export interface RecompensaDetalle {
  recompensa: Recompensa;
  configuracion: {
    clientes?: SegmentoAsignado[];
    productos?: ProductoAsignado[];
    puntos?: ConfiguracionPuntos[];
    descuentos?: RecompensaDescuento[];
    envios?: RecompensaEnvio[];
    regalos?: RecompensaRegalo[];
  };
  historial_reciente?: RecompensaHistorial[];
  estadisticas?: EstadisticasRecompensa;
}

export interface EstadisticasRecompensa {
  total_aplicaciones: number;
  total_clientes_beneficiados: number;
  valor_total_beneficios: number;
  conversion_rate: number;
  efectividad: number;
  ultima_aplicacion?: string;
  tendencia: 'creciente' | 'decreciente' | 'estable';
}

// ============================================================================
// INTERFACES PARA AUDITORÍA
// ============================================================================

export interface AuditoriaRecompensa {
  id: number;
  recompensa_id: number;
  accion: 'creacion' | 'modificacion' | 'activacion' | 'pausa' | 'eliminacion';
  usuario_id: number;
  usuario_nombre: string;
  detalles: string;
  fecha_accion: string;
  ip_address: string;
}

// ============================================================================
// INTERFACES PARA RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  first_page_url?: string;
  last_page_url?: string;
  next_page_url?: string;
  prev_page_url?: string;
  path?: string;
  links?: any[];
}

// ============================================================================
// INTERFACES PARA VALIDACIONES
// ============================================================================

export interface ValidacionRecompensa {
  es_valida: boolean;
  errores: string[];
  advertencias: string[];
  recomendaciones: string[];
}

export interface SimulacionRecompensa {
  clientes_elegibles: number;
  conversion_esperada: number;
  costo_estimado: number;
  roi_estimado: number;
  recomendaciones: string[];
}