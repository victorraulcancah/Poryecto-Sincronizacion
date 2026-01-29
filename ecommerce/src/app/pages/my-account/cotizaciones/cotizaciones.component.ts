import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionesService, Cotizacion } from '../../../services/cotizaciones.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cotizaciones.component.html',
  styleUrl: './cotizaciones.component.scss'
})
export class CotizacionesComponent implements OnInit, OnDestroy {
  cotizaciones: Cotizacion[] = [];
  isLoadingCotizaciones = false;
  cotizacionSeleccionada: Cotizacion | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private cotizacionesService: CotizacionesService
  ) { }

  ngOnInit(): void {
    this.cargarCotizaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarCotizaciones(): void {
    this.isLoadingCotizaciones = true;
    this.cotizacionesService.obtenerMisCotizaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success' && response.cotizaciones) {
            this.cotizaciones = response.cotizaciones;
          }
          this.isLoadingCotizaciones = false;
        },
        error: (error) => {
          console.error('Error cargando cotizaciones:', error);
          this.isLoadingCotizaciones = false;
        }
      });
  }

  verDetallesCotizacion(cotizacion: Cotizacion): void {
    // Descargar PDF de la cotización
    this.cotizacionesService.descargarPDF(
      cotizacion.id,
      `Cotizacion_${cotizacion.codigo_cotizacion}.pdf`
    );
  }

  convertirACompra(cotizacion: Cotizacion): void {
    Swal.fire({
      title: '¿Convertir a compra?',
      text: `¿Deseas convertir la cotización ${cotizacion.codigo_cotizacion} en una compra?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Convirtiendo cotización a compra:', cotizacion);

        this.cotizacionesService.convertirACompra(cotizacion.id).subscribe({
          next: (response) => {
            if (response.status === 'success') {
              Swal.fire({
                title: '¡Éxito!',
                text: 'Cotización convertida a compra exitosamente',
                icon: 'success',
                confirmButtonColor: '#198754'
              });
              this.cargarCotizaciones(); // Recargar la lista
            }
          },
          error: (error) => {
            console.error('Error convirtiendo cotización:', error);
            Swal.fire({
              title: 'Error',
              text: 'Error al convertir la cotización. Inténtalo de nuevo.',
              icon: 'error',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  pedirCotizacion(cotizacion: Cotizacion): void {
    Swal.fire({
      title: '¿Solicitar procesamiento?',
      html: `
        <div class="text-start">
          <p><strong>Cotización:</strong> ${cotizacion.codigo_cotizacion}</p>
          <p><strong>Total:</strong> S/ ${cotizacion.total}</p>
          <p class="text-info mt-3">
            <i class="ph ph-info-circle"></i>
            Se notificará al administrador para que procese tu cotización y te contacte pronto.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0dcaf0',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, solicitar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Solicitando procesamiento de cotización:', cotizacion);

        // Mostrar loading
        Swal.fire({
          title: 'Enviando solicitud...',
          text: 'Por favor espera mientras notificamos al administrador',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.cotizacionesService.pedirCotizacion(cotizacion.id).subscribe({
          next: (response) => {
            if (response.status === 'success') {
              Swal.fire({
                title: '¡Solicitud enviada!',
                text: 'Hemos notificado al administrador. Te contactaremos pronto.',
                icon: 'success',
                confirmButtonColor: '#198754'
              });
              this.cargarCotizaciones(); // Recargar la lista
            }
          },
          error: (error) => {
            console.error('Error solicitando cotización:', error);
            Swal.fire({
              title: 'Error',
              text: 'Error al enviar la solicitud. Inténtalo de nuevo.',
              icon: 'error',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  eliminarCotizacion(cotizacion: Cotizacion): void {
    Swal.fire({
      title: '¿Eliminar cotización?',
      html: `
        <div class="text-start">
          <p><strong>Cotización:</strong> ${cotizacion.codigo_cotizacion}</p>
          <p><strong>Total:</strong> S/ ${cotizacion.total}</p>
          <p class="text-warning mt-3">
            <i class="ph ph-warning-circle"></i>
            Esta acción no se puede deshacer y se perderán todos los datos de la cotización.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Eliminando cotización:', cotizacion);

        // Mostrar loading
        Swal.fire({
          title: 'Eliminando...',
          text: 'Por favor espera mientras eliminamos tu cotización',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.cotizacionesService.eliminarCotizacion(cotizacion.id).subscribe({
          next: (response) => {
            if (response.status === 'success') {
              Swal.fire({
                title: '¡Eliminada!',
                text: 'La cotización ha sido eliminada exitosamente',
                icon: 'success',
                confirmButtonColor: '#198754'
              });
              this.cargarCotizaciones(); // Recargar la lista
            }
          },
          error: (error) => {
            console.error('Error eliminando cotización:', error);
            Swal.fire({
              title: 'Error',
              text: 'Error al eliminar la cotización. Inténtalo de nuevo.',
              icon: 'error',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '-';
    return this.cotizacionesService.formatearFecha(fecha);
  }

  formatearPrecio(precio: number): string {
    return this.cotizacionesService.formatearPrecio(precio);
  }

  getEstadoClass(estado: any): string {
    return this.cotizacionesService.getEstadoClass(estado);
  }
}