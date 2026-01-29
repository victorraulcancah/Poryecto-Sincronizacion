// src\app\pages\dashboard\almacen\almacen.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlmacenService } from '../../../services/almacen.service';
import { Seccion } from '../../../types/almacen.types';
import { SeccionesGestionModalComponent } from './/secciones-gestion-modal/secciones-gestion-modal.component';
import { SeccionFilterService } from '../../../services/seccion-filter.service';
import { PermissionsService } from '../../../services/permissions.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SeccionesGestionModalComponent,
    FormsModule,
  ],
  template: `
    <div class="container-fluid">
      <!-- Filtro de Sección -->
      <div class="card border-0 shadow-sm rounded-12 mb-24">
        <div class="card-body px-24 py-16">
          <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-12">
              <i class="ph ph-funnel text-gray-600"></i>
              <span class="text-sm text-gray-600">Filtrar por Sección</span>
              <select
                class="form-select form-select-sm border-gray-300 rounded-8"
                style="min-width: 150px; max-width: 200px;"
                [(ngModel)]="seccionSeleccionada"
                (change)="onSeccionChange($event)"
              >
                <option value="" disabled>Seleccionar</option>
                <option value="todas">Todas</option>
                <option *ngFor="let seccion of secciones" [value]="seccion.id">
                  {{ seccion.nombre }}
                </option>
              </select>
            </div>

            <!-- Botón para agregar/gestionar secciones -->
            <button
              class="btn btn-sm bg-main-600 hover-bg-main-700 text-white px-12 py-6 rounded-8"
              *ngIf="permissionsService.canViewSecciones()"
              (click)="abrirModalSeccion()"
              title="Agregar/Gestionar Secciones"
            >
              <i class="ph ph-plus me-6"></i>
              Secciones
            </button>
          </div>
        </div>
      </div>

      <!-- Listado de Productos -->
      <div class="tab-content">
        <router-outlet></router-outlet>
      </div>
    </div>

    <!-- Modal de gestión de secciones -->
    <app-secciones-gestion-modal
      (seccionesActualizadas)="onSeccionesActualizadas()"
    >
    </app-secciones-gestion-modal>
  `,
  styles: [
    `
      .form-select-sm {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
      }
      .gap-8 {
        gap: 8px;
      }
      .gap-12 {
        gap: 12px;
      }
      .btn-sm {
        padding: 0.375rem 0.5rem;
        font-size: 0.875rem;
      }

      /* Estilos responsivos adicionales */
      @media (max-width: 575.98px) {
        .px-24 {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
      }
    `,
  ],
})
export class AlmacenComponent implements OnInit {
  secciones: Seccion[] = [];
  seccionSeleccionada: string | null = null;

  constructor(
    private almacenService: AlmacenService,
    private seccionFilterService: SeccionFilterService,
    public permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarSecciones();

    // ✅ MODIFICADO: Inicializar con Sección 1 por defecto
    this.seccionSeleccionada = '1';
    if (this.seccionFilterService.setSeccionSeleccionada) {
      this.seccionFilterService.setSeccionSeleccionada(1);
    }
  }



  private cargarSecciones(): void {
    this.almacenService.obtenerSecciones().subscribe({
      next: (secciones) => {
        this.secciones = secciones;
      },
      error: (error) => {
        console.error('Error al cargar secciones:', error);
      },
    });
  }

  onSeccionChange(event: any): void {
    const value = event.target ? event.target.value : event;

    if (value === 'todas' || value === '') {
      this.seccionSeleccionada = 'todas';
      if (this.seccionFilterService.setSeccionSeleccionada) {
        this.seccionFilterService.setSeccionSeleccionada(null);
      }
    } else {
      this.seccionSeleccionada = value;
      if (this.seccionFilterService.setSeccionSeleccionada) {
        this.seccionFilterService.setSeccionSeleccionada(Number(value));
      }
    }

    console.log('Sección seleccionada:', this.seccionSeleccionada);
  }

  abrirModalSeccion(): void {
    const modal = document.getElementById('modalGestionSecciones');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  onSeccionesActualizadas(): void {
    this.cargarSecciones();
  }

}
