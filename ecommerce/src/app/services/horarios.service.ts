import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Horario {
  id?: number;
  user_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  es_descanso: boolean;
  fecha_especial?: string;
  comentarios?: string;
  activo: boolean;
}

export interface Usuario {
  id: number;
  name: string;
  email: string;
  horarios?: Horario[];
  profile?: any;
  avatar?: string;  // ← Agregar esta línea
  roles?: any[];
  mostrarImagen?: boolean; // Agregar esta línea
}

export interface AsesorDisponible {
  id: number;
  name: string;
  email: string;
  telefono?: string;
  avatar?: string;
  disponible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private apiUrl = `${environment.apiUrl}/horarios`;

  constructor(private http: HttpClient) {}

  obtenerHorarios(rol?: string): Observable<any> {
    let params = new HttpParams();
    if (rol) {
      params = params.set('rol', rol);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  obtenerHorarioUsuario(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/usuario`);
  }

  crearHorario(horario: Horario): Observable<any> {
    return this.http.post<any>(this.apiUrl, horario);
  }

  actualizarHorario(id: number, horario: Partial<Horario>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, horario);
  }

  eliminarHorario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  copiarHorarios(usuarioOrigenId: number, usuarioDestinoId: number, sobrescribir: boolean = false): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/copiar`, {
      usuario_origen_id: usuarioOrigenId,
      usuario_destino_id: usuarioDestinoId,
      sobrescribir
    });
  }

  obtenerPlantillas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/plantillas`);
  }

  obtenerAsesorDisponibles(): Observable<{ asesores_disponibles: AsesorDisponible[] }> {
    // Configurar headers para que la petición sea pública (sin autenticación)
    const options = {
      withCredentials: false, // No enviar cookies de autenticación
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    return this.http.get<{ asesores_disponibles: AsesorDisponible[] }>(`${environment.apiUrl}/asesores/disponibles`, options);
  }

  eliminarHorariosUsuario(userId: number, dias: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/eliminar-usuario`, {
      user_id: userId,
      dias: dias
    });
  }

}
