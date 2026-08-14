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
  /** Compra cuyo detalle de productos se está viendo. */
  compraErpAbierta: CompraErp | null = null;

  private destroy$ = new Subject<void>();

  constructor(private comprasService: ComprasService) {}

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
          // Si el ERP no responde, el listado queda vacío en vez de romperse.
          this.cuentaVinculada = false;
          this.cargandoComprasErp = false;
        }
      });
  }

  verDetalleCompraErp(compra: CompraErp): void {
    this.compraErpAbierta = compra;
  }

  cerrarDetalleCompraErp(): void {
    this.compraErpAbierta = null;
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
