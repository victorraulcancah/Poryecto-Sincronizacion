import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../services/pedidos.service';
import { ProductosService } from '../../../services/productos.service';
import { ReniecService } from '../../../services/reniec.service';
import { MonedaPipe } from '../../../pipes/moneda.pipe';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MonedaPipe],
  templateUrl: "./pedidos-list.component.html",
  styleUrl: "./pedidos-list.component.scss"
})
export class PedidosListComponent implements OnInit {
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  pedidoSeleccionado: any | null = null;

  terminoBusqueda: string = '';
  filtroEstado: string = '';

  estadosDisponibles: any[] = [];
  estadoSeleccionado: number | null = null;
  comentarioEstado: string = '';
  cambiandoEstado: boolean = false;
  loading = false;

  pageSize = 10;
  currentPage = 1;

  Math = Math;

  // ── Notificaciones de pedidos generados desde cotización ──
  pedidosDesdeCotizacion: any[] = [];
  notificacionesNoVistas = 0;
  mostrarNotificaciones = false;
  private readonly SEEN_KEY = 'pedidos_cotizacion_vistos';

  // ── Crear pedido ──────────────────────────────────────────
  creandoPedido = false;
  nuevoPedido: { cliente_nombre: string; cliente_email: string; telefono_contacto: string; numero_documento: string; metodo_pago: string; forma_envio: string; direccion_envio: string; costo_envio: number; observaciones: string; moneda?: string } = {
    cliente_nombre: '',
    cliente_email: '',
    telefono_contacto: '',
    numero_documento: '',
    metodo_pago: 'efectivo',
    forma_envio: 'delivery',
    direccion_envio: '',
    costo_envio: 0,
    observaciones: '',
    moneda: 's',
  };
  productosDelNuevoPedido: { producto: any; cantidad: number; precio_unitario: number }[] = [];
  terminoBusquedaProducto: string = '';
  productosSugeridos: any[] = [];
  buscandoProducto = false;
  subtotalNuevoPedido = 0;
  igvNuevoPedido = 0;
  totalNuevoPedido = 0;
  buscandoDocumento = false;
  activeTabCrear: 'cliente' | 'envio' | 'productos' = 'cliente';
  activeTabDetalle: 'general' | 'productos' | 'envio' | 'pago' | 'estado' = 'general';
  pdfPreviewUrl: SafeResourceUrl | null = null;
  loadingPdf: boolean = false;

  constructor(
    private pedidosService: PedidosService,
    private productosService: ProductosService,
    private reniecService: ReniecService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarPedidos();
  }

  /**
   * Abre "Nueva Venta" en el ERP 7Power con el cliente y los productos de
   * este pedido precargados (por código), para que el vendedor solo revise
   * y complete la venta manualmente — no crea ni guarda nada automáticamente.
   */
  puedeEnviarAErp(pedido: any): boolean {
    return !!pedido?.user_cliente?.codigo_erp;
  }

  /**
   * Abre "Nueva Venta" del ERP con los productos de UNA moneda.
   *
   * Una venta de 7Power maneja una sola moneda, así que un pedido mixto se
   * gestiona como dos ventas: se pulsa el botón de cada moneda. En el
   * e-commerce sigue siendo un único pedido.
   */
  enviarAErp(pedido: any, moneda?: string): void {
    const codigoCliente = pedido?.user_cliente?.codigo_erp;
    if (!codigoCliente) {
      Swal.fire({
        title: 'Cliente no vinculado al ERP',
        text: 'Este cliente no tiene un código de cliente 7Power (codigo_erp) asignado.',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    const productos = moneda
      ? this.productosDeMoneda(pedido, moneda)
      : (pedido.detalles || []);

    // Formato CODIGO:CANTIDAD. Antes se mandaba solo el código y el ERP cargaba
    // una unidad de cada uno, así que un pedido de 2 unidades entraba por la
    // mitad del importe.
    const codigosProductos = productos
      .filter((d: any) => d.codigo_producto)
      .map((d: any) => `${d.codigo_producto}:${Number(d.cantidad) || 1}`)
      .join(',');

    const params = new URLSearchParams({ codigo_cliente: codigoCliente });
    if (codigosProductos) params.set('productos', codigosProductos);
    // Lista de precio del ERP que corresponde a la moneda del pedido. Sin
    // esto, Nueva Venta abre con la lista del cliente (soles) y los productos
    // cotizados en dólares se cargan en 0.
    if (pedido?.lista_precio_erp) params.set('lista_precio', String(pedido.lista_precio_erp));

    window.open(`${environment.erpFrontUrl}?${params.toString()}`, '_blank');
  }

  /**
   * Alterna entre la bandeja (pendientes + atendidos hoy) y el historial
   * completo. Los pedidos atendidos en días anteriores no se borran: solo
   * salen de la bandeja al cierre del día.
   */
  verHistorial = false;

  alternarHistorial(): void {
    this.verHistorial = !this.verHistorial;
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.loading = true;
    this.pedidosService.getPedidos(this.verHistorial).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.pedidos = response.pedidos || [];
          this.aplicarFiltros();
          this.calcularNotificaciones();
        } else {
          this.pedidos = [];
          this.pedidosFiltrados = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        this.pedidos = [];
        this.pedidosFiltrados = [];
        this.loading = false;
      }
    });
  }

  // ── Notificaciones ────────────────────────────────────────

  private getVistos(): number[] {
    try {
      return JSON.parse(localStorage.getItem(this.SEEN_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private idsNoVistosSesion = new Set<number>();

  calcularNotificaciones(): void {
    const vistos = this.getVistos();
    this.pedidosDesdeCotizacion = this.pedidos
      // Los pedidos viejos no tienen `cotizacion_id`: se reconocen por la
      // referencia que antes se guardaba en las observaciones.
      .filter(p => !!p.cotizacion_id || !!p.observaciones?.includes('Generado desde cotización'))
      .sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime());

    this.idsNoVistosSesion = new Set(
      this.pedidosDesdeCotizacion.filter(p => !vistos.includes(p.id)).map(p => p.id)
    );
    this.notificacionesNoVistas = this.idsNoVistosSesion.size;
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones && this.notificacionesNoVistas > 0) {
      const ids = this.pedidosDesdeCotizacion.map(p => p.id);
      localStorage.setItem(this.SEEN_KEY, JSON.stringify(ids));
      this.notificacionesNoVistas = 0;
    }
  }

  esNoVisto(pedido: any): boolean {
    return this.idsNoVistosSesion.has(pedido.id);
  }

  abrirPedidoDesdeNotificacion(pedido: any): void {
    this.mostrarNotificaciones = false;
    this.verDetalle(pedido);
  }

  aplicarFiltros(): void {
    let resultado = [...this.pedidos];

    if (this.terminoBusqueda) {
      const term = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.codigo_pedido?.toLowerCase().includes(term) ||
        p.cliente_nombre?.toLowerCase().includes(term) ||
        p.cliente_email?.toLowerCase().includes(term)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(p =>
        p.estado_pedido?.nombre_estado?.toLowerCase().includes(this.filtroEstado.toLowerCase())
      );
    }

    this.pedidosFiltrados = resultado;
    this.currentPage = 1;
  }

  /**
   * Moneda que se está viendo en el detalle. Un pedido puede tener productos
   * en soles y en dólares; en vez de partirlo en dos registros, el detalle
   * muestra una moneda por vez.
   */
  monedaDetalle = 's';

  verDetalle(pedido: any): void {
    this.pedidoSeleccionado = pedido;
    this.activeTabDetalle = 'general';
    // Los estados disponibles dependen del pedido: se recargan al abrir la
    // pestaña de estado.
    this.resetFormEstado();
    // Se abre en la primera moneda del pedido (soles si tiene).
    this.monedaDetalle = this.monedasDelPedido(pedido)[0] || 's';
    const modal = document.getElementById('detallePedidoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  contactarWhatsApp(pedido: any): void {
    // El mismo número que muestra el bloque: el del cliente vinculado.
    const telefono = this.telefonoCliente(pedido);
    const codigo = pedido.codigo_pedido;
    const cliente = this.nombreCliente(pedido);
    const total = pedido.total;
    const mensaje = `Hola ${cliente}, te contactamos respecto a tu pedido ${codigo} por S/ ${total}. ¿En qué podemos ayudarte?`;
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  // ────────────────────────── Detalle de pago por moneda ──────────────────────
  //
  // Un pedido puede tener productos en soles y en dólares a la vez. La cabecera
  // guarda un solo subtotal/igv/total —que suma las dos monedas y por eso no
  // significa nada—, así que el desglose se recalcula desde las líneas, que sí
  // llevan su moneda.

  /** Monedas presentes en el pedido, soles primero. */
  monedasDelPedido(pedido: any): string[] {
    const detalles = pedido?.detalles || [];
    const pagos = pedido?.metodos_pago || [];

    const monedas = new Set<string>([
      ...detalles.map((d: any) => d.moneda || 's'),
      ...pagos.map((m: any) => m.moneda || 's'),
    ]);

    const presentes = ['s', 'd'].filter(m => monedas.has(m));

    // Un pedido sin líneas ni pagos (creado a mano desde el panel) se trata
    // como de una sola moneda, la suya, para no dejar la fila sin importe.
    return presentes.length ? presentes : [pedido?.moneda || 's'];
  }

  /** El pedido mezcla monedas, así que el detalle necesita el selector. */
  tieneVariasMonedas(pedido: any): boolean {
    return this.monedasDelPedido(pedido).length > 1;
  }

  /** Productos de una moneda. */
  productosDeMoneda(pedido: any, moneda: string): any[] {
    return (pedido?.detalles || []).filter((d: any) => (d.moneda || 's') === moneda);
  }

  /** Métodos de pago de una moneda. */
  pagosDeMoneda(pedido: any, moneda: string): any[] {
    return (pedido?.metodos_pago || []).filter((m: any) => (m.moneda || 's') === moneda);
  }

  /** Lo pagado en una moneda. */
  totalPagadoEnMoneda(pedido: any, moneda: string): number {
    return this.pagosDeMoneda(pedido, moneda)
      .reduce((suma: number, m: any) => suma + (Number(m.monto) || 0), 0);
  }

  /**
   * Total de los productos de una moneda. El envío se cobra en soles, así que
   * solo entra en ese bloque.
   */
  totalDeMoneda(pedido: any, moneda: string): number {
    const productos = (pedido?.detalles || [])
      .filter((d: any) => (d.moneda || 's') === moneda)
      .reduce((suma: number, d: any) => suma + (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0), 0);

    return moneda === 's' ? productos + (Number(pedido?.costo_envio) || 0) : productos;
  }

  /** Base sin IGV: los precios ya lo incluyen. */
  subtotalDeMoneda(pedido: any, moneda: string): number {
    return this.totalDeMoneda(pedido, moneda) / 1.18;
  }

  igvDeMoneda(pedido: any, moneda: string): number {
    return this.totalDeMoneda(pedido, moneda) - this.subtotalDeMoneda(pedido, moneda);
  }

  nombreMoneda(moneda: string): string {
    return moneda === 'd' ? 'Dólares' : 'Soles';
  }

  /**
   * Nombre del titular del pedido: el del cliente de 7Power si la cuenta está
   * vinculada, porque es a nombre de quién se emite el comprobante. Si no, el
   * que se registró en el pedido o el de la cuenta del e-commerce.
   */
  /**
   * Teléfono del titular: el del cliente de 7Power si la cuenta está vinculada,
   * igual que el resto del bloque "Datos del Cliente". Si el ERP no lo tiene
   * cargado, se cae al que se dejó en el pedido.
   */
  telefonoCliente(pedido: any): string {
    return pedido?.cliente_erp?.telefono || pedido?.telefono_contacto || '';
  }

  nombreCliente(pedido: any): string {
    if (!pedido) return '';

    const apellidos = pedido.user_cliente?.apellidos || '';
    const deLaCuenta = `${pedido.user_cliente?.nombres || ''} ${apellidos}`.trim();

    return pedido.cliente_erp?.nombre || pedido.cliente_nombre || deLaCuenta;
  }

  /**
   * Pestaña de cambio de estado dentro del propio detalle: antes había que
   * cerrar el detalle para abrir otro modal.
   */
  abrirTabEstado(): void {
    this.activeTabDetalle = 'estado';

    if (this.pedidoSeleccionado && !this.estadosDisponibles.length) {
      this.loadEstadosDisponibles(this.pedidoSeleccionado.id);
    }
  }

  cambiarEstado(pedido: any): void {
    this.pedidoSeleccionado = pedido;
    this.loadEstadosDisponibles(pedido.id);
    const modal = document.getElementById('cambiarEstadoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  imprimirPedido(): void {
    if (!this.pedidoSeleccionado) return;
    
    this.loadingPdf = true;
    this.pdfPreviewUrl = null;

    this.pedidosService.generarPDF(this.pedidoSeleccionado.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        // Añadir parámetros para el visor (ocultando panel de navegación/miniaturas)
        this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#toolbar=1&navpanes=0&scrollbar=1&view=FitH&pagemode=none');
        this.loadingPdf = false;
        this.loadingPdf = false;
        
        // Abrir el modal de vista previa
        const modal = document.getElementById('previewPdfModal');
        if (modal) {
          const bootstrapModal = new (window as any).bootstrap.Modal(modal);
          bootstrapModal.show();
        }
      },
      error: (error) => {
        console.error('Error al generar PDF para vista previa:', error);
        this.loadingPdf = false;
        Swal.fire('Error', 'No se pudo generar la vista previa del PDF', 'error');
      }
    });
  }

  descargarPdfActual(): void {
    if (!this.pedidoSeleccionado) return;
    this.pedidosService.descargarPDF(this.pedidoSeleccionado.id, `Pedido_${this.pedidoSeleccionado.codigo_pedido}.pdf`);
  }

  imprimirIframe(): void {
    const iframe = document.querySelector('#previewPdfModal iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary-50 text-secondary-600';
    switch (estado.toLowerCase()) {
      case 'nuevo':            return 'bg-secondary-50 text-secondary-600';
      case 'pendiente':        return 'bg-warning-50 text-warning-600';
      case 'confirmado':       return 'bg-primary-50 text-primary-600';
      case 'pagado':           return 'bg-success-50 text-success-600';
      case 'en preparación':
      case 'en preparacion':   return 'bg-info-50 text-info-600';
      case 'en recepción':
      case 'en recepcion':     return 'bg-warning-100 text-warning-700';
      case 'en camino':
      case 'enviado':          return 'bg-primary-100 text-primary-700';
      case 'enviado a provincia': return 'bg-tertiary-50 text-tertiary-600';
      case 'entregado':        return 'bg-success-50 text-success-600';
      case 'sin stock':        return 'bg-warning-100 text-warning-700';
      case 'cancelado':        return 'bg-danger-50 text-danger-600';
      case 'devuelto':         return 'bg-danger-50 text-danger-600';
      default:                 return 'bg-secondary-50 text-secondary-600';
    }
  }

  getStatusIcon(estado: string | undefined): string {
    if (!estado) return 'ph ph-question';
    switch (estado.toLowerCase()) {
      case 'nuevo':            return 'ph ph-star';
      case 'pendiente':        return 'ph ph-clock';
      case 'confirmado':       return 'ph ph-check-circle';
      case 'pagado':           return 'ph ph-money';
      case 'en preparación':
      case 'en preparacion':   return 'ph ph-package';
      case 'en recepción':
      case 'en recepcion':     return 'ph ph-tray';
      case 'en camino':
      case 'enviado':          return 'ph ph-truck';
      case 'enviado a provincia': return 'ph ph-airplane';
      case 'entregado':        return 'ph ph-house';
      case 'sin stock':        return 'ph ph-warning';
      case 'cancelado':        return 'ph ph-x-circle';
      case 'devuelto':         return 'ph ph-arrows-left-right';
      default:                 return 'ph ph-tag';
    }
  }

  seleccionarEstado(id: number): void {
    this.estadoSeleccionado = id;
  }

  formatMetodoPago(metodo: string | null | undefined): string {
    if (!metodo) return 'No especificado';
    switch (metodo.toLowerCase()) {
      case 'efectivo':       return 'Efectivo';
      case 'tarjeta':        return 'Tarjeta de crédito/débito';
      case 'transferencia':  return 'Transferencia bancaria';
      case 'yape':           return 'Yape';
      case 'plin':           return 'Plin';
      default: return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
  }

  formatFormaEnvio(forma: string | null | undefined): string {
    if (!forma) return 'No especificada';
    switch (forma.toLowerCase()) {
      case 'delivery':         return 'Delivery';
      case 'recojo_tienda':    return 'Recojo en tienda';
      case 'envio_provincia':  return 'Envío a provincia';
      default: return forma.replace(/_/g, ' ').charAt(0).toUpperCase() + forma.slice(1);
    }
  }

  loadEstadosDisponibles(pedidoId: number): void {
    this.pedidosService.getEstados(pedidoId).subscribe({
      next: (response: any) => {
        this.estadosDisponibles = response.estados || response;
      },
      error: (error) => {
        console.error('Error cargando estados:', error);
      }
    });
  }

  confirmarCambioEstado(): void {
    if (!this.pedidoSeleccionado || !this.estadoSeleccionado) return;

    this.cambiandoEstado = true;

    this.pedidosService.cambiarEstado(this.pedidoSeleccionado.id, {
      estado_pedido_id: this.estadoSeleccionado,
      comentario: this.comentarioEstado
    }).subscribe({
      next: (response) => {
        const idx = this.pedidos.findIndex((p: any) => p.id === this.pedidoSeleccionado!.id);
        if (idx !== -1 && response.pedido) {
          this.pedidos[idx] = { ...this.pedidos[idx], ...response.pedido };
          this.aplicarFiltros();
        }

        // El cambio se puede hacer desde el modal aparte o desde la pestaña
        // del detalle: se cierra el que esté abierto.
        ['cambiarEstadoModal', 'detallePedidoModal'].forEach(id => {
          const modal = document.getElementById(id);
          if (modal) {
            (window as any).bootstrap.Modal.getInstance(modal)?.hide();
          }
        });

        this.resetFormEstado();

        Swal.fire({
          title: '¡Éxito!',
          text: 'Estado del pedido actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        }).then(() => this.cargarPedidos());
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'Error al cambiar estado del pedido',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
        this.cambiandoEstado = false;
      },
      complete: () => {
        this.cambiandoEstado = false;
      }
    });
  }

  resetFormEstado(): void {
    this.estadoSeleccionado = null;
    this.comentarioEstado = '';
    this.estadosDisponibles = [];
    this.cambiandoEstado = false;
  }

  esEnvioAProvincia(pedido: any): boolean {
    return pedido.forma_envio === 'envio_provincia';
  }

  getEstadisticaEstado(estadoBuscado: string): number {
    if (!this.pedidos || this.pedidos.length === 0) return 0;
    return this.pedidos.filter((p: any) => {
      const nombre = p.estado_pedido?.nombre_estado?.toLowerCase() || '';
      return nombre.includes(estadoBuscado.toLowerCase());
    }).length;
  }

  getPaginatedPedidos(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.pedidosFiltrados.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.pedidosFiltrados.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }

    return pages;
  }

  trackByPedidoId(_index: number, pedido: any): number {
    return pedido.id;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // ── Crear pedido ──────────────────────────────────────────

  consultarDocumento(): void {
    const doc = this.nuevoPedido.numero_documento.trim();
    if (doc.length !== 8 && doc.length !== 11) {
      Swal.fire('Documento inválido', 'Ingresa un DNI (8 dígitos) o RUC (11 dígitos).', 'warning');
      return;
    }

    this.buscandoDocumento = true;
    this.reniecService.buscarPorDni(doc).subscribe({
      next: (res) => {
        this.buscandoDocumento = false;
        if (!res.success) {
          Swal.fire('No encontrado', res.message || 'No se encontraron datos para ese documento.', 'warning');
          return;
        }

        if (doc.length === 8) {
          // DNI → armar nombre completo
          const nombre = [res.nombres, res.apellidoPaterno, res.apellidoMaterno]
            .filter(Boolean).join(' ');
          this.nuevoPedido.cliente_nombre = nombre;
        } else {
          // RUC → razón social + dirección
          this.nuevoPedido.cliente_nombre = res.razonSocial || res.nombre || '';
          if (res.direccion) {
            this.nuevoPedido.direccion_envio = res.direccion;
          }
        }

        Swal.fire({
          icon: 'success',
          title: '¡Datos encontrados!',
          text: `Datos de ${this.nuevoPedido.cliente_nombre} cargados.`,
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: () => {
        this.buscandoDocumento = false;
        Swal.fire('Error', 'No se pudo conectar con el servicio. Ingresa los datos manualmente.', 'error');
      }
    });
  }

  abrirModalCrear(): void {
    this.resetFormCrear();
    this.activeTabCrear = 'cliente';
    const modal = document.getElementById('crearPedidoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  resetFormCrear(): void {
    this.activeTabCrear = 'cliente';
    this.nuevoPedido = {
      cliente_nombre: '',
      cliente_email: '',
      telefono_contacto: '',
      numero_documento: '',
      metodo_pago: 'efectivo',
      forma_envio: 'delivery',
      direccion_envio: '',
      costo_envio: 0,
      observaciones: '',
    };
    this.productosDelNuevoPedido = [];
    this.terminoBusquedaProducto = '';
    this.productosSugeridos = [];
    this.recalcularTotales();
  }

  buscarProducto(): void {
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

  agregarProducto(producto: any): void {
    const existe = this.productosDelNuevoPedido.find(p => p.producto.id === producto.id);
    if (existe) {
      existe.cantidad++;
    } else {
      this.productosDelNuevoPedido.push({
        producto,
        cantidad: 1,
        precio_unitario: producto.precio_venta ?? 0,
      });
    }
    this.terminoBusquedaProducto = '';
    this.productosSugeridos = [];
    this.recalcularTotales();
  }

  quitarProducto(index: number): void {
    this.productosDelNuevoPedido.splice(index, 1);
    this.recalcularTotales();
  }

  recalcularTotales(): void {
    const subtotal = this.productosDelNuevoPedido.reduce(
      (acc, p) => acc + p.cantidad * p.precio_unitario, 0
    );
    const costo = Number(this.nuevoPedido.costo_envio) || 0;
    this.subtotalNuevoPedido = subtotal;
    this.igvNuevoPedido = subtotal * 0.18;
    this.totalNuevoPedido = subtotal + this.igvNuevoPedido + costo;
  }

  confirmarCrearPedido(): void {
    if (!this.nuevoPedido.cliente_nombre || !this.nuevoPedido.telefono_contacto ||
        !this.nuevoPedido.direccion_envio || this.productosDelNuevoPedido.length === 0) {
      Swal.fire('Datos incompletos', 'Completa los campos obligatorios y agrega al menos un producto.', 'warning');
      return;
    }

    this.creandoPedido = true;

    const payload = {
      ...this.nuevoPedido,
      productos: this.productosDelNuevoPedido.map(p => ({
        producto_id: p.producto.id,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      })),
    };

    this.pedidosService.crearPedido(payload).subscribe({
      next: (response) => {
        const modal = document.getElementById('crearPedidoModal');
        if (modal) {
          (window as any).bootstrap.Modal.getInstance(modal)?.hide();
        }
        this.creandoPedido = false;
        Swal.fire({
          title: '¡Pedido creado!',
          text: `Código: ${response.codigo_pedido}`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
        }).then(() => this.cargarPedidos());
      },
      error: (err) => {
        this.creandoPedido = false;
        const msg = err.error?.message || 'Error al crear el pedido';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}
