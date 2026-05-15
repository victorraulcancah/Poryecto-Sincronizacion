import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionesService, Cotizacion } from '../../../services/cotizaciones.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  
  // Para la vista previa del PDF
  pdfPreviewUrl: SafeResourceUrl | null = null;
  loadingPdf = false;

  private destroy$ = new Subject<void>();

  constructor(
    private cotizacionesService: CotizacionesService,
    private sanitizer: DomSanitizer
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
    this.cotizacionSeleccionada = cotizacion;
    this.loadingPdf = true;
    this.pdfPreviewUrl = null;

    // Obtener el blob del PDF desde el servicio
    this.cotizacionesService.generarPDF(cotizacion.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        // Añadir parámetros para el visor (ocultando panel de navegación/miniaturas)
        this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#toolbar=1&navpanes=0&scrollbar=1&view=FitH&pagemode=none');
        this.loadingPdf = false;
        
        // Abrir el modal programáticamente (usando bootstrap nativo)
        const modalElement = document.getElementById('previewPdfModalCot');
        if (modalElement) {
          const bootstrapModal = new (window as any).bootstrap.Modal(modalElement);
          bootstrapModal.show();
        }
      },
      error: (error) => {
        console.error('Error generando vista previa:', error);
        this.loadingPdf = false;
        Swal.fire('Error', 'No se pudo generar la vista previa de la cotización', 'error');
      }
    });
  }

  descargarPdfActual(): void {
    if (this.cotizacionSeleccionada) {
      this.cotizacionesService.descargarPDF(
        this.cotizacionSeleccionada.id,
        `Cotizacion_${this.cotizacionSeleccionada.codigo_cotizacion}.pdf`
      );
    }
  }

  imprimirIframe(): void {
    const iframe = document.querySelector('#pdfViewerCot') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
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
              const codigoPedido = (response as any).pedido_codigo;
              Swal.fire({
                title: '¡Solicitud enviada!',
                html: `
                  <p>${response.message || 'Hemos notificado al administrador. Te contactaremos pronto.'}</p>
                  ${codigoPedido ? `<p class="text-sm text-muted mt-2">N° de pedido: <strong>${codigoPedido}</strong></p>` : ''}
                `,
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