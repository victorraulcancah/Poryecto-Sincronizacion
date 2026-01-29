import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ComprasService } from '../../../services/compras.service';
import { Compra } from '../../../services/compras.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./compras-list.component.html",
  styleUrl: "./compras-list.component.scss"
})
export class ComprasListComponent implements OnInit, OnDestroy {
  // Datos
  compras: Compra[] = [];
  comprasFiltradas: Compra[] = [];
  compraSeleccionada: Compra | null = null;
  loading = false;

  // Paginación simple
  pageSize = 10;
  currentPage = 1;

  // Método para acceder a Math.min en el template
  Math = Math;

  private resizeSubscription!: Subscription;

  // Cache para URLs de fotos para evitar regeneración constante
  private photoUrlCache = new Map<string, string | null>();

  constructor(private comprasService: ComprasService) {}

  ngOnInit(): void {
    this.cargarCompras();
  }

  ngOnDestroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  cargarCompras(): void {
    this.loading = true;
    // Limpiar cache de fotos cuando se recargan las compras
    this.photoUrlCache.clear();

    this.comprasService.obtenerTodasLasCompras().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.compras = response.compras || [];
          this.comprasFiltradas = [...this.compras];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando compras:', error);
        this.loading = false;
      }
    });
  }

  verDetalle(compra: Compra): void {
    this.compraSeleccionada = compra;
    console.log('Ver detalle de compra:', compra.codigo_compra);

    // Activar el modal de Bootstrap
    const modalElement = document.getElementById('modalDetalleCompra');
    if (modalElement) {
      // Usar Bootstrap 5 Modal API
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  getInitials(nombre: string | undefined): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  aprobarCompra(compra: Compra): void {
    if (confirm('¿Está seguro de aprobar esta compra?')) {
      this.comprasService.aprobarCompra(compra.id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.cargarCompras();
          }
        },
        error: (error) => {
          console.error('Error aprobando compra:', error);
          alert('Error al aprobar la compra');
        }
      });
    }
  }

  rechazarCompra(compra: Compra): void {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (motivo) {
      this.comprasService.rechazarCompra(compra.id, motivo).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.cargarCompras();
          }
        },
        error: (error) => {
          console.error('Error rechazando compra:', error);
          alert('Error al rechazar la compra');
        }
      });
    }
  }

  formatearFecha(fecha: string): string {
    return this.comprasService.formatearFecha(fecha);
  }

  formatearPrecio(precio: number): string {
    return this.comprasService.formatearPrecio(precio);
  }

  getEstadoClass(estado: any): string {
    return this.comprasService.getEstadoClass(estado);
  }

  getEstadoIcon(estado: any): string {
    return this.comprasService.getEstadoIcon(estado);
  }

  getEstadoTexto(estado: any): string {
    return this.comprasService.getEstadoTexto(estado);
  }

  getEstadoTextoCorto(estado: any): string {
    const textoCompleto = this.comprasService.getEstadoTexto(estado);
    // Acortar textos largos para que quepan mejor en la tabla
    const textoCorto: { [key: string]: string } = {
      'Pendiente Aprobación': 'Pendiente',
      'Pendiente de Aprobación': 'Pendiente',
      'Pendiente Pago': 'Pend. Pago',
      'En Proceso': 'Proceso',
      'Completada': 'Completa',
      'Cancelada': 'Cancelada',
      'Rechazada': 'Rechazada'
    };
    return textoCorto[textoCompleto] || textoCompleto;
  }

  necesitaAtencion(compra: Compra): boolean {
    return this.comprasService.necesitaAtencion(compra);
  }

  getSelectionText(): string {
    return `${this.compras.length} ${this.compras.length === 1 ? 'compra' : 'compras'}`;
  }

  // Método para obtener la URL de la foto del cliente
  getClientePhotoUrl(compra: Compra): string | null {
    const cacheKey = `compra-${compra.id}-user-${(compra as any).user_cliente_id}`;

    if (this.photoUrlCache.has(cacheKey)) {
      return this.photoUrlCache.get(cacheKey)!;
    }

    const compraAny = compra as any;
    const userCliente = compraAny.user_cliente;

    if (userCliente) {
      const photoField = userCliente.foto || userCliente.foto_url ||
                        userCliente.profile_photo || userCliente.avatar ||
                        userCliente.image;

      if (photoField) {
        let finalUrl = photoField;

        if (finalUrl.startsWith('http')) {
          finalUrl = finalUrl.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
        } else {
          let photoPath = finalUrl;
          if (photoPath.includes('/storage/clientes//storage/clientes/')) {
            photoPath = photoPath.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
          }
          if (!photoPath.includes('/')) {
            photoPath = `/storage/clientes/${photoPath}`;
          }
          finalUrl = `${environment.baseUrl}${photoPath}`;
        }

        const result = finalUrl;
        this.photoUrlCache.set(cacheKey, result);
        return result;
      }
    }

    const photoField = compraAny.cliente_foto || compraAny.cliente_photo ||
                      compraAny.foto || compraAny.cliente_imagen || compraAny.avatar;

    if (photoField) {
      let finalUrl = photoField;
      if (finalUrl.startsWith('http')) {
        finalUrl = finalUrl.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
      } else {
        let photoPath = finalUrl;
        if (photoPath.includes('/storage/clientes//storage/clientes/')) {
          photoPath = photoPath.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
        }
        if (!photoPath.includes('/')) {
          photoPath = `/storage/clientes/${photoPath}`;
        }
        finalUrl = `${environment.baseUrl}${photoPath}`;
      }

      this.photoUrlCache.set(cacheKey, finalUrl);
      return finalUrl;
    }

    this.photoUrlCache.set(cacheKey, null);
    return null;
  }

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  // Métodos de paginación moderna
  getPaginatedCompras(): Compra[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.comprasFiltradas.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.comprasFiltradas.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // TrackBy function para evitar re-renders innecesarios
  trackByCompraId(index: number, compra: Compra): number {
    return compra.id;
  }
}