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
  /** Código del usuario en Novik (ej. "USR013") si la cuenta está vinculada. */
  codigo_erp?: string | null;
  // Agrega otros campos que necesites del backend
}

/** Usuario de Novik que se puede vincular con una cuenta del panel. */
export interface UsuarioErp {
  id: number;
  codigo: string;
  nombre: string;
  usuario: string;
  email: string | null;
  telefono: string | null;
  rol: string | null;
  /** Ya está tomado por otra cuenta del panel. */
  ya_vinculado?: boolean;
}

export interface BusquedaUsuariosErp {
  status: string;
  total: number;
  offset: number;
  hay_mas: boolean;
  usuarios: UsuarioErp[];
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

  // ── Pestaña Avanzado: vinculación con un usuario de Novik ──────────────

  /** Busca usuarios de Novik para vincular (paginado por scroll). */
  buscarUsuariosErp(q: string, offset = 0, soloVendedores = false): Observable<BusquedaUsuariosErp> {
    const params: Record<string, string> = { q, offset: String(offset) };
    if (soloVendedores) params['solo_vendedores'] = '1';
    return this.http.get<BusquedaUsuariosErp>(`${this.apiUrl}/erp/buscar`, { params });
  }

  /** Usuario de Novik al que está vinculada la cuenta, si tiene. */
  obtenerVinculacion(id: number): Observable<{
    status: string;
    vinculado: boolean;
    codigo_erp?: string;
    usuario: UsuarioErp | null;
  }> {
    return this.http.get<any>(`${this.apiUrl}/${id}/vinculado`);
  }

  /** Confirma la vinculación con la contraseña del administrador logueado. */
  vincular(id: number, codigoErp: string, password: string): Observable<{
    status: string;
    message: string;
    codigo_erp: string;
    usuario: UsuarioErp;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/vincular`, { codigo_erp: codigoErp, password });
  }

  desvincular(id: number, password: string): Observable<{ status: string; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/desvincular`, { password });
  }
}
