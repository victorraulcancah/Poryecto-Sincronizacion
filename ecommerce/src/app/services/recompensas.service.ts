import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Recompensa,
  RecompensaLista,
  RecompensaDetalle,
  DashboardStats,
  RecompensaReciente,
  ApiResponse,
  PaginatedResponse,
  FiltrosRecompensas,
  EstadisticasRecompensas,
  TipoRecompensa,
  EstadosDisponiblesResponse
} from '../models/recompensa.model';

@Injectable({
  providedIn: 'root'
})
export class RecompensasService {
  private apiUrl = `${environment.apiUrl}/admin/recompensas`;

  constructor(private http: HttpClient) { }

  // Obtener lista de recompensas
  obtenerLista(filtros?: FiltrosRecompensas): Observable<PaginatedResponse<RecompensaLista>> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key as keyof FiltrosRecompensas];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<PaginatedResponse<RecompensaLista>>(`${this.apiUrl}`, { params });
  }

  // Obtener detalle de una recompensa
  obtenerDetalle(id: number): Observable<RecompensaDetalle> {
    return this.http.get<RecompensaDetalle>(`${this.apiUrl}/${id}`);
  }

  // Crear nueva recompensa
  crear(recompensa: Partial<Recompensa>): Observable<ApiResponse<Recompensa>> {
    return this.http.post<ApiResponse<Recompensa>>(`${this.apiUrl}`, recompensa);
  }

  // Actualizar recompensa existente
  actualizar(id: number, recompensa: Partial<Recompensa>): Observable<ApiResponse<Recompensa>> {
    return this.http.put<ApiResponse<Recompensa>>(`${this.apiUrl}/${id}`, recompensa);
  }

  // Activar recompensa
  activar(id: number): Observable<ApiResponse<Recompensa>> {
    return this.http.patch<ApiResponse<Recompensa>>(`${this.apiUrl}/${id}/activate`, {});
  }

  // Pausar recompensa
  pausar(id: number): Observable<ApiResponse<Recompensa>> {
    return this.http.patch<ApiResponse<Recompensa>>(`${this.apiUrl}/${id}/pause`, {});
  }

  // Cambiar estado de recompensa (genérico)
  cambiarEstado(id: number, estado: string): Observable<ApiResponse<boolean>> {
    if (estado === 'pausada') {
      // Para pausar, usamos el endpoint específico de pausa
      return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/pause`, {});
    } else if (estado === 'activa') {
      // Para activar, usamos el endpoint de activación
      return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/activate`, {});
    } else {
      // Para otros estados, actualizamos directamente usando el campo estado
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, { estado: estado });
    }
  }

  // Cancelar recompensa (cambia estado a 'cancelada')
  cancelar(id: number): Observable<ApiResponse<Recompensa>> {
    return this.http.put<ApiResponse<Recompensa>>(`${this.apiUrl}/${id}`, { estado: 'cancelada' });
  }

  // Eliminar recompensa (ahora cancela en lugar de eliminar)
  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.cancelar(id).pipe(
      map(response => ({ success: response.success, message: response.message, data: true }))
    );
  }

  // Obtener estadísticas generales
  obtenerEstadisticas(): Observable<ApiResponse<EstadisticasRecompensas>> {
    return this.http.get<ApiResponse<EstadisticasRecompensas>>(`${this.apiUrl}/estadisticas`);
  }

  // Obtener estadísticas con fallback
  obtenerEstadisticasConFallback(): Observable<ApiResponse<EstadisticasRecompensas>> {
    return this.http.get<ApiResponse<EstadisticasRecompensas>>(`${this.apiUrl}/estadisticas`);
  }

  // Obtener tipos de recompensas disponibles
  obtenerTipos(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tipos`);
  }

  // Obtener estados disponibles según fecha de inicio
  obtenerEstadosDisponibles(fechaInicio: string): Observable<ApiResponse<EstadosDisponiblesResponse>> {
    const params = new HttpParams().set('fecha_inicio', fechaInicio);
    return this.http.get<ApiResponse<EstadosDisponiblesResponse>>(`${this.apiUrl}/estados-disponibles`, { params });
  }

  // ===== MÉTODOS PARA ANALYTICS =====

  // Dashboard principal de analytics
  obtenerDashboardAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics/dashboard`);
  }

  // ===== MÉTODOS PARA GESTIÓN DE PRODUCTOS Y CATEGORÍAS =====

  // Obtener productos/categorías asignados a una recompensa
  obtenerProductosAsignados(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos`);
  }

  // Asignar producto o categoría a una recompensa
  // Estructura según backend: 
  // Para producto: { tipo: 'producto', producto_id: number }
  // Para categoría: { tipo: 'categoria', categoria_id: number }
  asignarProducto(recompensaId: number, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos`, data);
  }

  // Eliminar asignación de producto/categoría
  eliminarAsignacionProducto(recompensaId: number, asignacionId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${recompensaId}/productos/${asignacionId}`);
  }

  // Buscar productos disponibles
  buscarProductos(filtros: { buscar: string, limite?: number, categoria_id?: number, solo_activos?: boolean }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const value = filtros[key as keyof typeof filtros];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/productos/buscar`, { params });
  }

  // Buscar categorías disponibles
  buscarCategorias(filtros: { buscar?: string, limite?: number, solo_activas?: boolean }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const value = filtros[key as keyof typeof filtros];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/categorias/buscar`, { params });
  }

  // Obtener productos aplicables para una recompensa
  obtenerProductosAplicables(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos/aplicables`);
  }

  // Validar si un producto aplica para una recompensa
  validarProducto(recompensaId: number, productoId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos/validar-producto`, { producto_id: productoId });
  }

  // Obtener estadísticas de productos de una recompensa
  obtenerEstadisticasProductos(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos/estadisticas`);
  }

  // ===== MÉTODOS PARA GESTIÓN DE SEGMENTOS Y CLIENTES =====

  // Obtener segmentos asignados a una recompensa
  obtenerSegmentosAsignados(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/segmentos`);
  }

  // Asignar segmento o cliente específico
  // Estructura según documentación: { segmento: 'vip'|'especifico'|'todos', cliente_id?: number | null }
  asignarSegmento(recompensaId: number, data: { segmento: string, cliente_id?: number | null }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/segmentos`, data);
  }

  // Eliminar asignación de segmento/cliente
  eliminarAsignacionSegmento(recompensaId: number, asignacionId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${recompensaId}/segmentos/${asignacionId}`);
  }

  // Buscar clientes disponibles
  buscarClientes(filtros: { buscar: string, limite?: number, segmento?: string }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const value = filtros[key as keyof typeof filtros];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/clientes/buscar`, { params });
  }

  // Obtener segmentos disponibles
  obtenerSegmentosDisponibles(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/segmentos/disponibles`);
  }

  // ===== MÉTODOS PARA CONFIGURACIÓN DE PUNTOS =====

  // Obtener configuración de puntos
  obtenerConfiguracionPuntos(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/puntos`);
  }

  // Crear configuración de puntos
  crearConfiguracionPuntos(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/puntos`, configuracion);
  }

  // Actualizar configuración de puntos
  actualizarConfiguracionPuntos(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/puntos`, configuracion);
  }

  // Simular cálculo de puntos
  simularCalculoPuntos(recompensaId: number, datos: { monto_compra: number, tipo_calculo: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/puntos/simular`, datos);
  }

  // Obtener ejemplos de configuración de puntos
  obtenerEjemplosPuntos(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/puntos/ejemplos`);
  }

  // Validar configuración de puntos
  validarConfiguracionPuntos(configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/puntos/validar`, configuracion);
  }

  // ===== MÉTODOS PARA CONFIGURACIÓN DE DESCUENTOS =====

  // Obtener configuración de descuentos
  obtenerConfiguracionDescuentos(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/descuentos`);
  }

  // Crear configuración de descuentos
  crearConfiguracionDescuentos(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/descuentos`, configuracion);
  }

  // Actualizar configuración de descuentos
  actualizarConfiguracionDescuentos(recompensaId: number, configId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/descuentos/${configId}`, configuracion);
  }

  // Eliminar configuración de descuentos
  eliminarConfiguracionDescuentos(recompensaId: number, configId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${recompensaId}/descuentos/${configId}`);
  }

  // Simular descuentos
  simularDescuentos(recompensaId: number, datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/descuentos/simular`, datos);
  }

  // Calcular descuento específico
  calcularDescuento(recompensaId: number, datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/descuentos/calcular`, datos);
  }

  // Obtener tipos de descuentos disponibles
  obtenerTiposDescuentos(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/descuentos/tipos`);
  }

  // Validar configuración de descuentos
  validarConfiguracionDescuentos(configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/descuentos/validar`, configuracion);
  }

  // ===== MÉTODOS PARA CONFIGURACIÓN DE ENVÍOS =====

  // Obtener configuración de envíos
  obtenerConfiguracionEnvios(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/envios`);
  }

  // Crear configuración de envíos
  crearConfiguracionEnvios(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/envios`, configuracion);
  }

  // Actualizar configuración de envíos
  actualizarConfiguracionEnvios(recompensaId: number, configId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/envios/${configId}`, configuracion);
  }

  // Eliminar configuración de envíos
  eliminarConfiguracionEnvios(recompensaId: number, configId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${recompensaId}/envios/${configId}`);
  }

  // Validar envío
  validarEnvio(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/envios/validar`, configuracion);
  }

  // Obtener estadísticas de cobertura
  obtenerEstadisticasCobertura(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/envios/estadisticas-cobertura`);
  }

  // Buscar zonas
  buscarZonas(filtros: any): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const value = filtros[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/envios/zonas/buscar`, { params });
  }

  // Obtener departamentos
  obtenerDepartamentos(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/envios/departamentos`);
  }

  // ===== MÉTODOS PARA CONFIGURACIÓN DE REGALOS =====

  // Obtener configuración de regalos
  obtenerConfiguracionRegalos(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos`);
  }

  // Crear configuración de regalos
  crearConfiguracionRegalos(recompensaId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos`, configuracion);
  }

  // Actualizar configuración de regalos
  actualizarConfiguracionRegalos(recompensaId: number, configId: number, configuracion: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos/${configId}`, configuracion);
  }

  // Eliminar configuración de regalos
  eliminarConfiguracionRegalos(recompensaId: number, configId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${recompensaId}/regalos/${configId}`);
  }

  // Verificar disponibilidad de regalo
  verificarDisponibilidadRegalo(recompensaId: number, regaloId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos/${regaloId}/verificar-disponibilidad`, {});
  }

  // Simular otorgamiento de regalos
  simularRegalos(recompensaId: number, datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos/simular`, datos);
  }

  // Obtener estadísticas de regalos
  obtenerEstadisticasRegalos(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/regalos/estadisticas`);
  }

  // Buscar productos para regalos
  buscarProductosRegalos(filtros: any): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const value = filtros[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/recompensas/regalos/productos/buscar`, { params });
  }

  // ===== MÉTODOS PARA PRODUCTOS Y CATEGORÍAS =====

  // Obtener productos disponibles para recompensas
  obtenerProductosDisponibles(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/productos/buscar`, { params });
  }

  // Obtener categorías disponibles para recompensas
  obtenerCategoriasDisponibles(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/categorias/buscar`, { params });
  }

  // Asignar productos a una recompensa
  asignarProductos(data: { recompensa_id: number, productos: number[] }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${data.recompensa_id}/productos`, { productos: data.productos });
  }

  // Asignar categorías a una recompensa
  asignarCategorias(data: { recompensa_id: number, categorias: number[] }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${data.recompensa_id}/categorias`, { categorias: data.categorias });
  }


  // Obtener categorías asignadas a una recompensa
  obtenerCategoriasAsignadas(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/categorias`);
  }

  // Remover producto de una recompensa
  removerProducto(recompensaId: number, productoId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/productos/${productoId}`);
  }

  // Remover categoría de una recompensa
  removerCategoria(recompensaId: number, categoriaId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/categorias/${categoriaId}`);
  }

  // ===== MÉTODOS PARA CLIENTES ESPECÍFICOS =====

  // Obtener clientes disponibles para recompensas
  obtenerClientesDisponibles(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/clientes/buscar`, { params });
  }

  // Asignar clientes específicos a una recompensa
  asignarClientesEspecificos(recompensaId: number, clientes: any[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/clientes`, { clientes });
  }

  // Obtener clientes asignados a una recompensa
  obtenerClientesAsignados(recompensaId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/clientes`);
  }

  // Remover cliente específico de una recompensa
  removerClienteEspecifico(recompensaId: number, clienteId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${recompensaId}/clientes/${clienteId}`);
  }

  // Obtener analytics de recompensas
  obtenerAnalytics(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analytics/dashboard`, { params });
  }

  // Obtener tendencias de analytics
  obtenerTendencias(periodo: string, fechaInicio?: string, fechaFin?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('periodo', periodo);

    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analytics/tendencias`, { params });
  }

  // Obtener métricas de rendimiento
  obtenerRendimiento(recompensaId?: number, periodo?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (recompensaId) {
      params = params.set('recompensa_id', recompensaId.toString());
    }
    if (periodo) {
      params = params.set('periodo', periodo.toString());
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analytics/rendimiento`, { params });
  }

  // Obtener comparativa entre períodos
  obtenerComparativa(periodoActualInicio: string, periodoActualFin: string, periodoAnteriorInicio: string, periodoAnteriorFin: string): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('periodo_actual_inicio', periodoActualInicio)
      .set('periodo_actual_fin', periodoActualFin)
      .set('periodo_anterior_inicio', periodoAnteriorInicio)
      .set('periodo_anterior_fin', periodoAnteriorFin);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analytics/comparativa`, { params });
  }

  // Obtener comportamiento de clientes
  obtenerComportamientoClientes(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analytics/comportamiento-clientes`);
  }

  // ===== MÉTODOS PARA ASIGNACIÓN DE PRODUCTOS Y CATEGORÍAS =====

  // Crear configuración específica según el tipo
  crearConfiguracion(configuracion: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${configuracion.recompensa_id}/configuracion`, configuracion);
  }


  // Asignar segmentos
  asignarSegmentos(data: { recompensa_id: number, segmentos: number[] }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${data.recompensa_id}/segmentos`, { segmentos: data.segmentos });
  }

  // Asignar clientes específicos
  asignarClientes(data: { recompensa_id: number, clientes: number[] }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${data.recompensa_id}/clientes`, { clientes: data.clientes });
  }
}