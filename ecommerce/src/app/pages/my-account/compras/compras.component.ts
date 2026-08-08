import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComprasService, Compra, CompraErp } from '../../../services/compras.service';
import { MonedaPipe } from '../../../pipes/moneda.pipe';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, MonedaPipe],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit, OnDestroy {
  compras: Compra[] = [];
  isLoadingCompras = false;
  compraSeleccionada: Compra | null = null;

  // Compras hechas en la tienda (ventas del ERP). Solo llegan si la cuenta
  // está vinculada a un cliente de 7Power.
  comprasErp: CompraErp[] = [];
  cuentaVinculada = false;
  cargandoComprasErp = false;
  /** Qué origen se está viendo: el e-commerce o la tienda. */
  origen: 'ecommerce' | 'tienda' = 'ecommerce';
  compraErpAbierta: CompraErp | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.cargarCompras();
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

  formatearMonto(valor: number | null | undefined): string {
    return (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarCompras(): void {
    this.isLoadingCompras = true;
    this.comprasService.obtenerMisCompras()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success' && response.compras) {
            this.compras = response.compras;
          }
          this.isLoadingCompras = false;
        },
        error: (error) => {
          console.error('Error cargando compras:', error);
          this.isLoadingCompras = false;
        }
      });
  }

  mostrarModalDetalle = false;

  verDetalleCompra(compra: Compra): void {
    this.compraSeleccionada = compra;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.compraSeleccionada = null;
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