import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { CotizacionesService, Cotizacion } from '../../../services/cotizaciones.service';
import { CartService } from '../../../services/cart.service';
import { ProductosService, ProductoSugerencia } from '../../../services/productos.service';
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
    private router: Router
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

  /** Detalle de productos de la cotización, como el del pedido. */
  /** Cotización cuyo detalle de productos se está viendo. */
  cotizacionDetalle: Cotizacion | null = null;

  verProductosCotizacion(cotizacion: Cotizacion): void {
    this.activeTabDetalle = 'productos';
    this.cotizacionDetalle = cotizacion;
  }

  /**
   * Si la foto del producto no carga se cambia por el placeholder. La marca
   * `dataset` evita el bucle infinito si el placeholder tampoco existe.
   */
  onImagenProductoError(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  cerrarProductosCotizacion(): void {
    this.cotizacionDetalle = null;
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

  /**
   * El cliente cancela su cotización. No se borra nada: el pedido pasa a
   * "Cancelado", así el vendedor lo sigue viendo en su bandeja y la cotización
   * deja de ser editable.
   */
  cancelarCotizacion(cotizacion: Cotizacion): void {
    // Misma ventana que la edición: se cierra cuando el vendedor toma el
    // pedido. El backend también lo rechaza; esto evita abrir el diálogo.
    if (!cotizacion.editable) {
      Swal.fire({
        title: 'Ya no se puede cancelar',
        text: 'Un vendedor ya está atendiendo tu pedido, así que la cotización quedó cerrada.',
        icon: 'info',
        confirmButtonColor: '#0dcaf0'
      });
      return;
    }

    Swal.fire({
      title: '¿Cancelar cotización?',
      html: `
        <div class="text-start">
          <p><strong>Cotización:</strong> ${cotizacion.codigo_cotizacion}</p>
          <p><strong>Total:</strong> S/ ${cotizacion.total}</p>
          <p class="text-warning mt-3">
            <i class="ph ph-warning-circle"></i>
            La cotización quedará cancelada y ya no podrás editarla.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      reverseButtons: true
    }).then((result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Cancelando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });

      this.cotizacionesService.cancelarCotizacion(cotizacion.id).subscribe({
        next: () => {
          Swal.fire({
            title: 'Cotización cancelada',
            text: 'Tu cotización quedó cancelada.',
            icon: 'success',
            confirmButtonColor: '#198754'
          });
          this.cargarCotizaciones();
        },
        error: (error) => {
          console.error('Error cancelando cotización:', error);
          Swal.fire({
            title: 'Error',
            text: error.error?.message || 'No se pudo cancelar la cotización. Inténtalo de nuevo.',
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    });
  }

  /** Pestaña abierta en el modal de "Ver". */
  activeTabDetalle: 'productos' | 'envio' | 'pago' = 'productos';

  /** "Soles" / "Dólares", para encabezar el desglose. */
  nombreMoneda(moneda: string | null | undefined): string {
    return (moneda || 's') === 'd' ? 'Dólares' : 'Soles';
  }

  /** Nombre legible de la forma de envío guardada. */
  formatFormaEnvio(forma: string | null | undefined): string {
    if (!forma) return 'No especificada';
    switch (forma.toLowerCase()) {
      case 'delivery':        return 'Delivery';
      case 'recojo_tienda':   return 'Recojo en tienda';
      case 'envio_provincia': return 'Envío a provincia';
      default:
        return forma.replace(/_/g, ' ').charAt(0).toUpperCase() + forma.slice(1);
    }
  }

  /** Nombre legible del método de pago guardado. */
  formatMetodoPago(metodo: string | null | undefined): string {
    if (!metodo) return 'No especificado';
    switch (metodo.toLowerCase()) {
      case 'efectivo':      return 'Efectivo';
      case 'tarjeta':       return 'Tarjeta de crédito/débito';
      case 'transferencia': return 'Transferencia bancaria';
      case 'yape':          return 'Yape';
      case 'plin':          return 'Plin';
      default: return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
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