import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { MonedaPipe } from '../../../pipes/moneda.pipe';
import { FileDownloadService } from '../../../services/file-download.service';
import {
  EstadoProcesoPago,
  FiltroEstadoPago,
  PagoAdmin,
  PagosEnLineaAdminService,
  PagosEnLineaFiltros,
  PagosEnLineaPaginacion,
  PagosEnLineaResumen,
} from '../../../services/pagos-en-linea-admin.service';

/** Etapa de atención de una compra: cómo se llama, su ícono y su color. */
interface EtapaProceso {
  valor: EstadoProcesoPago;
  etiqueta: string;
  /** Texto del chip de resumen, que cuenta compras ("12 Facturadas"). */
  plural: string;
  icono: string;
  clase: string;
}

/** Peso máximo del PDF del comprobante (lo mismo que acepta el servidor). */
const MAX_BYTES_COMPROBANTE = 5 * 1024 * 1024;

/**
 * "Compras en línea": las compras hechas con la pasarela de pago.
 *
 * El flujo del negocio es manual: el personal ve la compra acá, la factura a
 * mano en el ERP 7Power (botón "Enviar a ERP"), sube el PDF del comprobante que
 * emitió allá para enviárselo al cliente y lo llama para coordinar el delivery.
 * Esta pantalla solo muestra la compra, guarda/envía ese PDF y deja constancia
 * del seguimiento; no genera comprobantes, no factura ni toca el stock.
 */
@Component({
  selector: 'app-compras-en-linea',
  standalone: true,
  imports: [CommonModule, FormsModule, MonedaPipe],
  templateUrl: './compras-en-linea.component.html',
  styleUrl: './compras-en-linea.component.scss',
})
export class ComprasEnLineaComponent implements OnInit, OnDestroy {
  /** Etapas de la atención manual, en el orden en que ocurren. */
  readonly etapas: EtapaProceso[] = [
    { valor: 'pendiente_facturar', etiqueta: 'Pendiente de facturar', plural: 'Pendientes de facturar', icono: 'ph ph-clock', clase: 'bg-warning-50 text-warning-600' },
    { valor: 'facturado', etiqueta: 'Facturado', plural: 'Facturadas', icono: 'ph ph-receipt', clase: 'bg-primary-50 text-primary-600' },
    { valor: 'en_delivery', etiqueta: 'En delivery', plural: 'En delivery', icono: 'ph ph-truck', clase: 'bg-info-50 text-info-600' },
    { valor: 'entregado', etiqueta: 'Entregado', plural: 'Entregadas', icono: 'ph ph-house', clase: 'bg-success-50 text-success-600' },
    { valor: 'cancelado', etiqueta: 'Cancelado', plural: 'Canceladas', icono: 'ph ph-x-circle', clase: 'bg-danger-50 text-danger-600' },
  ];

  /** Las que se muestran como chips de resumen arriba del listado. */
  readonly etapasResumen = this.etapas.filter((e) => e.valor !== 'cancelado');

  // ── Listado ────────────────────────────────────────────────────────────
  pagos: PagoAdmin[] = [];
  paginacion: PagosEnLineaPaginacion = { current_page: 1, last_page: 1, per_page: 20, total: 0 };
  resumen: PagosEnLineaResumen = {
    pendiente_facturar: 0,
    facturado: 0,
    en_delivery: 0,
    entregado: 0,
    cancelado: 0,
  };
  loading = false;
  errorCarga = false;

  // ── Filtros ────────────────────────────────────────────────────────────
  terminoBusqueda = '';
  filtroEstado: FiltroEstadoPago = 'pagado';
  filtroEtapa: EstadoProcesoPago | '' = '';
  pagina = 1;
  porPagina = 20;

  // ── Detalle ────────────────────────────────────────────────────────────
  pagoSeleccionado: PagoAdmin | null = null;
  reenviando = false;

  // ── Seguimiento (formulario del detalle) ───────────────────────────────
  seguimiento: { estado_proceso: EstadoProcesoPago; comprobante_erp: string; notas_internas: string } = {
    estado_proceso: 'pendiente_facturar',
    comprobante_erp: '',
    notas_internas: '',
  };
  guardandoSeguimiento = false;

  // ── Comprobante para el cliente (PDF emitido en el ERP) ────────────────
  readonly maxMbComprobante = MAX_BYTES_COMPROBANTE / (1024 * 1024);
  archivoComprobante: File | null = null;
  errorArchivoComprobante = '';
  mensajeComprobante = '';
  numeroComprobante = '';
  enviandoComprobante = false;
  reenviandoComprobante = false;
  abriendoComprobante = false;

  @ViewChild('inputArchivoComprobante') private inputArchivo?: ElementRef<HTMLInputElement>;

  /** Cada valor emitido pide el listado; el booleano indica si se muestra el cargando. */
  private recarga$ = new Subject<boolean>();
  private busqueda$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private pagosService: PagosEnLineaAdminService,
    private fileDownload: FileDownloadService
  ) {}

  ngOnInit(): void {
    // `switchMap` descarta la respuesta de una petición vieja si ya salió otra:
    // al cambiar rápido de filtro no pisa a la más reciente.
    this.recarga$
      .pipe(
        tap((mostrarCarga) => {
          if (mostrarCarga) this.loading = true;
          this.errorCarga = false;
        }),
        switchMap(() =>
          this.pagosService.listar(this.filtrosActuales()).pipe(
            catchError((error) => {
              console.error('Error cargando compras en línea:', error);
              this.errorCarga = true;
              return of(null);
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((respuesta) => {
        this.loading = false;

        if (!respuesta || respuesta.status !== 'success') {
          this.pagos = [];
          return;
        }

        this.pagos = (respuesta.pagos || []).map((p) => this.normalizar(p));
        this.paginacion = respuesta.pagination || this.paginacion;
        this.resumen = { ...this.resumen, ...(respuesta.resumen || {}) };

        // La página que se pidió ya no existe (p. ej. al atender la última
        // compra de la última página): se vuelve a la última que queda.
        if (this.pagos.length === 0 && this.pagina > 1 && this.pagina > this.paginacion.last_page) {
          this.pagina = Math.max(1, this.paginacion.last_page);
          this.cargar();
        }
      });

    // La búsqueda espera a que termine de escribir antes de ir al servidor.
    this.busqueda$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pagina = 1;
        this.cargar();
      });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.bloquearScroll(false);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Listado y filtros
  // ────────────────────────────────────────────────────────────────────────

  private filtrosActuales(): PagosEnLineaFiltros {
    return {
      search: this.terminoBusqueda,
      estado: this.filtroEstado,
      estado_proceso: this.filtroEtapa,
      page: this.pagina,
      per_page: this.porPagina,
    };
  }

  cargar(mostrarCarga = true): void {
    this.recarga$.next(mostrarCarga);
  }

  onBuscar(): void {
    this.busqueda$.next();
  }

  /** Pagadas / Rechazadas / Todas. Las etapas solo existen para las pagadas. */
  onCambiarEstado(): void {
    if (this.filtroEstado !== 'pagado') {
      this.filtroEtapa = '';
    }
    this.pagina = 1;
    this.cargar();
  }

  /** Elegir una etapa implica compras pagadas: las rechazadas no se atienden. */
  onCambiarEtapa(): void {
    if (this.filtroEtapa) {
      this.filtroEstado = 'pagado';
    }
    this.pagina = 1;
    this.cargar();
  }

  /** Un chip del resumen: filtra por esa etapa, y al pulsarlo otra vez la quita. */
  alternarEtapa(valor: EstadoProcesoPago): void {
    this.filtroEtapa = this.filtroEtapa === valor ? '' : valor;
    this.onCambiarEtapa();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'pagado';
    this.filtroEtapa = '';
    this.pagina = 1;
    this.cargar();
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.terminoBusqueda.trim() || this.filtroEtapa || this.filtroEstado !== 'pagado');
  }

  onCambiarPorPagina(): void {
    this.porPagina = Number(this.porPagina);
    this.pagina = 1;
    this.cargar();
  }

  // ── Paginación ─────────────────────────────────────────────────────────

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.paginacion.last_page || pagina === this.pagina) return;
    this.pagina = pagina;
    this.cargar();
  }

  get numerosDePagina(): number[] {
    const total = this.paginacion.last_page;
    const maxVisibles = 5;
    const paginas: number[] = [];

    if (total <= maxVisibles) {
      for (let i = 1; i <= total; i++) paginas.push(i);
      return paginas;
    }

    let inicio = Math.max(1, this.pagina - Math.floor(maxVisibles / 2));
    const fin = Math.min(total, inicio + maxVisibles - 1);
    if (fin - inicio < maxVisibles - 1) inicio = Math.max(1, fin - maxVisibles + 1);
    for (let i = inicio; i <= fin; i++) paginas.push(i);

    return paginas;
  }

  get desdeRegistro(): number {
    return this.paginacion.total === 0 ? 0 : (this.paginacion.current_page - 1) * this.paginacion.per_page + 1;
  }

  get hastaRegistro(): number {
    return Math.min(this.paginacion.current_page * this.paginacion.per_page, this.paginacion.total);
  }

  trackByPagoId(_indice: number, pago: PagoAdmin): number {
    return pago.id;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Presentación
  // ────────────────────────────────────────────────────────────────────────

  etapaDe(valor: string | null | undefined): EtapaProceso | undefined {
    return this.etapas.find((e) => e.valor === valor);
  }

  etiquetaEtapa(valor: string | null | undefined): string {
    return this.etapaDe(valor)?.etiqueta || 'Sin estado';
  }

  claseEtapa(valor: string | null | undefined): string {
    return this.etapaDe(valor)?.clase || 'bg-secondary-50 text-secondary-600';
  }

  iconoEtapa(valor: string | null | undefined): string {
    return this.etapaDe(valor)?.icono || 'ph ph-tag';
  }

  getInitials(nombre: string | null | undefined): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).map((n) => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  esRechazada(pago: PagoAdmin | null): boolean {
    return pago?.estado === 'rechazado';
  }

  /** Distrito, provincia y departamento en una sola línea. */
  ubicacion(pago: PagoAdmin | null): string {
    if (!pago) return '';
    return [pago.distrito_nombre, pago.provincia_nombre, pago.departamento_nombre].filter(Boolean).join(', ');
  }

  /** El envío se coordina por teléfono: sin importe cargado se muestra "Por coordinar". */
  tieneCostoEnvio(pago: PagoAdmin | null): boolean {
    return (Number(pago?.costo_envio) || 0) > 0;
  }

  tieneDescuento(pago: PagoAdmin | null): boolean {
    return (Number(pago?.descuento) || 0) > 0;
  }

  /** Imagen rota: se cambia por el placeholder una sola vez para no entrar en bucle. */
  onImagenProductoError(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  // ────────────────────────────────────────────────────────────────────────
  // Detalle
  // ────────────────────────────────────────────────────────────────────────

  verDetalle(pago: PagoAdmin): void {
    this.pagoSeleccionado = pago;
    this.cargarFormularioSeguimiento(pago);
    this.reiniciarFormularioComprobante(pago);
    this.bloquearScroll(true);
  }

  cerrarDetalle(): void {
    this.pagoSeleccionado = null;
    this.bloquearScroll(false);
  }

  /**
   * Un clic en el fondo oscuro cierra el detalle, pero solo si también empezó
   * ahí: así no se cierra al soltar el mouse fuera tras seleccionar un texto.
   */
  private mousedownEnFondo = false;

  onMousedownFondo(evento: MouseEvent): void {
    this.mousedownEnFondo = evento.target === evento.currentTarget;
  }

  onClickFondo(evento: MouseEvent): void {
    if (this.mousedownEnFondo && evento.target === evento.currentTarget) {
      this.cerrarDetalle();
    }
    this.mousedownEnFondo = false;
  }

  /** Escape cierra el detalle, salvo que haya un aviso de SweetAlert abierto (ese lo cierra solo). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pagoSeleccionado && !Swal.isVisible()) {
      this.cerrarDetalle();
    }
  }

  /** Con el detalle abierto, la página de atrás no debe moverse. */
  private bloquearScroll(bloquear: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('modal-open', bloquear);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Confirmación de la compra por correo
  // ────────────────────────────────────────────────────────────────────────

  /** Reemplaza la compra en el listado y en el detalle por la que devolvió el servidor. */
  private aplicarPago(recibido: PagoAdmin | null | undefined): void {
    if (!recibido) return;

    const actualizado = this.normalizar(recibido);
    const indice = this.pagos.findIndex((p) => p.id === actualizado.id);
    if (indice !== -1) this.pagos[indice] = actualizado;

    if (this.pagoSeleccionado?.id === actualizado.id) {
      this.pagoSeleccionado = actualizado;
    }
  }

  /** Las líneas siempre son una lista, aunque el servidor mande `null`. */
  private normalizar(pago: PagoAdmin): PagoAdmin {
    return { ...pago, items: Array.isArray(pago.items) ? pago.items : [] };
  }

  reenviarCorreo(): void {
    const pago = this.pagoSeleccionado;
    if (!pago || this.reenviando) return;

    Swal.fire({
      title: '¿Reenviar la confirmación?',
      html: `Se enviará de nuevo al cliente el correo de confirmación de su compra a <strong>${this.escapar(pago.cliente_email)}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#198754',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.reenviando = true;
      this.pagosService.reenviar(pago.id).subscribe({
        next: (respuesta) => {
          this.reenviando = false;
          this.marcarCorreoEnviado(pago.id);
          Swal.fire({
            title: 'Confirmación enviada',
            text: respuesta?.message || `Confirmación enviada a ${pago.cliente_email}.`,
            icon: 'success',
            confirmButtonColor: '#198754',
          });
        },
        error: (error) => {
          this.reenviando = false;
          Swal.fire({
            title: 'No se pudo enviar',
            text: error?.error?.message || 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.',
            icon: 'error',
            confirmButtonColor: '#dc3545',
          });
        },
      });
    });
  }

  /** El servidor ya registró el envío: se refleja sin esperar a recargar el listado. */
  private marcarCorreoEnviado(id: number): void {
    const ahora = new Date().toISOString();
    if (this.pagoSeleccionado?.id === id) this.pagoSeleccionado.email_enviado_at = ahora;
    const enLista = this.pagos.find((p) => p.id === id);
    if (enLista) enLista.email_enviado_at = ahora;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Comprobante para el cliente (PDF emitido en el ERP)
  // ────────────────────────────────────────────────────────────────────────

  /** Deja el formulario de envío como nuevo; el N° del ERP arranca con el ya guardado. */
  private reiniciarFormularioComprobante(pago: PagoAdmin | null): void {
    this.archivoComprobante = null;
    this.errorArchivoComprobante = '';
    this.mensajeComprobante = '';
    this.numeroComprobante = pago?.comprobante_erp || '';
    this.enviandoComprobante = false;
    this.reenviandoComprobante = false;
    this.abriendoComprobante = false;
    if (this.inputArchivo?.nativeElement) this.inputArchivo.nativeElement.value = '';
  }

  /** Valida en el navegador lo mismo que valida el servidor: solo PDF y hasta 5 MB. */
  onArchivoComprobante(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;

    this.archivoComprobante = null;
    this.errorArchivoComprobante = '';

    if (!archivo) return;

    const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name);
    if (!esPdf) {
      this.errorArchivoComprobante = 'El comprobante debe ser un archivo PDF.';
      input.value = '';
      return;
    }

    if (archivo.size > MAX_BYTES_COMPROBANTE) {
      this.errorArchivoComprobante = `El PDF no puede pesar más de ${this.maxMbComprobante} MB.`;
      input.value = '';
      return;
    }

    this.archivoComprobante = archivo;
  }

  quitarArchivoComprobante(): void {
    this.archivoComprobante = null;
    this.errorArchivoComprobante = '';
    if (this.inputArchivo?.nativeElement) this.inputArchivo.nativeElement.value = '';
  }

  /** "245 KB" / "1.2 MB" para mostrar al lado del nombre del archivo elegido. */
  tamanoArchivo(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  enviarComprobante(): void {
    const pago = this.pagoSeleccionado;
    if (!pago || this.enviandoComprobante || this.esRechazada(pago)) return;

    const archivo = this.archivoComprobante;
    if (!archivo) {
      this.errorArchivoComprobante = 'Elige el PDF del comprobante.';
      return;
    }

    // Subir otro PDF reemplaza al anterior: se avisa para que no sea sin querer.
    const reemplaza = pago.tiene_comprobante
      ? '<br><span class="text-danger">Reemplazará al comprobante que ya estaba guardado.</span>'
      : '';

    Swal.fire({
      title: '¿Enviar el comprobante al cliente?',
      html:
        `Se enviará <strong>${this.escapar(archivo.name)}</strong> a ` +
        `<strong>${this.escapar(pago.cliente_email)}</strong>.${reemplaza}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#198754',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.enviandoComprobante = true;
      this.pagosService
        .subirComprobante(pago.id, {
          archivo,
          mensaje: this.mensajeComprobante.trim() || undefined,
          comprobante_erp: this.numeroComprobante.trim() || undefined,
        })
        .subscribe({
          next: (respuesta) => {
            this.enviandoComprobante = false;
            this.aplicarPago(respuesta.pago);

            // El servidor pasó la compra a "Facturado" y guardó el N° del
            // ERP: el formulario de seguimiento y el de envío se rehacen con eso.
            if (this.pagoSeleccionado?.id === pago.id) {
              this.cargarFormularioSeguimiento(this.pagoSeleccionado);
              this.reiniciarFormularioComprobante(this.pagoSeleccionado);
            }

            // Cambian los conteos de los chips y puede que la compra ya no
            // pertenezca a la lista filtrada.
            this.cargar(false);

            Swal.fire({
              title: 'Comprobante enviado',
              text: respuesta.message || `Comprobante enviado a ${pago.cliente_email}.`,
              icon: 'success',
              confirmButtonColor: '#198754',
            });
          },
          error: (error) => {
            this.enviandoComprobante = false;

            // 502: el PDF quedó guardado aunque el correo falló. Si el servidor
            // devolvió la compra, se muestra "Guardado, falta enviar" con el
            // botón de reenviar, sin pedir que se suba otra vez el archivo.
            const guardado: PagoAdmin | undefined = error?.error?.pago;
            if (guardado) {
              this.aplicarPago(guardado);
              if (this.pagoSeleccionado?.id === pago.id) {
                this.cargarFormularioSeguimiento(guardado);
                this.reiniciarFormularioComprobante(guardado);
              }
              this.cargar(false);
            }

            Swal.fire({
              title: guardado ? 'El PDF quedó guardado' : 'No se pudo enviar',
              text:
                error?.error?.message ||
                'No se pudo enviar el comprobante. Revisa el archivo e intenta nuevamente.',
              icon: guardado ? 'warning' : 'error',
              confirmButtonColor: '#dc3545',
            });
          },
        });
    });
  }

  /** Abre el PDF ya guardado en otra pestaña (el visor del navegador permite descargarlo). */
  verComprobante(): void {
    const pago = this.pagoSeleccionado;
    if (!pago || this.abriendoComprobante || !pago.tiene_comprobante) return;

    // La pestaña se abre ya, en el clic: si se abriera al llegar la respuesta,
    // el navegador la bloquearía como ventana emergente.
    const pestana = window.open('', '_blank');

    this.abriendoComprobante = true;
    this.pagosService.descargarComprobante(pago.id).subscribe({
      next: (blob) => {
        this.abriendoComprobante = false;

        if (pestana) {
          const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          pestana.location.href = url;
          // La pestaña ya cargó el archivo: se libera la memoria un rato después.
          setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } else {
          // El navegador no dejó abrir la pestaña: se descarga el archivo.
          this.fileDownload.downloadBlob(blob, pago.comprobante_nombre || `Comprobante-${pago.codigo}.pdf`);
        }
      },
      error: async (error) => {
        this.abriendoComprobante = false;
        pestana?.close();

        // Con `responseType: 'blob'` el mensaje del servidor llega dentro de un Blob.
        const mensaje = await this.fileDownload.extractErrorMessage(error);
        Swal.fire({
          title: 'No se pudo abrir el comprobante',
          text: mensaje || 'No se pudo abrir el comprobante. Intenta nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc3545',
        });
      },
    });
  }

  /** Vuelve a mandar al cliente el PDF ya guardado (no sube nada). */
  reenviarComprobante(): void {
    const pago = this.pagoSeleccionado;
    if (!pago || this.reenviandoComprobante || !pago.tiene_comprobante) return;

    Swal.fire({
      title: '¿Reenviar el comprobante?',
      html:
        `Se enviará <strong>${this.escapar(pago.comprobante_nombre || 'el comprobante')}</strong> a ` +
        `<strong>${this.escapar(pago.cliente_email)}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#198754',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.reenviandoComprobante = true;
      this.pagosService.reenviarComprobante(pago.id).subscribe({
        next: (respuesta) => {
          this.reenviandoComprobante = false;
          this.aplicarPago(respuesta.pago);
          this.cargar(false);

          Swal.fire({
            title: 'Comprobante enviado',
            text: respuesta.message || `Comprobante enviado a ${pago.cliente_email}.`,
            icon: 'success',
            confirmButtonColor: '#198754',
          });
        },
        error: (error) => {
          this.reenviandoComprobante = false;
          Swal.fire({
            title: 'No se pudo enviar',
            text: error?.error?.message || 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.',
            icon: 'error',
            confirmButtonColor: '#dc3545',
          });
        },
      });
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Contacto con el cliente
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Número en el formato que espera wa.me: solo dígitos y un único prefijo de
   * país. Si el cliente lo escribió con "+51" no se le antepone otro 51.
   */
  private numeroWhatsApp(telefono: string): string {
    const digitos = (telefono || '').replace(/\D/g, '');

    // Un celular peruano son 9 dígitos; si trae más, ya incluye el país.
    return digitos.length > 9 ? digitos : `51${digitos}`;
  }

  /** Teléfono para el enlace `tel:`: dígitos y, si lo trae, el "+" inicial. */
  telefonoParaLlamar(pago: PagoAdmin | null): string {
    return (pago?.telefono_contacto || '').replace(/[^\d+]/g, '');
  }

  contactarWhatsApp(pago: PagoAdmin): void {
    if (!pago.telefono_contacto) {
      Swal.fire({
        title: 'Sin teléfono',
        text: 'La compra no tiene un teléfono de contacto registrado.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    const mensaje = `Hola ${pago.cliente_nombre}, te contactamos por tu compra en línea ${pago.codigo}. ¿Coordinamos la entrega de tu pedido?`;
    const url = `https://wa.me/${this.numeroWhatsApp(pago.telefono_contacto)}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // ────────────────────────────────────────────────────────────────────────
  // ERP 7Power
  // ────────────────────────────────────────────────────────────────────────

  /** Solo se puede abrir "Nueva Venta" si la cuenta del cliente está vinculada al ERP. */
  puedeEnviarAErp(pago: PagoAdmin | null): boolean {
    return !!pago?.codigo_erp;
  }

  /**
   * Abre "Nueva Venta" en el ERP 7Power con el cliente y los productos de esta
   * compra precargados (por código), para que el personal solo revise y emita
   * el comprobante a mano. No crea ni guarda nada en el ERP automáticamente.
   */
  enviarAErp(pago: PagoAdmin): void {
    if (!pago.codigo_erp) {
      Swal.fire({
        title: 'Cliente no vinculado al ERP',
        text: 'La cuenta de este cliente no tiene un código de cliente 7Power (codigo_erp) asignado, así que no se puede precargar la venta. Vincula la cuenta desde Clientes o emite el comprobante directamente en el ERP.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    // Formato CODIGO:CANTIDAD. Sin la cantidad, el ERP carga una unidad de cada
    // producto y una compra de varias unidades entra por la mitad del importe.
    const productos = (pago.items || [])
      .filter((i) => i.codigo_producto)
      .map((i) => `${i.codigo_producto}:${Number(i.cantidad) || 1}`)
      .join(',');

    const params = new URLSearchParams({ codigo_cliente: pago.codigo_erp });
    if (productos) params.set('productos', productos);
    // Lista de precio del ERP con la que se cobró: sin ella, "Nueva Venta" abre
    // con la lista del cliente y los productos en dólares se cargan en 0.
    if (pago.lista_precio_erp) params.set('lista_precio', String(pago.lista_precio_erp));

    window.open(`${environment.erpFrontUrl}?${params.toString()}`, '_blank');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Seguimiento
  // ────────────────────────────────────────────────────────────────────────

  private cargarFormularioSeguimiento(pago: PagoAdmin): void {
    this.seguimiento = {
      estado_proceso: pago.estado_proceso || 'pendiente_facturar',
      comprobante_erp: pago.comprobante_erp || '',
      notas_internas: pago.notas_internas || '',
    };
    this.guardandoSeguimiento = false;
  }

  /** Hay algo distinto de lo ya guardado: habilita el botón Guardar. */
  get seguimientoModificado(): boolean {
    const pago = this.pagoSeleccionado;
    if (!pago) return false;

    return (
      this.seguimiento.estado_proceso !== pago.estado_proceso ||
      this.seguimiento.comprobante_erp.trim() !== (pago.comprobante_erp || '') ||
      this.seguimiento.notas_internas.trim() !== (pago.notas_internas || '')
    );
  }

  guardarSeguimiento(): void {
    const pago = this.pagoSeleccionado;
    if (!pago || this.guardandoSeguimiento || this.esRechazada(pago)) return;

    this.guardandoSeguimiento = true;
    this.pagosService
      .actualizarSeguimiento(pago.id, {
        estado_proceso: this.seguimiento.estado_proceso,
        comprobante_erp: this.seguimiento.comprobante_erp.trim() || null,
        notas_internas: this.seguimiento.notas_internas.trim() || null,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardandoSeguimiento = false;

          if (respuesta.pago) {
            // El N° del ERP del formulario de envío arrancó con el guardado: si
            // nadie lo tocó, acompaña al que se acaba de guardar.
            const numeroSinTocar = this.numeroComprobante.trim() === (pago.comprobante_erp || '');

            // El servidor devuelve la compra ya actualizada: reemplaza la del listado y la del detalle.
            this.aplicarPago(respuesta.pago);
            if (this.pagoSeleccionado?.id === respuesta.pago.id) {
              this.cargarFormularioSeguimiento(this.pagoSeleccionado);
              if (numeroSinTocar) this.numeroComprobante = this.pagoSeleccionado.comprobante_erp || '';
            }
          }

          // Cambia los conteos de los chips y, con un filtro de etapa activo,
          // puede que la compra ya no pertenezca a la lista: se vuelve a pedir
          // sin mostrar el cargando.
          this.cargar(false);

          Swal.fire({
            title: 'Seguimiento actualizado',
            text: 'Los cambios quedaron guardados.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.guardandoSeguimiento = false;
          Swal.fire({
            title: 'No se pudo guardar',
            text: error?.error?.message || 'No se pudo actualizar el seguimiento. Intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#dc3545',
          });
        },
      });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Utilidades
  // ────────────────────────────────────────────────────────────────────────

  /** Para meter texto del cliente en el HTML de un aviso sin interpretarlo como marcado. */
  private escapar(texto: string | null | undefined): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
