import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { CotizacionesService, Cotizacion } from '../../../services/cotizaciones.service';
import { CartService } from '../../../services/cart.service';
import { ProductosService, ProductoSugerencia } from '../../../services/productos.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MonedaPipe } from '../../../pipes/moneda.pipe';
import Swal from 'sweetalert2';

interface ItemEdicion {
  producto_id: number;
  nombre: string;
  imagen?: string;
  cantidad: number;
  precio_unitario: number;
  moneda?: string;
}

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MonedaPipe],
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
    private cartService: CartService,
    private router: Router,
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

  // El boton "Pedir" desaparecio: la cotizacion genera su pedido al crearse
  // desde el checkout, asi que ya no hay un segundo paso que solicitar.

  eliminarCotizacion(cotizacion: Cotizacion): void {
    // Misma ventana que la edición: se cierra cuando el vendedor toma el
    // pedido. El backend también lo rechaza; esto evita abrir el diálogo.
    if (!cotizacion.editable) {
      Swal.fire({
        title: 'Ya no se puede eliminar',
        text: 'Un vendedor ya está atendiendo tu pedido, así que la cotización quedó cerrada.',
        icon: 'info',
        confirmButtonColor: '#0dcaf0'
      });
      return;
    }

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

  /** Color del estado de la gestión del pedido. */
  claseEstadoPedido(cotizacion: Cotizacion): string {
    switch (cotizacion.estado_pedido?.nombre_estado) {
      case 'En preparación':
        return 'bg-info-50 text-info-600';
      case 'Cancelado':
        return 'bg-danger-50 text-danger-600';
      default:
        // En espera: es lo que todavía puede editar el cliente.
        return 'bg-warning-50 text-warning-600';
    }
  }

  onImgError(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return; // anti-loop
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  // ── Edición de cotización ─────────────────────────────────

  /**
   * Editar = rehacer el pedido desde el carrito.
   *
   * En vez de un modal aparte, los productos de la cotización vuelven al
   * carrito y el cliente recorre otra vez el flujo normal (Carro → Entrega →
   * Pago), donde puede moverse entre pasos y cambiar lo que necesite. La
   * cotización original se elimina: al terminar se genera una nueva.
   */
  abrirEdicion(cotizacion: Cotizacion): void {
    // La ventana de edición se cierra cuando un vendedor toma el pedido; el
    // backend también lo rechaza, pero así se avisa antes.
    if (!cotizacion.editable) {
      Swal.fire({
        title: 'Ya no se puede editar',
        text: 'Un vendedor ya está atendiendo tu pedido, así que la cotización quedó cerrada.',
        icon: 'info',
        confirmButtonColor: '#0dcaf0'
      });
      return;
    }

    const productos = (cotizacion.productos || []).filter(p => p.producto_id != null);

    if (!productos.length) {
      Swal.fire({
        title: 'No se puede editar',
        text: 'Esta cotización no tiene productos que se puedan devolver al carrito.',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    Swal.fire({
      title: '¿Editar esta cotización?',
      html: `
        <div class="text-start">
          <p>Los productos de <strong>${cotizacion.codigo_cotizacion}</strong> vuelven a tu carrito para que rehagas el pedido.</p>
          <p class="text-warning mt-3">
            <i class="ph ph-warning-circle"></i>
            Se reemplaza lo que tengas ahora en el carrito y la cotización actual se elimina.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, editar',
      cancelButtonText: 'Cancelar'
    }).then(resultado => {
      if (resultado.isConfirmed) {
        this.devolverAlCarrito(cotizacion, productos);
      }
    });
  }

  /**
   * Deja el carrito con los productos de la cotización y lleva al cliente al
   * primer paso.
   */
  private devolverAlCarrito(cotizacion: Cotizacion, productos: any[]): void {
    // Lo que ya había cargado el cliente (observaciones, dirección y los
    // montos por método de pago) viaja al checkout para no volver a pedirlo.
    sessionStorage.setItem('cotizacion_editando', JSON.stringify({
      observaciones: cotizacion.observaciones || '',
      direccion_envio: cotizacion.direccion_envio || '',
      metodo_pago_preferido: cotizacion.metodo_pago_preferido || '',
      metodos_pago: cotizacion.metodos_pago || [],
    }));

    Swal.fire({
      title: 'Preparando tu carrito...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Primero se borra la cotización: si eso falla, el carrito queda intacto y
    // el cliente no pierde nada.
    this.cotizacionesService.eliminarCotizacion(cotizacion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cartService.clearCart()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => this.agregarProductosAlCarrito(productos),
              error: () => this.agregarProductosAlCarrito(productos)
            });
        },
        error: () => {
          Swal.fire({
            title: 'No se pudo editar',
            text: 'No fue posible liberar la cotización. Intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      });
  }

  private agregarProductosAlCarrito(productos: any[]): void {
    const pendientes = productos.map(p =>
      this.cartService.addToCart({ id: p.producto_id }, p.cantidad)
    );

    forkJoin(pendientes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.close();
          this.router.navigate(['/cart']);
        },
        error: () => {
          Swal.fire({
            title: 'Carrito incompleto',
            text: 'Algunos productos no se pudieron agregar. Revisa tu carrito antes de continuar.',
            icon: 'warning',
            confirmButtonColor: '#ffc107'
          }).then(() => this.router.navigate(['/cart']));
        }
      });
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
        moneda: producto.moneda ?? this.cotizacionEnEdicion?.moneda ?? 's',
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