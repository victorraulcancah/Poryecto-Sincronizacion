import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionesService, Cotizacion } from '../../../services/cotizaciones.service';
import { ProductosService, ProductoSugerencia } from '../../../services/productos.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

interface ItemEdicion {
  producto_id: number;
  nombre: string;
  imagen?: string;
  cantidad: number;
  precio_unitario: number;
}

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // ── Edición de cotización ─────────────────────────────────
  guardandoEdicion = false;
  activeTabEdicion: 'datos' | 'productos' = 'datos';
  cotizacionEnEdicion: Cotizacion | null = null;
  formEdicion = {
    cliente_nombre: '',
    cliente_email: '',
    telefono_contacto: '',
    numero_documento: '',
    direccion_envio: '',
    metodo_pago_preferido: '',
    observaciones: '',
  };
  itemsEdicion: ItemEdicion[] = [];
  terminoBusquedaProducto = '';
  productosSugeridos: ProductoSugerencia[] = [];
  buscandoProducto = false;
  subtotalEdicion = 0;
  igvEdicion = 0;
  totalEdicion = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private cotizacionesService: CotizacionesService,
    private productosService: ProductosService,
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
    if (cotizacion.estado_actual.id !== 1) {
      Swal.fire({
        title: 'Solicitud ya enviada',
        text: 'Ya hemos recibido tu solicitud para procesar esta cotización. Un administrador te contactará pronto.',
        icon: 'info',
        confirmButtonColor: '#0dcaf0'
      });
      return;
    }

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

  onImgError(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return; // anti-loop
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  // ── Edición de cotización ─────────────────────────────────

  abrirEdicion(cotizacion: Cotizacion): void {
    this.cotizacionEnEdicion = cotizacion;
    this.activeTabEdicion = 'datos';
    this.formEdicion = {
      cliente_nombre: cotizacion.cliente_nombre || '',
      cliente_email: cotizacion.cliente_email || '',
      telefono_contacto: cotizacion.telefono_contacto || '',
      numero_documento: cotizacion.numero_documento || '',
      direccion_envio: cotizacion.direccion_envio || '',
      metodo_pago_preferido: cotizacion.metodo_pago_preferido || '',
      observaciones: cotizacion.observaciones || '',
    };
    this.itemsEdicion = (cotizacion.productos || [])
      .filter(p => p.producto_id != null)
      .map(p => ({
        producto_id: p.producto_id!,
        nombre: p.nombre,
        imagen: p.imagen,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      }));
    this.terminoBusquedaProducto = '';
    this.productosSugeridos = [];
    this.recalcularEdicion();

    const modal = document.getElementById('editarCotizacionModal');
    if (modal) {
      new (window as any).bootstrap.Modal(modal).show();
    }
  }

  buscarProductoEdicion(): void {
    const termino = this.terminoBusquedaProducto.trim();
    if (termino.length < 2) {
      this.productosSugeridos = [];
      return;
    }
    this.buscandoProducto = true;
    this.productosService.buscarProductos(termino).subscribe({
      next: (productos) => {
        this.productosSugeridos = productos;
        this.buscandoProducto = false;
      },
      error: () => {
        this.buscandoProducto = false;
      }
    });
  }

  // Cantidad elegida en el buscador, por producto
  cantidadBusqueda: { [productoId: number]: number } = {};

  getCantidadBusqueda(id: number): number {
    return this.cantidadBusqueda[id] ?? 1;
  }

  cambiarCantidadBusqueda(id: number, delta: number): void {
    const nueva = this.getCantidadBusqueda(id) + delta;
    this.cantidadBusqueda[id] = nueva < 1 ? 1 : nueva;
  }

  setCantidadBusqueda(id: number, valor: any): void {
    const n = Math.floor(Number(valor));
    this.cantidadBusqueda[id] = (!n || n < 1) ? 1 : n;
  }

  agregarProductoEdicion(producto: ProductoSugerencia): void {
    const cantidad = this.getCantidadBusqueda(producto.id);
    const existe = this.itemsEdicion.find(i => i.producto_id === producto.id);
    if (existe) {
      existe.cantidad += cantidad;
    } else {
      this.itemsEdicion.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        imagen: producto.imagen_url,
        cantidad: cantidad,
        precio_unitario: producto.precio ?? 0,
      });
    }
    // Reinicia la cantidad de ese producto en el buscador a 1.
    // No se limpia el término ni las sugerencias: así el usuario
    // puede seguir agregando productos sin reescribir.
    this.cantidadBusqueda[producto.id] = 1;
    this.recalcularEdicion();
  }

  cambiarCantidadEdicion(item: ItemEdicion, delta: number): void {
    const nueva = item.cantidad + delta;
    if (nueva >= 1) {
      item.cantidad = nueva;
      this.recalcularEdicion();
    }
  }

  setCantidadEdicion(item: ItemEdicion, valor: any): void {
    const n = Math.floor(Number(valor));
    item.cantidad = (!n || n < 1) ? 1 : n;
    this.recalcularEdicion();
  }

  quitarProductoEdicion(index: number): void {
    this.itemsEdicion.splice(index, 1);
    this.recalcularEdicion();
  }

  recalcularEdicion(): void {
    const subtotal = this.itemsEdicion.reduce(
      (acc, i) => acc + i.cantidad * i.precio_unitario, 0
    );
    const costo = Number(this.cotizacionEnEdicion?.costo_envio) || 0;
    this.subtotalEdicion = subtotal;
    this.igvEdicion = subtotal * 0.18;
    this.totalEdicion = subtotal + this.igvEdicion + costo;
  }

  guardarEdicion(): void {
    if (!this.cotizacionEnEdicion) return;

    if (!this.formEdicion.cliente_nombre || !this.formEdicion.cliente_email ||
        !this.formEdicion.telefono_contacto || !this.formEdicion.direccion_envio ||
        this.itemsEdicion.length === 0) {
      Swal.fire('Datos incompletos', 'Completa los campos obligatorios y deja al menos un producto.', 'warning');
      return;
    }

    this.guardandoEdicion = true;
    const payload = {
      ...this.formEdicion,
      productos: this.itemsEdicion.map(i => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
      })),
    };

    this.cotizacionesService.actualizarCotizacionEcommerce(this.cotizacionEnEdicion.id, payload).subscribe({
      next: (response) => {
        this.guardandoEdicion = false;
        if (response.status === 'success') {
          const modal = document.getElementById('editarCotizacionModal');
          if (modal) {
            (window as any).bootstrap.Modal.getInstance(modal)?.hide();
          }
          Swal.fire({
            title: '¡Actualizada!',
            text: 'La cotización se actualizó correctamente.',
            icon: 'success',
            confirmButtonColor: '#198754'
          });
          this.cargarCotizaciones();
        }
      },
      error: (error) => {
        this.guardandoEdicion = false;
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo actualizar la cotización.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }
}