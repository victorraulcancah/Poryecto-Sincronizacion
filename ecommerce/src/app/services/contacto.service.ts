import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

  /**
   * Mensajes sin leer, para el badge del menú lateral. Es un BehaviorSubject
   * para que al marcar uno como leído el número baje al instante, sin esperar
   * a que el menú vuelva a consultar.
   */
  private noLeidosSubject = new BehaviorSubject<number>(0);
  readonly noLeidos$ = this.noLeidosSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** Pide el conteo al servidor y actualiza el badge. */
  refrescarNoLeidos(): Observable<{ no_leidos: number }> {
    return this.http
      .get<{ no_leidos: number }>(`${this.apiUrl}/contacto/mensajes/no-leidos`)
      .pipe(tap(res => this.noLeidosSubject.next(res.no_leidos ?? 0)));
  }

  /** Ajusta el contador sin ir al servidor (al leer o desleer un mensaje). */
  ajustarNoLeidos(delta: number): void {
    this.noLeidosSubject.next(Math.max(0, this.noLeidosSubject.value + delta));
  }

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
