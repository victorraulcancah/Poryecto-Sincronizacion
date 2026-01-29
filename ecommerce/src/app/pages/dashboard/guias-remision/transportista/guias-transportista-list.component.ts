import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuiasRemisionService, GuiaRemision } from '../../../../services/guias-remision.service';
import { GuiaRemisionModalComponent } from '../../../../components/guia-remision-modal/guia-remision-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-guias-transportista-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GuiaRemisionModalComponent],
  styleUrl: './guias-transportista-list.component.scss',
  template: `
    <div class="gre-container">
      <div class="gre-header">
        <div class="gre-title">
          <h5>GRE Transportista</h5>
          <p>Guías de remisión para empresas de transporte (Tipo 31)</p>
        </div>
        <div class="gre-actions">
          <button class="gre-btn-primary" (click)="nuevaGuia()">
            <i class="ph ph-plus"></i>
            Nueva GRE Transportista
          </button>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="gre-stats">
        <div class="row g-4">
          <div class="col-md-3">
            <div class="stat-card stat-total">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-truck"></i>
                  </div>
                  <div>
                    <p class="stat-label">Total</p>
                    <h6 class="stat-value">{{ totalGuias }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card stat-pending">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-clock"></i>
                  </div>
                  <div>
                    <p class="stat-label">Pendientes</p>
                    <h6 class="stat-value">{{ guiasPendientes }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card stat-accepted">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-check-circle"></i>
                  </div>
                  <div>
                    <p class="stat-label">Aceptadas</p>
                    <h6 class="stat-value">{{ guiasAceptadas }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card stat-rejected">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-x-circle"></i>
                  </div>
                  <div>
                    <p class="stat-label">Rechazadas</p>
                    <h6 class="stat-value">{{ guiasRechazadas }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="gre-filters">
        <div class="card-body">
          <div class="row">
            <div class="col-md-4 mb-16">
              <label class="form-label">Estado SUNAT</label>
              <select class="form-select" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
            <div class="col-md-3 mb-16">
              <label class="form-label">Fecha Inicio</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="filtroFechaInicio"
                (change)="aplicarFiltros()">
            </div>
            <div class="col-md-3 mb-16">
              <label class="form-label">Fecha Fin</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="filtroFechaFin"
                (change)="aplicarFiltros()">
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Acciones</label>
              <div class="d-grid">
                <button
                  class="gre-btn-secondary"
                  (click)="limpiarFiltros()">
                  <i class="ph ph-broom"></i>
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="gre-table-card">
        <div class="card-body">
          <div *ngIf="loading" class="gre-loading">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando guías...</p>
          </div>

          <div *ngIf="error" class="gre-alert alert-danger">
            <i class="ph ph-warning"></i>{{ error }}
          </div>

          <div *ngIf="!loading && !error" class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha Emisión</th>
                  <th>Transportista</th>
                  <th>Conductor</th>
                  <th>Placa</th>
                  <th>Peso (kg)</th>
                  <th>Estado SUNAT</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let guia of guias">
                  <td class="td-number">
                    <strong>{{ guia.numero_completo || guia.serie + '-' + guia.correlativo }}</strong>
                  </td>
                  <td>{{ guia.fecha_emision | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <div>
                      <strong>{{ guia.transportista_razon_social || 'N/A' }}</strong>
                      <br>
                      <small class="text-muted" *ngIf="guia.transportista_ruc">
                        RUC: {{ guia.transportista_ruc }}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{{ guia.conductor_nombres || 'N/A' }}</strong>
                      <br>
                      <small class="text-muted" *ngIf="guia.conductor_numero_documento">
                        DNI: {{ guia.conductor_numero_documento }}
                      </small>
                    </div>
                  </td>
                  <td>{{ guia.vehiculo_placa_principal || 'N/A' }}</td>
                  <td>{{ guia.peso_total | number:'1.2-2' }}</td>
                  <td>
                    <span class="gre-badge" [ngClass]="getEstadoClass(guia.estado)">
                      {{ guia.estado_nombre || guia.estado }}
                    </span>
                  </td>
                  <td>
                    <div class="position-relative">
                      <button 
                        class="btn btn-sm bg-gray-100 hover-bg-gray-200 text-gray-600 px-8 py-6 rounded-6"
                        (click)="toggleMenu(guia.id!, $event)">
                        <i class="ph ph-dots-three-vertical"></i>
                      </button>

                      <div 
                        *ngIf="menuAbiertoId === guia.id"
                        class="dropdown-menu-custom"
                        (click)="$event.stopPropagation()">
                        
                        <button 
                          class="dropdown-item-custom text-primary"
                          (click)="verDetalle(guia); cerrarMenu()">
                          <i class="ph ph-eye me-2"></i>
                          <span>Ver Detalle</span>
                        </button>

                        <button 
                          *ngIf="guia.estado === 'PENDIENTE' && !guia.tiene_xml"
                          class="dropdown-item-custom text-info"
                          (click)="generarXML(guia); cerrarMenu()"
                          [disabled]="loading">
                          <i class="ph ph-file-code me-2"></i>
                          <span>Generar XML</span>
                        </button>

                        <button 
                          *ngIf="guia.estado === 'PENDIENTE' && guia.tiene_xml"
                          class="dropdown-item-custom text-success"
                          (click)="enviarSunat(guia); cerrarMenu()">
                          <i class="ph ph-paper-plane me-2"></i>
                          <span>Enviar a SUNAT</span>
                        </button>

                        <button 
                          *ngIf="guia.tiene_xml"
                          class="dropdown-item-custom text-purple"
                          (click)="verXML(guia); cerrarMenu()">
                          <i class="ph ph-file-text me-2"></i>
                          <span>Ver XML</span>
                        </button>

                        <button 
                          *ngIf="guia.estado === 'ACEPTADO'"
                          class="dropdown-item-custom text-warning"
                          (click)="descargarCDR(guia); cerrarMenu()">
                          <i class="ph ph-download me-2"></i>
                          <span>Descargar CDR</span>
                        </button>

                        <button 
                          class="dropdown-item-custom text-teal"
                          (click)="verPDF(guia); cerrarMenu()">
                          <i class="ph ph-file-pdf me-2"></i>
                          <span>Ver PDF</span>
                        </button>

                        <div class="dropdown-divider"></div>

                        <button 
                          class="dropdown-item-custom text-secondary"
                          (click)="enviarEmail(guia); cerrarMenu()">
                          <i class="ph ph-envelope me-2"></i>
                          <span>Enviar por Email</span>
                        </button>

                        <button 
                          class="dropdown-item-custom text-secondary"
                          (click)="enviarWhatsApp(guia); cerrarMenu()">
                          <i class="ph ph-whatsapp-logo me-2"></i>
                          <span>Enviar por WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="guias.length === 0" class="gre-empty">
              <i class="ph ph-truck"></i>
              <h6>No hay guías de transportista</h6>
              <button class="gre-btn-primary" (click)="nuevaGuia()">
                <i class="ph ph-plus"></i>
                Crear Primera Guía
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-guia-remision-modal
      [isOpen]="mostrarModal"
      tipoGuiaPredefinido="TRANSPORTISTA"
      (onClose)="cerrarModal()"
      (onSuccess)="onGuiaCreada($event)">
    </app-guia-remision-modal>
  `
})
export class GuiasTransportistaListComponent implements OnInit {
  guias: GuiaRemision[] = [];
  loading = false;
  error = '';
  mostrarModal = false;
  menuAbiertoId: number | null = null;

  filtroEstado = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  totalGuias = 0;
  guiasPendientes = 0;
  guiasAceptadas = 0;
  guiasRechazadas = 0;

  constructor(
    private guiasService: GuiasRemisionService
  ) { }

  ngOnInit(): void {
    this.cargarGuias();
  }

  toggleMenu(guiaId: number, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === guiaId ? null : guiaId;
  }

  cerrarMenu(): void {
    this.menuAbiertoId = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cerrarMenu();
  }

  cargarGuias(): void {
    this.loading = true;
    this.error = '';

    const filtros: any = {
      tipo_guia: 'TRANSPORTISTA',
      estado: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin
    };

    this.guiasService.getGuias(filtros).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar guías';
        this.loading = false;
      }
    });
  }

  calcularEstadisticas(): void {
    this.totalGuias = this.guias.length;
    this.guiasPendientes = this.guias.filter(g => g.estado === 'PENDIENTE').length;
    this.guiasAceptadas = this.guias.filter(g => g.estado === 'ACEPTADO').length;
    this.guiasRechazadas = this.guias.filter(g => g.estado === 'RECHAZADO').length;
  }

  aplicarFiltros(): void {
    this.cargarGuias();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.cargarGuias();
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACEPTADO': return 'badge-aceptado';
      case 'RECHAZADO': return 'badge-rechazado';
      case 'PENDIENTE': return 'badge-pendiente';
      case 'ANULADO': return 'badge-anulado';
      default: return 'badge-pendiente';
    }
  }

  nuevaGuia(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onGuiaCreada(_guia: any): void {
    this.cargarGuias();
    Swal.fire('Éxito', 'GRE Transportista creada exitosamente', 'success');
  }

  verDetalle(guia: GuiaRemision): void {
    Swal.fire({
      title: 'Detalle de GRE Transportista',
      html: `
        <div class="text-start">
          <p><strong>Número:</strong> ${guia.numero_completo || guia.serie + '-' + guia.correlativo}</p>
          <p><strong>Fecha Emisión:</strong> ${new Date(guia.fecha_emision).toLocaleDateString('es-PE')}</p>
          <hr>
          <h6>Transportista</h6>
          <p><strong>RUC:</strong> ${guia.transportista_ruc || 'No especificado'}</p>
          <p><strong>Razón Social:</strong> ${guia.transportista_razon_social || 'No especificado'}</p>
          <p><strong>N° MTC:</strong> ${guia.transportista_numero_mtc || 'No especificado'}</p>
          <hr>
          <h6>Conductor</h6>
          <p><strong>Nombres:</strong> ${guia.conductor_nombres || 'No especificado'}</p>
          <p><strong>Documento:</strong> ${guia.conductor_numero_documento || 'No especificado'}</p>
          <p><strong>Licencia:</strong> ${guia.conductor_licencia || 'No especificado'}</p>
          <hr>
          <h6>Vehículo</h6>
          <p><strong>Placa Principal:</strong> ${guia.vehiculo_placa_principal || 'No especificado'}</p>
          <p><strong>Placa Secundaria:</strong> ${guia.vehiculo_placa_secundaria || 'N/A'}</p>
          <hr>
          <p><strong>Peso Total:</strong> ${guia.peso_total} kg</p>
          <p><strong>Estado:</strong> <span class="badge bg-${this.getEstadoBadgeColor(guia.estado)}">${guia.estado}</span></p>
        </div>
      `,
      icon: 'info',
      width: '600px'
    });
  }

  getEstadoBadgeColor(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACEPTADO': return 'success';
      case 'RECHAZADO': return 'danger';
      case 'PENDIENTE': return 'warning';
      case 'ANULADO': return 'secondary';
      default: return 'secondary';
    }
  }

  generarXML(guia: GuiaRemision): void {
    Swal.fire({
      title: '¿Generar XML?',
      text: `¿Desea generar el XML firmado para la guía ${guia.numero_completo}? También se generará el PDF automáticamente.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.guiasService.generarXml(guia.id!).subscribe({
          next: (response) => {
            this.loading = false;
            Swal.fire('Éxito', response.message, 'success');
            this.cargarGuias();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire('Error', err.error?.message || 'Error al generar XML', 'error');
          }
        });
      }
    });
  }

  enviarSunat(guia: GuiaRemision): void {
    if (!guia.tiene_xml) {
      Swal.fire({
        title: 'XML no generado',
        text: 'Debe generar el XML antes de enviar a SUNAT. ¿Desea generarlo ahora?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, generar XML',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.generarXML(guia);
        }
      });
      return;
    }

    Swal.fire({
      title: '¿Enviar a SUNAT?',
      text: `¿Desea enviar la guía ${guia.numero_completo} a SUNAT?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.guiasService.enviarSunat(guia.id!).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarGuias();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Error al enviar a SUNAT', 'error');
          }
        });
      }
    });
  }

  verXML(guia: GuiaRemision): void {
    // Abrir XML en nueva pestaña usando el endpoint correcto
    // Pasar numero_completo, y como respaldo serie y correlativo
    const url = this.guiasService.verXmlArchivo(
      guia.id!, 
      guia.numero_completo!, 
      guia.serie, 
      guia.correlativo
    );
    window.open(url, '_blank');
  }

  descargarCDR(guia: GuiaRemision): void {
    this.guiasService.descargarCdr(guia.id!).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `R-${guia.numero_completo}.xml`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (_err: any) => {
        Swal.fire('Error', 'No hay CDR disponible. La guía debe ser aceptada por SUNAT primero.', 'error');
      }
    });
  }

  verPDF(guia: GuiaRemision): void {
    this.guiasService.getPdf(guia.id!).subscribe({
      next: (response) => {
        window.open(response.data.url, '_blank');
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'No se pudo obtener el PDF', 'error');
      }
    });
  }

  enviarEmail(guia: GuiaRemision): void {
    this.guiasService.getEmailDatos(guia.id!).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Enviar por Email',
          html: `
            <div class="text-start">
              <div class="mb-3">
                <label class="form-label">Email:</label>
                <input type="email" id="email-input" class="form-control" value="${response.data.email}" />
              </div>
              <div class="mb-3">
                <label class="form-label">Mensaje:</label>
                <textarea id="mensaje-input" class="form-control" rows="4">${response.data.mensaje}</textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            const email = (document.getElementById('email-input') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensaje-input') as HTMLTextAreaElement).value;

            if (!email) {
              Swal.showValidationMessage('El email es requerido');
              return false;
            }

            return { email, mensaje };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            this.guiasService.enviarEmail(guia.id!, result.value).subscribe({
              next: () => {
                Swal.fire('Éxito', 'Guía enviada por email exitosamente', 'success');
              },
              error: (err) => {
                Swal.fire('Error', err.error?.message || 'Error al enviar email', 'error');
              }
            });
          }
        });
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Error al obtener datos de email', 'error');
      }
    });
  }

  enviarWhatsApp(guia: GuiaRemision): void {
    this.guiasService.getWhatsappDatos(guia.id!).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Enviar por WhatsApp',
          html: `
            <div class="text-start">
              <div class="mb-3">
                <label class="form-label">Teléfono:</label>
                <input type="text" id="telefono-input" class="form-control" value="${response.data.telefono}" placeholder="+51987654321" />
              </div>
              <div class="mb-3">
                <label class="form-label">Mensaje:</label>
                <textarea id="mensaje-wa-input" class="form-control" rows="4">${response.data.mensaje}</textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            const telefono = (document.getElementById('telefono-input') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensaje-wa-input') as HTMLTextAreaElement).value;

            if (!telefono) {
              Swal.showValidationMessage('El teléfono es requerido');
              return false;
            }

            return { telefono, mensaje };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            this.guiasService.enviarWhatsapp(guia.id!, result.value).subscribe({
              next: () => {
                Swal.fire('Éxito', 'Guía enviada por WhatsApp exitosamente', 'success');
              },
              error: (err) => {
                Swal.fire('Error', err.error?.message || 'Error al enviar WhatsApp', 'error');
              }
            });
          }
        });
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Error al obtener datos de WhatsApp', 'error');
      }
    });
  }
}
