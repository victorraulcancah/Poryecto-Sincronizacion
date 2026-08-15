import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Mensaje enviado desde el formulario público de "Contáctanos". */
export interface MensajeContacto {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  asunto: string;
  mensaje: string;
  ip?: string | null;
  leido: boolean;
  created_at: string;
  updated_at: string;
}

export interface MensajesContactoPagina {
  data: MensajeContacto[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Envío desde la vista pública /contact (no requiere sesión). */
  enviar(datos: {
    nombre: string;
    email: string;
    telefono?: string;
    asunto: string;
    mensaje: string;
  }): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(
      `${this.apiUrl}/contacto`,
      datos
    );
  }

  listar(opciones: {
    page?: number;
    per_page?: number;
    solo_no_leidos?: boolean;
  } = {}): Observable<MensajesContactoPagina> {
    let params = new HttpParams();
    if (opciones.page) params = params.set('page', opciones.page);
    if (opciones.per_page) params = params.set('per_page', opciones.per_page);
    if (opciones.solo_no_leidos) params = params.set('solo_no_leidos', '1');

    return this.http.get<MensajesContactoPagina>(
      `${this.apiUrl}/contacto/mensajes`,
      { params }
    );
  }

  actualizar(id: number, datos: Partial<MensajeContacto>): Observable<MensajeContacto> {
    return this.http.put<MensajeContacto>(
      `${this.apiUrl}/contacto/mensajes/${id}`,
      datos
    );
  }

  marcarLeido(id: number, leido = true): Observable<MensajeContacto> {
    return this.http.put<MensajeContacto>(
      `${this.apiUrl}/contacto/mensajes/${id}/leido`,
      { leido }
    );
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/contacto/mensajes/${id}`
    );
  }
}
