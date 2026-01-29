import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerOfertaService, BannerOferta } from '../../../../services/banner-oferta.service';
import { BannerOfertaModalComponent } from '../banner-oferta-modal/banner-oferta-modal.component';
import { ProductosBannerOfertaComponent } from '../productos-banner-oferta/productos-banner-oferta.component';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-banners-ofertas-list',
  standalone: true,
  imports: [CommonModule, BannerOfertaModalComponent, ProductosBannerOfertaComponent],
  templateUrl: './banners-ofertas-list.component.html',
  styleUrl: './banners-ofertas-list.component.scss'
})
export class BannersOfertasListComponent implements OnInit {
  banners: BannerOferta[] = [];
  isLoading = false;
  bannerParaEditar: BannerOferta | null = null;
  mostrarProductos = false;
  bannerSeleccionado: BannerOferta | null = null;

  constructor(private bannerOfertaService: BannerOfertaService) {}

  ngOnInit(): void {
    this.cargarBanners();
  }

  cargarBanners(): void {
    this.isLoading = true;
    this.bannerOfertaService.getAll().subscribe({
      next: (banners) => {
        this.banners = banners;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar banners:', error);
        this.isLoading = false;
        Swal.fire('Error', 'No se pudieron cargar los banners', 'error');
      }
    });
  }

  editarBanner(banner: BannerOferta): void {
    this.bannerParaEditar = { ...banner };
    const modal = new bootstrap.Modal(document.getElementById('modalCrearBannerOferta'));
    modal.show();
  }

  eliminarBanner(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bannerOfertaService.delete(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El banner ha sido eliminado', 'success');
            this.cargarBanners();
          },
          error: (error) => {
            console.error('Error al eliminar:', error);
            Swal.fire('Error', 'No se pudo eliminar el banner', 'error');
          }
        });
      }
    });
  }

  toggleActivo(banner: BannerOferta): void {
    const formData = new FormData();
    formData.append('activo', banner.activo ? '0' : '1');
    formData.append('prioridad', banner.prioridad.toString());

    this.bannerOfertaService.update(banner.id!, formData).subscribe({
      next: () => {
        banner.activo = !banner.activo;
        Swal.fire('Actualizado', `Banner ${banner.activo ? 'activado' : 'desactivado'}`, 'success');
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
      }
    });
  }

  gestionarProductos(banner: BannerOferta): void {
    this.bannerSeleccionado = banner;
    this.mostrarProductos = true;
  }

  volverABanners(): void {
    this.mostrarProductos = false;
    this.bannerSeleccionado = null;
    this.cargarBanners();
  }

  onBannerGuardado(): void {
    this.cargarBanners();
  }

  onModalCerrado(): void {
    this.bannerParaEditar = null;
  }

  contarProductos(banner: BannerOferta): number {
    return banner.productos?.length || 0;
  }
}
