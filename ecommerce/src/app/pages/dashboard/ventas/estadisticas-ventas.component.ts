// src/app/pages/dashboard/ventas/estadisticas-ventas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { VentasService, EstadisticasVentas } from '../../../services/ventas.service';

@Component({
  selector: 'app-estadisticas-ventas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Estadísticas de Ventas</h5>
        <p class="text-gray-500 mb-0">Análisis y reportes de ventas del sistema</p>
      </div>
    </div>

    <!-- Filtros de fecha -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <form [formGroup]="filtrosForm" (ngSubmit)="cargarEstadisticas()">
          <div class="row">
            <div class="col-md-4 mb-16">
              <label class="form-label text-heading fw-medium mb-8">Fecha Inicio</label>
              <input 
                type="date" 
                class="form-control px-16 py-12 border rounded-8"
                formControlName="fecha_inicio">
            </div>
            <div class="col-md-4 mb-16">
              <label class="form-label text-heading fw-medium mb-8">Fecha Fin</label>
              <input 
                type="date" 
                class="form-control px-16 py-12 border rounded-8"
                formControlName="fecha_fin">
            </div>
            <div class="col-md-4 mb-16">
              <label class="form-label text-heading fw-medium mb-8">&nbsp;</label>
              <button 
                type="submit" 
                class="btn bg-main-600 hover-bg-main-700 text-white px-24 py-12 rounded-8 w-100">
                <i class="ph ph-magnifying-glass me-8"></i>
                Consultar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="row mb-24" *ngIf="estadisticas">
      <div class="col-lg-3 col-md-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="w-48 h-48 bg-main-50 rounded-12 flex-center me-16">
                <i class="ph ph-shopping-cart text-main-600 text-xl"></i>
              </div>
              <div>
                <h6 class="text-heading fw-semibold mb-4">Total Ventas</h6>
                <p class="text-2xl fw-bold text-main-600 mb-0">{{ estadisticas.total_ventas }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-3 col-md-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="w-48 h-48 bg-success-50 rounded-12 flex-center me-16">
                <i class="ph ph-currency-circle-dollar text-success-600 text-xl"></i>
              </div>
              <div>
                <h6 class="text-heading fw-semibold mb-4">Monto Total</h6>
                <p class="text-2xl fw-bold text-success-600 mb-0">S/ {{ estadisticas.monto_total | number:'1.2-2' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-3 col-md-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="w-48 h-48 bg-warning-50 rounded-12 flex-center me-16">
                <i class="ph ph-clock text-warning-600 text-xl"></i>
              </div>
              <div>
                <h6 class="text-heading fw-semibold mb-4">Pendientes</h6>
                <p class="text-2xl fw-bold text-warning-600 mb-0">{{ estadisticas.ventas_pendientes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-3 col-md-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="w-48 h-48 bg-info-50 rounded-12 flex-center me-16">
                <i class="ph ph-receipt text-info-600 text-xl"></i>
              </div>
              <div>
                <h6 class="text-heading fw-semibold mb-4">Facturadas</h6>
                <p class="text-2xl fw-bold text-info-600 mb-0">{{ estadisticas.ventas_facturadas }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráficos y análisis adicionales -->
    <div class="row">
      <div class="col-lg-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-header bg-gray-50 border-0 rounded-top-12 p-24">
            <h6 class="text-heading fw-semibold mb-0">Ventas por Estado</h6>
          </div>
          <div class="card-body p-24">
            <div *ngIf="estadisticas" class="text-center">
              <div class="mb-16">
                <div class="d-flex justify-content-between align-items-center mb-8">
                  <span class="text-gray-600">Pendientes</span>
                  <span class="text-heading fw-medium">{{ estadisticas.ventas_pendientes }}</span>
                </div>
                <div class="progress mb-12" style="height: 8px;">
                  <div 
                    class="progress-bar bg-warning" 
                    [style.width.%]="getPorcentaje(estadisticas.ventas_pendientes)">
                  </div>
                </div>
              </div>
              
              <div class="mb-16">
                <div class="d-flex justify-content-between align-items-center mb-8">
                  <span class="text-gray-600">Facturadas</span>
                  <span class="text-heading fw-medium">{{ estadisticas.ventas_facturadas }}</span>
                </div>
                <div class="progress mb-12" style="height: 8px;">
                  <div 
                    class="progress-bar bg-success" 
                    [style.width.%]="getPorcentaje(estadisticas.ventas_facturadas)">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6 mb-24">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-header bg-gray-50 border-0 rounded-top-12 p-24">
            <h6 class="text-heading fw-semibold mb-0">Tipos de Venta</h6>
          </div>
          <div class="card-body p-24">
            <div *ngIf="estadisticas" class="text-center">
              <div class="mb-16">
                <div class="d-flex justify-content-between align-items-center mb-8">
                  <span class="text-gray-600">E-commerce</span>
                  <span class="text-heading fw-medium">{{ estadisticas.ventas_ecommerce }}</span>
                </div>
                <div class="progress mb-12" style="height: 8px;">
                  <div 
                    class="progress-bar bg-main" 
                    [style.width.%]="getPorcentaje(estadisticas.ventas_ecommerce)">
                  </div>
                </div>
              </div>
              
              <div class="mb-16">
                <div class="d-flex justify-content-between align-items-center mb-8">
                  <span class="text-gray-600">Tradicionales</span>
                  <span class="text-heading fw-medium">{{ getVentasTradicionales() }}</span>
                </div>
                <div class="progress mb-12" style="height: 8px;">
                  <div 
                    class="progress-bar bg-secondary" 
                    [style.width.%]="getPorcentaje(getVentasTradicionales())">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div *ngIf="isLoading" class="text-center py-40">
      <div class="spinner-border text-main-600" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-gray-500 mt-12 mb-0">Cargando estadísticas...</p>
    </div>

    <!-- Empty state -->
    <div *ngIf="!isLoading && !estadisticas" class="text-center py-40">
      <i class="ph ph-chart-bar text-gray-300 text-6xl mb-16"></i>
      <h6 class="text-heading fw-semibold mb-8">No hay datos</h6>
      <p class="text-gray-500 mb-16">No se encontraron estadísticas para el período seleccionado</p>
    </div>
  `,
  styles: [
    `
    .progress {
      background-color: #f8f9fa;
    }
  `,
  ],
})
export class EstadisticasVentasComponent implements OnInit {
  estadisticas: EstadisticasVentas | null = null;
  isLoading = false;
  filtrosForm: FormGroup;

  constructor(
    private ventasService: VentasService,
    private fb: FormBuilder
  ) {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.filtrosForm = this.fb.group({
      fecha_inicio: [inicioMes.toISOString().split('T')[0]],
      fecha_fin: [hoy.toISOString().split('T')[0]]
    });
  }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.isLoading = true;
    const { fecha_inicio, fecha_fin } = this.filtrosForm.value;

    this.ventasService.obtenerEstadisticas(fecha_inicio, fecha_fin).subscribe({
      next: (estadisticas: EstadisticasVentas) => {
        this.estadisticas = estadisticas;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar estadísticas:', error);
        this.isLoading = false;
      }
    });
  }

  getPorcentaje(valor: number): number {
    if (!this.estadisticas || this.estadisticas.total_ventas === 0) {
      return 0;
    }
    return (valor / this.estadisticas.total_ventas) * 100;
  }

  getVentasTradicionales(): number {
    if (!this.estadisticas) return 0;
    return this.estadisticas.total_ventas - this.estadisticas.ventas_ecommerce;
  }
}