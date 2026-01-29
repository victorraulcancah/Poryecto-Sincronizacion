import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Motorizado {
  id?: number;
  numero_unidad: string;        // ← QUITAR ? (siempre se genera)
  nombre_completo: string;
  foto_perfil?: string;
  tipo_documento_id: number;
  numero_documento: string;
  licencia_numero: string;
  licencia_categoria: string;
  telefono: string;
  correo: string;
  direccion_detalle: string;
  ubigeo: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_ano: number;
  vehiculo_cilindraje: string;
  vehiculo_color_principal: string;
  vehiculo_color_secundario?: string;
  vehiculo_placa: string;
  vehiculo_motor: string;
  vehiculo_chasis: string;
  comentario?: string;
  estado: boolean;             // ← QUITAR ? (tiene default true)
  created_at?: string;
  updated_at?: string;
  tipo_documento?: any;
  registrado_por?: any;
  ubicacion?: any;
  // Propiedades relacionadas con el usuario del motorizado
  tiene_usuario?: boolean;
  estado_usuario?: boolean;
  username?: string;
  ultimo_login?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MotorizadosService {
  private apiUrl = `${environment.apiUrl}/motorizados`;

  constructor(private http: HttpClient) {}

  getMotorizados(): Observable<Motorizado[]> {
    return this.http.get<Motorizado[]>(this.apiUrl);
  }

  getMotorizado(id: number): Observable<Motorizado> {
    return this.http.get<Motorizado>(`${this.apiUrl}/${id}`);
  }

  crearMotorizado(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  actualizarMotorizado(id: number, formData: FormData): Observable<any> {
    // Usar POST directo sin _method ya que la ruta está configurada como POST
    const headers = {
      'Accept': 'application/json'
    };
         
    return this.http.post(`${this.apiUrl}/${id}`, formData, { headers });
  }

  eliminarMotorizado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleEstado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-estado`, {});
  }

  getCategoriasLicencia(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias-licencia`);
  }

  // Nuevos métodos para gestión de usuarios
  crearUsuario(id: number, data: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/crear-usuario`, data);
  }

  toggleUsuario(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-usuario`, {});
  }

  resetearPassword(id: number, data: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/resetear-password`, data);
  }
}
