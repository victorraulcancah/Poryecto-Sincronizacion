import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotasDebitoService {
  private apiUrl = `${environment.apiUrl}/notas-debito`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todas las notas de débito
   */
  getAll(params?: {
    estado?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    serie?: string;
    comprobante_referencia?: string;
    search?: string;
    page?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Crear nota de débito
   */
  create(data: {
    comprobante_referencia_id: number;
    motivo_nota: string;
    motivo_nota_descripcion?: string;
    productos: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
    }>;
    observaciones?: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al emitir Nota de Débito';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Obtener detalle de una nota de débito
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Descargar PDF de la nota de débito
   */
  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar XML de la nota de débito
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar CDR de la nota de débito
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, {
      responseType: 'blob'
    });
  }

  /**
   * Obtener estadísticas de notas de débito
   */
  getEstadisticas(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value) {
          httpParams = httpParams.set(key, value);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { params: httpParams });
  }

  /**
   * Editar nota de débito (solo si estado = PENDIENTE)
   */
  update(id: number, data: {
    motivo?: string;
    descripcion?: string;
    items?: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      descuento?: number;
      tipo_afectacion_igv: string;
    }>;
  }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al editar Nota de Débito';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Generar XML de la nota de débito (sin enviar a SUNAT)
   */
  generarXml(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/generar-xml`, {}).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al generar XML';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Enviar nota de débito a SUNAT (requiere XML generado)
   */
  enviarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/enviar-sunat`, {}).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al enviar a SUNAT';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Consultar estado de la nota en SUNAT
   */
  consultarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/consultar-sunat`, {}).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al consultar estado en SUNAT';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Enviar nota de débito por WhatsApp
   */
  enviarWhatsApp(id: number, telefono: string, mensaje?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/whatsapp`, { telefono, mensaje }).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al preparar envío por WhatsApp';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }

  /**
   * Enviar nota de débito por Email
   */
  enviarEmail(id: number, email: string, asunto?: string, mensaje?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/email`, { email, asunto, mensaje }).pipe(
      catchError((err: any) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al preparar envío por Email';
        err.error = { ...(err.error || {}), message: msg };
        return throwError(() => err);
      })
    );
  }
}
