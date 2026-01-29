// src/app/pages/dashboard/banners/banners-list/banners-list.component.ts


import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BannersService, Banner } from '../../../../services/banner.service';
import { BannerModalComponent } from '../../../../component/banner-modal/banner-modal.component';
import { PermissionsService } from '../../../../services/permissions.service';
import { Observable, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import {
  NgxDatatableModule,
  ColumnMode,
  SelectionType,
  SortType,
  DatatableComponent
} from '@swimlane/ngx-datatable';
@Component({
  selector: 'app-banners-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BannerModalComponent, NgxDatatableModule],
  templateUrl: "./banners-list.component.html",
  styleUrl: "./banners-list.component.scss"
})
export class BannersListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DatatableComponent) table!: DatatableComponent;
  
  banners: Banner[] = [];
  isLoading = true;
  bannerSeleccionado: Banner | null = null;
  canCreate$!: boolean;
  canEdit$!: boolean;

  private resizeSubscription?: Subscription;

  // Paginación
  pageSize = 10;
  selected: any[] = [];
  canDelete$!: boolean;

  // Configuración para NGX-Datatable
  columns = [
    { name: 'Imagen', flexGrow: 1.2 },
    { name: 'Banner', prop: 'titulo', flexGrow: 2.5 },
    { name: 'Precio', prop: 'precio_desde', flexGrow: 1 },
    { name: 'Orden', prop: 'orden', flexGrow: 0.8 },
    { name: 'Estado', prop: 'activo', flexGrow: 0.8 },
    { name: 'Acciones', prop: 'acciones', flexGrow: 1.2 }
  ];

  ColumnMode = ColumnMode;
  SelectionType = SelectionType;
  SortType = SortType;


  constructor(
    private bannersService: BannersService,
    private permissionsService: PermissionsService
  ) {
    // Escuchar cambios de resize del window
    this.resizeSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.cargarBanners();
    // Verificar permisos al inicializar
    this.checkPermissions();

    // Escuchar cambios del sidebar para recalcular la tabla
    const sidebarListener = () => {
      // Recálculo inmediato sin setTimeout para respuesta más rápida
      this.recalcularTabla();

      // Recálculo adicional por si acaso
      setTimeout(() => {
        this.recalcularTabla();
      }, 10);
    };

    window.addEventListener('sidebarChanged', sidebarListener);

    // Limpiar el listener cuando se destruya el componente
    this.resizeSubscription?.add(() => {
      window.removeEventListener('sidebarChanged', sidebarListener);
    });
  }

  // Nuevo método para verificar permisos
  private checkPermissions(): void {
   this.canCreate$ = this.permissionsService.hasPermission('banners.create');
      this.canEdit$ = this.permissionsService.hasPermission('banners.edit');
      this.canDelete$ = this.permissionsService.hasPermission('banners.delete');

  }

  // Método para recargar permisos (si cambian en tiempo real)
  refreshPermissions(): void {
    this.checkPermissions();
  }

  cargarBanners(): void {
    this.isLoading = true;
    this.bannersService.obtenerBanners().subscribe({
      next: (banners) => {
        // Filtrar solo banners principales (excluir horizontales)
        this.banners = banners
          .filter(b => !b.tipo_banner || b.tipo_banner === 'principal')
          .sort((a, b) => a.orden - b.orden);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar banners:', error);
        this.isLoading = false;
      }
    });
  }

  editarBanner(banner: Banner): void {
    this.bannerSeleccionado = banner;
    const modal = document.getElementById('modalCrearBanner');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }
  abrirNuevoModal(): void { 
    this.bannerSeleccionado = null;

  }

  eliminarBanner(id: number): void {
    Swal.fire({
      title: '¿Eliminar banner?',
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
        this.bannersService.eliminarBanner(id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El banner ha sido eliminado.',
              icon: 'success',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            this.cargarBanners();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el banner.',
              icon: 'error',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            console.error('Error al eliminar banner:', error);
          }
        });
      }
    });
  }

  toggleEstado(banner: Banner): void {
    this.bannersService.actualizarBanner(banner.id, {
      activo: !banner.activo
    }).subscribe({
      next: () => {
        this.cargarBanners();
      },
      error: (error) => {
        console.error('Error al actualizar banner:', error);
      }
    });
  }

  // ✅ MÉTODOS PARA HOVER EN GALERÍA
  showOverlay(event: any): void {
    const overlay = event.currentTarget.querySelector('.banner-overlay');
    if (overlay) {
      overlay.style.opacity = '1';
    }
  }

  hideOverlay(event: any): void {
    const overlay = event.currentTarget.querySelector('.banner-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
    }
  }

  onBannerGuardado(): void {
    this.cargarBanners();
    this.bannerSeleccionado = null;
  }

  onModalCerrado(): void {
    this.bannerSeleccionado = null;
  }

  // Métodos para manejar selección y paginación
  onSelect(event: any): void {
    this.selected = event.selected;
  }

  onPageChange(event: any): void {
    console.log('Página cambiada:', event);
  }

  displayCheck(row: any): boolean {
    return this.permissionsService.hasPermission('banners.edit');
  }

  get selectionText(): string {
    const total = this.banners.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} banners en total`;
    }
    return `${selected} seleccionado${selected > 1 ? 's' : ''} de ${total}`;
  }

  ngAfterViewInit(): void {
    // Forzar recalculo después de que la vista esté completamente inicializada
    setTimeout(() => {
      if (this.table) {
        this.table.recalculateColumns();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  // Método para recalcular columnas cuando cambia el layout
  private recalcularTabla(): void {
    if (this.table) {
      // Forzar recalculo inmediato
      this.table.recalculate();
      this.table.recalculateColumns();

      // Forzar redibujado del DOM
      this.table.recalculateDims();

      // Detectar cambios para Angular
      setTimeout(() => {
        if (this.table) {
          this.table.recalculate();
        }
      }, 1);
    }
  }

}