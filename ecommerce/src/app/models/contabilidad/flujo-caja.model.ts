export interface Proyeccion {
  id: number;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  concepto: string;
  monto_proyectado: number;
  monto_real?: number;
  estado: 'PROYECTADO' | 'REALIZADO';
  recurrente: boolean;
  frecuencia?: 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  observaciones?: string;
  desviacion?: number;
  desviacion_porcentaje?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Comparativa {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  ingresos: {
    proyectado: number;
    real: number;
    desviacion: number;
  };
  egresos: {
    proyectado: number;
    real: number;
    desviacion: number;
  };
  flujo_neto: {
    proyectado: number;
    real: number;
    desviacion: number;
  };
}

export interface Alerta {
  id: number;
  concepto: string;
  monto_proyectado: number;
  monto_real: number;
  desviacion_porcentaje: number;
  nivel: 'MODERADA' | 'CRITICA';
}

export interface AlertasResponse {
  total_alertas: number;
  criticas: number;
  moderadas: number;
  alertas: Alerta[];
}

export interface CrearProyeccionDto {
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  concepto: string;
  monto_proyectado: number;
  recurrente?: boolean;
  frecuencia?: 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  observaciones?: string;
}

export interface ActualizarProyeccionDto {
  fecha?: string;
  categoria?: string;
  concepto?: string;
  monto_proyectado?: number;
  recurrente?: boolean;
  observaciones?: string;
}

export interface RegistrarRealDto {
  monto_real: number;
  observaciones?: string;
}

export interface FiltrosFlujoCaja {
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo?: 'INGRESO' | 'EGRESO';
}

export interface ComparativaParams {
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface AlertasParams {
  fecha_inicio?: string;
  fecha_fin?: string;
}
