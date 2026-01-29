

import { TipoRecompensa, EstadoRecompensa } from './recompensa.model';

/**
 * Modelo principal para analytics de recompensas
 * Basado en la documentación de la API
 */
export interface RecompensaAnalytics {
  dashboard: DashboardAnalytics;
  rendimiento: RendimientoAnalytics;
  tendencias: TendenciasAnalytics;
  comparativa: ComparativaAnalytics;
  segmentos: SegmentosAnalytics;
  productos: ProductosAnalytics;
}

/**
 * Respuesta del dashboard principal de analytics
 * Basado en: GET /api/admin/recompensas/analytics/dashboard
 */
export interface DashboardAnalyticsResponse {
  resumen_ejecutivo: {
    aplicaciones_mes: number;
    clientes_activos_mes: number;
    puntos_otorgados_mes: number;
    crecimiento: {
      aplicaciones: TendenciaCrecimiento;
      clientes: TendenciaCrecimiento;
      puntos: TendenciaCrecimiento;
    };
    participacion_clientes: number;
  };
  metricas_principales: {
    recompensas_totales: number;
    recompensas_activas: number;
    recompensas_vigentes: number;
    utilizacion_promedio: number;
    efectividad_general: number;
    roi_estimado: {
      costo_estimado: number;
      beneficio_estimado: number;
      roi_porcentaje: number;
    };
  };
  tendencias_mensuales: {
    [periodo: string]: {
      total_aplicaciones: number;
      total_clientes: number;
      total_puntos: number;
      por_tipo: {
        [tipo: string]: {
          aplicaciones: number;
          clientes_unicos: number;
          puntos_otorgados: number;
        };
      };
    };
  };
  top_recompensas: TopRecompensaAnalytics[];
  segmentacion_uso: SegmentacionUso[];
  conversion_rates: {
    tasa_adopcion: number;
    clientes_activos: number;
    clientes_totales: number;
    conversiones_por_tipo: {
      [tipo: string]: number;
    };
  };
  metadata: {
    generado_en: string;
    cache_hasta: string;
    periodo_analisis: string;
  };
}

export interface TendenciaCrecimiento {
  porcentaje: number;
  direccion: 'subida' | 'bajada' | 'estable';
  diferencia: number;
}

export interface TopRecompensaAnalytics {
  id: number;
  nombre: string;
  tipo: string;
  total_aplicaciones: number;
  clientes_unicos: number;
  puntos_otorgados: number;
  promedio_puntos: number;
}

export interface SegmentacionUso {
  segmento: string;
  aplicaciones: number;
  clientes_unicos: number;
  puntos_totales: number;
}

/**
 * Respuesta de tendencias detalladas
 * Basado en: GET /api/admin/recompensas/analytics/tendencias
 */
export interface TendenciasResponse {
  periodo: 'diario' | 'mensual' | 'anual';
  rango_fechas: {
    inicio: string;
    fin: string;
  };
  tendencias: {
    [periodo: string]: TendenciaPeriodo[];
  };
  resumen: {
    totales: {
      aplicaciones: number;
      clientes: number;
      puntos: number;
    };
    promedios: {
      aplicaciones_por_periodo: number;
      clientes_por_periodo: number;
      puntos_por_periodo: number;
    };
  };
}

export interface TendenciaPeriodo {
  periodo: string;
  aplicaciones: number;
  clientes_unicos: number;
  puntos_otorgados: number;
  tipo: string;
}

/**
 * Respuesta de rendimiento
 * Basado en: GET /api/admin/recompensas/analytics/rendimiento
 */
export interface RendimientoResponse {
  resumen_general?: {
    aplicaciones_totales: number;
    clientes_unicos: number;
    recompensas_utilizadas: number;
    puntos_totales: number;
  };
  por_tipo?: {
    tipo: string;
    aplicaciones: number;
    clientes: number;
    puntos: number;
  }[];
  // Para rendimiento específico
  aplicaciones?: number;
  clientes_unicos?: number;
  puntos_totales?: number;
  promedio_puntos?: number;
  ultima_aplicacion?: string;
  primera_aplicacion?: string;
}

/**
 * Respuesta de comparativa entre períodos
 * Basado en: GET /api/admin/recompensas/analytics/comparativa
 */
export interface ComparativaResponse {
  periodo_actual: {
    fechas: {
      inicio: string;
      fin: string;
    };
    metricas: {
      aplicaciones: number;
      clientes_unicos: number;
      puntos_totales: number;
      recompensas_utilizadas: number;
    };
  };
  periodo_anterior: {
    fechas: {
      inicio: string;
      fin: string;
    };
    metricas: {
      aplicaciones: number;
      clientes_unicos: number;
      puntos_totales: number;
      recompensas_utilizadas: number;
    };
  };
  comparativa: {
    aplicaciones: TendenciaCrecimiento;
    clientes: TendenciaCrecimiento;
    puntos: TendenciaCrecimiento;
  };
}

/**
 * Respuesta de análisis de comportamiento de clientes
 * Basado en: GET /api/admin/recompensas/analytics/comportamiento-clientes
 */
export interface ComportamientoClientesResponse {
  segmentacion_participacion: {
    segmento: string;
    aplicaciones: number;
    clientes_participantes: number;
  }[];
  frecuencia_uso: {
    ocasional: number;
    regular: number;
    frecuente: number;
    muy_frecuente: number;
  };
  patrones_temporales: {
    por_dia_semana: {
      dia_semana: string;
      aplicaciones: number;
    }[];
    por_hora_dia: {
      hora: number;
      aplicaciones: number;
    }[];
  };
  fidelizacion: {
    tasa_retencion: number;
    clientes_fidelizados: number;
    total_clientes: number;
  };
  valor_cliente: {
    valor_promedio_por_aplicacion: number;
    valor_maximo: number;
    valor_minimo: number;
    desviacion_estandar: number;
  };
}

export interface DashboardAnalytics {
  resumen_general: ResumenGeneral;
  metricas_principales: MetricasPrincipales;
  graficos_principales: GraficosPrincipales;
  alertas: AlertaAnalytics[];
  recomendaciones: RecomendacionAnalytics[];
}

export interface ResumenGeneral {
  total_recompensas_activas: number;
  total_recompensas_este_mes: number;
  total_clientes_beneficiados: number;
  valor_total_beneficios: number;
  conversion_rate_promedio: number;
  crecimiento_mensual: number;
}

export interface MetricasPrincipales {
  recompensas_por_tipo: RecompensaPorTipo[];
  top_recompensas: TopRecompensa[];
  clientes_mas_activos: ClienteActivo[];
  productos_mas_recompensados: ProductoRecompensado[];
  zonas_mas_activas: ZonaActiva[];
}

export interface RecompensaPorTipo {
  tipo: string;
  tipo_nombre: string;
  cantidad: number;
  porcentaje: number;
  valor_total: number;
  conversion_rate: number;
}

export interface TopRecompensa {
  id: number;
  nombre: string;
  tipo: string;
  aplicaciones: number;
  clientes_beneficiados: number;
  valor_beneficios: number;
  conversion_rate: number;
  efectividad: number;
}

export interface ClienteActivo {
  id: number;
  nombre: string;
  email: string;
  total_recompensas: number;
  valor_beneficios: number;
  ultima_actividad: string;
  segmento: string;
}

export interface ProductoRecompensado {
  id: number;
  nombre: string;
  codigo: string;
  veces_recompensado: number;
  valor_total_recompensado: number;
  categoria: string;
}

export interface ZonaActiva {
  codigo: string;
  nombre: string;
  total_aplicaciones: number;
  valor_beneficios: number;
  porcentaje_participacion: number;
}

export interface GraficosPrincipales {
  evolucion_temporal: PuntoGrafico[];
  distribucion_por_tipo: PuntoGrafico[];
  conversion_por_segmento: PuntoGrafico[];
  tendencia_valores: PuntoGrafico[];
}

export interface PuntoGrafico {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: any;
}

export interface AlertaAnalytics {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensaje: string;
  fecha: string;
  accion_requerida: boolean;
  accion_url?: string;
}

export interface RecomendacionAnalytics {
  id: string;
  categoria: 'optimizacion' | 'nuevas_campanas' | 'segmentacion' | 'productos';
  titulo: string;
  descripcion: string;
  impacto_estimado: 'alto' | 'medio' | 'bajo';
  facilidad_implementacion: 'alta' | 'media' | 'baja';
  accion_sugerida: string;
}

export interface RendimientoAnalytics {
  metricas_rendimiento: MetricasRendimiento;
  analisis_efectividad: AnalisisEfectividad;
  comparacion_periodos: ComparacionPeriodos;
  insights: InsightRendimiento[];
}

export interface MetricasRendimiento {
  conversion_rate: number;
  valor_promedio_beneficio: number;
  tiempo_promedio_aplicacion: number;
  tasa_abandono: number;
  retorno_inversion: number;
  costo_por_adquisicion: number;
}

export interface AnalisisEfectividad {
  recompensas_mas_efectivas: RecompensaEfectiva[];
  recompensas_menos_efectivas: RecompensaEfectiva[];
  factores_exito: FactorExito[];
  areas_mejora: AreaMejora[];
}

export interface RecompensaEfectiva {
  id: number;
  nombre: string;
  tipo: string;
  efectividad: number;
  conversion_rate: number;
  valor_beneficios: number;
  razones_exito: string[];
}

export interface FactorExito {
  factor: string;
  impacto: number;
  descripcion: string;
  recomendaciones: string[];
}

export interface AreaMejora {
  area: string;
  problema: string;
  impacto: number;
  solucion_sugerida: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface ComparacionPeriodos {
  periodo_actual: PeriodoComparacion;
  periodo_anterior: PeriodoComparacion;
  cambios: CambioPeriodo[];
}

export interface PeriodoComparacion {
  fecha_inicio: string;
  fecha_fin: string;
  total_recompensas: number;
  total_aplicaciones: number;
  conversion_rate: number;
  valor_beneficios: number;
}

export interface CambioPeriodo {
  metrica: string;
  valor_actual: number;
  valor_anterior: number;
  cambio_absoluto: number;
  cambio_porcentual: number;
  tendencia: 'creciente' | 'decreciente' | 'estable';
}

export interface InsightRendimiento {
  id: string;
  tipo: 'oportunidad' | 'riesgo' | 'tendencia' | 'patron';
  titulo: string;
  descripcion: string;
  datos_soporte: any;
  accion_recomendada: string;
  urgencia: 'alta' | 'media' | 'baja';
}

export interface TendenciasAnalytics {
  tendencias_temporales: TendenciaTemporal[];
  patrones_estacionales: PatronEstacional[];
  proyecciones: ProyeccionAnalytics;
  ciclos_vida: CicloVidaRecompensa[];
}

export interface TendenciaTemporal {
  metrica: string;
  periodo: string;
  datos: PuntoGrafico[];
  tendencia: 'creciente' | 'decreciente' | 'estable' | 'ciclica';
  fuerza_tendencia: number;
  significancia: number;
}

export interface PatronEstacional {
  patron: string;
  descripcion: string;
  frecuencia: 'diaria' | 'semanal' | 'mensual' | 'anual';
  impacto: number;
  recomendaciones: string[];
}

export interface ProyeccionAnalytics {
  proyeccion_conversion: ProyeccionMetrica;
  proyeccion_valores: ProyeccionMetrica;
  proyeccion_clientes: ProyeccionMetrica;
  escenarios: EscenarioProyeccion[];
}

export interface ProyeccionMetrica {
  metrica: string;
  valores_historicos: PuntoGrafico[];
  valores_proyectados: PuntoGrafico[];
  confianza: number;
  intervalo_confianza: {
    inferior: PuntoGrafico[];
    superior: PuntoGrafico[];
  };
}

export interface EscenarioProyeccion {
  nombre: string;
  descripcion: string;
  probabilidad: number;
  valores_proyectados: PuntoGrafico[];
  factores_clave: string[];
}

export interface CicloVidaRecompensa {
  fase: string;
  duracion_promedio: number;
  caracteristicas: string[];
  metricas_tipicas: any;
  recomendaciones: string[];
}

export interface ComparativaAnalytics {
  comparacion_tipos: ComparacionTipo[];
  comparacion_segmentos: ComparacionSegmento[];
  comparacion_productos: ComparacionProducto[];
  benchmarking: BenchmarkingData;
}

export interface ComparacionTipo {
  tipo: string;
  tipo_nombre: string;
  metricas: {
    aplicaciones: number;
    conversion_rate: number;
    valor_beneficios: number;
    costo_implementacion: number;
    roi: number;
  };
  ranking: number;
  fortalezas: string[];
  debilidades: string[];
}

export interface ComparacionSegmento {
  segmento: string;
  metricas: {
    clientes: number;
    aplicaciones: number;
    conversion_rate: number;
    valor_promedio_beneficio: number;
    frecuencia_uso: number;
  };
  ranking: number;
  caracteristicas: string[];
}

export interface ComparacionProducto {
  producto: string;
  categoria: string;
  metricas: {
    veces_recompensado: number;
    valor_total_recompensado: number;
    conversion_rate: number;
    popularidad: number;
  };
  ranking: number;
  tendencia: 'creciente' | 'decreciente' | 'estable';
}

export interface BenchmarkingData {
  metricas_industria: {
    conversion_rate_promedio: number;
    valor_beneficio_promedio: number;
    frecuencia_uso_promedio: number;
  };
  posicion_actual: {
    conversion_rate: number;
    valor_beneficio: number;
    frecuencia_uso: number;
  };
  gaps: {
    metrica: string;
    gap_actual: number;
    gap_objetivo: number;
    accion_requerida: string;
  }[];
}

export interface SegmentosAnalytics {
  analisis_segmentos: AnalisisSegmento[];
  segmentacion_efectiva: SegmentacionEfectiva;
  oportunidades_segmentacion: OportunidadSegmentacion[];
}

export interface AnalisisSegmento {
  segmento: string;
  caracteristicas: string[];
  metricas: {
    total_clientes: number;
    clientes_activos: number;
    aplicaciones: number;
    conversion_rate: number;
    valor_beneficios: number;
    frecuencia_uso: number;
  };
  comportamiento: {
    patrones_compra: string[];
    preferencias_recompensas: string[];
    horarios_actividad: string[];
    canales_preferidos: string[];
  };
  potencial: {
    crecimiento_estimado: number;
    oportunidades_expansion: string[];
    riesgos: string[];
  };
}

export interface SegmentacionEfectiva {
  segmentos_mas_efectivos: string[];
  segmentos_menos_efectivos: string[];
  factores_diferenciacion: string[];
  recomendaciones_optimizacion: string[];
}

export interface OportunidadSegmentacion {
  oportunidad: string;
  descripcion: string;
  segmento_objetivo: string;
  potencial_impacto: number;
  facilidad_implementacion: 'alta' | 'media' | 'baja';
  accion_sugerida: string;
}

export interface ProductosAnalytics {
  analisis_productos: AnalisisProducto[];
  categorias_mas_efectivas: CategoriaEfectiva[];
  oportunidades_productos: OportunidadProducto[];
}

export interface AnalisisProducto {
  producto: string;
  categoria: string;
  metricas: {
    veces_recompensado: number;
    valor_total_recompensado: number;
    conversion_rate: number;
    popularidad: number;
    rentabilidad: number;
  };
  comportamiento: {
    estacionalidad: string[];
    tendencias: string[];
    correlaciones: string[];
  };
  potencial: {
    crecimiento_estimado: number;
    oportunidades_expansion: string[];
    limitaciones: string[];
  };
}

export interface CategoriaEfectiva {
  categoria: string;
  efectividad: number;
  metricas: {
    productos_incluidos: number;
    aplicaciones: number;
    conversion_rate: number;
    valor_beneficios: number;
  };
  fortalezas: string[];
  areas_mejora: string[];
}

export interface OportunidadProducto {
  oportunidad: string;
  descripcion: string;
  productos_afectados: string[];
  potencial_impacto: number;
  facilidad_implementacion: 'alta' | 'media' | 'baja';
  accion_sugerida: string;
}
