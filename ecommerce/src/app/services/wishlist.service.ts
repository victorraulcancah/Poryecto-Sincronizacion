// src/app/services/wishlist.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WishlistItem {
  id: number;
  producto_id: number;
  nombre: string;
  imagen_url: string;
  precio: number;
  stock_disponible: number;
  codigo_producto: string;
  categoria?: string;
  marca?: string;
  rating?: number;
  reviews_count?: number;
  mostrar_igv?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly STORAGE_KEY = 'wishlist_items';
  private wishlistItemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  
  public wishlistItems$ = this.wishlistItemsSubject.asObservable();

  constructor() {
    this.loadWishlistFromStorage();
  }

  // Cargar wishlist desde localStorage
  private loadWishlistFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedWishlist = localStorage.getItem(this.STORAGE_KEY);
        if (savedWishlist) {
          const items: WishlistItem[] = JSON.parse(savedWishlist);
          this.wishlistItemsSubject.next(items);
        }
      }
    } catch (error) {
      console.error('Error loading wishlist from storage:', error);
      this.clearWishlist();
    }
  }

  // Guardar wishlist en localStorage
  private saveWishlistToStorage(items: WishlistItem[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      }
    } catch (error) {
      console.error('Error saving wishlist to storage:', error);
    }
  }

  // Normalizar producto para la wishlist
  private normalizeProduct(producto: any): any {
    return {
      id: producto.id,
      nombre: producto.nombre || producto.name || producto.title,
      precio: producto.precio_venta || producto.precio || producto.price,
      stock: producto.stock || producto.stock_disponible || 100,
      codigo_producto: producto.codigo_producto || producto.code || `PROD-${producto.id}`,
      imagen_url: producto.imagen_url || producto.imagen_principal || producto.image,
      categoria: producto.categoria?.nombre || producto.categoria,
      marca: producto.marca?.nombre || producto.marca,
      rating: producto.rating || 0,
      reviews_count: producto.reviews_count || producto.total_reviews || 0,
      mostrar_igv: Boolean(producto.mostrar_igv)
    };
  }

  // Agregar producto a la wishlist
  addToWishlist(producto: any): boolean {
    try {
      const normalizedProduct = this.normalizeProduct(producto);
      const currentItems = this.wishlistItemsSubject.value;
      
      // Verificar si el producto ya existe en la wishlist
      const existingItemIndex = currentItems.findIndex(item => item.producto_id === normalizedProduct.id);
      
      if (existingItemIndex >= 0) {
        // El producto ya está en la wishlist
        return false;
      }

      // Agregar nuevo producto a la wishlist
      const newItem: WishlistItem = {
        id: Date.now(), // ID temporal único
        producto_id: normalizedProduct.id,
        nombre: normalizedProduct.nombre,
        imagen_url: normalizedProduct.imagen_url,
        precio: normalizedProduct.precio,
        stock_disponible: normalizedProduct.stock,
        codigo_producto: normalizedProduct.codigo_producto,
        categoria: normalizedProduct.categoria,
        marca: normalizedProduct.marca,
        rating: normalizedProduct.rating,
        reviews_count: normalizedProduct.reviews_count,
        mostrar_igv: normalizedProduct.mostrar_igv
      };

      currentItems.push(newItem);
      this.wishlistItemsSubject.next([...currentItems]);
      this.saveWishlistToStorage(currentItems);
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }

  // Remover producto de la wishlist
  removeFromWishlist(itemId: number): void {
    const currentItems = this.wishlistItemsSubject.value;
    const filteredItems = currentItems.filter(item => item.id !== itemId);
    
    this.wishlistItemsSubject.next(filteredItems);
    this.saveWishlistToStorage(filteredItems);
  }

  // Remover producto por producto_id
  removeByProductId(productoId: number): void {
    const currentItems = this.wishlistItemsSubject.value;
    const filteredItems = currentItems.filter(item => item.producto_id !== productoId);
    
    this.wishlistItemsSubject.next(filteredItems);
    this.saveWishlistToStorage(filteredItems);
  }

  // Verificar si un producto está en la wishlist
  isInWishlist(productoId: number): boolean {
    const currentItems = this.wishlistItemsSubject.value;
    return currentItems.some(item => item.producto_id === productoId);
  }

  // Limpiar wishlist completa
  clearWishlist(): void {
    this.wishlistItemsSubject.next([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Obtener items actuales de la wishlist
  getCurrentItems(): WishlistItem[] {
    return this.wishlistItemsSubject.value;
  }

  // Obtener cantidad total de items
  getTotalItems(): number {
    return this.wishlistItemsSubject.value.length;
  }

  // Verificar si la wishlist está vacía
  isEmpty(): boolean {
    return this.wishlistItemsSubject.value.length === 0;
  }

  // Toggle producto en wishlist (agregar si no está, quitar si está)
  toggleWishlist(producto: any): boolean {
    const productoId = producto.id;
    
    if (this.isInWishlist(productoId)) {
      this.removeByProductId(productoId);
      return false; // Removido
    } else {
      return this.addToWishlist(producto); // Agregado
    }
  }
}