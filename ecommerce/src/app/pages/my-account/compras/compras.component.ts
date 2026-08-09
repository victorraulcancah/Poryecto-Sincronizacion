import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  /** Comprobante que se está viendo en el modal. */
  compraComprobante: CompraErp | null = null;
  urlComprobante: SafeResourceUrl | null = null;
  private blobComprobante: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comprasService: ComprasService,
    private sanitizer: DomSanitizer
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
   * Abre el comprobante en un modal sobre la misma página, como el ERP. El
   * endpoint pide token, así que se descarga como blob y se muestra desde
   * memoria.
   */
  verComprobante(compra: CompraErp): void {
    if (this.descargando) return;

    this.descargando = compra.id;
    this.comprasService.descargarComprobanteErp(compra.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.cerrarComprobante();
          this.blobComprobante = URL.createObjectURL(blob);
          // Angular bloquea las blob: URL en un iframe si no se marcan como
          // confiables.
          this.urlComprobante = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobComprobante);
          this.compraComprobante = compra;
          this.descargando = null;
        },
        error: () => {
          this.descargando = null;
        }
      });
  }

  cerrarComprobante(): void {
    if (this.blobComprobante) {
      URL.revokeObjectURL(this.blobComprobante);
      this.blobComprobante = null;
    }
    this.urlComprobante = null;
    this.compraComprobante = null;
  }

  /** Descarga el comprobante que se está viendo. */
  descargarComprobante(): void {
    if (!this.blobComprobante || !this.compraComprobante) return;

    const enlace = document.createElement('a');
    enlace.href = this.blobComprobante;
    enlace.download = `${this.compraComprobante.documento}.pdf`;
    enlace.click();
  }

  formatearMonto(valor: number | null | undefined): string {
    return (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngOnDestroy(): void {
    this.cerrarComprobante();
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