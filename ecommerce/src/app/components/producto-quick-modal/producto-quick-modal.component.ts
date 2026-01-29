import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ProductoQuickItem {
  id: number;
  codigo?: string;
  codigo_producto?: string;
  nombre: string;
  precio: number;
  stock?: number;
}

@Component({
  selector: 'app-producto-quick-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1" 
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; 
             width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; 
             justify-content: center !important; background-color: rgba(0,0,0,0.6) !important; z-index: 99999 !important; 
             padding: 20px !important; margin: 0 !important;" 
      (click)="cerrar.emit()">
      <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()" 
        style="margin: 0 auto !important; max-width: 900px; width: 100%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-box-open me-2"></i>
              Buscar producto
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3 mb-3">
              <div class="col-md-8">
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="termino"
                  (ngModelChange)="filtrar()"
                  placeholder="Buscar por nombre o código"
                  #searchBox
                >
              </div>
              <div class="col-md-4">
                <select class="form-select" [(ngModel)]="orden" (change)="filtrar()">
                  <option value="nombre">Orden: Nombre</option>
                  <option value="precio">Orden: Precio</option>
                  <option value="stock">Orden: Stock</option>
                </select>
              </div>
            </div>

            <div class="table-responsive" style="max-height: 50vh; overflow: auto;">
              <table class="table table-hover table-sm align-middle">
                <thead class="table-light">
                  <tr>
                    <th width="120">Código</th>
                    <th>Nombre</th>
                    <th width="120" class="text-end">Precio</th>
                    <th width="100" class="text-center">Stock</th>
                    <th width="80"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of filtrados">
                    <td>{{ p.codigo || p.codigo_producto || ('PROD-' + p.id) }}</td>
                    <td>{{ p.nombre }}</td>
                    <td class="text-end">S/ {{ p.precio | number:'1.2-2' }}</td>
                    <td class="text-center">{{ p.stock ?? '-' }}</td>
                    <td>
                      <button class="btn btn-sm btn-primary" (click)="seleccionar(p)">
                        <i class="fas fa-plus me-1"></i>
                        Agregar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div *ngIf="filtrados.length===0" class="text-center text-muted py-3">
                No hay resultados
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar.emit()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProductoQuickModalComponent {
  @Input() productos: ProductoQuickItem[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() seleccionarProducto = new EventEmitter<ProductoQuickItem>();
  @Output() productoSeleccionado = new EventEmitter<ProductoQuickItem>();

  termino = '';
  orden: 'nombre' | 'precio' | 'stock' = 'nombre';
  filtrados: ProductoQuickItem[] = [];

  ngOnInit(): void {
    this.filtrar();
    // Pequeño delay para enfocar el input al abrir
    setTimeout(() => {
      const el = document.querySelector('input[placeholder*="Buscar por nombre"]') as HTMLInputElement | null;
      el?.focus();
    });
  }

  filtrar(): void {
    const t = (this.termino || '').toLowerCase();
    const base = this.productos || [];
    let out = base.filter(p =>
      (p.nombre || '').toLowerCase().includes(t) ||
      (p.codigo || p.codigo_producto || '').toLowerCase().includes(t)
    );
    out = out.sort((a, b) => {
      if (this.orden === 'precio') return (a.precio || 0) - (b.precio || 0);
      if (this.orden === 'stock') return (a.stock || 0) - (b.stock || 0);
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    this.filtrados = out;
  }

  seleccionar(prod: ProductoQuickItem): void {
    this.seleccionarProducto.emit(prod);
    this.productoSeleccionado.emit(prod);
    this.cerrar.emit();
  }
}


