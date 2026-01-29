import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import Swal from 'sweetalert2';

interface CatalogoItem {
  codigo: string;
  descripcion: string;
  activo: boolean;
}

interface Catalogo {
  nombre: string;
  descripcion: string;
  total_items: number;
  items: CatalogoItem[];
}

@Component({
  selector: 'app-catalogos-sunat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Catálogos SUNAT</h5>
        <p class="text-gray-500 mb-0">Consulta los catálogos oficiales de SUNAT para facturación electrónica</p>
      </div>
      <div class="d-flex gap-12">
        <button 
          class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
          (click)="actualizarCatalogos()">
          <i class="ph ph-arrow-clockwise me-8"></i>
          Actualizar
        </button>
        <button 
          class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
          (click)="exportarCatalogo()">
          <i class="ph ph-download me-8"></i>
          Exportar
        </button>
      </div>
    </div>

    <!-- Selector de catálogo -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-8 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Seleccionar Catálogo</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="catalogoSeleccionado" (change)="cargarCatalogo()">
              <option value="">Seleccione un catálogo...</option>
              <option value="01">01 - Códigos de Tipo de Documento</option>
              <option value="02">02 - Códigos de Tipo de Moneda</option>
              <option value="03">03 - Códigos de Tipo de Unidad de Medida</option>
              <option value="04">04 - Códigos de Tipo de Operación</option>
              <option value="05">05 - Códigos de Tipo de Afectación del IGV</option>
              <option value="06">06 - Códigos de Tipo de Sistema de Cálculo del ISC</option>
              <option value="07">07 - Códigos de Tipo de Afectación del ISC</option>
              <option value="08">08 - Códigos de Tipo de Carga Utilizada</option>
              <option value="09">09 - Códigos de Tipo de Nota de Crédito</option>
              <option value="10">10 - Códigos de Tipo de Nota de Débito</option>
              <option value="11">11 - Códigos de Tipo de Valor de Venta</option>
              <option value="12">12 - Códigos de Tipo de Precio de Venta</option>
              <option value="13">13 - Códigos de Tipo de Tributo</option>
              <option value="14">14 - Códigos de Tipo de Documento de Identidad</option>
              <option value="15">15 - Códigos de Tipo de Contribuyente</option>
              <option value="16">16 - Códigos de Tipo de Relación</option>
              <option value="17">17 - Códigos de Tipo de Documento Relacionado</option>
              <option value="18">18 - Códigos de Tipo de Otro Documento Relacionado</option>
              <option value="19">19 - Códigos de Tipo de Operación</option>
              <option value="20">20 - Códigos de Tipo de Pago</option>
              <option value="21">21 - Códigos de Tipo de Anexo</option>
              <option value="22">22 - Códigos de Tipo de Producto</option>
              <option value="23">23 - Códigos de Tipo de Servicio</option>
              <option value="24">24 - Códigos de Tipo de Bien</option>
              <option value="25">25 - Códigos de Tipo de Servicio Público</option>
              <option value="26">26 - Códigos de Tipo de Servicio de Telecomunicaciones</option>
              <option value="27">27 - Códigos de Tipo de Servicio de Transporte</option>
              <option value="28">28 - Códigos de Tipo de Servicio de Alojamiento</option>
              <option value="29">29 - Códigos de Tipo de Servicio de Alimentación</option>
              <option value="30">30 - Códigos de Tipo de Servicio de Espectáculos Públicos</option>
              <option value="31">31 - Códigos de Tipo de Servicio de Juegos de Azar</option>
              <option value="32">32 - Códigos de Tipo de Servicio de Apuestas</option>
              <option value="33">33 - Códigos de Tipo de Servicio de Lotería</option>
              <option value="34">34 - Códigos de Tipo de Servicio de Rifas</option>
              <option value="35">35 - Códigos de Tipo de Servicio de Apuestas Deportivas</option>
              <option value="36">36 - Códigos de Tipo de Servicio de Apuestas Hípicas</option>
              <option value="37">37 - Códigos de Tipo de Servicio de Apuestas de Lotería</option>
              <option value="38">38 - Códigos de Tipo de Servicio de Apuestas de Rifas</option>
              <option value="39">39 - Códigos de Tipo de Servicio de Apuestas de Juegos de Azar</option>
              <option value="40">40 - Códigos de Tipo de Servicio de Apuestas de Espectáculos Públicos</option>
            </select>
          </div>
          <div class="col-md-4 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Buscar</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control px-16 py-12 border rounded-start-8"
                placeholder="Código o descripción..."
                [(ngModel)]="terminoBusqueda"
                (input)="filtrarItems()">
              <button 
                type="button" 
                class="btn bg-main-600 text-white px-16 rounded-end-8"
                (click)="filtrarItems()">
                <i class="ph ph-magnifying-glass"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Información del catálogo -->
    <div *ngIf="catalogoActual" class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-8">
            <h6 class="text-heading fw-semibold mb-8">{{ catalogoActual.nombre }}</h6>
            <p class="text-gray-600 mb-0">{{ catalogoActual.descripcion }}</p>
          </div>
          <div class="col-md-4 text-end">
            <div class="d-flex align-items-center justify-content-end gap-16">
              <div class="text-center">
                <h6 class="text-heading fw-semibold mb-0">{{ catalogoActual.total_items }}</h6>
                <small class="text-gray-500">Total Items</small>
              </div>
              <div class="text-center">
                <h6 class="text-heading fw-semibold mb-0">{{ itemsFiltrados.length }}</h6>
                <small class="text-gray-500">Mostrados</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de items del catálogo -->
    <div *ngIf="catalogoActual" class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando catálogo...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarCatalogo()">
            <i class="ph ph-arrow-clockwise me-4"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Código</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Descripción</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of itemsFiltrados" class="border-bottom border-gray-100">
                <!-- Código -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ item.codigo }}</span>
                </td>

                <!-- Descripción -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ item.descripcion }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="item.activo ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'">
                    {{ item.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Ver Detalle -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Ver Detalle"
                      (click)="verDetalle(item)">
                      <i class="ph ph-eye text-sm"></i>
                    </button>

                    <!-- Copiar Código -->
                    <button 
                      class="btn bg-primary-50 hover-bg-primary-100 text-primary-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Copiar Código"
                      (click)="copiarCodigo(item.codigo)">
                      <i class="ph ph-copy text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="itemsFiltrados.length === 0" class="text-center py-40">
            <i class="ph ph-magnifying-glass text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No se encontraron resultados</h6>
            <p class="text-gray-500 mb-16">No hay items que coincidan con tu búsqueda.</p>
            <button 
              class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
              (click)="limpiarBusqueda()">
              <i class="ph ph-broom me-8"></i>
              Limpiar Búsqueda
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado inicial -->
    <div *ngIf="!catalogoActual && !loading" class="text-center py-40">
      <i class="ph ph-books text-gray-300 text-6xl mb-16"></i>
      <h6 class="text-heading fw-semibold mb-8">Selecciona un catálogo</h6>
      <p class="text-gray-500 mb-16">Elige un catálogo de la lista para ver su contenido.</p>
    </div>
  `,
  styles: [
    `
      .table td {
        vertical-align: middle;
      }
      
      .flex-center {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .transition-2 {
        transition: all 0.2s ease;
      }
    `,
  ],
})
export class CatalogosSunatComponent implements OnInit {
  catalogoSeleccionado = '';
  catalogoActual: Catalogo | null = null;
  itemsFiltrados: CatalogoItem[] = [];
  terminoBusqueda = '';
  loading = false;
  error = '';

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    // No cargar ningún catálogo por defecto
  }

  cargarCatalogo(): void {
    if (!this.catalogoSeleccionado) {
      this.catalogoActual = null;
      this.itemsFiltrados = [];
      return;
    }

    this.loading = true;
    this.error = '';

    this.facturacionService.getCatalogo(this.catalogoSeleccionado).subscribe({
      next: (response) => {
        this.catalogoActual = response.data;
        this.itemsFiltrados = this.catalogoActual?.items || [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar el catálogo';
        this.loading = false;
        console.error('Error al cargar catálogo:', e);
      }
    });
  }

  filtrarItems(): void {
    if (!this.catalogoActual) return;

    if (!this.terminoBusqueda.trim()) {
      this.itemsFiltrados = this.catalogoActual.items;
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.itemsFiltrados = this.catalogoActual.items.filter(item =>
      item.codigo.toLowerCase().includes(termino) ||
      item.descripcion.toLowerCase().includes(termino)
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.filtrarItems();
  }

  verDetalle(item: CatalogoItem): void {
    Swal.fire({
      title: 'Detalle del Item',
      html: `
        <div class="text-start">
          <p><strong>Código:</strong> ${item.codigo}</p>
          <p><strong>Descripción:</strong> ${item.descripcion}</p>
          <p><strong>Estado:</strong> ${item.activo ? 'Activo' : 'Inactivo'}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }

  copiarCodigo(codigo: string): void {
    navigator.clipboard.writeText(codigo).then(() => {
      Swal.fire({
        title: 'Copiado',
        text: `Código "${codigo}" copiado al portapapeles`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }).catch(() => {
      Swal.fire('Error', 'No se pudo copiar el código', 'error');
    });
  }

  actualizarCatalogos(): void {
    Swal.fire('Info', 'Funcionalidad de actualización en desarrollo.', 'info');
  }

  exportarCatalogo(): void {
    if (!this.catalogoActual) {
      Swal.fire('Advertencia', 'Selecciona un catálogo primero', 'warning');
      return;
    }
    
    Swal.fire('Info', 'Funcionalidad de exportación en desarrollo.', 'info');
  }
}