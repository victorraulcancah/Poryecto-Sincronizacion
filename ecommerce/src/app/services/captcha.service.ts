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
  /** En cuántas piezas se parte esta imagen: 2, 4, 6 u 8. */
  piezas: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Opciones de dificultad y la cuadrícula que le corresponde a cada una. */
export const OPCIONES_PIEZAS: { valor: number; etiqueta: string; columnas: number; filas: number }[] = [
  { valor: 2, etiqueta: '2 piezas (2 × 1)', columnas: 2, filas: 1 },
  { valor: 4, etiqueta: '4 piezas (2 × 2)', columnas: 2, filas: 2 },
  { valor: 6, etiqueta: '6 piezas (3 × 2)', columnas: 3, filas: 2 },
  { valor: 8, etiqueta: '8 piezas (4 × 2)', columnas: 4, filas: 2 },
];

/** Desafío que arma el servidor para el registro. */
export interface CaptchaDesafio {
  status: string;
  token: string;
  imagen: string;
  /** Índices de las piezas en el orden en que se muestran (ya barajado). */
  piezas: number[];
  total_piezas: number;
  columnas: number;
  filas: number;
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

  crear(nombre: string, imagen: File, piezas = 4, activo = true): Observable<any> {
    const datos = new FormData();
    datos.append('nombre', nombre);
    datos.append('imagen', imagen);
    datos.append('piezas', String(piezas));
    datos.append('activo', activo ? '1' : '0');
    return this.http.post<any>(`${this.apiUrl}/imagenes`, datos);
  }

  actualizar(
    id: number,
    cambios: Partial<Pick<CaptchaImagen, 'nombre' | 'piezas' | 'activo'>>
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/imagenes/${id}`, cambios);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/imagenes/${id}`);
  }
}
