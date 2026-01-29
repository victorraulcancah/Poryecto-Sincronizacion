import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import Swal from 'sweetalert2';

interface Certificado {
  id: number;
  nombre: string;
  ruc: string;
  fecha_vencimiento: string;
  estado: 'activo' | 'inactivo' | 'vencido';
  valido: boolean;
  ruta_archivo: string;
  created_at: string;
}

@Component({
  selector: 'app-certificados-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Certificados Digitales</h5>
        <p class="text-gray-500 mb-0">Administra los certificados digitales para facturación electrónica</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="abrirModalSubir()">
        <i class="ph ph-upload me-8"></i>
        Subir Certificado
      </button>
    </div>

    <!-- Estado del certificado activo -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <h6 class="text-heading fw-semibold mb-16">Estado del Certificado Activo</h6>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="d-flex align-items-center gap-16 p-16 border border-gray-200 rounded-8">
              <div class="w-48 h-48 rounded-12 flex-center"
                   [ngClass]="certificadoActivo ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'">
                <i class="ph ph-shield-check text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Estado</p>
                <h6 class="text-heading fw-semibold mb-0">
                  {{ certificadoActivo ? 'Activo' : 'Sin Certificado' }}
                </h6>
              </div>
            </div>
          </div>
          <div class="col-md-4" *ngIf="certificadoActivo">
            <div class="d-flex align-items-center gap-16 p-16 border border-gray-200 rounded-8">
              <div class="w-48 h-48 rounded-12 flex-center"
                   [ngClass]="certificadoActivo?.valido ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'">
                <i class="ph ph-check-circle text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Validez</p>
                <h6 class="text-heading fw-semibold mb-0">
                  {{ certificadoActivo?.valido ? 'Válido' : 'Inválido' }}
                </h6>
              </div>
            </div>
          </div>
          <div class="col-md-4" *ngIf="certificadoActivo">
            <div class="d-flex align-items-center gap-16 p-16 border border-gray-200 rounded-8">
              <div class="w-48 h-48 rounded-12 flex-center bg-info-50 text-info-600">
                <i class="ph ph-calendar text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Vencimiento</p>
                <h6 class="text-heading fw-semibold mb-0">
                  {{ certificadoActivo?.fecha_vencimiento | date:'dd/MM/yyyy' }}
                </h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Estado</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Validez</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroValidez" (change)="aplicarFiltros()">
              <option value="">Todos</option>
              <option value="true">Válidos</option>
              <option value="false">Inválidos</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Buscar</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control px-16 py-12 border rounded-start-8"
                placeholder="Nombre, RUC..."
                [(ngModel)]="filtroBusqueda"
                (input)="aplicarFiltros()">
              <button 
                type="button" 
                class="btn bg-main-600 text-white px-16 rounded-end-8"
                (click)="cargarCertificados()">
                <i class="ph ph-magnifying-glass"></i>
              </button>
            </div>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Acciones</label>
            <div class="d-grid">
              <button 
                class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
                (click)="limpiarFiltros()">
                <i class="ph ph-broom me-8"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de certificados -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando certificados...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarCertificados()">
            <i class="ph ph-arrow-clockwise me-4"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Nombre</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">RUC</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Vencimiento</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Validez</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cert of certificados" class="border-bottom border-gray-100">
                <!-- Nombre -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ cert.nombre }}</span>
                </td>

                <!-- RUC -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ cert.ruc }}</span>
                </td>

                <!-- Vencimiento -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ cert.fecha_vencimiento | date:'dd/MM/yyyy' }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(cert.estado)">
                    {{ cert.estado | titlecase }}
                  </span>
                </td>

                <!-- Validez -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="cert.valido ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'">
                    {{ cert.valido ? 'Válido' : 'Inválido' }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Validar -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Validar Certificado"
                      (click)="validarCertificado(cert)" 
                      [disabled]="validando">
                      <i class="ph ph-magnifying-glass text-sm"></i>
                    </button>

                    <!-- Activar -->
                    <button 
                      class="btn bg-success-50 hover-bg-success-100 text-success-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Activar Certificado"
                      (click)="activarCertificado(cert)" 
                      [disabled]="cert.estado === 'activo' || activando">
                      <i class="ph ph-check text-sm"></i>
                    </button>

                    <!-- Editar -->
                    <button 
                      class="btn bg-warning-50 hover-bg-warning-100 text-warning-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Editar Certificado"
                      (click)="editarCertificado(cert)">
                      <i class="ph ph-pencil text-sm"></i>
                    </button>

                    <!-- Eliminar -->
                    <button 
                      class="btn bg-danger-50 hover-bg-danger-100 text-danger-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Eliminar Certificado"
                      (click)="eliminarCertificado(cert)" 
                      [disabled]="cert.estado === 'activo'">
                      <i class="ph ph-trash text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="certificados.length === 0" class="text-center py-40">
            <i class="ph ph-shield-check text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay certificados</h6>
            <p class="text-gray-500 mb-16">No se encontraron certificados con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="abrirModalSubir()">
              <i class="ph ph-upload me-8"></i>
              Subir Primer Certificado
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para subir certificado -->
    <div class="modal fade" [class.show]="mostrarModalSubir" [style.display]="mostrarModalSubir ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-heading fw-semibold">Subir Certificado Digital</h5>
            <button type="button" class="btn-close" (click)="cerrarModalSubir()"></button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="subirCertificado()">
              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Archivo Certificado (.pfx)</label>
                <input type="file" class="form-control px-16 py-12 border rounded-8" accept=".pfx" 
                       (change)="onFileChange($event)" #fileInput>
                <div class="form-text text-gray-500">Selecciona el archivo .pfx de tu certificado digital</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Contraseña del Certificado</label>
                <div class="input-group">
                  <input [type]="mostrarPassword ? 'text' : 'password'" class="form-control px-16 py-12 border rounded-start-8" 
                         [(ngModel)]="passwordCertificado" name="password" placeholder="••••••••">
                  <button type="button" class="btn btn-outline-secondary rounded-end-8" 
                          (click)="mostrarPassword = !mostrarPassword">
                    <i [class]="mostrarPassword ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
                  </button>
                </div>
                <div class="form-text text-gray-500">Contraseña que protege el archivo .pfx</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Nombre del Certificado</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" [(ngModel)]="nombreCertificado" 
                       name="nombre" placeholder="Certificado 2025">
                <div class="form-text text-gray-500">Nombre descriptivo para identificar el certificado</div>
              </div>

              <div class="alert alert-info border-0 rounded-12">
                <h6 class="alert-heading text-heading fw-semibold">
                  <i class="ph ph-info me-8"></i> Información Importante
                </h6>
                <ul class="mb-0 text-gray-600">
                  <li>El certificado debe estar vigente</li>
                  <li>Debe coincidir con el RUC de tu empresa</li>
                  <li>Se recomienda hacer una copia de seguridad</li>
                  <li>El archivo se almacena de forma segura</li>
                </ul>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8" (click)="cerrarModalSubir()">Cancelar</button>
            <button type="button" class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8" (click)="subirCertificado()" 
                    [disabled]="!archivoSeleccionado || !passwordCertificado || subiendo">
              <span *ngIf="subiendo" class="spinner-border spinner-border-sm me-8"></span>
              {{ subiendo ? 'Subiendo...' : 'Subir Certificado' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="mostrarModalSubir" class="modal-backdrop fade show"></div>
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
export class CertificadosListComponent implements OnInit {
  certificados: Certificado[] = [];
  loading = false;
  error = '';
  
  // Modal subir certificado
  mostrarModalSubir = false;
  archivoSeleccionado: File | null = null;
  passwordCertificado = '';
  nombreCertificado = '';
  mostrarPassword = false;
  subiendo = false;
  
  // Estados de acciones
  validando = false;
  activando = false;
  
  // Filtros
  filtroEstado = '';
  filtroValidez = '';
  filtroBusqueda = '';
  
  // Certificado activo
  certificadoActivo: Certificado | null = null;

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarCertificados();
  }

  cargarCertificados(): void {
    this.loading = true;
    this.error = '';
    
    this.facturacionService.getCertificados().subscribe({
      next: (response) => {
        this.certificados = response.data || [];
        this.certificadoActivo = this.certificados.find(c => c.estado === 'activo') || null;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar certificados';
        this.loading = false;
        console.error('Error al cargar certificados:', error);
      }
    });
  }

  aplicarFiltros(): void {
    // Implementar filtrado local o llamar al backend con filtros
    this.cargarCertificados();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroValidez = '';
    this.filtroBusqueda = '';
    this.cargarCertificados();
  }

  abrirModalSubir(): void {
    this.mostrarModalSubir = true;
    this.archivoSeleccionado = null;
    this.passwordCertificado = '';
    this.nombreCertificado = '';
  }

  cerrarModalSubir(): void {
    this.mostrarModalSubir = false;
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.pfx')) {
        this.archivoSeleccionado = file;
        if (!this.nombreCertificado) {
          this.nombreCertificado = file.name.replace('.pfx', '');
        }
      } else {
        Swal.fire('Error', 'Por favor selecciona un archivo .pfx válido', 'error');
        event.target.value = '';
      }
    }
  }

  subirCertificado(): void {
    if (!this.archivoSeleccionado || !this.passwordCertificado) return;

    this.subiendo = true;
    const formData = new FormData();
    formData.append('archivo_pfx', this.archivoSeleccionado);
    formData.append('password', this.passwordCertificado);
    formData.append('nombre', this.nombreCertificado);

    this.facturacionService.subirCertificado(formData).subscribe({
      next: (response) => {
        this.subiendo = false;
        this.cerrarModalSubir();
        this.cargarCertificados();
        Swal.fire('Éxito', 'Certificado subido correctamente.', 'success');
        console.log('Certificado subido:', response);
      },
      error: (error) => {
        this.subiendo = false;
        Swal.fire('Error', 'No se pudo subir el certificado.', 'error');
        console.error('Error al subir certificado:', error);
      }
    });
  }

  validarCertificado(certificado: Certificado): void {
    this.validando = true;
    
    this.facturacionService.validarCertificado(certificado.id).subscribe({
      next: (response) => {
        this.validando = false;
        this.cargarCertificados(); // Recargar para ver estado actualizado
        Swal.fire('Éxito', 'Certificado validado correctamente.', 'success');
        console.log('Certificado validado:', response);
      },
      error: (error) => {
        this.validando = false;
        Swal.fire('Error', 'No se pudo validar el certificado.', 'error');
        console.error('Error al validar certificado:', error);
      }
    });
  }

  activarCertificado(certificado: Certificado): void {
    this.activando = true;
    
    this.facturacionService.activarCertificado(certificado.id).subscribe({
      next: (response) => {
        this.activando = false;
        this.cargarCertificados(); // Recargar para ver estado actualizado
        Swal.fire('Éxito', 'Certificado activado correctamente.', 'success');
        console.log('Certificado activado:', response);
      },
      error: (error) => {
        this.activando = false;
        Swal.fire('Error', 'No se pudo activar el certificado.', 'error');
        console.error('Error al activar certificado:', error);
      }
    });
  }

  editarCertificado(certificado: Certificado): void {
    // Implementar edición de certificado
    console.log('Editar certificado:', certificado);
    Swal.fire('Info', 'Funcionalidad de edición en desarrollo.', 'info');
  }

  eliminarCertificado(certificado: Certificado): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el certificado "${certificado.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.facturacionService.eliminarCertificado(certificado.id).subscribe({
          next: (response) => {
            this.cargarCertificados();
            Swal.fire('Eliminado', 'El certificado ha sido eliminado.', 'success');
            console.log('Certificado eliminado:', response);
          },
          error: (error) => {
            Swal.fire('Error', 'No se pudo eliminar el certificado.', 'error');
            console.error('Error al eliminar certificado:', error);
          }
        });
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'activo': return 'bg-success-50 text-success-600';
      case 'inactivo': return 'bg-gray-50 text-gray-600';
      case 'vencido': return 'bg-danger-50 text-danger-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }
}