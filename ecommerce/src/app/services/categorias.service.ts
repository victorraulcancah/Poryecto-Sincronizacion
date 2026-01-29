// src/app/services/categorias.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  imagen_url?: string; // Agregar esta propiedad
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string;
  imagen?: File;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private apiUrl = `${environment.apiUrl}`;
  private baseUrl = environment.apiUrl.replace('/api', ''); // http://localhost:8000

  constructor(private http: HttpClient) {}

  obtenerCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`).pipe(
      map(categorias => categorias.map(categoria => ({
        ...categoria,
        imagen_url: categoria.imagen ? `${this.baseUrl}/storage/categorias/${categoria.imagen}` : undefined
      })))
    );
  }

  obtenerCategoria(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/categorias/${id}`).pipe(
      map(categoria => ({
        ...categoria,
        imagen_url: categoria.imagen ? `${this.baseUrl}/storage/categorias/${categoria.imagen}` : undefined
      }))
    );
  }

  crearCategoria(categoria: CategoriaCreate): Observable<any> {
    const formData = new FormData();
    
    formData.append('nombre', categoria.nombre);
    formData.append('activo', categoria.activo ? '1' : '0');
    
    if (categoria.descripcion) {
      formData.append('descripcion', categoria.descripcion);
    }
    
    if (categoria.imagen) {
      formData.append('imagen', categoria.imagen);
    }

    return this.http.post<any>(`${this.apiUrl}/categorias`, formData);
  }

  actualizarCategoria(id: number, categoria: Partial<CategoriaCreate>): Observable<any> {
    const formData = new FormData();
    
    Object.keys(categoria).forEach(key => {
      const value = (categoria as any)[key];
      if (value !== null && value !== undefined) {
        if (key === 'imagen' && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/categorias/${id}`, formData);
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/categorias/${id}`);
  }
}