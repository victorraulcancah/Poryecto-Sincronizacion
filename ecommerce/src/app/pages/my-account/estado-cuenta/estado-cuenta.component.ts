import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { RangoFechasComponent } from '../../../components/rango-fechas/rango-fechas.component';
import {
  AplicacionPago,
  EstadoCuentaService,
  EstadoCuentaResponse,
  MovimientoEstadoCuenta,
} from '../../../services/estado-cuenta.service';

@Component({
  selector: 'app-estado-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RangoFechasComponent],
  templateUrl: './estado-cuenta.component.html',
  styleUrl: './estado-cuenta.component.scss'
})
export class EstadoCuentaComponent implements OnInit {
  cargando = false;
  // Estados posibles: 'sin_vincular' (el cliente no tiene codigo_erp asignado),
  // 'error' (falló la consulta al ERP) o null (todo cargó bien).
  estado: 'sin_vincular' | 'error' | null = null;
  errorMensaje = '';

  resumen: EstadoCuentaResponse | null = null;
  movimientos: MovimientoEstadoCuenta[] = [];
  movimientosFiltrados: MovimientoEstadoCuenta[] = [];

  private codigoErp = '';
  busqueda = '';

  /**
   * Cómo se repartió cada pago entre las ventas que cubrió, por id de
   * PaymentSeller. No viene en la respuesta del ERP: se pide aparte a nuestro
   * backend y se cruza acá.
   */
  private aplicacionesPorPago: Record<string, AplicacionPago[]> = {};

  // Filtro de fechas (por defecto, el mes en curso, igual que el ERP).
  fechaDesde = '';
  fechaHasta = '';

  constructor(
    private authService: AuthService,
    private estadoCuentaService: EstadoCuentaService
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getCurrentUser();
    const codigoErp = usuario?.codigo_erp;

    if (!codigoErp) {
      this.estado = 'sin_vincular';
      return;
    }
    this.codigoErp = codigoErp;

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaDesde = this.aInputDate(inicioMes);
    this.fechaHasta = this.aInputDate(hoy);

    this.recargar();
  }

  /**
   * Vuelve a consultar la API con el rango actual. El mapa de pagos se pide
   * antes que los movimientos porque de él depende cómo se separan las filas
   * de pago; si falla, los pagos salen sin documento pero el estado de cuenta
   * se muestra igual.
   */
  recargar(): void {
    this.estadoCuentaService.obtenerDocumentosDePagos().subscribe({
      next: (mapa) => {
        this.aplicacionesPorPago = mapa || {};
        this.cargar();
      },
      error: () => {
        this.aplicacionesPorPago = {};
        this.cargar();
      },
    });
  }

  private aInputDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  aplicarFiltroFechas(): void {
    if (!this.fechaDesde || !this.fechaHasta) return;
    this.recargar();
  }

  /** Rango elegido en el calendario (se dispara recién al presionar "Aplicar"). */
  cambiarRangoFechas(rango: { desde: string; hasta: string }): void {
    this.fechaDesde = rango.desde;
    this.fechaHasta = rango.hasta;
    this.aplicarFiltroFechas();
  }

  private cargar(): void {
    this.cargando = true;
    this.estadoCuentaService
      .obtenerEstadoCuenta(this.codigoErp, [this.fechaDesde, this.fechaHasta])
      .subscribe({
        next: (res) => {
          this.resumen = res;
          // Más reciente primero, igual que la vista del ERP.
          this.movimientos = this.separarPagosPorVenta(res.data || []).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          this.aplicarBusqueda();
          this.cargando = false;
        },
        error: (err) => {
          this.cargando = false;
          this.estado = 'error';
          this.errorMensaje =
            err?.error?.error || 'No se pudo cargar el estado de cuenta. Intenta nuevamente más tarde.';
        }
      });
  }

  /**
   * Un pago puede cubrir cuotas de varias ventas. En ese caso se parte en una
   * fila por venta, cada una con su documento y el monto que le tocó, en vez
   * de una sola fila con dos documentos juntos.
   *
   * Los pagos que cubren una sola venta (o ninguna, como el saldo a favor) se
   * dejan tal cual; solo se les anota el documento.
   */
  private separarPagosPorVenta(movimientos: MovimientoEstadoCuenta[]): MovimientoEstadoCuenta[] {
    const resultado: MovimientoEstadoCuenta[] = [];

    for (const mov of movimientos) {
      const aplicaciones =
        mov.type === 'payment_seller_aggregated' ? this.aplicacionesPorPago[this.idDePago(mov)] ?? [] : [];

      if (aplicaciones.length === 0) {
        resultado.push(mov);
        continue;
      }

      if (aplicaciones.length === 1) {
        resultado.push({ ...mov, documento_venta: aplicaciones[0].documento });
        continue;
      }

      const total = Number(mov.total_sumado ?? 0);
      const aplicado = aplicaciones.reduce((suma, a) => suma + Number(a.monto ?? 0), 0);
      // Lo que el pago no aplicó a ninguna venta (saldo a favor) va en una
      // fila aparte, para que la suma de la columna siga dando el total.
      const resto = Math.round((total - aplicado) * 100) / 100;

      aplicaciones.forEach((aplicacion, i) => {
        // Si se aplicó de más (diferencias de redondeo del ERP), el sobrante
        // se descuenta de la última fila en vez de mostrar un monto negativo.
        const ajuste = resto < 0 && i === aplicaciones.length - 1 ? resto : 0;
        resultado.push({
          ...mov,
          id: `${mov.id}-${aplicacion.documento}`,
          documento_venta: aplicacion.documento,
          total_sumado: Number(aplicacion.monto ?? 0) + ajuste,
        });
      });

      if (resto > 0) {
        resultado.push({ ...mov, id: `${mov.id}-resto`, total_sumado: resto });
      }
    }

    return resultado;
  }

  aplicarBusqueda(): void {
    const q = this.busqueda.trim().toLowerCase();
    this.movimientosFiltrados = !q
      ? this.movimientos
      : this.movimientos.filter((mov) => this.descripcion(mov).toLowerCase().includes(q));
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearMonto(valor: number | undefined | null): string {
    return (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Réplica exacta de la columna "Documento" del estado de cuenta del ERP,
   * vista detallada por producto (columnsEstadoDeCuentaPrincipal).
   */
  documento(mov: MovimientoEstadoCuenta): string {
    // El pago no tiene documento propio: lleva el de la venta a la que se
    // aplicó, que anota separarPagosPorVenta().
    if (mov.type === 'payment_seller_aggregated') {
      return mov.documento_venta ?? '-';
    }
    if (!mov.sale) return '-';
    if (mov.sale.boleta) {
      const b = mov.sale.boleta;
      const tipo = (b.tipo || 'bol').toString().toUpperCase();
      const serie = (b.serie ?? '001').toString().padStart(3, '0');
      const numero = (b.numero ?? '0').toString().padStart(4, '0');
      return `${tipo}${serie}-${numero}`;
    }
    const nro = (mov.sale.nro_documento ?? '0').toString().padStart(4, '0');
    return `V001-${nro}`;
  }

  /**
   * Id del PaymentSeller dentro del id del movimiento, que el ERP arma como
   * "ps-agg-soles-132" / "ps-agg-dolares-132".
   */
  private idDePago(mov: MovimientoEstadoCuenta): string {
    return String(mov.id ?? '').split('-').pop() ?? '';
  }

  /** Cantidad del producto (columna "Cantidad"). */
  cantidad(mov: MovimientoEstadoCuenta): string {
    return mov.cantidad != null ? String(mov.cantidad) : '-';
  }

  /**
   * Réplica exacta de la columna "Descripción" del ERP (vista detallada):
   * producto (código | nombre | marca) o "Pagó con {método}".
   */
  descripcion(mov: MovimientoEstadoCuenta): string {
    if (mov.product) {
      return `${mov.product.codigo ?? ''} | ${mov.product.name ?? ''} | ${mov.product.brand?.name ?? '-'}`;
    }
    return `Pagó con ${mov.payment_method?.name ?? mov.paymentMethod?.name ?? 'N/A'}`;
  }

  /**
   * Réplica exacta de la columna "Soles" del ERP (vista detallada): la
   * moneda se determina por total_dolares (nunca por tipo_de_cambio, que es
   * solo referencia interna).
   */
  soles(mov: MovimientoEstadoCuenta): number {
    if (mov.type === 'payment_seller_aggregated') {
      return mov.moneda !== 'dolares' ? Number(mov.total_sumado ?? 0) : 0;
    }
    if (mov.payment_method) {
      return (mov.sale?.total_dolares ?? 0) > 0 ? 0 : Number(mov.monto ?? 0);
    }
    return mov.dolares ? 0 : Number(mov.subtotal_con_dto ?? 0);
  }

  dolares(mov: MovimientoEstadoCuenta): number {
    if (mov.type === 'payment_seller_aggregated') {
      return mov.moneda === 'dolares' ? Number(mov.total_sumado ?? 0) : 0;
    }
    if (mov.payment_method) {
      return (mov.sale?.total_dolares ?? 0) > 0 ? Number(mov.monto ?? 0) : 0;
    }
    return mov.dolares ? Number(mov.subtotal_con_dto ?? 0) : 0;
  }

  /** Fila en rojo: es un pago, o la venta está anulada (estado === false). */
  /** Un movimiento es un pago (no una venta). */
  esPago(mov: MovimientoEstadoCuenta): boolean {
    // El ERP devuelve el método de pago con distintos nombres según el tipo de
    // movimiento; antes solo se miraba `payment_method`, así que los pagos
    // agregados no se detectaban y salían en negro.
    return (
      mov.type === 'payment_seller_aggregated' ||
      !!mov.payment_method ||
      !!mov.paymentMethod ||
      (mov.payment_methods?.length ?? 0) > 0 ||
      !mov.product
    );
  }

  esFilaRoja(mov: MovimientoEstadoCuenta): boolean {
    return this.esPago(mov) || mov.sale?.estado === false;
  }

  /**
   * Primera fila de su documento: los productos de una misma venta llegan como
   * filas separadas, así que solo la primera muestra fecha y documento y se le
   * pinta la línea divisoria. Así cada orden se ve como un bloque.
   */
  esInicioDeGrupo(indice: number): boolean {
    if (indice === 0) return true;
    const actual = this.movimientosFiltrados[indice];
    const previo = this.movimientosFiltrados[indice - 1];
    // Los pagos no se agrupan: cada uno es su propia línea.
    if (this.esPago(actual) || this.esPago(previo)) return true;
    return this.documento(actual) !== this.documento(previo);
  }

  get hayDeudaAnterior(): boolean {
    return (this.resumen?.deuda_anterior_soles ?? 0) > 0 || (this.resumen?.deuda_anterior_dolares ?? 0) > 0;
  }
}
