// Modelos para el submódulo de Analytics Avanzados

export interface Crecimiento {
  porcentaje: number;
  direccion: 'subida' | 'bajada' | 'estable';
  diferencia: number;
}

export interface ResumenEjecutivo {
  aplicaciones_mes: number;
  clientes_activos_mes: number;
  puntos_otorgados_mes: number;
  crecimiento: {
    aplicaciones: Crecimiento;
    clientes: Crecimiento;
    puntos: Crecimiento;
  };
}

export interface TopRecompensa {
  id: number;
  nombre: string;
  tipo: string;
  aplicaciones: number;
  clientes_unicos: number;
  puntos_otorgados: number;
  efectividad: number;
}

export interface TendenciaSemanal {
  semana: string;
  aplicaciones: number;
  clientes_unicos: number;
  puntos_otorgados: number;
}

export interface DistribucionTipo {
  tipo: string;
  tipo_nombre: string;
  cantidad: number;
  porcentaje: number;
  aplicaciones: number;
  puntos_otorgados: number;
}

export interface ClienteActivo {
  id: number;
  nombre_completo: string;
  email: string;
  aplicaciones_totales: number;
  puntos_obtenidos: number;
  ultima_aplicacion: string;
  segmento: string;
}

export interface DashboardAnalytics {
  resumen_ejecutivo: ResumenEjecutivo;
  top_recompensas: TopRecompensa[];
  tendencias_semanales: TendenciaSemanal[];
  distribucion_por_tipo: DistribucionTipo[];
  clientes_mas_activos: ClienteActivo[];
  metadata: {
    generado_en: string;
    periodo_analisis: string;
    cache_valido_hasta: string;
  };
}

export interface FiltrosAnalytics {
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_recompensa?: string;
  segmento_cliente?: string;
  limite_clientes?: number;
}

export interface ComparativaPeriodo {
  periodo_actual: {
    aplicaciones: number;
    clientes_unicos: number;
    puntos_otorgados: number;
    promedio_puntos_por_aplicacion: number;
  };
  periodo_anterior: {
    aplicaciones: number;
    clientes_unicos: number;
    puntos_otorgados: number;
    promedio_puntos_por_aplicacion: number;
  };
  comparativa: {
    aplicaciones: Crecimiento;
    clientes: Crecimiento;
    puntos: Crecimiento;
    promedio_puntos: Crecimiento;
  };
}

export interface TendenciaDetallada {
  fecha: string;
  aplicaciones: number;
  clientes_unicos: number;
  puntos_otorgados: number;
  recompensas_activas: number;
}

export interface AnalisisTendencias {
  tendencias_diarias: TendenciaDetallada[];
  comparativa_periodos: ComparativaPeriodo;
  patrones_identificados: {
    dia_semana_mas_activo: string;
    hora_pico: string;
    tendencia_crecimiento: 'creciente' | 'decreciente' | 'estable';
    estacionalidad: string[];
  };
  metadata: {
    generado_en: string;
    periodo_analisis: {
      inicio: string;
      fin: string;
    };
    cache_valido_hasta: string;
  };
}

export interface SegmentoAnalytics {
  segmento: string;
  segmento_nombre: string;
  clientes_totales: number;
  clientes_activos: number;
  aplicaciones_totales: number;
  puntos_otorgados: number;
  efectividad: number;
  crecimiento_mensual: Crecimiento;
}

export interface AnalisisSegmentacion {
  resumen_general: {
    total_segmentos: number;
    segmentos_activos: number;
    clientes_activos: number;
    aplicaciones_totales: number;
  };
  por_segmento: SegmentoAnalytics[];
  comparativa_segmentos: {
    mejor_segmento: {
      segmento: string;
      efectividad: number;
    };
    segmento_mas_creciente: {
      segmento: string;
      crecimiento: number;
    };
  };
  metadata: {
    generado_en: string;
    periodo_analisis: string;
    cache_valido_hasta: string;
  };
}

export interface ClienteDetalle {
  id: number;
  nombre_completo: string;
  email: string;
  segmento: string;
  aplicaciones_totales: number;
  puntos_obtenidos: number;
  primera_aplicacion: string;
  ultima_aplicacion: string;
  recompensas_favoritas: {
    tipo: string;
    cantidad: number;
  }[];
  comportamiento: {
    frecuencia_promedio: number;
    dias_ultima_actividad: number;
    tendencia: 'creciente' | 'decreciente' | 'estable';
  };
}

export interface AnalisisClientes {
  resumen: {
    total_clientes: number;
    clientes_activos: number;
    clientes_nuevos_mes: number;
    clientes_reactivados: number;
  };
  top_clientes: ClienteDetalle[];
  segmentacion_comportamiento: {
    clientes_frecuentes: number;
    clientes_ocasionales: number;
    clientes_inactivos: number;
  };
  patrones_identificados: {
    cliente_tipo_promedio: string;
    frecuencia_media: number;
    puntos_promedio_por_cliente: number;
  };
  metadata: {
    generado_en: string;
    periodo_analisis: string;
    cache_valido_hasta: string;
  };
}
