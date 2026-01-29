import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notificacion {
  id: number;
  tipo: 'email' | 'whatsapp' | 'sms';
  destinatario: string;
  asunto?: string;
  mensaje: string;
  estado: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';
  fecha_envio?: string;
  fecha_leido?: string;
  error_mensaje?: string;
  plantilla_id?: number;
  entidad_tipo?: string;
  entidad_id?: number;
  created_at?: string;
}

export interface PlantillaNotificacion {
  id: number;
  nombre: string;
  tipo: 'email' | 'whatsapp' | 'sms';
  asunto?: string;
  contenido: string;
  variables: string[];
  activo: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  // Notificaciones
  getNotificaciones(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(this.apiUrl, { params: httpParams });
  }

  enviarNotificacion(datos: {
    tipo: string;
    destinatario: string;
    asunto?: string;
    mensaje: string;
    plantilla_id?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar`, datos);
  }

  // Plantillas
  getPlantillas(tipo?: string): Observable<any> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get(`${this.apiUrl}/plantillas`, { params });
  }

  getPlantilla(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/plantillas/${id}`);
  }

  crearPlantilla(datos: Partial<PlantillaNotificacion>): Observable<any> {
    return this.http.post(`${this.apiUrl}/plantillas`, datos);
  }

  actualizarPlantilla(id: number, datos: Partial<PlantillaNotificacion>): Observable<any> {
    return this.http.put(`${this.apiUrl}/plantillas/${id}`, datos);
  }

  eliminarPlantilla(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/plantillas/${id}`);
  }

  // Estadísticas
  getEstadisticas(params?: { fecha_inicio?: string; fecha_fin?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if ((params as any)[key]) httpParams = httpParams.set(key, (params as any)[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/estadisticas`, { params: httpParams });
  }

  // Envío de comprobantes
  enviarComprobantePorEmail(comprobanteId: number, email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/comprobantes/${comprobanteId}/enviar-email`, { email });
  }

  enviarComprobantePorWhatsApp(comprobanteId: number, telefono: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/comprobantes/${comprobanteId}/enviar-whatsapp`, { telefono });
  }
}
