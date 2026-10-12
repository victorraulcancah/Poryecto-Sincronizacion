import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComprasService, CompraErp } from '../../../services/compras.service';
import {
  PagoEnLinea,
  PagoEnLineaService,
  EstadoProcesoCompra
} from '../../../services/pago-en-linea.service';
import { MonedaPipe } from '../../../pipes/moneda.pipe';

/** Cómo se muestra cada etapa que marca el personal. */
interface EtapaCompra {
  valor: EstadoProcesoCompra;
  etiqueta: string;
  icono: string;
  clase: string;
  /** Lo que se le explica al cliente en el detalle. */
  descripcion: string;
}

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, MonedaPipe],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit, OnDestroy {

  /** Etapas del seguimiento, en el orden en que avanza una compra. */
  readonly etapas: EtapaCompra[] = [
    {
      valor: 'pendiente_facturar',
      etiqueta: 'Pendiente de facturar',
      icono: 'ph-clock',
      clase: 'bg-warning-50 text-warning-600',
      descripcion: 'Recibimos tu pago. Estamos preparando tu comprobante.'
    },
    {
      valor: 'facturado',
      etiqueta: 'Facturado',
      icono: 'ph-receipt',
      clase: 'bg-primary-50 text-primary-600',
      descripcion: 'Emitimos tu comprobante y te lo enviamos a tu correo. Pronto coordinaremos la entrega.'
    },
    {
      valor: 'en_delivery',
      etiqueta: 'En delivery',
      icono: 'ph-truck',
      clase: 'bg-info-50 text-info-600',
      descripcion: 'Tu pedido va en camino a la dirección indicada.'
    },
    {
      valor: 'entregado',
      etiqueta: 'Entregado',
      icono: 'ph-house',
      clase: 'bg-success-50 text-success-600',
      descripcion: 'Tu pedido fue entregado. ¡Gracias por tu compra!'
    }
  ];

  private readonly etapaCancelada: EtapaCompra = {
    valor: 'cancelado',
    etiqueta: 'Cancelado',
    icono: 'ph-x-circle',
    clase: 'bg-danger-50 text-danger-600',
    descripcion: 'Esta compra fue cancelada. Si tienes dudas, comunícate con nosotros.'
  };

  // Compras por la web (pasarela de pago), con el estado que marca el personal.
  comprasEnLinea: PagoEnLinea[] = [];
  cargandoEnLinea = false;
  /** Compra en línea cuyo detalle se está viendo. */
  pagoAbierto: PagoEnLinea | null = null;

  // Compras hechas en la tienda (ventas del ERP). Solo llegan si la cuenta
  // está vinculada a un cliente de 7Power.
  comprasErp: CompraErp[] = [];
  cuentaVinculada = false;
  cargandoComprasErp = false;
  /** Compra cuyo detalle de productos se está viendo. */
  compraErpAbierta: CompraErp | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comprasService: ComprasService,
    private pagoEnLineaService: PagoEnLineaService
  ) {}

  ngOnInit(): void {
    this.cargarComprasEnLinea();
    this.cargarComprasErp();
  }

  get cargando(): boolean {
    return this.cargandoEnLinea || this.cargandoComprasErp;
  }

  private cargarComprasEnLinea(): void {
    this.cargandoEnLinea = true;
    this.pagoEnLineaService.listarMias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.comprasEnLinea = res.pagos || [];
          this.cargandoEnLinea = false;
        },
        error: () => {
          // Si falla, el resto de Mis Compras sigue funcionando.
          this.comprasEnLinea = [];
          this.cargandoEnLinea = false;
        }
      });
  }

  private cargarComprasErp(): void {
    this.cargandoComprasErp = true;
    this.comprasService.obtenerMisComprasErp()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.cuentaVinculada = !!res.vinculado;
          this.comprasErp = res.compras || [];
          this.cargandoComprasErp = false;
        },
        error: () => {
          // Si el ERP no responde, el listado queda vacío en vez de romperse.
          this.cuentaVinculada = false;
          this.cargandoComprasErp = false;
        }
      });
  }

  /** Etapa que corresponde al estado actual de la compra. */
  etapaDe(pago: PagoEnLinea): EtapaCompra {
    if (pago.estado_proceso === 'cancelado') {
      return this.etapaCancelada;
    }
    return this.etapas.find((e) => e.valor === pago.estado_proceso) || this.etapas[0];
  }

  /** Posición de la compra en el recorrido (las canceladas no lo muestran). */
  indiceEtapa(pago: PagoEnLinea): number {
    const indice = this.etapas.findIndex((e) => e.valor === pago.estado_proceso);
    return indice < 0 ? 0 : indice;
  }

  estaCancelada(pago: PagoEnLinea): boolean {
    return pago.estado_proceso === 'cancelado';
  }

  verDetallePago(pago: PagoEnLinea): void {
    this.pagoAbierto = pago;
  }

  cerrarDetallePago(): void {
    this.pagoAbierto = null;
  }

  verDetalleCompraErp(compra: CompraErp): void {
    this.compraErpAbierta = compra;
  }

  cerrarDetalleCompraErp(): void {
    this.compraErpAbierta = null;
  }

  direccionEntrega(pago: PagoEnLinea): string {
    return [pago.direccion_envio, pago.distrito_nombre, pago.provincia_nombre, pago.departamento_nombre]
      .filter((parte) => !!parte)
      .join(', ');
  }

  formatearMonto(valor: number | null | undefined): string {
    return (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatearFecha(fecha: string): string {
    return this.comprasService.formatearFecha(fecha);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
