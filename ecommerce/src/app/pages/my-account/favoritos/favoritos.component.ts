// src/app/pages/my-account/favoritos/favoritos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FavoritosService } from '../../../services/favoritos.service';
import { CartService } from '../../../services/cart.service';
import { CartNotificationService } from '../../../services/cart-notification.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.scss'
})
export class FavoritosComponent implements OnInit {
  favoritos: any[] = [];
  isLoading = true;

  constructor(
    private favoritosService: FavoritosService,
    private cartService: CartService,
    private cartNotificationService: CartNotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarFavoritos();
  }

  cargarFavoritos(): void {
    this.isLoading = true;
    this.favoritosService.obtenerFavoritos().subscribe({
      next: (response: any) => {
        console.log('Favoritos recibidos:', response);
        this.favoritos = response.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar favoritos:', error);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los favoritos'
        });
      }
    });
  }

  eliminarFavorito(productoId: number): void {
    Swal.fire({
      title: '¿Eliminar de favoritos?',
      text: 'Este producto se eliminará de tu lista de favoritos',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.favoritosService.eliminarFavorito(productoId).subscribe({
          next: () => {
            this.favoritos = this.favoritos.filter(f => f.producto_id !== productoId);
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'Producto eliminado de favoritos',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al eliminar favorito:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el favorito'
            });
          }
        });
      }
    });
  }

  agregarAlCarrito(favorito: any): void {
    const producto = favorito.producto;
    
    if (!producto || producto.stock <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin stock',
        text: 'Este producto no tiene stock disponible'
      });
      return;
    }

    this.cartService.addToCart(producto, 1).subscribe({
      next: () => {
        const productImage = producto.imagen_url || producto.imagen || 'assets/images/thumbs/product-default.png';
        
        this.cartNotificationService.showProductAddedNotification(
          producto.nombre,
          Number(producto.precio_venta || producto.precio || 0),
          productImage,
          1,
          []
        );
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'No se pudo agregar el producto al carrito'
        });
      }
    });
  }

  verProducto(producto: any): void {
    const slug = producto.slug || producto.nombre?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
    this.router.navigate(['/product', producto.id, slug]);
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/thumbs/product-default.png';
  }
}
