// src\app\services\almacen.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Categoria,
  CategoriaCreate,
  MarcaProducto,
  MarcaProductoCreate,
  Producto,
  ProductoCreate,
  ProductoPublico,
  ProductosPublicosResponse,
  CategoriaParaSidebar,
  Seccion,
  SeccionCreate,
} from '../types/almacen.types';

@Injectable({
  providedIn: 'root',
})
export class AlmacenService {
  // ✅ USAR BACKEND DE MAGUS para el dashboard
  private apiUrl = `${environment.apiUrl}`;
  private baseUrl = environment.baseUrl;
  // Backend de 7power solo para productos públicos
  private apiUrl7Power = `${environment.apiUrl}`;
  private baseUrl7Power = environment.baseUrl;

  constructor(private http: HttpClient) { }

  // ==================== MÉTODOS PARA CATEGORÍAS ====================
  obtenerCategorias(seccionId?: number | null): Observable<Categoria[]> {
    let params = new HttpParams();
    if (seccionId !== null && seccionId !== undefined && seccionId !== 0) {
      params = params.set('seccion', seccionId.toString());
    }
    console.log('🌐 AlmacenService - Llamando a Magus categorías');

    // ✅ USAR BACKEND DE MAGUS para el dashboard
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`, { params }).pipe(
      map(categorias => categorias.map(cat => ({
        ...cat,
        imagen_url: cat.imagen ? `${this.baseUrl}/storage/categorias/${cat.imagen}` : undefined
      })))
    );
  }

  obtenerCategoria(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/categorias/${id}`).pipe(
      map((categoria) => ({
        ...categoria,
        imagen_url: categoria.imagen
          ? `${this.baseUrl}/storage/categorias/${categoria.imagen}`
          : undefined,
      }))
    );
  }

  crearCategoria(categoria: CategoriaCreate): Observable<any> {
    const formData = new FormData();

    formData.append('nombre', categoria.nombre);
    formData.append('id_seccion', categoria.id_seccion.toString());
    formData.append('activo', categoria.activo ? '1' : '0');

    if (categoria.descripcion) {
      formData.append('descripcion', categoria.descripcion);
    }

    if (categoria.imagen) {
      formData.append('imagen', categoria.imagen);
    }

    return this.http.post<any>(`${this.apiUrl}/categorias`, formData);
  }

  actualizarCategoria(
    id: number,
    categoria: Partial<CategoriaCreate>
  ): Observable<any> {
    const formData = new FormData();

    Object.keys(categoria).forEach((key) => {
      const value = (categoria as any)[key];
      if (value !== null && value !== undefined) {
        if (key === 'imagen' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'activo') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/categorias/${id}`, formData);
  }

  toggleEstadoCategoria(id: number, activo: boolean): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/categorias/${id}/toggle-estado`,
      { activo }
    );
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/categorias/${id}`);
  }

  obtenerCategoriasParaSidebar(): Observable<CategoriaParaSidebar[]> {
    return this.http.get<CategoriaParaSidebar[]>(
      `${this.apiUrl}/categorias-sidebar`
    );
  }

  // ==================== MÉTODOS PARA MARCAS ====================

  obtenerMarcas(seccionId?: number | null): Observable<MarcaProducto[]> {
    let params = new HttpParams();
    if (seccionId !== null && seccionId !== undefined && seccionId !== 0) {
      params = params.set('seccion', seccionId.toString());
    }
    console.log('🌐 AlmacenService - Llamando a Magus marcas');

    // ✅ USAR BACKEND DE MAGUS para marcas
    return this.http.get<MarcaProducto[]>(`${this.apiUrl}/marcas`, { params }).pipe(
      map(marcas => marcas.map(marca => ({
        ...marca,
        imagen_url: marca.imagen ? `${this.baseUrl}/storage/marcas_productos/${marca.imagen}` : undefined
      })))
    );
  }
  obtenerMarcasPorCategoria(categoriaId: number): Observable<MarcaProducto[]> {
    let params = new HttpParams();
    params = params.set('categoria_id', categoriaId.toString());
    return this.http
      .get<MarcaProducto[]>(`${this.apiUrl}/marcas/por-categoria`, { params })
      .pipe(
        map((marcas) =>
          marcas.map((marca) => ({
            ...marca,
            imagen_url: marca.imagen
              ? `${this.baseUrl}/storage/marcas_productos/${marca.imagen}`
              : undefined,
          }))
        )
      );
  }

  obtenerMarca(id: number): Observable<MarcaProducto> {
    return this.http.get<MarcaProducto>(`${this.apiUrl}/marcas/${id}`).pipe(
      map((marca) => ({
        ...marca,
        imagen_url: marca.imagen
          ? `${this.baseUrl}/storage/marcas_productos/${marca.imagen}`
          : undefined,
      }))
    );
  }

  crearMarca(marca: MarcaProductoCreate): Observable<any> {
    const formData = new FormData();

    formData.append('nombre', marca.nombre);
    formData.append('activo', marca.activo ? '1' : '0');

    if (marca.descripcion) {
      formData.append('descripcion', marca.descripcion);
    }

    if (marca.imagen) {
      formData.append('imagen', marca.imagen);
    }

    return this.http.post<any>(`${this.apiUrl}/marcas`, formData);
  }

  actualizarMarca(
    id: number,
    marca: Partial<MarcaProductoCreate>
  ): Observable<any> {
    const formData = new FormData();

    Object.keys(marca).forEach((key) => {
      const value = (marca as any)[key];
      if (value !== null && value !== undefined) {
        if (key === 'imagen' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'activo') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/marcas/${id}`, formData);
  }

  toggleEstadoMarca(id: number, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/marcas/${id}/toggle-estado`, {
      activo,
    });
  }

  eliminarMarca(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/marcas/${id}`);
  }

  obtenerMarcasActivas(): Observable<MarcaProducto[]> {
    // ✅ Usar MAGUS para marcas activas
    return this.http.get<MarcaProducto[]>(`${this.apiUrl}/marcas`).pipe(
      map(marcas => marcas.filter(m => m.activo).map(marca => ({
        ...marca,
        imagen_url: marca.imagen ? `${this.baseUrl}/storage/marcas_productos/${marca.imagen}` : undefined
      })))
    );
  }

  // ==================== MÉTODOS PARA PRODUCTOS ====================

  obtenerProductos(seccionId?: number | null): Observable<Producto[]> {
    let params = new HttpParams();
    // ✅ Solicitar TODOS los productos (aumentar per_page)
    params = params.set('per_page', '1000');

    if (seccionId !== null && seccionId !== undefined && seccionId !== 0) {
      params = params.set('seccion', seccionId.toString());
    }
    console.log('🌐 AlmacenService - Llamando a Magus productos');
    console.log('📋 AlmacenService - Params:', params.toString());

    // ✅ USAR BACKEND DE MAGUS para productos
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, { params }).pipe(
      map(productos => productos.map(producto => ({
        ...producto,
        imagen_url: producto.imagen ? `${this.baseUrl}/storage/productos/${producto.imagen}` : undefined
      })))
    );
  }

  obtenerProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/productos/${id}`).pipe(
      map((producto) => ({
        ...producto,
        imagen_url: producto.imagen
          ? `${this.baseUrl}/storage/productos/${producto.imagen}`
          : undefined,
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

    if (producto.descripcion) {
      formData.append('descripcion', producto.descripcion);
    }

    if (producto.marca_id) {
      formData.append('marca_id', producto.marca_id.toString());
    }

    if (producto.imagen) {
      formData.append('imagen', producto.imagen);
    }

    return this.http.post<any>(`${this.apiUrl}/productos`, formData);
  }

  actualizarProducto(
    id: number,
    producto: Partial<ProductoCreate>
  ): Observable<any> {
    const formData = new FormData();

    Object.keys(producto).forEach((key) => {
      const value = (producto as any)[key];
      if (value !== null && value !== undefined) {
        if (key === 'imagen' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'activo') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/productos/${id}`, formData);
  }

  // ✅ NUEVO: Actualizar producto de 7power a través del proxy de Magus
  actualizarProducto7Power(
    id: number,
    producto: Partial<ProductoCreate>
  ): Observable<any> {
    const formData = new FormData();

    // Mapear campos de Magus a 7power
    if (producto.nombre) formData.append('name', producto.nombre);
    if (producto.descripcion) formData.append('descripcion', producto.descripcion);
    if (producto.codigo_producto) formData.append('codigo', producto.codigo_producto);
    if (producto.categoria_id) formData.append('category_id', producto.categoria_id.toString());
    if (producto.marca_id) formData.append('brand_id', producto.marca_id.toString());
    if (producto.activo !== undefined) formData.append('estado', producto.activo ? '1' : '0');

    if (producto.imagen && producto.imagen instanceof File) {
      formData.append('img', producto.imagen);
    }

    // Usar el endpoint proxy de Magus que tiene autenticación
    return this.http.post<any>(`${this.apiUrl}/productos-7power/${id}`, formData);
  }

  // ✅ NUEVO: Subir solo imagen a producto de 7power
  subirImagenProducto7Power(id: number, imagen: File): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', imagen);

    return this.http.post<any>(`${this.apiUrl}/productos-7power/${id}/imagen`, formData);
  }

  // ✅ NUEVO: Subir imagen de producto 7power (se guarda en Magus)
  subirImagenProducto7PowerLocal(id: number, imagen: File): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', imagen);

    return this.http.post<any>(`${this.apiUrl}/productos-7power-imagenes/${id}`, formData);
  }

  // ✅ NUEVO: Obtener imagen de producto 7power desde Magus
  obtenerImagenProducto7Power(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/productos-7power-imagenes/${id}`);
  }

  // ✅ NUEVO: Eliminar imagen de producto 7power
  eliminarImagenProducto7Power(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/productos-7power-imagenes/${id}`);
  }

  toggleEstadoProducto(id: number, activo: boolean): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/productos/${id}/toggle-estado`,
      { activo }
    );
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/productos/${id}`);
  }

  obtenerProductosPublicos(filtros?: {
    categoria?: number;
    marca?: number;
    search?: string;
    page?: number;
  }): Observable<ProductosPublicosResponse> {
    let params = new HttpParams();

    if (filtros?.categoria) {
      params = params.set('categoria_id', filtros.categoria.toString());
    }
    if (filtros?.marca) {
      params = params.set('marca_id', filtros.marca.toString());
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.page) {
      params = params.set('page', filtros.page.toString());
    }

    // Solicitar todos los productos (máximo permitido)
    params = params.set('per_page', '1000');

    // ✅ CACHE BUSTING: Agregar timestamp para evitar caché del navegador
    params = params.set('_t', Date.now().toString());

    // ✅ USAR MAGUS para productos públicos
    return this.http.get<Producto[]>(`${this.apiUrl}/productos-publicos`, { params }).pipe(
      map(productos => ({
        productos: productos.map(producto => ({
          id: producto.id,
          nombre: producto.nombre,
          slug: producto.nombre?.toLowerCase().replace(/\s+/g, '-'),
          descripcion: producto.descripcion || '',
          codigo_producto: producto.codigo_producto || producto.id?.toString(),
          precio: producto.precio_venta || 0,
          precio_oferta: undefined,
          stock: producto.stock || 0,
          imagen_principal: producto.imagen_url || 'assets/images/thumbs/product-default.png',
          categoria: producto.categoria?.nombre || '',
          categoria_id: producto.categoria_id,
          marca: producto.marca?.nombre,
          marca_id: producto.marca_id,
          rating: 0,
          total_reviews: '0',
          reviews_count: 0,
          sold_count: 0,
          total_stock: producto.stock || 0,
          is_on_sale: false,
          discount_percentage: 0
        })),
        pagination: {
          current_page: 1,
          last_page: 1,
          per_page: 1000,
          total: productos.length
        }
      }))
    );
  }

  obtenerMarcasPublicas(): Observable<MarcaProducto[]> {
    // ✅ USAR MAGUS para marcas públicas
    return this.http.get<MarcaProducto[]>(`${this.apiUrl}/marcas/publicas`).pipe(
      map(marcas => marcas.map(marca => ({
        ...marca,
        slug: marca.slug || marca.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        imagen_url: marca.imagen ? `${this.baseUrl}/storage/marcas_productos/${marca.imagen}` : undefined
      })))
    );
  }

  // ✅ NUEVO: Obtener producto público individual con detalles
  obtenerProductoPublico(id: number): Observable<{
    producto: any;
    detalles: any;
    productos_relacionados: any[];
  }> {
    return this.http.get<{
      producto: any;
      detalles: any;
      productos_relacionados: any[];
    }>(`${this.apiUrl}/productos-publicos/${id}`);
  }

  // Métodos para secciones
  obtenerSecciones(): Observable<Seccion[]> {
    // ⚠️ TEMPORAL: El endpoint /secciones no existe en 7Power
    // Retornar un array vacío o datos mock hasta que se implemente
    console.warn('⚠️ AlmacenService - El endpoint /secciones no está implementado en 7Power');
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  crearSeccion(seccion: SeccionCreate): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/secciones`, seccion);
  }

  actualizarSeccion(id: number, seccion: SeccionCreate): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/secciones/${id}`, seccion);
  }

  eliminarSeccion(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/secciones/${id}`);
  }

  migrarCategoria(
    categoriaId: number,
    nuevaSeccionId: number
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/categorias/${categoriaId}/migrar-seccion`,
      {
        nueva_seccion_id: nuevaSeccionId,
      }
    );
  }

  validarCupon(codigo: string, total: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cupones/validar`, { codigo, total });
  }

  // ✅ NUEVO MÉTODO: Obtener productos recomendados
  obtenerProductosRecomendados(
    limite: number = 12
  ): Observable<ProductoPublico[]> {
    let params = new HttpParams();
    params = params.set('limite', limite.toString());
    params = params.set('recomendados', 'true'); // Flag para indicar que queremos productos recomendados

    return this.http
      .get<ProductosPublicosResponse>(`${this.apiUrl}/productos-publicos`, {
        params,
      })
      .pipe(map((response) => response.productos));
  }

  obtenerDetallesProducto(productoId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/productos/${productoId}/detalles`
    );
  }

  guardarDetallesProducto(
    productoId: number,
    formData: FormData
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/productos/${productoId}/detalles`,
      formData
    );
  }

  eliminarImagenDetalle(
    productoId: number,
    imagenIndex: number
  ): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/productos/${productoId}/detalles/imagenes`,
      {
        body: { imagen_index: imagenIndex },
      }
    );
  }

  toggleDestacadoProducto(id: number, destacado: boolean): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/productos/${id}/toggle-destacado`,
      { destacado }
    );
  }


  // Obtener información de la empresa
  obtenerInfoEmpresa(): Observable<any> {
    return this.http.get(`${this.apiUrl}/empresa-info`);
  }

  // Obtener asesores disponibles
  obtenerAsesorDisponibles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/asesores/disponibles`);
  }

  // ✅ NUEVO: Obtener productos destacados desde Magus
  obtenerProductosDestacados(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, {
      params: { per_page: '10' }
    }).pipe(
      map(productos => productos.map(producto => ({
        ...producto,
        imagen_url: producto.imagen ? `${this.baseUrl}/storage/productos/${producto.imagen}` : undefined
      })))
    );
  }
}
