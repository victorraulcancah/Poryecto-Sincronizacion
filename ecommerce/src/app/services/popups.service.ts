import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Popup,
  PopupCreateRequest,
  PopupUpdateRequest,
  PopupResponse,
  PopupListResponse,
  PopupStats,
  PopupStatsResponse,
  PopupFilters,
  RecompensaConPopups,
  NotificacionRequest,
  NotificacionResponse,
  NotificacionStatsResponse
} from '../models/popup.model';

@Injectable({
  providedIn: 'root'
})
export class PopupsService {
  private apiUrl = `${environment.apiUrl}/admin/recompensas`;
  private clienteApiUrl = `${environment.apiUrl}/cliente/recompensas`;
  private publicoApiUrl = `${environment.apiUrl}/publico/recompensas`;

  constructor(private http: HttpClient) {}

  // ===== ENDPOINTS ADMINISTRATIVOS DE POPUPS =====

  /**
   * Listar popups de una recompensa específica
   */
  listarPopupsRecompensa(recompensaId: number): Observable<PopupResponse> {
    return this.http.get<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups`);
  }

  /**
   * Crear popup para una recompensa
   */
  crearPopup(recompensaId: number, popupData: PopupCreateRequest): Observable<PopupResponse> {
    const formData = new FormData();

    // Campo obligatorio
    formData.append('titulo', popupData.titulo);
    
    // Campos opcionales según la documentación
    if (popupData.descripcion && popupData.descripcion.trim() !== '') {
      formData.append('descripcion', popupData.descripcion);
    }
    
    if (popupData.imagen_popup) {
      formData.append('imagen_popup', popupData.imagen_popup);
    }
    
    // Usar defaults según la documentación
    formData.append('texto_boton', popupData.texto_boton || 'Ver más');
    formData.append('url_destino', popupData.url_destino || `/recompensas/${recompensaId}`);
    // Enviar booleanos como 1 o 0 según el backend
    formData.append('mostrar_cerrar', (popupData.mostrar_cerrar !== undefined ? popupData.mostrar_cerrar : true) ? '1' : '0');
    
    // auto_cerrar_segundos: solo enviar si es mayor a 0
    if (popupData.auto_cerrar_segundos && popupData.auto_cerrar_segundos > 0) {
      formData.append('auto_cerrar_segundos', popupData.auto_cerrar_segundos.toString());
    }
    
    formData.append('popup_activo', (popupData.popup_activo !== undefined ? popupData.popup_activo : false) ? '1' : '0');

    return this.http.post<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups`, formData);
  }

  /**
   * Ver detalle de un popup específico
   */
  obtenerPopup(recompensaId: number, popupId: number): Observable<PopupResponse> {
    return this.http.get<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}`);
  }

  /**
   * Actualizar popup
   */
  actualizarPopup(recompensaId: number, popupId: number, popupData: PopupUpdateRequest): Observable<PopupResponse> {
    const formData = new FormData();
    
    if (popupData.titulo) formData.append('titulo', popupData.titulo);
    if (popupData.descripcion !== undefined) formData.append('descripcion', popupData.descripcion);
    if (popupData.imagen_popup) formData.append('imagen_popup', popupData.imagen_popup);
    if (popupData.texto_boton) formData.append('texto_boton', popupData.texto_boton);
    if (popupData.url_destino) formData.append('url_destino', popupData.url_destino);
    // Enviar booleanos como '1'/'0' para alinearnos con el backend
    if (popupData.mostrar_cerrar !== undefined) {
      formData.append('mostrar_cerrar', popupData.mostrar_cerrar ? '1' : '0');
    }
    // Solo enviar auto_cerrar_segundos si es un número válido (permitimos 0 para desactivar)
    if (popupData.auto_cerrar_segundos !== undefined && popupData.auto_cerrar_segundos !== null) {
      const secs = Number(popupData.auto_cerrar_segundos);
      if (!Number.isNaN(secs)) {
        formData.append('auto_cerrar_segundos', String(secs));
      }
    }
    if (popupData.popup_activo !== undefined) {
      formData.append('popup_activo', popupData.popup_activo ? '1' : '0');
    }

    // Algunos backends (p.ej., Laravel) no aceptan multipart/form-data con PUT.
    // Usamos POST con _method=PUT para compatibilidad.
    formData.append('_method', 'PUT');
    return this.http.post<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}`, formData);
  }

  /**
   * Eliminar popup
   */
  eliminarPopup(recompensaId: number, popupId: number): Observable<PopupResponse> {
    return this.http.delete<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}`);
  }

  /**
   * Activar/Desactivar popup
   */
  togglePopup(recompensaId: number, popupId: number): Observable<PopupResponse> {
    return this.http.patch<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}/toggle`, {});
  }

  /**
   * Activar popup (si tu API lo soporta)
   */
  activarPopup(recompensaId: number, popupId: number): Observable<PopupResponse> {
    return this.http.patch<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}/activar`, {});
  }

  /**
   * Desactivar popup (si tu API lo soporta)
   */
  desactivarPopup(recompensaId: number, popupId: number): Observable<PopupResponse> {
    return this.http.patch<PopupResponse>(`${this.apiUrl}/${recompensaId}/popups/${popupId}/desactivar`, {});
  }

  /**
   * Obtener estadísticas de popups de una recompensa
   */
  obtenerEstadisticasPopups(recompensaId: number): Observable<PopupStatsResponse> {
    return this.http.get<PopupStatsResponse>(`${this.apiUrl}/${recompensaId}/popups/estadisticas-popups`);
  }

  // ===== ENDPOINTS PARA GESTIÓN GLOBAL DE POPUPS =====

  /**
   * Listar todas las recompensas con información de popups
   */
  listarRecompensasConPopups(filtros?: PopupFilters): Observable<PopupListResponse> {
    let params = new HttpParams();
    
    if (filtros?.nombre) params = params.set('nombre', filtros.nombre);
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.page) params = params.set('page', filtros.page.toString());
    if (filtros?.per_page) params = params.set('per_page', filtros.per_page.toString());

    // Usar el endpoint de lista de recompensas que ya existe
    return this.http.get<PopupListResponse>(`${this.apiUrl}`, { params });
  }

  // ===== ENDPOINTS DE NOTIFICACIONES =====

  /**
   * Enviar notificación a clientes específicos
   */
  enviarNotificacion(recompensaId: number, clienteIds: number[]): Observable<NotificacionResponse> {
    return this.http.post<NotificacionResponse>(`${this.apiUrl}/${recompensaId}/notificaciones/enviar`, {
      cliente_ids: clienteIds
    });
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  obtenerEstadisticasNotificaciones(recompensaId: number): Observable<NotificacionStatsResponse> {
    return this.http.get<NotificacionStatsResponse>(`${this.apiUrl}/${recompensaId}/notificaciones/estadisticas`);
  }

  // ===== ENDPOINTS PARA CLIENTES =====

  /**
   * Obtener popups activos para el cliente autenticado
   */
  obtenerPopupsActivos(): Observable<PopupResponse> {
    return this.http.get<PopupResponse>(`${this.clienteApiUrl}/popups-activos`);
  }

  /**
   * Obtener popups activos con user_cliente_id (endpoint de cliente)
   * Según especificaciones del backend, este endpoint ahora acepta user_cliente_id
   */
  obtenerPopupsActivosConUserId(userClienteId: number): Observable<PopupResponse> {
    const params = new HttpParams().set('user_cliente_id', userClienteId.toString());
    return this.http.get<PopupResponse>(`${this.clienteApiUrl}/popups-activos`, { params });
  }

  /**
   * Obtener popups activos para invitados (público, sin token)
   */
  obtenerPopupsPublicosActivos(segmento?: string): Observable<PopupResponse> {
    let params = new HttpParams();
    if (segmento && segmento.trim() !== '') {
      params = params.set('segmento', segmento);
    }
    return this.http.get<PopupResponse>(`${this.publicoApiUrl}/popups-activos`, { params });
  }

  /**
   * Obtener popups activos para cliente registrado SIN token (usando user_cliente_id)
   */
  obtenerPopupsPublicosActivosConUserId(userClienteId: number, segmento?: string): Observable<PopupResponse> {
    let params = new HttpParams().set('user_cliente_id', userClienteId.toString());
    if (segmento && segmento.trim() !== '') {
      params = params.set('segmento', segmento);
    }
    return this.http.get<PopupResponse>(`${this.publicoApiUrl}/popups-activos`, { params });
  }

  /**
   * Marcar popup como visto
   */
  marcarPopupVisto(popupId: number): Observable<PopupResponse> {
    return this.http.patch<PopupResponse>(`${this.clienteApiUrl}/popups/${popupId}/marcar-visto`, {});
  }

  /**
   * Cerrar popup
   */
  cerrarPopup(popupId: number): Observable<PopupResponse> {
    return this.http.patch<PopupResponse>(`${this.clienteApiUrl}/popups/${popupId}/cerrar`, {});
  }

  /**
   * Obtener diagnóstico de popups (útil para debugging)
   */
  obtenerDiagnosticoPopups(): Observable<any> {
    return this.http.get<any>(`${this.clienteApiUrl}/popups-diagnostico`);
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Obtener URL completa de imagen
   */
  obtenerUrlImagen(imagenPath: string): string {
    if (!imagenPath) return '';
    
    // Si ya es una URL completa, procesarla para corregir /api/storage/
    if (imagenPath.startsWith('http')) {
      // Verificar si contiene el patrón incorrecto '/api/storage/'
      if (imagenPath.includes('/api/storage/')) {
        // Reemplazar '/api/storage/' con '/storage/'
        const correctedUrl = imagenPath.replace('/api/storage/', '/storage/');
        return correctedUrl;
      }
      // Si es una URL http pero no tiene el patrón incorrecto, usarla tal cual
      return imagenPath;
    }
    
    // Si es solo una ruta (ej. 'nombre_archivo.jpg'), construir la URL
    const cleanPath = imagenPath.replace(/\s+/g, '_'); // Limpiar espacios
    const url = `${environment.baseUrl}/storage/${cleanPath}`;
    return url;
  }

  /**
   * Validar si un popup está activo
   */
  esPopupActivo(popup: Popup): boolean {
    return popup.popup_activo && popup.esta_activo;
  }

  /**
   * Obtener texto del botón por defecto
   */
  obtenerTextoBotonDefault(): string {
    return 'Ver más';
  }

  /**
   * Generar URL destino por defecto
   */
  generarUrlDestinoDefault(recompensaId: number): string {
    return `/recompensas/${recompensaId}`;
  }
}