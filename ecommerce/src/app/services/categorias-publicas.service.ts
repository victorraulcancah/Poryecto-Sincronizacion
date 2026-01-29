// src/app/services/categorias-publicas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategoriaPublica {
  id: number;
  nombre: string;
  slug?: string; // ✅ NUEVO: Slug para URLs amigables (ej: "laptops", "computadoras-gaming")
  descripcion?: string;
  imagen?: string;
  imagen_url?: string;
  productos_count?: number;
  // ✅ NUEVAS PROPIEDADES PARA ARMA PC
  paso_info?: {
    orden: number;
    nombre_paso: string;
    descripcion_paso?: string;
    es_requerido: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasPublicasService {
  private apiUrl = `${environment.apiUrl}`;
  // ✅ CORRECCIÓN: Usar endpoints públicos de Magus
  private apiUrlCategoriasPublicas = `${environment.apiUrl}/categorias/publicas`;
  private apiUrlMarcasPublicas = `${environment.apiUrl}/marcas/publicas`;

  constructor(private http: HttpClient) {}

  // ✅ CORREGIDO: Usar endpoint público de Magus
  obtenerCategoriasPublicas(seccionId?: number): Observable<CategoriaPublica[]> {
    let params = new HttpParams();
    if (seccionId !== null && seccionId !== undefined && seccionId !== 0) {
      params = params.set('seccion', seccionId.toString());
    }

    // ✅ USAR ENDPOINT PÚBLICO DE MAGUS
    return this.http.get<any[]>(this.apiUrlCategoriasPublicas, { params }).pipe(
      map(categorias => categorias.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        slug: cat.slug || cat.nombre?.toLowerCase().replace(/\s+/g, '-'),
        descripcion: cat.descripcion || '',
        imagen: cat.imagen,
        imagen_url: cat.imagen ? `${environment.baseUrl}/storage/categorias/${cat.imagen}` : undefined,
        productos_count: cat.productos_count || 0
      })))
    );
  }

  // ✅ NUEVO MÉTODO: Específico para obtener categorías de la sección 1
  obtenerCategoriasSeccion1(): Observable<CategoriaPublica[]> {
    return this.obtenerCategoriasPublicas(1);
  }

    // ✅ NUEVO MÉTODO: Específico para obtener categorías de la sección 2 (Laptops)
  obtenerCategoriasSeccion2(): Observable<CategoriaPublica[]> {
    return this.obtenerCategoriasPublicas(2);
  }

  // ✅ CORREGIDO: Para obtener categorías configuradas de Arma tu PC
  obtenerCategoriasArmaPc(): Observable<CategoriaPublica[]> {
    return this.http.get<CategoriaPublica[]>(`${this.apiUrl}/arma-pc/categorias`);
  }

  // ✅ CORREGIDOS: Métodos para consumir categorías desde Magus (endpoints públicos)
  /**
   * Listar categorías públicas desde Magus
   */
  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrlCategoriasPublicas);
  }

  /**
   * Ver detalle de categoría desde Magus
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrlCategoriasPublicas}/${id}`);
  }

  // ✅ NUEVO: Obtener marcas públicas desde Magus
  obtenerMarcasPublicas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrlMarcasPublicas).pipe(
      map(marcas => marcas.map(marca => ({
        id: marca.id,
        nombre: marca.nombre,
        slug: marca.slug || marca.nombre?.toLowerCase().replace(/\s+/g, '-'),
        descripcion: marca.descripcion || '',
        imagen: marca.imagen,
        imagen_url: marca.imagen ? `${environment.baseUrl}/storage/marcas_productos/${marca.imagen}` : undefined,
        productos_count: marca.productos_count || 0
      })))
    );
  }

}