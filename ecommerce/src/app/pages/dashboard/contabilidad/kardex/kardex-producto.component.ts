import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KardexService } from '../../../../services/contabilidad/kardex.service';
import { ProductosService } from '../../../../services/productos.service';

@Component({
  selector: 'app-kardex-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid p-24">
      <h5 class="text-heading fw-semibold mb-24">Kardex de Inventario</h5>

      <!-- Selector de Producto -->
      <div class="card border-0 shadow-sm mb-24">
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <label class="form-label">Producto</label>
              <select class="form-select" [(ngModel)]="productoSeleccionado" (change)="cargarKardex()">
                <option value="">Seleccione un producto</option>
                <option *ngFor="let p of productos" [value]="p.id">
                  {{ p.codigo_producto }} - {{ p.nombre }}
                </option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha Inicio</label>
              <input type="date" class="form-control" [(ngModel)]="fechaInicio" (change)="cargarKardex()">
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha Fin</label>
              <input type="date" class="form-control" [(ngModel)]="fechaFin" (change)="cargarKardex()">
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje cuando no hay producto seleccionado -->
      <div class="card border-0 shadow-sm" *ngIf="!productoSeleccionado && productos.length > 0">
        <div class="card-body text-center py-5">
          <i class="ph ph-package text-gray-300" style="font-size: 4rem;"></i>
          <h6 class="mt-3">Seleccione un producto</h6>
          <p class="text-gray-500">Seleccione un producto del dropdown para ver su kardex</p>
        </div>
      </div>

      <!-- Mensaje cuando no hay productos -->
      <div class="card border-0 shadow-sm" *ngIf="productos.length === 0 && !loadingProductos">
        <div class="card-body text-center py-5">
          <i class="ph ph-warning text-warning-600" style="font-size: 4rem;"></i>
          <h6 class="mt-3">No hay productos disponibles</h6>
          <p class="text-gray-500">Agregue productos al sistema para poder ver el kardex</p>
        </div>
      </div>

      <!-- Tabla Kardex -->
      <div class="card border-0 shadow-sm" *ngIf="productoSeleccionado">
        <div class="card-body p-0">
          <div *ngIf="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-gray-500">Cargando movimientos...</p>
          </div>

          <div *ngIf="!loading && movimientos.length > 0" class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="bg-gray-50">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th class="text-end">Entrada</th>
                  <th class="text-end">Salida</th>
                  <th class="text-end">Saldo</th>
                  <th class="text-end">Costo Unit.</th>
                  <th class="text-end">Costo Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mov of movimientos">
                  <td>{{ mov.fecha | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <span class="badge" [ngClass]="getTipoBadge(mov.tipo_movimiento)">
                      {{ mov.tipo_movimiento }}
                    </span>
                  </td>
                  <td>{{ mov.tipo_documento }} {{ mov.numero_documento }}</td>
                  <td class="text-end">{{ mov.tipo_movimiento === 'ENTRADA' ? mov.cantidad : '-' }}</td>
                  <td class="text-end">{{ mov.tipo_movimiento === 'SALIDA' ? mov.cantidad : '-' }}</td>
                  <td class="text-end fw-semibold">{{ mov.saldo_cantidad }}</td>
                  <td class="text-end">S/ {{ mov.saldo_costo_unitario | number:'1.2-2' }}</td>
                  <td class="text-end">S/ {{ mov.saldo_costo_total | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Sin movimientos -->
          <div *ngIf="!loading && movimientos.length === 0" class="text-center py-5">
            <i class="ph ph-file-x text-gray-300" style="font-size: 3rem;"></i>
            <h6 class="mt-3">No hay movimientos</h6>
            <p class="text-gray-500">Este producto no tiene movimientos de kardex en el período seleccionado</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class KardexProductoComponent implements OnInit {
  productos: any[] = [];
  productoSeleccionado = '';
  fechaInicio = '';
  fechaFin = '';
  movimientos: any[] = [];
  loading = false;
  loadingProductos = false;

  constructor(
    private kardexService: KardexService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.loadingProductos = true;
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos = productos;
        this.loadingProductos = false;
        console.log('Productos cargados:', productos.length);
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.loadingProductos = false;
      }
    });
  }

  cargarKardex(): void {
    if (!this.productoSeleccionado) return;

    this.loading = true;
    const params = {
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin
    };

    console.log('Cargando kardex para producto:', this.productoSeleccionado, 'con params:', params);

    this.kardexService.getKardexProducto(Number(this.productoSeleccionado), params).subscribe({
      next: (res) => {
        console.log('Respuesta kardex:', res);
        this.movimientos = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar kardex:', err);
        console.error('Detalles del error:', err.error);
        this.loading = false;
      }
    });
  }

  getTipoBadge(tipo: string): string {
    switch (tipo) {
      case 'ENTRADA': return 'bg-success-50 text-success-600';
      case 'SALIDA': return 'bg-danger-50 text-danger-600';
      case 'AJUSTE': return 'bg-warning-50 text-warning-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }
}
