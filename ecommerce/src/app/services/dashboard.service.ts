// src/app/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============================================
// INTERFACES PARA DASHBOARD
// ============================================

/**
 * Producto más vendido del mes
 */
export interface ProductoDelMes {
  id: number;
  nombre: string;
  imagen_principal: string;
  ventas_cantidad: number;
  ventas_total: number;
  crecimiento_porcentaje: number;
  periodo: {
    mes: number;
    anio: number;
    nombre_mes: string;
  };
}

/**
 * Estadísticas generales del dashboard
 */
export interface EstadisticasDashboard {
  total_pedidos: number;
  total_clientes: number;
  total_ingresos: number;
  total_productos: number;
  ganancias_mes_actual: number;
  producto_del_mes: ProductoDelMes | null;
}

/**
 * Datos para gráfico de categorías más vendidas
 */
export interface CategoriaVendida {
  id: number;
  nombre: string;
  porcentaje: number;
  color: string;
  ventas_total: number;
}

/**
 * Pedidos por día de la semana
 */
export interface PedidosPorDia {
  dia_semana: string;
  dia_numero: number;
  cantidad_pedidos: number;
}

/**
 * Ventas mensuales
 */
export interface VentasMensuales {
  mes: number;
  anio: number;
  nombre_mes: string;
  total_ventas: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  // ============================================
  // ESTADÍSTICAS GENERALES
  // ============================================

  /**
   * Obtiene todas las estadísticas del dashboard
   * GET /api/dashboard/estadisticas
   */
  obtenerEstadisticasDashboard(): Observable<EstadisticasDashboard> {
    return this.http.get<EstadisticasDashboard>(`${this.apiUrl}/dashboard/estadisticas`);
  }

  /**
   * Obtiene el producto más vendido del mes actual
   * GET /api/dashboard/producto-del-mes
   */
  obtenerProductoDelMes(mes?: number, anio?: number): Observable<ProductoDelMes | null> {
    let params = new HttpParams();
    
    if (mes) {
      params = params.set('mes', mes.toString());
    }
    if (anio) {
      params = params.set('año', anio.toString());
    }

    return this.http.get<{data: ProductoDelMes | null}>(`${this.apiUrl}/dashboard/producto-del-mes`, { params })
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Obtiene categorías más vendidas para gráfico de torta
   * GET /api/dashboard/categorias-vendidas
   */
  obtenerCategoriasVendidas(limite: number = 4): Observable<CategoriaVendida[]> {
    const params = new HttpParams().set('limite', limite.toString());
    
    return this.http.get<{data: CategoriaVendida[]}>(`${this.apiUrl}/dashboard/categorias-vendidas`, { params })
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Obtiene pedidos por día de la semana
   * GET /api/dashboard/pedidos-por-dia
   */
  obtenerPedidosPorDia(): Observable<PedidosPorDia[]> {
    return this.http.get<{data: PedidosPorDia[]}>(`${this.apiUrl}/dashboard/pedidos-por-dia`)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Obtiene ventas de los últimos meses
   * GET /api/dashboard/ventas-mensuales
   */
  obtenerVentasMensuales(meses: number = 6): Observable<VentasMensuales[]> {
    const params = new HttpParams().set('meses', meses.toString());
    
    return this.http.get<{data: VentasMensuales[]}>(`${this.apiUrl}/dashboard/ventas-mensuales`, { params })
      .pipe(
        map(response => response.data)
      );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Formatea el crecimiento como porcentaje
   */
  formatearCrecimiento(crecimiento: number): string {
    const signo = crecimiento >= 0 ? '+' : '';
    return `${signo}${crecimiento.toFixed(1)}%`;
  }

  /**
   * Obtiene el color para el crecimiento
   */
  obtenerColorCrecimiento(crecimiento: number): string {
    return crecimiento >= 0 ? 'success' : 'danger';
  }

  /**
   * Obtiene el icono para el crecimiento
   */
  obtenerIconoCrecimiento(crecimiento: number): string {
    return crecimiento >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  }

  /**
   * Formatea moneda en soles peruanos
   */
  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(monto);
  }

  /**
   * Obtiene el nombre del mes en español
   */
  obtenerNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Mes desconocido';
  }

  /**
   * Obtiene el nombre corto del día de la semana
   */
  obtenerNombreDiaCorto(dia: number): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[dia] || 'Día';
  }
}