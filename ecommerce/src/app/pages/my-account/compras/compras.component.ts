import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComprasService, CompraErp } from '../../../services/compras.service';
import { MonedaPipe } from '../../../pipes/moneda.pipe';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, MonedaPipe],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit, OnDestroy {

  // Compras hechas en la tienda (ventas del ERP). Solo llegan si la cuenta
  // está vinculada a un cliente de 7Power.
  comprasErp: CompraErp[] = [];
  cuentaVinculada = false;
  cargandoComprasErp = false;
  compraErpAbierta: CompraErp | null = null;
  /** Id de la compra cuyo PDF se está generando. */
  descargando: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.cargarComprasErp();
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
          // Si el ERP no responde, la pestaña de tienda queda vacía pero las
          // compras del e-commerce se siguen viendo.
          this.cuentaVinculada = false;
          this.cargandoComprasErp = false;
        }
      });
  }

  verDetalleCompraErp(compra: CompraErp): void {
    this.compraErpAbierta = this.compraErpAbierta?.id === compra.id ? null : compra;
  }

  /**
   * Abre el comprobante en PDF en otra pestaña. El endpoint pide token, así
   * que se descarga como blob y se abre desde memoria.
   */
  verComprobante(compra: CompraErp): void {
    if (this.descargando) return;

    this.descargando = compra.id;
    this.comprasService.descargarComprobanteErp(compra.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          // El navegador ya tiene el contenido; se libera al rato para no
          // cortar la carga de la pestaña recién abierta.
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          this.descargando = null;
        },
        error: () => {
          this.descargando = null;
        }
      });
  }

  formatearMonto(valor: number | null | undefined): string {
    return (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  formatearMoneda(moneda: string): string {
    return moneda === 'd' ? 'US$' : 'S/';
  }

  formatearFecha(fecha: string): string {
    return this.comprasService.formatearFecha(fecha);
  }

  formatearPrecio(precio: number): string {
    return this.comprasService.formatearPrecio(precio);
  }

  getEstadoCompraClass(estado: any): string {
    return this.comprasService.getEstadoClass(estado);
  }
}