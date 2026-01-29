import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES ====================

export interface GastoOperativo {
  id: number;
  fecha: string;
  categoria: 'ALQUILER' | 'SERVICIOS' | 'SUELDOS' | 'MARKETING' | 'TRANSPORTE' | 'MANTENIMIENTO' | 'IMPUESTOS' | 'OTROS';
  concepto: string;
  monto: number;
  descripcion?: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor_id?: number;
  proveedor?: any;
  es_fijo: boolean;
  es_recurrente: boolean;
  created_at?: string;
}

export interface RegistrarGastoDto {
  fecha: string;
  categoria: 'ALQUILER' | 'SERVICIOS' | 'SUELDOS' | 'MARKETING' | 'TRANSPORTE' | 'MANTENIMIENTO' | 'IMPUESTOS' | 'OTROS';
  concepto: string;
  monto: number;
  descripcion?: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor_id?: number;
  es_fijo?: boolean;
  es_recurrente?: boolean;
}

export interface ReporteUtilidades {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  ventas: {
    total: number;
    cantidad: number;
  };
  costos: {
    costo_ventas: number;
    gastos_operativos: number;
    total_costos: number;
  };
  utilidad: {
    utilidad_bruta: number;
    margen_bruto: number;
    utilidad_operativa: number;
    margen_operativo: number;
    utilidad_neta: number;
    margen_neto: number;
  };
}

export interface UtilidadVenta {
  venta_id: number;
  fecha: string;
  total_venta: number;
  costo_total: number;
  utilidad_bruta: number;
  margen_porcentaje: number;
  detalles: UtilidadDetalleProducto[];
}

export interface UtilidadDetalleProducto {
  producto: string;
  cantidad: number;
  precio_venta: number;
  costo_unitario: number;
  subtotal_venta: number;
  subtotal_costo: number;
  utilidad: number;
  margen: number;
}

export interface UtilidadPorProducto {
  producto_id: number;
  codigo: string;
  nombre: string;
  cantidad_vendida: number;
  precio_promedio: number;
  costo_promedio: number;
  total_ventas: number;
  total_costos: number;
  utilidad: number;
  margen_porcentaje: number;
}

export interface PuntoEquilibrio {
  mes: number;
  anio: number;
  gastos_fijos: number;
  margen_contribucion_porcentaje: number;
  punto_equilibrio_ventas: number;
  ventas_actuales: number;
  diferencia: number;
  alcanzado: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UtilidadesContabilidadService {
  private apiUrl = `${environment.apiUrl}/contabilidad/utilidades`;

  constructor(private http: HttpClient) {}

  // ==================== GASTOS ====================

  /**
   * Listar gastos
   * GET /contabilidad/utilidades/gastos
   */
  listarGastos(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<{ data: GastoOperativo[]; total: number; per_page: number }> {
    let httpParams = new HttpParams();

    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get<{ data: GastoOperativo[]; total: number; per_page: number }>(`${this.apiUrl}/gastos`, { params: httpParams });
  }

  /**
   * Registrar gasto
   * POST /contabilidad/utilidades/gastos
   */
  registrarGasto(data: RegistrarGastoDto): Observable<GastoOperativo> {
    return this.http.post<GastoOperativo>(`${this.apiUrl}/gastos`, data);
  }

  /**
   * Obtener gastos por categoría
   * GET /contabilidad/utilidades/gastos/por-categoria
   */
  gastosPorCategoria(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<{
    periodo: { fecha_inicio: string; fecha_fin: string };
    gastos_por_categoria: Array<{ categoria: string; total: number }>;
    total_gastos: number;
  }> {
    let httpParams = new HttpParams();

    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get<{
      periodo: { fecha_inicio: string; fecha_fin: string };
      gastos_por_categoria: Array<{ categoria: string; total: number }>;
      total_gastos: number;
    }>(`${this.apiUrl}/gastos/por-categoria`, {
      params: httpParams,
    });
  }

  // ==================== UTILIDADES ====================

  /**
   * Obtener reporte de utilidades
   * GET /contabilidad/utilidades/reporte
   */
  reporte(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<ReporteUtilidades> {
    let httpParams = new HttpParams();

    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get<ReporteUtilidades>(`${this.apiUrl}/reporte`, { params: httpParams });
  }

  /**
   * Calcular utilidad mensual
   * POST /contabilidad/utilidades/mensual/{mes}/{anio}
   */
  utilidadMensual(mes: number, anio: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/mensual/${mes}/${anio}`, {});
  }

  /**
   * Obtener utilidad de una venta específica
   * GET /contabilidad/utilidades/venta/{ventaId}
   */
  utilidadVenta(ventaId: number): Observable<UtilidadVenta> {
    return this.http.get<UtilidadVenta>(`${this.apiUrl}/venta/${ventaId}`);
  }

  /**
   * Obtener utilidades por producto
   * GET /contabilidad/utilidades/por-producto
   */
  utilidadesPorProducto(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<{
    productos: UtilidadPorProducto[];
    resumen: {
      total_ventas: number;
      total_costos: number;
      utilidad_total: number;
    };
  }> {
    let httpParams = new HttpParams();

    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get<{
      productos: UtilidadPorProducto[];
      resumen: {
        total_ventas: number;
        total_costos: number;
        utilidad_total: number;
      };
    }>(`${this.apiUrl}/por-producto`, {
      params: httpParams,
    });
  }

  /**
   * Calcular punto de equilibrio
   * GET /contabilidad/utilidades/punto-equilibrio
   */
  puntoEquilibrio(mes?: number, anio?: number): Observable<PuntoEquilibrio> {
    let httpParams = new HttpParams();
    
    if (mes) {
      httpParams = httpParams.set('mes', mes.toString());
    }
    if (anio) {
      httpParams = httpParams.set('anio', anio.toString());
    }
    
    return this.http.get<PuntoEquilibrio>(`${this.apiUrl}/punto-equilibrio`, { params: httpParams });
  }

  /**
   * Comparativa de utilidades por año
   * GET /contabilidad/utilidades/comparativa/{anio}
   */
  comparativaAnual(anio: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/comparativa/${anio}`);
  }
}
