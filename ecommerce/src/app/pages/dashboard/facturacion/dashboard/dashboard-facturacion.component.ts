import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacturacionService } from '../../../../services/facturacion.service';

interface KPIsFacturacion {
  total_comprobantes: number;
  comprobantes_aceptados: number;
  comprobantes_rechazados: number;
  comprobantes_pendientes: number;
  total_ventas: number;
  total_igv: number;
  resumenes_pendientes: number;
  bajas_pendientes: number;
  certificado_activo: boolean;
  sunat_conexion: boolean;
  cola_reintentos: number;
}

interface EstadoSistema {
  certificado_activo: boolean;
  sunat_conexion: boolean;
  cola_pendientes: number;
  ultima_sincronizacion: string;
  modo_operacion: 'beta' | 'prod';
}

@Component({
  selector: 'app-dashboard-facturacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Dashboard de Facturación</h5>
        <p class="text-gray-500 mb-0">Resumen del sistema de facturación electrónica</p>
      </div>
    </div>

    <!-- Estado del Sistema -->
    <div class="row g-4 mb-24">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center"
                     [ngClass]="estadoSistema.certificado_activo ? 'bg-success-50' : 'bg-danger-50'">
                  <i class="ph ph-shield-check text-xl"
                     [ngClass]="estadoSistema.certificado_activo ? 'text-success-600' : 'text-danger-600'"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">
                  {{ estadoSistema.certificado_activo ? 'Activo' : 'Inactivo' }}
                </h6>
                <p class="text-gray-500 mb-0 text-sm">Certificado Digital</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center"
                     [ngClass]="estadoSistema.sunat_conexion ? 'bg-success-50' : 'bg-danger-50'">
                  <i class="ph ph-wifi text-xl"
                     [ngClass]="estadoSistema.sunat_conexion ? 'text-success-600' : 'text-danger-600'"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">
                  {{ estadoSistema.sunat_conexion ? 'Conectado' : 'Desconectado' }}
                </h6>
                <p class="text-gray-500 mb-0 text-sm">Conexión SUNAT</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center bg-warning-50">
                  <i class="ph ph-clock text-xl text-warning-600"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">{{ estadoSistema.cola_pendientes }}</h6>
                <p class="text-gray-500 mb-0 text-sm">Cola de Reintentos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs de Comprobantes -->
    <div class="row g-4 mb-24">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center bg-main-50">
                  <i class="ph ph-file-invoice text-xl text-main-600"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">{{ kpis.total_comprobantes }}</h6>
                <p class="text-gray-500 mb-0 text-sm">Total Comprobantes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center bg-success-50">
                  <i class="ph ph-check-circle text-xl text-success-600"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">{{ kpis.comprobantes_aceptados }}</h6>
                <p class="text-gray-500 mb-0 text-sm">Aceptados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center bg-danger-50">
                  <i class="ph ph-x-circle text-xl text-danger-600"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">{{ kpis.comprobantes_rechazados }}</h6>
                <p class="text-gray-500 mb-0 text-sm">Rechazados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12 h-100">
          <div class="card-body p-24">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0">
                <div class="w-48 h-48 rounded-12 flex-center bg-warning-50">
                  <i class="ph ph-clock text-xl text-warning-600"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-16">
                <h6 class="text-heading fw-semibold mb-4">{{ kpis.comprobantes_pendientes }}</h6>
                <p class="text-gray-500 mb-0 text-sm">Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Información del Sistema y Tareas Pendientes -->
    <div class="row g-4">
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <h6 class="text-heading fw-semibold mb-16">
              <i class="ph ph-info text-main-600 me-8"></i>
              Información del Sistema
            </h6>
            <div class="row">
              <div class="col-6">
                <div class="mb-12">
                  <p class="text-gray-500 mb-4 text-sm">Modo de Operación</p>
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="estadoSistema.modo_operacion === 'prod' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'">
                    {{ estadoSistema.modo_operacion | uppercase }}
                  </span>
                </div>
                <div class="mb-12">
                  <p class="text-gray-500 mb-4 text-sm">Última Sincronización</p>
                  <p class="text-heading fw-medium mb-0 text-sm">{{ estadoSistema.ultima_sincronizacion }}</p>
                </div>
              </div>
              <div class="col-6">
                <div class="mb-12">
                  <p class="text-gray-500 mb-4 text-sm">Total Ventas</p>
                  <p class="text-heading fw-semibold mb-0">S/ {{ kpis.total_ventas | number:'1.2-2' }}</p>
                </div>
                <div class="mb-12">
                  <p class="text-gray-500 mb-4 text-sm">Total IGV</p>
                  <p class="text-heading fw-semibold mb-0">S/ {{ kpis.total_igv | number:'1.2-2' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <h6 class="text-heading fw-semibold mb-16">
              <i class="ph ph-list-checks text-main-600 me-8"></i>
              Tareas Pendientes
            </h6>
            <div class="d-flex justify-content-between align-items-center mb-12">
              <div class="d-flex align-items-center">
                <div class="w-32 h-32 rounded-8 flex-center bg-warning-50 me-12">
                  <i class="ph ph-file-text text-sm text-warning-600"></i>
                </div>
                <span class="text-heading fw-medium">Resúmenes Pendientes</span>
              </div>
              <span class="badge bg-warning-50 text-warning-600 px-12 py-6 rounded-pill fw-medium">
                {{ kpis.resumenes_pendientes }}
              </span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <div class="w-32 h-32 rounded-8 flex-center bg-danger-50 me-12">
                  <i class="ph ph-file-x text-sm text-danger-600"></i>
                </div>
                <span class="text-heading fw-medium">Bajas Pendientes</span>
              </div>
              <span class="badge bg-danger-50 text-danger-600 px-12 py-6 rounded-pill fw-medium">
                {{ kpis.bajas_pendientes }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .flex-center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flex-shrink-0 {
      flex-shrink: 0;
    }
    .flex-grow-1 {
      flex-grow: 1;
    }
  `,
  ],
})
export class DashboardFacturacionComponent implements OnInit {
  kpis: KPIsFacturacion = {
    total_comprobantes: 0,
    comprobantes_aceptados: 0,
    comprobantes_rechazados: 0,
    comprobantes_pendientes: 0,
    total_ventas: 0,
    total_igv: 0,
    resumenes_pendientes: 0,
    bajas_pendientes: 0,
    certificado_activo: false,
    sunat_conexion: false,
    cola_reintentos: 0
  };

  estadoSistema: EstadoSistema = {
    certificado_activo: false,
    sunat_conexion: false,
    cola_pendientes: 0,
    ultima_sincronizacion: '',
    modo_operacion: 'beta'
  };

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarKPIs();
    this.cargarEstadoSistema();
  }

  cargarKPIs(): void {
    this.facturacionService.getKPIs().subscribe({
      next: (data: any) => {
        this.kpis = data.data || data;
      },
      error: (error: any) => {
        console.error('Error al cargar KPIs:', error);
        // Usar datos por defecto
        this.kpis = {
          total_comprobantes: 0,
          comprobantes_aceptados: 0,
          comprobantes_rechazados: 0,
          comprobantes_pendientes: 0,
          total_ventas: 0,
          total_igv: 0,
          resumenes_pendientes: 0,
          bajas_pendientes: 0,
          certificado_activo: false,
          sunat_conexion: false,
          cola_reintentos: 0
        };
      }
    });
  }

  cargarEstadoSistema(): void {
    this.facturacionService.getEstadoSistema().subscribe({
      next: (estado: any) => {
        this.estadoSistema = estado.data || estado;
      },
      error: (error) => {
        console.error('Error al cargar estado del sistema:', error);
        // Usar datos por defecto
        this.estadoSistema = {
          certificado_activo: true,
          sunat_conexion: true,
          cola_pendientes: 0,
          ultima_sincronizacion: new Date().toLocaleString(),
          modo_operacion: 'beta'
        };
      }
    });
  }
}