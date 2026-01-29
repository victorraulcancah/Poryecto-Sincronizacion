// src/app/pages/dashboard/ofertas/productos-oferta/productos-oferta.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfertasAdminService } from '../../../../services/ofertas-admin.service';
import { ProductosService } from '../../../../services/productos.service';
import Swal from 'sweetalert2';

export interface ProductoDisponible {
  id: number;
  nombre: string;
  codigo: string;
  precio_venta: number;
  stock: number;
  imagen_url?: string;
  categoria?: { nombre: string };
  marca?: { nombre: string };
}

export interface ProductoEnOferta {
  id: number;
  producto_id: number;
  nombre: string;
  codigo: string;
  precio_original: number;
  precio_oferta: number;
  stock_original: number;
  stock_oferta: number;
  vendidos_oferta: number;
  imagen_url?: string;
  categoria?: string;
  marca?: string;
}

@Component({
  selector: 'app-productos-oferta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-24">
        <div>
          <h4 class="text-heading fw-semibold mb-8">Productos en Oferta</h4>
          <p class="text-gray-500 mb-0">Gestiona los productos incluidos en la oferta: {{ ofertaTitulo }}</p>
        </div>
        <button 
          class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
          data-bs-toggle="modal" 
          data-bs-target="#modalAgregarProducto">
          <i class="ph ph-plus me-8"></i>
          Agregar Producto
        </button>
      </div>

      <!-- Productos en la oferta -->
      <div class="card border-0 shadow-sm rounded-12 mb-24">
        <div class="card-header bg-gray-50 border-0 py-16">
          <h6 class="text-heading fw-semibold mb-0">
            <i class="ph ph-tag me-8 text-main-600"></i>
            Productos en la Oferta ({{ productosEnOferta.length }})
          </h6>
        </div>
        <div class="card-body p-0">
          
          <!-- Loading state -->
          <div *ngIf="isLoadingProductosOferta" class="text-center py-40">
            <div class="spinner-border text-main-600" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>

          <!-- Tabla de productos en oferta -->
          <div *ngIf="!isLoadingProductosOferta" class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Producto</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Precios</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Stock</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Vendidos</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let producto of productosEnOferta" class="border-bottom border-gray-100">
                  <!-- Producto -->
                  <td class="px-24 py-16">
                    <div class="d-flex align-items-center gap-12">
                      <div class="w-48 h-48 bg-gray-100 rounded-8 flex-center overflow-hidden">
                        <img *ngIf="producto.imagen_url" 
                             [src]="producto.imagen_url" 
                             [alt]="producto.nombre"
                             class="w-100 h-100 object-fit-cover">
                        <i *ngIf="!producto.imagen_url" class="ph ph-package text-gray-400 text-xl"></i>
                      </div>
                      <div>
                        <h6 class="text-heading fw-semibold mb-4">{{ producto.nombre }}</h6>
                        <p class="text-gray-500 text-sm mb-0">{{ producto.codigo }}</p>
                        <div class="d-flex gap-8 mt-4">
                          <span *ngIf="producto.categoria" class="badge bg-info-50 text-info-600 px-8 py-4 text-xs">
                            {{ producto.categoria }}
                          </span>
                          <span *ngIf="producto.marca" class="badge bg-purple-50 text-purple-600 px-8 py-4 text-xs">
                            {{ producto.marca }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Precios -->
                  <td class="px-24 py-16">
                    <div class="text-sm">
                      <div class="text-gray-600 mb-4">
                        <strong>Original:</strong> S/ {{ producto.precio_original | number:'1.2-2' }}
                      </div>
                      <div class="text-success-600 fw-semibold">
                        <strong>Oferta:</strong> S/ {{ producto.precio_oferta | number:'1.2-2' }}
                      </div>
                      <div class="text-xs text-gray-500 mt-4">
                        Descuento: {{ calcularDescuentoPorcentaje(producto.precio_original, producto.precio_oferta) }}%
                      </div>
                    </div>
                  </td>

                  <!-- Stock -->
                  <td class="px-24 py-16">
                    <div class="text-sm">
                      <div class="text-gray-600 mb-4">
                        <strong>Total:</strong> {{ producto.stock_original }}
                      </div>
                      <div class="text-main-600 fw-semibold">
                        <strong>En oferta:</strong> {{ producto.stock_oferta }}
                      </div>
                    </div>
                  </td>

                  <!-- Vendidos -->
                  <td class="px-24 py-16">
                    <div class="text-center">
                      <span class="badge bg-success-50 text-success-600 px-12 py-6 rounded-pill fw-semibold">
                        {{ producto.vendidos_oferta }}
                      </span>
                      <div class="text-xs text-gray-500 mt-4">
                        Disponible: {{ producto.stock_oferta - producto.vendidos_oferta }}
                      </div>
                    </div>
                  </td>

                  <!-- Acciones -->
                  <td class="px-24 py-16 text-center">
                    <div class="d-flex justify-content-center gap-8">
                      <!-- Editar -->
                      <button class="btn bg-main-50 hover-bg-main-100 text-main-600 w-32 h-32 rounded-6 flex-center transition-2"
                              title="Editar"
                              (click)="editarProducto(producto)">
                        <i class="ph ph-pencil text-sm"></i>
                      </button>

                      <!-- Eliminar -->
                      <button class="btn bg-danger-50 hover-bg-danger-100 text-danger-600 w-32 h-32 rounded-6 flex-center transition-2"
                              title="Eliminar"
                              (click)="eliminarProducto(producto.id)">
                        <i class="ph ph-trash text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Empty state -->
            <div *ngIf="productosEnOferta.length === 0" class="text-center py-40">
              <i class="ph ph-package text-gray-300 text-6xl mb-16"></i>
              <h6 class="text-heading fw-semibold mb-8">No hay productos en esta oferta</h6>
              <p class="text-gray-500 mb-16">Agrega productos para que aparezcan en la oferta</p>
              <button class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                      data-bs-toggle="modal" 
                      data-bs-target="#modalAgregarProducto">
                <i class="ph ph-plus me-8"></i>
                Agregar primer producto
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para agregar producto -->
      <div class="modal fade" id="modalAgregarProducto" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content border-0 rounded-12">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title text-heading fw-semibold">
                {{ productoEditando ? 'Editar Producto en Oferta' : 'Agregar Producto a Oferta' }}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            
            <div class="modal-body p-24">
              <!-- Búsqueda de productos (solo para agregar) -->
              <div *ngIf="!productoEditando" class="mb-20">
                <label class="form-label text-heading fw-medium mb-8">Buscar Producto</label>
                <div class="input-group">
                  <input type="text" 
                         class="form-control px-16 py-12 border"
                         [(ngModel)]="busquedaProducto"
                         (input)="buscarProductos()"
                         placeholder="Buscar por nombre o código...">
                  <button class="btn bg-main-600 text-white px-16" type="button" (click)="buscarProductos()">
                    <i class="ph ph-magnifying-glass"></i>
                  </button>
                </div>
              </div>

              <!-- Lista de productos disponibles (solo para agregar) -->
              <div *ngIf="!productoEditando && productosDisponibles.length > 0" class="mb-20">
                <label class="form-label text-heading fw-medium mb-8">Seleccionar Producto</label>
                <div class="border rounded-8 max-h-300 overflow-auto">
                  <div *ngFor="let producto of productosDisponibles" 
                       class="p-12 border-bottom border-gray-100 cursor-pointer hover-bg-gray-50"
                       [class.bg-main-50]="productoSeleccionado?.id === producto.id"
                       (click)="seleccionarProducto(producto)">
                    <div class="d-flex align-items-center gap-12">
                      <div class="w-40 h-40 bg-gray-100 rounded-6 flex-center overflow-hidden">
                        <img *ngIf="producto.imagen_url" 
                             [src]="producto.imagen_url" 
                             [alt]="producto.nombre"
                             class="w-100 h-100 object-fit-cover">
                        <i *ngIf="!producto.imagen_url" class="ph ph-package text-gray-400"></i>
                      </div>
                      <div class="flex-grow-1">
                        <h6 class="text-heading fw-semibold mb-4">{{ producto.nombre }}</h6>
                        <p class="text-gray-500 text-sm mb-0">{{ producto.codigo }} - S/ {{ producto.precio_venta | number:'1.2-2' }}</p>
                        <p class="text-xs text-gray-400 mb-0">Stock: {{ producto.stock }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Información del producto seleccionado -->
              <div *ngIf="productoSeleccionado || productoEditando" class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8">Precio de Oferta *</label>
                  <div class="input-group">
                    <span class="input-group-text bg-gray-50 border-end-0">S/</span>
                    <input type="number" 
                           class="form-control px-16 py-12 border-start-0"
                           [(ngModel)]="formProducto.precio_oferta"
                           min="0"
                           step="0.01"
                           required>
                  </div>
                  <small class="text-muted">
                    Precio original: S/ {{ (productoSeleccionado?.precio_venta || productoEditando?.precio_original) | number:'1.2-2' }}
                  </small>
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8">Stock para Oferta *</label>
                  <input type="number" 
                         class="form-control px-16 py-12 border rounded-8"
                         [(ngModel)]="formProducto.stock_oferta"
                         min="1"
                         [max]="getMaxStock()"
                         required>
                  <small class="text-muted">
                    Stock disponible: {{ getStockDisponible() }}
                  </small>
                </div>
              </div>
            </div>
            
            <div class="modal-footer border-0 pt-0">
              <button type="button" 
                      class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
                      data-bs-dismiss="modal">
                Cancelar
              </button>
              <button type="button" 
                      class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                      [disabled]="isLoading || (!productoSeleccionado && !productoEditando)"
                      (click)="guardarProducto()">
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
                <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
                {{ isLoading ? 'Guardando...' : (productoEditando ? 'Actualizar' : 'Agregar') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cursor-pointer {
      cursor: pointer;
    }
    .max-h-300 {
      max-height: 300px;
    }
    .table td {
      vertical-align: middle;
    }
  `]
})
export class ProductosOfertaComponent implements OnInit {
  @Input() ofertaId!: number;
  @Input() ofertaTitulo: string = '';

  productosEnOferta: ProductoEnOferta[] = [];
  productosDisponibles: ProductoDisponible[] = [];
  productoSeleccionado: ProductoDisponible | null = null;
  productoEditando: ProductoEnOferta | null = null;
  
  busquedaProducto = '';
  isLoading = false;
  isLoadingProductosOferta = false;
  isLoadingProductosDisponibles = false;

  formProducto = {
    precio_oferta: 0,
    stock_oferta: 1
  };

  constructor(
    private ofertasAdminService: OfertasAdminService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    if (this.ofertaId) {
      this.cargarProductosOferta();
    }
  }

  // ✅ MÉTODOS AUXILIARES PARA MANEJAR LOS TIPOS CORRECTAMENTE
  getMaxStock(): number {
    if (this.productoSeleccionado) {
      return this.productoSeleccionado.stock;
    }
    if (this.productoEditando) {
      return this.productoEditando.stock_original;
    }
    return 999999; // Valor por defecto alto
  }

  getStockDisponible(): number {
    if (this.productoSeleccionado) {
      return this.productoSeleccionado.stock;
    }
    if (this.productoEditando) {
      return this.productoEditando.stock_original;
    }
    return 0;
  }

  cargarProductosOferta(): void {
    this.isLoadingProductosOferta = true;
    this.ofertasAdminService.obtenerProductosOferta(this.ofertaId).subscribe({
      next: (productos) => {
        this.productosEnOferta = productos;
        this.isLoadingProductosOferta = false;
      },
      error: (error) => {
        console.error('Error al cargar productos de oferta:', error);
        this.isLoadingProductosOferta = false;
      }
    });
  }

  buscarProductos(): void {
    if (this.busquedaProducto.length < 2) {
      this.productosDisponibles = [];
      return;
    }

    this.isLoadingProductosDisponibles = true;
    this.ofertasAdminService.obtenerProductosDisponibles(this.busquedaProducto).subscribe({
      next: (response) => {
        // Filtrar productos que ya están en la oferta
        const productosEnOfertaIds = this.productosEnOferta.map(p => p.producto_id);
        this.productosDisponibles = response.data.filter(
          (producto: ProductoDisponible) => !productosEnOfertaIds.includes(producto.id)
        );
        this.isLoadingProductosDisponibles = false;
      },
      error: (error) => {
        console.error('Error al buscar productos:', error);
        this.isLoadingProductosDisponibles = false;
      }
    });
  }

  seleccionarProducto(producto: ProductoDisponible): void {
    this.productoSeleccionado = producto;
    this.formProducto = {
      precio_oferta: producto.precio_venta * 0.8, // 20% de descuento por defecto
      stock_oferta: Math.min(producto.stock, 10) // Máximo 10 unidades por defecto
    };
  }

  editarProducto(producto: ProductoEnOferta): void {
    this.productoEditando = producto;
    this.formProducto = {
      precio_oferta: producto.precio_oferta,
      stock_oferta: producto.stock_oferta
    };
    
    const modal = document.getElementById('modalAgregarProducto');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  guardarProducto(): void {
    if (!this.productoSeleccionado && !this.productoEditando) return;

    this.isLoading = true;

    const operacion = this.productoEditando
      ? this.ofertasAdminService.actualizarProductoOferta(
          this.ofertaId, 
          this.productoEditando.id, 
          this.formProducto
        )
      : this.ofertasAdminService.agregarProductoOferta(
          this.ofertaId, 
          this.productoSeleccionado!.id, 
          this.formProducto
        );

    operacion.subscribe({
      next: () => {
        Swal.fire({
          title: '¡Éxito!',
          text: `Producto ${this.productoEditando ? 'actualizado' : 'agregado'} correctamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        this.cargarProductosOferta();
        this.cerrarModal();
        this.isLoading = false;
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo guardar el producto',
          icon: 'error'
        });
        console.error('Error al guardar producto:', error);
        this.isLoading = false;
      }
    });
  }

  eliminarProducto(productoOfertaId: number): void {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ofertasAdminService.eliminarProductoOferta(this.ofertaId, productoOfertaId).subscribe({
          next: () => {
            Swal.fire('¡Eliminado!', 'El producto ha sido eliminado de la oferta.', 'success');
            this.cargarProductosOferta();
          },
          error: (error) => {
            Swal.fire('Error', 'No se pudo eliminar el producto.', 'error');
            console.error('Error al eliminar producto:', error);
          }
        });
      }
    });
  }

  calcularDescuentoPorcentaje(precioOriginal: number, precioOferta: number): number {
    return Math.round(((precioOriginal - precioOferta) / precioOriginal) * 100);
  }

  private cerrarModal(): void {
    const modal = document.getElementById('modalAgregarProducto');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    
    // Resetear formulario
    this.productoSeleccionado = null;
    this.productoEditando = null;
    this.busquedaProducto = '';
    this.productosDisponibles = [];
    this.formProducto = {
      precio_oferta: 0,
      stock_oferta: 1
    };
  }
}