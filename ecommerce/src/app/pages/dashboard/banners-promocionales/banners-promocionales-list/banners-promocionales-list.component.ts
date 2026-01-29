// src\app\pages\dashboard\banners-promocionales\banners-promocionales-list\banners-promocionales-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BannersService, BannerPromocional } from '../../../../services/banner.service';
import { BannerPromocionalModalComponent } from '../../../../component/banner-promocional-modal/banner-promocional-modal.component';
import { PermissionsService } from '../../../../services/permissions.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-banners-promocionales-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BannerPromocionalModalComponent],
  templateUrl: "./banners-promocionales-list.component.html",
  styleUrl: "./banners-promocionales-list.component.scss"
})
export class BannersPromocionalesListComponent implements OnInit, OnDestroy {
  // Datos
  bannersPromocionales: BannerPromocional[] = [];
  bannersFiltrados: BannerPromocional[] = [];
  isLoading = true;
  bannerSeleccionado: BannerPromocional | null = null;

  canCreateBanner_promocionales!: boolean;
  canEdit!: boolean;
  canDelete!: boolean;

  // Paginación simple
  pageSize = 10;
  currentPage = 1;
  selected: BannerPromocional[] = [];

  // Método para acceder a Math.min en el template
  Math = Math;

  constructor(
    private bannersService: BannersService,
    private permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarBannersPromocionales();
    this.checkPermissions();
  }

  private checkPermissions(): void {
    this.canCreateBanner_promocionales = this.permissionsService.hasPermission('banners_promocionales.create');
    this.canEdit = this.permissionsService.hasPermission('banners_promocionales.edit');
    this.canDelete = this.permissionsService.hasPermission('banners_promocionales.delete');
  }

  // Método para recargar permisos (si cambian en tiempo real)
  refreshPermissions(): void {
    this.checkPermissions();
  }

  cargarBannersPromocionales(): void {
    this.isLoading = true;
    this.bannersService.obtenerBannersPromocionales().subscribe({
      next: (banners) => {
        this.bannersPromocionales = banners.sort((a, b) => a.orden - b.orden);
        this.bannersFiltrados = [...this.bannersPromocionales];
        this.isLoading = false;
        console.log('Banners promocionales cargados:', banners.length);
      },
      error: (error) => {
        console.error('Error al cargar banners promocionales:', error);
        this.isLoading = false;
      }
    });
  }

  editarBanner(banner: BannerPromocional): void {
    this.bannerSeleccionado = banner;
    const modal = document.getElementById('modalCrearBannerPromocional');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  eliminarBanner(id: number): void {
    Swal.fire({
      title: '¿Eliminar banner promocional?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-12',
        confirmButton: 'rounded-8',
        cancelButton: 'rounded-8',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.bannersService.eliminarBannerPromocional(id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El banner promocional ha sido eliminado.',
              icon: 'success',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            this.cargarBannersPromocionales();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el banner promocional.',
              icon: 'error',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            console.error('Error al eliminar banner promocional:', error);
          }
        });
      }
    });
  }

  toggleEstado(banner: BannerPromocional): void {
    this.bannersService.actualizarBannerPromocional(banner.id, { 
      activo: !banner.activo 
    }).subscribe({
      next: () => {
        this.cargarBannersPromocionales();
      },
      error: (error) => {
        console.error('Error al actualizar banner promocional:', error);
      }
    });
  }

  onBannerGuardado(): void {
    this.cargarBannersPromocionales();
    this.bannerSeleccionado = null;
  }

  onModalCerrado(): void {
    this.bannerSeleccionado = null;
  }

  onImageError(event: any): void {
    console.error('Error al cargar imagen del banner:', event);
    event.target.style.display = 'none';
    event.target.classList.add('image-error');

    const container = event.target.closest('.banner-image-container');
    if (container) {
      let placeholder = container.querySelector('.ph-image');
      if (!placeholder) {
        placeholder = document.createElement('i');
        placeholder.className = 'ph ph-image text-gray-400';
        placeholder.style.fontSize = '16px';
        container.appendChild(placeholder);
      }
      placeholder.style.display = 'block';
    }
  }

  // Métodos de paginación simple
  getPaginatedBanners(): BannerPromocional[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.bannersFiltrados.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.bannersFiltrados.length / this.pageSize);
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

  // Texto de selección
  get selectionText(): string {
    const total = this.bannersPromocionales.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} banners promocionales en total`;
    }
    return `${selected} seleccionado${selected > 1 ? 's' : ''} de ${total}`;
  }

  // Métodos de estadísticas
  getBannersActivos(): number {
    return this.bannersPromocionales.filter(b => b.activo).length;
  }

  getBannersInactivos(): number {
    return this.bannersPromocionales.filter(b => !b.activo).length;
  }

  // Método trackBy para optimizar renderizado
  trackByBannerId(index: number, banner: BannerPromocional): number {
    return banner.id;
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }
}