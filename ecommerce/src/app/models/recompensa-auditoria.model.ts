
import { Recompensa } from './recompensa.model';

export interface AuditoriaRecompensa {
  id: number;
  recompensa_id: number;
  accion: TipoAccionAuditoria;
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  detalles: string;
  cambios?: CambioAuditoria[];
  fecha_accion: string;
  ip_address: string;
  user_agent?: string;
}

export type TipoAccionAuditoria = 
  | 'creacion' 
  | 'modificacion' 
  | 'activacion' 
  | 'pausa' 
  | 'reanudacion'
  | 'eliminacion'
  | 'duplicacion'
  | 'configuracion_cambio';

/**
 * Modelo para cambios específicos en auditoría
 */
export interface CambioAuditoria {
  campo: string;
  valor_anterior: any;
  valor_nuevo: any;
  tipo_cambio: 'agregado' | 'modificado' | 'eliminado';
}

/**
 * Modelo para filtros de auditoría
 */
export interface FiltrosAuditoria {
  recompensa_id?: number;
  usuario_id?: number;
  accion?: TipoAccionAuditoria;
  fecha_desde?: string;
  fecha_hasta?: string;
  buscar?: string;
  page?: number;
  per_page?: number;
}

/**
 * Modelo para resumen de auditoría
 */
export interface ResumenAuditoria {
  total_acciones: number;
  acciones_por_tipo: {
    tipo: TipoAccionAuditoria;
    cantidad: number;
    porcentaje: number;
  }[];
  usuarios_mas_activos: {
    usuario_id: number;
    usuario_nombre: string;
    total_acciones: number;
  }[];
  recompensas_mas_modificadas: {
    recompensa_id: number;
    recompensa_nombre: string;
    total_modificaciones: number;
  }[];
  actividad_por_fecha: {
    fecha: string;
    total_acciones: number;
  }[];
}

/**
 * Modelo para exportación de auditoría
 */
export interface ExportacionAuditoria {
  formato: 'excel' | 'csv' | 'pdf';
  filtros: FiltrosAuditoria;
  incluir_detalles: boolean;
  incluir_cambios: boolean;
  fecha_generacion: string;
  generado_por: string;
}

/**
 * Modelo para alertas de auditoría
 */
export interface AlertaAuditoria {
  id: string;
  tipo: 'sospechosa' | 'masiva' | 'critica' | 'informativa';
  titulo: string;
  descripcion: string;
  severidad: 'alta' | 'media' | 'baja';
  fecha_deteccion: string;
  acciones: AccionAlerta[];
  resuelta: boolean;
  fecha_resolucion?: string;
  resuelta_por?: string;
}

export interface AccionAlerta {
  tipo: 'investigar' | 'revertir' | 'notificar' | 'ignorar';
  descripcion: string;
  ejecutada: boolean;
  fecha_ejecucion?: string;
  ejecutada_por?: string;
}

/**
 * Modelo para reportes de auditoría
 */
export interface ReporteAuditoria {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'diario' | 'semanal' | 'mensual' | 'personalizado';
  filtros: FiltrosAuditoria;
  metricas: {
    total_acciones: number;
    acciones_por_tipo: Record<TipoAccionAuditoria, number>;
    usuarios_activos: number;
    recompensas_afectadas: number;
  };
  generado_en: string;
  generado_por: string;
  archivo_url?: string;
}

/**
 * Modelo para configuración de auditoría
 */
export interface ConfiguracionAuditoria {
  auditar_creaciones: boolean;
  auditar_modificaciones: boolean;
  auditar_activaciones: boolean;
  auditar_eliminaciones: boolean;
  retener_historial_dias: number;
  alertas_activas: boolean;
  notificaciones_email: boolean;
  usuarios_notificacion: string[];
  umbral_acciones_sospechosas: number;
  umbral_cambios_masivos: number;
}

/**
 * Modelo para estadísticas de auditoría
 */
export interface EstadisticasAuditoria {
  periodo: {
    inicio: string;
    fin: string;
  };
  resumen: {
    total_acciones: number;
    acciones_unicas: number;
    usuarios_activos: number;
    recompensas_afectadas: number;
  };
  tendencias: {
    fecha: string;
    acciones: number;
    usuarios: number;
  }[];
  top_acciones: {
    accion: TipoAccionAuditoria;
    cantidad: number;
    porcentaje: number;
  }[];
  top_usuarios: {
    usuario: string;
    acciones: number;
    porcentaje: number;
  }[];
  distribucion_horaria: {
    hora: number;
    acciones: number;
  }[];
}
