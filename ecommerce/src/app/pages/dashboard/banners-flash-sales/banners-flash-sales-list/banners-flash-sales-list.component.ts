import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerFlashSalesService, BannerFlashSale } from '../../../../services/banner-flash-sales.service';
import { BannerFlashSaleModalComponent } from '../banner-flash-sale-modal/banner-flash-sale-modal.component';

@Component({
  selector: 'app-banners-flash-sales-list',
  standalone: true,
  imports: [CommonModule, BannerFlashSaleModalComponent],
  templateUrl: "./banners-flash-sales-list.component.html",
  styleUrl: "./banners-flash-sales-list.component.scss"
})
export class BannersFlashSalesListComponent implements OnInit, OnDestroy {
  banners: BannerFlashSale[] = [];
  isLoading = false;
  bannerParaEditar: BannerFlashSale | null = null;
  private countdownInterval: any;

  constructor(private bannerFlashSalesService: BannerFlashSalesService) {}

  ngOnInit(): void {
    this.cargarBanners();
    this.iniciarCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  iniciarCountdown(): void {
    // Actualizar countdown cada segundo
    this.countdownInterval = setInterval(() => {
      // Forzar detección de cambios para actualizar la vista
    }, 1000);
  }

  cargarBanners(): void {
    this.isLoading = true;
    this.bannerFlashSalesService.getAll().subscribe({
      next: (banners) => {
        this.banners = banners;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar banners:', error);
        this.isLoading = false;
      }
    });
  }

  getCountdown(banner: BannerFlashSale): { dias: number; horas: number; minutos: number; segundos: number } {
    const now = new Date();
    const fin = new Date(banner.fecha_fin);
    const diff = fin.getTime() - now.getTime();

    if (diff <= 0) {
      return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
    }

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);

    return { dias, horas, minutos, segundos };
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoFecha(banner: BannerFlashSale): { texto: string; class: string } {
    const now = new Date();
    const inicio = new Date(banner.fecha_inicio);
    const fin = new Date(banner.fecha_fin);

    if (now < inicio) {
      return { texto: 'Próximamente', class: 'bg-info-100 text-info-600' };
    } else if (now >= inicio && now <= fin) {
      return { texto: 'En curso', class: 'bg-success-100 text-success-600' };
    } else {
      return { texto: 'Finalizado', class: 'bg-danger-100 text-danger-600' };
    }
  }

  toggleActivo(banner: BannerFlashSale): void {
    if (!banner.id) return;

    this.bannerFlashSalesService.toggleActivo(banner.id).subscribe({
      next: () => {
        banner.activo = !banner.activo;
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del banner');
      }
    });
  }

  editarBanner(banner: BannerFlashSale): void {
    this.bannerParaEditar = banner;
    // Abrir modal con Bootstrap
    const modalElement = document.getElementById('modalCrearBannerFlash');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  onBannerGuardado(): void {
    this.cargarBanners();
    this.bannerParaEditar = null;
  }

  onModalCerrado(): void {
    this.bannerParaEditar = null;
  }

  eliminarBanner(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    this.bannerFlashSalesService.delete(id).subscribe({
      next: () => {
        this.cargarBanners();
        alert('Banner eliminado correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar banner:', error);
        alert('Error al eliminar el banner');
      }
    });
  }
}
