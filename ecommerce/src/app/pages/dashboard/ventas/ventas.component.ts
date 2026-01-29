// src/app/pages/dashboard/ventas/ventas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { VentasService } from '../../../services/ventas.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-24">
        <div>
        <!--  <h4 class="text-heading fw-semibold mb-8">Gestión de Ventas</h4> -->
          <p class="text-gray-500 mb-0">
            Administra ventas, facturación y reportes desde un solo lugar
          </p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="card border-0 shadow-sm rounded-12 mb-24">
        <div class="card-body p-0">
          <nav class="nav nav-tabs border-0" id="ventasTabs" role="tablist">
            <button
              class="nav-link px-24 py-16 border-0 text-heading fw-medium"
              [class.active]="activeTab === 'lista'"
              (click)="navigateToTab('lista')"
              type="button"
            >
              <i class="ph ph-list me-8"></i>
              Lista de Ventas
              <span class="badge bg-main-50 text-main-600 ms-8">{{
                totalVentas
              }}</span>
            </button>
            <button
              class="nav-link px-24 py-16 border-0 text-heading fw-medium"
              (click)="irAPOS()"
              type="button"
            >
              <i class="ph ph-plus me-8"></i>
              Nueva Venta
            </button>
            <button
              class="nav-link px-24 py-16 border-0 text-heading fw-medium"
              [class.active]="activeTab === 'estadisticas'"
              (click)="navigateToTab('estadisticas')"
              type="button"
            >
              <i class="ph ph-chart-bar me-8"></i>
              Estadísticas
            </button>
          </nav>
        </div>
      </div>

      <!-- Content -->
      <div class="tab-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
      .nav-tabs .nav-link {
        border-radius: 0;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .nav-tabs .nav-link.active {
        background-color: var(--bs-main-50);
        color: var(--bs-main-600);
        border-bottom: 2px solid var(--bs-main-600);
      }
      .nav-tabs .nav-link:hover {
        background-color: var(--bs-gray-50);
      }
    `,
  ],
})
export class VentasComponent implements OnInit {
  totalVentas = 0;
  activeTab = 'lista';

  constructor(
    private ventasService: VentasService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTotales();
    this.detectActiveTab();

    // Escuchar cambios de ruta para actualizar la pestaña activa
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.detectActiveTab();
      });
  }

  private cargarTotales(): void {
    this.ventasService.obtenerVentas().subscribe({
      next: (response) => {
        this.totalVentas = response.total || 0;
      },
      error: (error) => {
        console.error('Error al cargar ventas:', error);
        this.totalVentas = 0;
      },
    });
  }

  private detectActiveTab(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/ventas/nueva')) {
      this.activeTab = 'nueva';
    } else if (currentUrl.includes('/ventas/estadisticas')) {
      this.activeTab = 'estadisticas';
    } else {
      this.activeTab = 'lista';
    }
  }

  navigateToTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'lista') {
      this.router.navigate(['/dashboard/ventas']);
    } else {
      this.router.navigate(['/dashboard/ventas', tab]);
    }
  }

  irAPOS(): void {
    this.router.navigate(['/dashboard/ventas/nueva']);
  }
}