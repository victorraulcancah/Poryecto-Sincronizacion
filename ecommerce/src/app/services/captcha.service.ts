// src/app/services/captcha.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Imagen del rompecabezas, administrada desde el panel. */
export interface CaptchaImagen {
  id: number;
  nombre: string;
  /** Ruta relativa del tipo "storage/captcha/xxx.jpg". */
  ruta: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Desafío que arma el servidor para el registro. */
export interface CaptchaDesafio {
  status: string;
  token: string;
  imagen: string;
  /** Índices de las piezas en el orden en que se muestran (ya barajado). */
  piezas: number[];
  total_piezas: number;
}

@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private apiUrl = `${environment.apiUrl}/captcha`;
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /** URL absoluta de una imagen guardada como ruta relativa. */
  urlImagen(ruta: string): string {
    if (!ruta) return '';
    if (/^https?:\/\//i.test(ruta)) return ruta;
    return `${this.baseUrl}/${ruta.replace(/^\/+/, '')}`;
  }

  // ── Registro público ───────────────────────────────────────────────

  obtenerDesafio(): Observable<CaptchaDesafio> {
    return this.http.get<CaptchaDesafio>(`${this.apiUrl}/desafio`);
  }

  /** Se llama al pulsar "Confirmar", con el orden que armó el usuario. */
  verificar(token: string, orden: number[]): Observable<{ status: string; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/verificar`, { token, orden });
  }

  // ── Panel: CRUD de imágenes ────────────────────────────────────────

  listar(): Observable<{ status: string; imagenes: CaptchaImagen[]; activas: number }> {
    return this.http.get<any>(`${this.apiUrl}/imagenes`);
  }

  crear(nombre: string, imagen: File, activo = true): Observable<any> {
    const datos = new FormData();
    datos.append('nombre', nombre);
    datos.append('imagen', imagen);
    datos.append('activo', activo ? '1' : '0');
    return this.http.post<any>(`${this.apiUrl}/imagenes`, datos);
  }

  actualizar(id: number, cambios: Partial<Pick<CaptchaImagen, 'nombre' | 'activo'>>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/imagenes/${id}`, cambios);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/imagenes/${id}`);
  }
}
