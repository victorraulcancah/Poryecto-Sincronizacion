// src/app/services/favoritos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Favorito {
  id: number;
  user_cliente_id: number;
  producto_id: number;
  producto?: any;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private favoritosSubject = new BehaviorSubject<number[]>([]);
  public favoritos$ = this.favoritosSubject.asObservable();

  constructor(private http: HttpClient) {
    // No cargar automáticamente, esperar a que el usuario esté autenticado
  }

  cargarFavoritos(): Observable<void> {
    return new Observable(observer => {
      this.obtenerFavoritos().subscribe({
        next: (response: any) => {
          console.log('📦 Favoritos cargados desde API:', response);
          const ids = response.data?.map((f: Favorito) => f.producto_id) || [];
          console.log('📋 IDs de favoritos:', ids);
          this.favoritosSubject.next(ids);
          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error al cargar favoritos:', error);
          this.favoritosSubject.next([]);
          observer.next();
          observer.complete();
        }
      });
    });
  }

  obtenerFavoritos(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/favoritos`);
  }

  agregarFavorito(productoId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/favoritos`, { producto_id: productoId }).pipe(
      tap(() => {
        const current = this.favoritosSubject.value;
        if (!current.includes(productoId)) {
          this.favoritosSubject.next([...current, productoId]);
        }
      })
    );
  }

  eliminarFavorito(productoId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/favoritos/${productoId}`).pipe(
      tap(() => {
        const current = this.favoritosSubject.value;
        this.favoritosSubject.next(current.filter(id => id !== productoId));
      })
    );
  }

  /**
   * Deja la lista de ids tal cual la devolvió el backend. La usa el header,
   * que ya pide los favoritos completos para el desplegable, para no hacer una
   * segunda consulta solo por el contador.
   */
  establecerFavoritos(ids: number[]): void {
    this.favoritosSubject.next(ids);
  }

  esFavorito(productoId: number): boolean {
    return this.favoritosSubject.value.includes(productoId);
  }

  toggleFavorito(productoId: number): Observable<{ agregado: boolean }> {
    const esFavorito = this.esFavorito(productoId);
    
    if (esFavorito) {
      return this.eliminarFavorito(productoId).pipe(
        tap(() => {
          const current = this.favoritosSubject.value;
          this.favoritosSubject.next(current.filter(id => id !== productoId));
        }),
        catchError(error => {
          console.error('Error al eliminar favorito:', error);
          return of({ success: false, agregado: true });
        }),
        map(() => ({ agregado: false }))
      );
    } else {
      return this.agregarFavorito(productoId).pipe(
        tap(() => {
          const current = this.favoritosSubject.value;
          if (!current.includes(productoId)) {
            this.favoritosSubject.next([...current, productoId]);
          }
        }),
        catchError(error => {
          console.error('Error al agregar favorito:', error);
          return of({ success: false, agregado: false });
        }),
        map(() => ({ agregado: true }))
      );
    }
  }
}
