// src/app/pages/dashboard/ofertas/ofertas-list/ofertas-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfertasAdminService, OfertaAdmin } from '../../../../services/ofertas-admin.service';
import { OfertaModalComponent } from '../oferta-modal/oferta-modal.component';
import { ProductosOfertaComponent } from '../productos-oferta/productos-oferta.component';
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
  selector: 'app-ofertas-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    OfertaModalComponent,
    ProductosOfertaComponent,
    NgxDatatableModule
  ],
  templateUrl: './ofertas-list.component.html',
  styleUrl: "./ofertas-list.component.scss"
})
export class OfertasListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DatatableComponent) table!: DatatableComponent;
  
  ofertas: OfertaAdmin[] = [];
  isLoading = true;
  ofertaParaEditar: OfertaAdmin | null = null;

  // Propiedades para gestión de productos
  mostrarProductos = false;
  ofertaSeleccionada: OfertaAdmin | null = null;

  private resizeSubscription?: Subscription;

  // Paginación
  pageSize = 10;
  selected: any[] = [];

  // Configuración para NGX-Datatable
  columns = [
    { name: 'Oferta', prop: 'titulo', flexGrow: 2.5, minWidth: 180 },
    { name: 'Descuento', prop: 'valor_descuento', flexGrow: 1, minWidth: 90 },
    { name: 'Fechas', prop: 'fecha_inicio', flexGrow: 1.5, minWidth: 120 },
    { name: 'Productos', prop: 'productos', flexGrow: 1, minWidth: 80 },
    { name: 'Configuración', prop: 'configuracion', flexGrow: 1.2, minWidth: 100 },
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
    this.cargarOfertas();

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

  cargarOfertas(): void {
    this.isLoading = true;
    this.ofertasAdminService.obtenerOfertas().subscribe({
      next: (ofertas) => {
        // Ordenar por prioridad descendente (mayor prioridad primero)
        this.ofertas = ofertas.sort((a, b) => b.prioridad - a.prioridad);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar ofertas:', error);
        this.isLoading = false;
      }
    });
  }

  editarOferta(oferta: OfertaAdmin): void {
    this.ofertaParaEditar = oferta;
    const modal = document.getElementById('modalCrearOferta');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  toggleOfertaPrincipal(oferta: OfertaAdmin): void {
    const accion = oferta.es_oferta_principal ? 'quitar' : 'marcar';
    const mensaje = oferta.es_oferta_principal 
      ? '¿Quitar como oferta principal?' 
      : '¿Marcar como oferta principal del día?';
    
    const textoConfirmacion = oferta.es_oferta_principal
      ? 'Esta oferta ya no será la principal'
      : 'Esta oferta se mostrará en la sección "Ofertas del día" y cualquier otra oferta principal será desmarcada automáticamente';

    Swal.fire({
      title: mensaje,
      text: textoConfirmacion,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: oferta.es_oferta_principal ? '#dc3545' : '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: oferta.es_oferta_principal ? 'Sí, quitar' : 'Sí, marcar como principal',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-12',
        confirmButton: 'rounded-8',
        cancelButton: 'rounded-8',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.ofertasAdminService.toggleOfertaPrincipal(oferta.id!).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Actualizado!',
              text: response.message,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              customClass: {
                popup: 'rounded-12',
              },
            });
            this.cargarOfertas(); // Recargar para actualizar el estado
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo actualizar la oferta principal.',
              icon: 'error',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            console.error('Error al toggle oferta principal:', error);
          }
        });
      }
    });
  }
  toggleOfertaSemana(oferta: OfertaAdmin): void {
  const accion = oferta.es_oferta_semana ? 'quitar' : 'marcar';
  const mensaje = oferta.es_oferta_semana 
    ? '¿Quitar como oferta de la semana?' 
    : '¿Marcar como oferta de la semana?';
  
  const textoConfirmacion = oferta.es_oferta_semana
    ? 'Esta oferta ya no será la oferta de la semana'
    : 'Esta oferta se mostrará en la sección "Ofertas de la semana" y cualquier otra oferta de la semana será desmarcada automáticamente';

  Swal.fire({
    title: mensaje,
    text: textoConfirmacion,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: oferta.es_oferta_semana ? '#dc3545' : '#28a745',
    cancelButtonColor: '#6c757d',
    confirmButtonText: oferta.es_oferta_semana ? 'Sí, quitar' : 'Sí, marcar como oferta de la semana',
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'rounded-12',
      confirmButton: 'rounded-8',
      cancelButton: 'rounded-8',
    },
  }).then((result) => {
    if (result.isConfirmed) {
      this.ofertasAdminService.toggleOfertaSemana(oferta.id!).subscribe({
        next: (response) => {
          Swal.fire({
            title: '¡Actualizado!',
            text: response.message,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
              popup: 'rounded-12',
            },
          });
          this.cargarOfertas(); // Recargar para actualizar el estado
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la oferta de la semana.',
            icon: 'error',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8',
            },
          });
          console.error('Error al toggle oferta de la semana:', error);
        }
      });
    }
  });
}

  gestionarProductos(oferta: OfertaAdmin): void {
    this.ofertaSeleccionada = oferta;
    this.mostrarProductos = true;
  }

  volverAOfertas(): void {
    this.mostrarProductos = false;
    this.ofertaSeleccionada = null;
  }

  contarProductos(oferta: OfertaAdmin): number {
    return (oferta as any).productos?.length || 0;
  }

  eliminarOferta(id: number): void {
    Swal.fire({
      title: '¿Eliminar oferta?',
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
        this.ofertasAdminService.eliminarOferta(id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminada!',
              text: 'La oferta ha sido eliminada.',
              icon: 'success',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            this.cargarOfertas();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar la oferta.',
              icon: 'error',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            console.error('Error al eliminar oferta:', error);
          }
        });
      }
    });
  }

  onOfertaGuardada(): void {
    this.cargarOfertas();
    this.ofertaParaEditar = null;
  }

  onModalCerrado(): void {
    this.ofertaParaEditar = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEstadoFecha(oferta: OfertaAdmin): {texto: string, class: string} {
    const ahora = new Date();
    const inicio = new Date(oferta.fecha_inicio);
    const fin = new Date(oferta.fecha_fin);

    if (ahora < inicio) {
      return { texto: 'Programada', class: 'bg-info-50 text-info-600' };
    } else if (ahora >= inicio && ahora <= fin) {
      return { texto: 'Activa', class: 'bg-success-50 text-success-600' };
    } else {
      return { texto: 'Expirada', class: 'bg-danger-50 text-danger-600' };
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
    const total = this.ofertas.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} ofertas en total`;
    }
    return `${selected} seleccionada${selected > 1 ? 's' : ''} de ${total}`;
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