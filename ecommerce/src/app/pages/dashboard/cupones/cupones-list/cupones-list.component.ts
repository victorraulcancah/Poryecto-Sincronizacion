// src/app/pages/dashboard/cupones/cupones-list/cupones-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfertasAdminService, CuponAdmin } from '../../../../services/ofertas-admin.service';
import { CuponModalComponent } from '../cupon-modal/cupon-modal.component';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import {
  NgxDatatableModule,
  ColumnMode,
  SelectionType,
  SortType,
  DatatableComponent
} from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-cupones-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CuponModalComponent, NgxDatatableModule],
  templateUrl: './cupones-list.component.html',
  styleUrls: ['./cupones-list.component.scss']
})
export class CuponesListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DatatableComponent) table!: DatatableComponent;
  
  cupones: CuponAdmin[] = [];
  isLoading = true;
  cuponSeleccionado: CuponAdmin | null = null;

  private resizeSubscription?: Subscription;

  // Paginación
  pageSize = 10;
  selected: any[] = [];

  // Configuración para NGX-Datatable
  columns = [
    { name: 'Código', prop: 'codigo', flexGrow: 2.5, minWidth: 150 },
    { name: 'Descuento', prop: 'valor_descuento', flexGrow: 1, minWidth: 90 },
    { name: 'Vigencia', prop: 'fecha_inicio', flexGrow: 1.5, minWidth: 120 },
    { name: 'Usos', prop: 'usos', flexGrow: 1, minWidth: 80 },
    { name: 'Estado', prop: 'activo', flexGrow: 0.8, minWidth: 70 },
    { name: 'Acciones', prop: 'acciones', flexGrow: 1.2, minWidth: 150 }
  ];

  ColumnMode = ColumnMode;
  SelectionType = SelectionType;
  SortType = SortType;

  constructor(
    private ofertasAdminService: OfertasAdminService
  ) {
    // Escuchar cambios de resize del window
    this.resizeSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.cargarCupones();

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

  cargarCupones(): void {
    this.isLoading = true;
    this.ofertasAdminService.obtenerCupones().subscribe({
      next: (cupones) => {
        this.cupones = cupones.sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar cupones:', error);
        this.isLoading = false;
      }
    });
  }

  editarCupon(cupon: CuponAdmin): void {
    this.cuponSeleccionado = cupon;
    const modal = document.getElementById('modalCrearCupon');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  eliminarCupon(id: number): void {
    Swal.fire({
      title: '¿Eliminar cupón?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ofertasAdminService.eliminarCupon(id).subscribe({
          next: () => {
            Swal.fire('¡Eliminado!', 'El cupón ha sido eliminado.', 'success');
            this.cargarCupones();
          },
          error: (error) => {
            Swal.fire('Error', 'No se pudo eliminar el cupón.', 'error');
            console.error('Error al eliminar cupón:', error);
          }
        });
      }
    });
  }

  copiarCodigo(codigo: string): void {
    navigator.clipboard.writeText(codigo).then(() => {
      Swal.fire({
        title: '¡Copiado!',
        text: `Código "${codigo}" copiado al portapapeles`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    });
  }

  onCuponGuardado(): void {
    this.cargarCupones();
    this.cuponSeleccionado = null;
  }

  onModalCerrado(): void {
    this.cuponSeleccionado = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEstadoFecha(cupon: CuponAdmin): {texto: string, class: string} {
    const ahora = new Date();
    const inicio = new Date(cupon.fecha_inicio);
    const fin = new Date(cupon.fecha_fin);

    if (ahora < inicio) {
      return { texto: 'Programado', class: 'bg-info-50 text-info-600' };
    } else if (ahora >= inicio && ahora <= fin) {
      return { texto: 'Vigente', class: 'bg-success-50 text-success-600' };
    } else {
      return { texto: 'Expirado', class: 'bg-danger-50 text-danger-600' };
    }
  }

  // Métodos para manejar selección y paginación
  onSelect(event: any): void {
    this.selected = event.selected;
  }

  onPageChange(event: any): void {
    console.log('Página cambiada:', event);
  }

  displayCheck(row: any): boolean {
    return true; // Ajustar según permisos si es necesario
  }

  get selectionText(): string {
    const total = this.cupones.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} cupones en total`;
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