import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import {
  EstadoCuentaService,
  EstadoCuentaResponse,
  MovimientoEstadoCuenta,
} from '../../../services/estado-cuenta.service';

@Component({
  selector: 'app-estado-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

    this.cargar();
  }

  private aInputDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  aplicarFiltroFechas(): void {
    if (!this.fechaDesde || !this.fechaHasta) return;
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.estadoCuentaService
      .obtenerEstadoCuenta(this.codigoErp, [this.fechaDesde, this.fechaHasta])
      .subscribe({
        next: (res) => {
          this.resumen = res;
          // Más reciente primero, igual que la vista del ERP.
          this.movimientos = [...(res.data || [])].sort(
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
    if (mov.type === 'payment_seller_aggregated' || !mov.sale) return '-';
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
  esFilaRoja(mov: MovimientoEstadoCuenta): boolean {
    return !!mov.payment_method || mov.sale?.estado === false;
  }

  get hayDeudaAnterior(): boolean {
    return (this.resumen?.deuda_anterior_soles ?? 0) > 0 || (this.resumen?.deuda_anterior_dolares ?? 0) > 0;
  }
}
