import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WhatsAppPlantilla {
  contenido: string;
  activo: boolean;
  variables: string[];
  link_ecommerce: string;
  habilitado: boolean;
  conexion: { estado: string; en_cola?: number; qr?: string | null; error?: string };
}

@Injectable({
  providedIn: 'root',
})
export class WhatsAppTemplateService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) {}

  obtener(): Observable<WhatsAppPlantilla> {
    return this.http.get<WhatsAppPlantilla>(`${this.apiUrl}/plantilla`);
  }

  actualizar(contenido: string, activo: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/plantilla`, { contenido, activo });
  }

  desvincular(): Observable<{ desvinculado: boolean; message: string }> {
    return this.http.post<{ desvinculado: boolean; message: string }>(`${this.apiUrl}/desvincular`, {});
  }
}
