
// src/app/services/cart.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PedidosService, CrearPedidoRequest } from './pedidos.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface CartItem {
  id: number; // Puede ser el ID del backend o un ID temporal del frontend
  producto_id: number;
  nombre: string;
  imagen_url: string;
  precio: number;
  descuento_porcentaje?: number | null; // Porcentaje de descuento si aplica
  precio_con_descuento?: number | null; // Precio final con descuento
  cantidad: number;
  stock_disponible: number;
  codigo_producto: string;
  categoria?: string;
  marca?: string;
  mostrar_igv?: boolean;
}

export interface CartSummary {
  subtotal: number;
  igv: number;
  total: number;
  cantidad_items: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'shopping_cart';
  private readonly API_URL = `${environment.apiUrl}/cart`;

  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartSummarySubject = new BehaviorSubject<CartSummary>({
    subtotal: 0, igv: 0, total: 0, cantidad_items: 0
  });

  public cartItems$ = this.cartItemsSubject.asObservable();
  public cartSummary$ = this.cartSummarySubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private pedidosService: PedidosService
  ) {
    this.initCart();
  }

  private initCart(): void {
    this.authService.currentUser.subscribe(user => {
      // console.log('CartService - Usuario cambió:', user);
      if (user) {
        // console.log('CartService - Cargando carrito desde API');
        this.loadCartFromApi().subscribe({
          next: (items) => {
            // console.log('CartService - Carrito cargado desde API:', items);
          },
          error: (error) => {
            // console.error('CartService - Error cargando carrito desde API:', error);
            // Si falla la carga desde API, cargar desde storage como fallback
            this.loadCartFromStorage();
          }
        });
      } else {
        // console.log('CartService - Cargando carrito desde localStorage');
        this.loadCartFromStorage();
      }
    });
  }
  
  // =================================================================
  // MÉTODOS PÚBLICOS PRINCIPALES
  // =================================================================

  public addToCart(producto: any, cantidad: number = 1): Observable<any> {
    // console.log('Producto recibido en addToCart:', producto);
    const normalizedProduct = this.normalizeProduct(producto);
    // console.log('Producto normalizado:', normalizedProduct);
    if (this.authService.isLoggedIn()) {
      return this.addToCartApi(normalizedProduct.id, cantidad);
    } else {
      this.addToCartLocal(normalizedProduct, cantidad);
      return of({ message: 'Producto añadido al carrito local.' });
    }
  }

  public updateQuantity(item: CartItem, cantidad: number): Observable<any> {
    if (cantidad < 1) {
      return this.removeFromCart(item);
    }
    if (cantidad > item.stock_disponible) {
      return throwError(() => new Error('Stock insuficiente'));
    }

    if (this.authService.isLoggedIn()) {
      return this.updateQuantityApi(item.producto_id, cantidad);
    } else {
      this.updateQuantityLocal(item.id, cantidad);
      return of({ message: 'Cantidad actualizada localmente.' });
    }
  }

  public removeFromCart(item: CartItem): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.removeFromCartApi(item.producto_id);
    } else {
      this.removeFromCartLocal(item.id);
      return of({ message: 'Producto eliminado localmente.' });
    }
  }

  public clearCart(): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.clearCartApi();
    } else {
      this.clearCartLocal();
      return of({ message: 'Carrito local vaciado.' });
    }
  }

  public syncCart(): Observable<any> {
    const localCart = this.getLocalCart();
    if (localCart.length === 0) {
      console.log('Carrito local vacío, no hay nada que sincronizar');
      return of({ message: 'Carrito local vacío' });
    }

    console.log('Sincronizando carrito local:', localCart);
    console.log('Token de autenticación:', this.authService.getToken());

    return this.http.post(`${environment.apiUrl}/cart/sync`, { items: localCart }).pipe(
      tap(response => {
        console.log('Respuesta de sincronización:', response);
        // Limpiar carrito local después de sincronizar exitosamente
        this.clearLocalCart();
        // Recargar carrito desde el servidor
        this.loadCartFromServer();
      }),
      catchError(error => {
        console.error('Error al sincronizar carrito:', error);
        return throwError(() => error);
      })
    );
  }

  public isEmpty(): boolean {
    return this.cartItemsSubject.value.length === 0;
  }

  public getTotalItems(): number {
    return this.cartSummarySubject.value.cantidad_items;
  }

  // =================================================================
  // MÉTODOS PARA API (USUARIO AUTENTICADO)
  // =================================================================

  private loadCartFromApi(): Observable<CartItem[]> {
    // ⚠️ TEMPORAL: El endpoint /cart no existe en 7Power
    // Retornar array vacío y cargar desde storage como fallback
    console.warn('⚠️ CartService - El endpoint /cart no está implementado, usando localStorage');
    this.loadCartFromStorage();
    return of([]);
  }

  private addToCartApi(productoId: number, cantidad: number): Observable<any> {
    return this.http.post(`${this.API_URL}/add`, { producto_id: productoId, cantidad }).pipe(
      tap(() => {
        // Recargar el carrito para obtener el estado actualizado
        this.loadCartFromApi().subscribe({
          next: (items) => console.log('Carrito actualizado después de agregar:', items),
          error: (error) => console.error('Error actualizando carrito:', error)
        });
      }),
      catchError(this.handleError)
    );
  }
  

  private updateQuantityApi(productoId: number, cantidad: number): Observable<any> {
    return this.http.put(`${this.API_URL}/update/${productoId}`, { cantidad }).pipe(
      tap(() => {
        this.loadCartFromApi().subscribe({
          next: (items) => console.log('Carrito actualizado después de cambiar cantidad:', items),
          error: (error) => console.error('Error actualizando carrito:', error)
        });
      }),
      catchError(this.handleError)
    );
  }
  

  private removeFromCartApi(productoId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/remove/${productoId}`).pipe(
      tap(() => {
        this.loadCartFromApi().subscribe({
          next: (items) => console.log('Carrito actualizado después de eliminar:', items),
          error: (error) => console.error('Error actualizando carrito:', error)
        });
      }),
      catchError(this.handleError)
    );
  }
  

  private clearCartApi(): Observable<any> {
    return this.http.delete(`${this.API_URL}/clear`).pipe(
      tap(() => this.updateCartState([])),
      catchError(this.handleError)
    );
  }

  // =================================================================
  // MÉTODOS PARA LOCALSTORAGE (INVITADO)
  // =================================================================

  private loadCartFromStorage(): void {
    const items = this.getLocalCartItems();
    
    if (items.length > 0) {
      // Cargar datos básicos primero
      this.updateCartState(items);
      
      // Luego refrescar datos desde la API
      this.refreshProductData().subscribe({
        next: () => {
          console.log('CartService - Datos actualizados después de cargar desde storage');
        },
        error: (error) => {
          console.error('CartService - Error actualizando datos desde storage:', error);
          // Si falla la actualización, mantener los datos del storage
        }
      });
    } else {
      // Si no hay items, actualizar estado vacío
      this.updateCartState(items);
    }
  }

  private addToCartLocal(producto: any, cantidad: number): void {
    const currentItems = this.cartItemsSubject.value;
    const existingItemIndex = currentItems.findIndex(item => item.producto_id === producto.id);

    if (existingItemIndex > -1) {
      const existingItem = currentItems[existingItemIndex];
      const newQuantity = existingItem.cantidad + cantidad;
      if (newQuantity <= producto.stock) {
        existingItem.cantidad = newQuantity;
      }
    } else {
      if (cantidad <= producto.stock) {
        // Construir la URL de la imagen
        let imagenUrl = '';
        if (producto.imagen_url) {
          imagenUrl = producto.imagen_url;
        } else if (producto.imagen_principal) {
          // Si imagen_principal es solo un nombre de archivo, construir la URL completa
          if (producto.imagen_principal.startsWith('http') || producto.imagen_principal.startsWith('/')) {
            imagenUrl = producto.imagen_principal;
          } else {
            // Construir URL completa asumiendo que está en storage/productos/
            imagenUrl = `${environment.baseUrl}/storage/productos/${producto.imagen_principal}`;
          }
        }
        
        // DESPUÉS:
        const newItem: CartItem = {
          id: Date.now(),
          producto_id: producto.id,
          nombre: producto.nombre || 'Producto',
          imagen_url: imagenUrl,
          precio: Number(producto.precio || 0),
          cantidad: Number(cantidad || 1),
          stock_disponible: Number(producto.stock || 100),
          codigo_producto: producto.codigo_producto || `PROD-${producto.id}`,
          categoria: producto.categoria || '',
          marca: producto.marca || '',
          mostrar_igv: Boolean(producto.mostrar_igv)  // <- NUEVA LÍNEA
        };
        currentItems.push(newItem);
      }
    }
    this.saveCartToStorage(currentItems);
    this.updateCartState(currentItems);
  }

  private updateQuantityLocal(itemId: number, cantidad: number): void {
    const currentItems = this.cartItemsSubject.value;
    const itemIndex = currentItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
      currentItems[itemIndex].cantidad = cantidad;
      this.saveCartToStorage(currentItems);
      this.updateCartState(currentItems);
    }
  }

  private removeFromCartLocal(itemId: number): void {
    let currentItems = this.cartItemsSubject.value;
    currentItems = currentItems.filter(item => item.id !== itemId);
    this.saveCartToStorage(currentItems);
    this.updateCartState(currentItems);
  }

  private clearCartLocal(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.updateCartState([]);
  }

  private saveCartToStorage(items: CartItem[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    }
  }

  private getLocalCartItems(): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    const savedCart = localStorage.getItem(this.STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : [];
  }

  // Método para obtener el carrito local (público para sincronización)
  public getLocalCart(): CartItem[] {
    return this.getLocalCartItems();
  }

  // Método para limpiar el carrito local
  private clearLocalCart(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private loadCartFromServer(): void {
    if (this.authService.isLoggedIn()) {
      this.loadCartFromApi().subscribe({
        next: (items) => {
          console.log('CartService - Carrito recargado desde servidor:', items);
        },
        error: (error) => {
          console.error('CartService - Error recargando carrito:', error);
        }
      });
    }
  }
  

  // =================================================================
  // MÉTODOS AUXILIARES Y DE PROCESAMIENTO
  // =================================================================

  private updateCartState(items: CartItem[]): void {
    this.cartItemsSubject.next(items);
    this.updateCartSummary(items);
  }

  // REEMPLAZAR COMPLETAMENTE EL MÉTODO updateCartSummary:
  private updateCartSummary(items: CartItem[]): void {
    // Calcular el total usando precio con descuento si existe
    const total = items.reduce((sum, item) => {
      let precioFinal = item.precio || 0;

      // Si tiene descuento, usar precio_con_descuento
      if (item.descuento_porcentaje && item.descuento_porcentaje > 0 && item.precio_con_descuento) {
        precioFinal = item.precio_con_descuento;
      }

      const cantidad = item.cantidad || 0;
      return sum + (precioFinal * cantidad);
    }, 0);

    let subtotal = total;
    let igv = 0;

    // Solo calcular IGV si hay exactamente 1 producto Y ese producto tiene mostrar_igv = true
    if (items.length === 1 && items[0].mostrar_igv === true) {
      // El precio ya incluye IGV, así que calculamos el subtotal sin IGV
      subtotal = total / 1.18;
      igv = total - subtotal;
    }

    const cantidad_items = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    this.cartSummarySubject.next({
      subtotal: subtotal,
      igv: igv,
      total: total,
      cantidad_items: cantidad_items
    });
  }

  private normalizeProduct(producto: any): any {
    console.log('Normalizando producto:', producto);
    console.log('imagen_url:', producto.imagen_url);
    console.log('imagen_principal:', producto.imagen_principal);
    
    // Construir la URL de la imagen
    let imagenUrl = '';
    if (producto.imagen_url) {
      imagenUrl = producto.imagen_url;
    } else if (producto.imagen_principal) {
      // Si imagen_principal es solo un nombre de archivo, construir la URL completa
      if (producto.imagen_principal.startsWith('http') || producto.imagen_principal.startsWith('/')) {
        imagenUrl = producto.imagen_principal;
      } else {
        // Construir URL completa asumiendo que está en storage/productos/
        imagenUrl = `${environment.baseUrl}/storage/productos/${producto.imagen_principal}`;
      }
    }
    
    // DESPUÉS:
    const normalized = {
      id: producto.id,
      nombre: producto.nombre || producto.name || 'Producto',
      precio: Number(producto.precio_venta || producto.precio || 0),
      stock: Number(producto.stock || producto.stock_disponible || 100),
      codigo_producto: producto.codigo_producto || `PROD-${producto.id}`,
      imagen_url: imagenUrl,
      categoria: producto.categoria?.nombre || producto.categoria || '',
      marca: producto.marca?.nombre || producto.marca || '',
      mostrar_igv: Boolean(producto.mostrar_igv)  // <- NUEVA LÍNEA
    };
    
    console.log('Producto normalizado resultante:', normalized);
    return normalized;
  }

  private handleError(error: any): Observable<never> {
    console.error('Ocurrió un error en CartService', error);
    return throwError(() => new Error(error.error?.message || 'Error del servidor'));
  }

  public procesarPedido(datosCheckout: any): Observable<any> {
    const items = this.cartItemsSubject.value;
    if (items.length === 0) {
      return throwError(() => new Error('El carrito está vacío'));
    }
    const pedidoData: CrearPedidoRequest = {
      productos: items.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      })),
      ...datosCheckout
    };
    return this.pedidosService.crearPedidoEcommerce(pedidoData).pipe(
      tap(() => {
        // Limpiar el carrito de la API después de un pedido exitoso
        this.clearCart().subscribe();
      })
    );
  }
  public forceReloadCart(): void {
    if (this.authService.isLoggedIn()) {
      this.loadCartFromApi().subscribe({
        next: (items) => {
          console.log('CartService - Carrito forzado a recargar:', items);
        },
        error: (error) => {
          console.error('CartService - Error forzando recarga:', error);
        }
      });
    } else {
      this.loadCartFromStorage();
    }
  }

  public refreshProductData(): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.loadCartFromApi();
    } else {
      const currentItems = this.cartItemsSubject.value;
      if (currentItems.length === 0) {
        return of([]);
      }
      
      const refreshPromises = currentItems.map(cartItem => 
        this.http.get<any>(`${environment.apiUrl}/productos-publicos/${cartItem.producto_id}`).toPromise()
          .then(updatedProduct => {
            console.log(`Producto ${cartItem.producto_id} - Datos del localStorage:`, cartItem);
            console.log(`Producto ${cartItem.producto_id} - Datos de la API:`, updatedProduct);
            
            if (updatedProduct) {
              const newItem = {
                ...cartItem,
                mostrar_igv: Boolean(updatedProduct.producto.mostrar_igv),
                precio: Number(updatedProduct.producto.precio_venta),
                stock_disponible: Number(updatedProduct.producto.stock),
                nombre: updatedProduct.producto.nombre || cartItem.nombre
              };
              
              console.log(`Producto ${cartItem.producto_id} - Datos finales:`, newItem);
              return newItem;
            }
            return cartItem;
          })
          .catch(error => {
            console.error(`Error actualizando producto ${cartItem.producto_id}:`, error);
            return cartItem;
          })
      );
      
      return from(Promise.all(refreshPromises)).pipe(
        tap((updatedItems: CartItem[]) => {
          this.saveCartToStorage(updatedItems);
          this.updateCartState(updatedItems);
          console.log('CartService - Datos del carrito actualizados desde productos-publicos');
        }),
        catchError(this.handleError)
      );
    }
  }

  // =================================================================
  // MÉTODOS DE COTIZACIÓN
  // =================================================================

  // Generar cotización como PDF
  public generarCotizacionPDF(datosCotizacion: any): Observable<Blob> {
    return this.http.post(`${environment.apiUrl}/cotizacion/generar-pdf`, datosCotizacion, {
      responseType: 'blob'
    });
  }

  // Enviar cotización por email
  public enviarCotizacionPorEmail(datosCotizacion: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/cotizacion/enviar-email`, datosCotizacion);
  }
}
