import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComprasService, Compra } from '../../../services/compras.service';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit, OnDestroy {
  compras: Compra[] = [];
  isLoadingCompras = false;
  compraSeleccionada: Compra | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.cargarCompras();
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

  verDetalleCompra(compra: Compra): void {
    this.compraSeleccionada = compra;
    // Aquí podrías implementar un modal o navegación a detalle
    console.log('Ver detalle de compra:', compra);
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