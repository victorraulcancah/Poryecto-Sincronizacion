// src/app/services/productos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  codigo_producto: string;
  categoria_id: number;
  categoria?: Categoria;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  imagen?: string;
  imagen_url?: string; // Agregado para la URL de la imagen
  activo: boolean;
  destacado: boolean;        // <- NUEVA LÍNEA
  mostrar_igv: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  codigo_producto: string;
  categoria_id: number;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  imagen?: File;
  activo: boolean;
  mostrar_igv?: boolean;
}
export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion: string;
  codigo_producto?: string;
  precio: number;
  precio_oferta?: number;
  stock: number;
  imagen_principal: string;
  categoria: string;
  categoria_id: number;
  rating: number;
  total_reviews: string;
  reviews_count: number;
  sold_count: number;
  total_stock: number;
  is_on_sale: boolean;
  discount_percentage: number;
}

// ✅ NUEVA INTERFAZ PARA AUTOCOMPLETADO
export interface ProductoSugerencia {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  categoria_id: number;
  imagen_url?: string;
  url: string;
}

export interface ProductosPublicosResponse {
  productos: ProductoPublico[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CategoriaParaSidebar {
  id: number;
  nombre: string;
  productos_count: number;
}

export interface EstadisticasProductos {
  total_productos: number;
}

export interface ProductoStockCritico {
  id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  categoria_id: number;
  categoria?: Categoria;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = `${environment.apiUrl}`;
  private baseUrl = environment.apiUrl.replace('/api', ''); // http://localhost:8000 en environment 
  // ✅ NUEVO: Usar backend de 7power para productos públicos
  private apiUrl7Power = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  // Encuentra este método existente y modifícalo:
  buscarProductos(termino: string, categoriaId?: string): Observable<ProductoSugerencia[]> {
    let params = new HttpParams().set('q', termino);

    // ✅ NUEVO: Agregar categoría si se proporciona
    if (categoriaId && categoriaId !== '') {
      params = params.set('categoria', categoriaId);
    }

    return this.http.get<ProductoSugerencia[]>(`${this.apiUrl}/productos/buscar`, { params });
  }


  // Productos
  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`).pipe(
      map(productos => productos.map(producto => ({
        ...producto,
        imagen_url: producto.imagen ? `${this.baseUrl}/storage/productos/${producto.imagen}` : undefined
      })))
    );
  }

  obtenerProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/productos/${id}`).pipe(
      map(producto => ({
        ...producto,
        imagen_url: producto.imagen ? `${this.baseUrl}/storage/productos/${producto.imagen}` : undefined
      }))
    );
  }

  crearProducto(producto: ProductoCreate): Observable<any> {
    const formData = new FormData();

    formData.append('nombre', producto.nombre);
    formData.append('codigo_producto', producto.codigo_producto);
    formData.append('categoria_id', producto.categoria_id.toString());
    formData.append('precio_compra', producto.precio_compra.toString());
    formData.append('precio_venta', producto.precio_venta.toString());
    formData.append('stock', producto.stock.toString());
    formData.append('stock_minimo', producto.stock_minimo.toString());
    formData.append('activo', producto.activo ? '1' : '0');
    formData.append('mostrar_igv', producto.mostrar_igv ? '1' : '0');

    if (producto.descripcion) {
      formData.append('descripcion', producto.descripcion);
    }

    if (producto.imagen) {
      formData.append('imagen', producto.imagen);
    }

    return this.http.post<any>(`${this.apiUrl}/productos`, formData);
  }

  actualizarProducto(id: number, producto: Partial<ProductoCreate>): Observable<any> {
    const formData = new FormData();

    Object.keys(producto).forEach(key => {
      const value = (producto as any)[key];
      if (value !== null && value !== undefined) {

        // añadir lógica para manejar tipos específicos
        if (key === 'activo' || key === 'mostrar_igv') {
          formData.append(key, value ? '1' : '0'); // Unifica el manejo de booleanos
        } else if (key === 'imagen' && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // AGREGAR DEBUG AQUÍ:
    console.log('=== DEBUG FORMDATA ===');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }
    console.log('======================');

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/productos/${id}`, formData);
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/productos/${id}`);
  }

  // Categorías
  obtenerCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`);
  }

  crearCategoria(categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/categorias`, categoria);
  }

  obtenerCategoriasParaSidebar(): Observable<CategoriaParaSidebar[]> {
    // ✅ USAR BACKEND DE MAGUS
    return this.http.get<any[]>(`${this.apiUrl}/categorias`).pipe(
      map(categorias => categorias.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        productos_count: 0 // TODO: Agregar conteo de productos
      })))
    );
  }

  obtenerEstadisticasProductos(): Observable<EstadisticasProductos> {
    return this.http.get<EstadisticasProductos>(`${this.apiUrl}/productos/estadisticas`);
  }

  obtenerProductosStockCritico(): Observable<ProductoStockCritico[]> {
    return this.http.get<ProductoStockCritico[]>(`${this.apiUrl}/productos/stock-critico`);
  }

  // ✅ NUEVO: Obtener productos públicos desde Magus
  obtenerProductosPublicos(filtros?: {
    categoria?: number;
    brand?: number;
    search?: string;
    page?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }): Observable<ProductosPublicosResponse> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.categoria) params = params.set('categoria_id', filtros.categoria.toString());
      if (filtros.brand) params = params.set('marca_id', filtros.brand.toString());
      if (filtros.search) params = params.set('search', filtros.search);
      if (filtros.page) params = params.set('page', filtros.page.toString());
      if (filtros.minPrice) params = params.set('min_price', filtros.minPrice.toString());
      if (filtros.maxPrice) params = params.set('max_price', filtros.maxPrice.toString());
      if (filtros.sortBy) params = params.set('sort_by', filtros.sortBy);
    }

    params = params.set('per_page', '1000');

    // ✅ USAR MAGUS para productos públicos
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, { params }).pipe(
      map((productos) => {
        const productosMapeados = productos.map((producto: any) => ({
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          codigo_producto: producto.codigo_producto || producto.id?.toString(),
          precio: producto.precio_venta || 0,
          precio_oferta: undefined,
          stock: producto.stock || 0,
          imagen_principal: producto.imagen_url || 'assets/images/thumbs/product-default.png',
          categoria: producto.categoria?.nombre || 'Sin categoría',
          categoria_id: producto.categoria_id || 0,
          rating: 0,
          total_reviews: '0',
          reviews_count: 0,
          sold_count: 0,
          total_stock: producto.stock || 0,
          is_on_sale: false,
          discount_percentage: 0
        }));

        return {
          productos: productosMapeados,
          pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 1000,
            total: productosMapeados.length
          }
        };
      })
    );
  }
}