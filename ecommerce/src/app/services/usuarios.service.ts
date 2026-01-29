// src\app\services\usuarios.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  roles: {
    name: string;
  }[];
  is_enabled: boolean;
  created_at: string;
  // Agrega otros campos que necesites del backend
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
private apiUrl = `${environment.apiUrl}/usuarios`; // Ajusta según tu configuración

  constructor(private http: HttpClient) {}

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  obtenerUsuario(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }


// Método anterior eliminado - Laravel no maneja PUT con FormData correctamente
actualizarUsuario(id: number, formData: FormData): Observable<any> {
  // Cambiar a POST con _method=PUT para FormData
  return this.http.post(`${this.apiUrl}/${id}`, formData, {
    headers: {}
  });
}

actualizarUsuarioSinArchivo(id: number, userData: any): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}`, userData, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}


  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  obtenerTiposDocumento(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/document-types`);
  }

  obtenerRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/roles`);
  }

  obtenerDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/departamentos`);
  }

  obtenerProvincias(departamentoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/provincias/${departamentoId}`);
  }

  obtenerDistritos(departamentoId: number, provinciaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/distritos/${departamentoId}/${provinciaId}`);
  }

  cambiarEstado(id: number, estado: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/cambiar-estado`, { is_enabled: estado });
  }
}
