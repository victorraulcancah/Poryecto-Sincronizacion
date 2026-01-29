import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuiasRemisionService, GuiaRemision, EstadisticasGuias } from '../../../services/guias-remision.service';
import { GuiaRemisionModalComponent } from '../../../components/guia-remision-modal/guia-remision-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-guias-remision-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GuiaRemisionModalComponent],
  styles: [`
    .dropdown-menu-custom {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 8px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      min-width: 220px;
      padding: 8px;
      z-index: 1000;
      animation: fadeInDown 0.2s ease;
    }
    
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .dropdown-item-custom {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
    }
    
    .dropdown-item-custom:hover:not(:disabled) {
      background: #f8f9fa;
    }
    
    .dropdown-item-custom:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .dropdown-item-custom i {
      font-size: 18px;
    }
    
    .dropdown-item-custom.text-purple {
      color: #6f42c1;
    }
    
    .dropdown-item-custom.text-teal {
      color: #20c997;
    }
    
    .dropdown-divider {
      height: 1px;
      background: #e9ecef;
      margin: 8px 0;
    }
  `],
  template: `
    <div class="gre-container">
      <!-- Header -->
      <div class="gre-header">
        <div class="gre-title">
          <h5>Guías de Remisión</h5>
          <p>Administra las guías de remisión electrónicas</p>
        </div>
        <div class="gre-actions">
          <button class="gre-btn-primary" (click)="nuevaGuia()">
            <i class="ph ph-plus"></i>
            Nueva Guía de Remisión
          </button>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="gre-stats">
        <div class="row g-4">
          <div class="col-md-2">
            <div class="stat-card stat-total">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-file-text"></i>
                  </div>
                  <div>
                    <p class="stat-label">Total</p>
                    <h6 class="stat-value">{{ estadisticas.total_guias }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <div class="stat-card stat-pending">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-clock"></i>
                  </div>
                  <div>
                    <p class="stat-label">Pendientes</p>
                    <h6 class="stat-value">{{ estadisticas.guias_pendientes }}</h6>
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
                    <h6 class="stat-value">{{ estadisticas.guias_aceptadas }}</h6>
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
                    <h6 class="stat-value">{{ estadisticas.guias_rechazadas }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card stat-weight">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-package"></i>
                  </div>
                  <div>
                    <p class="stat-label">Peso (kg)</p>
                    <h6 class="stat-value">{{ estadisticas.peso_total_transportado | number:'1.2-2' }}</h6>
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
          <!-- Búsqueda rápida -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Búsqueda rápida</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="ph ph-magnifying-glass"></i>
                </span>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="filtroBusqueda"
                  (keyup.enter)="aplicarFiltros()"
                  placeholder="Buscar por número, cliente, placa...">
                <button
                  class="btn btn-primary"
                  (click)="aplicarFiltros()">
                  Buscar
                </button>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Accesos rápidos</label>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-outline-warning"
                  (click)="verPendientesEnvio()">
                  <i class="ph ph-clock"></i>
                  Pendientes de Envío
                </button>
                <button
                  class="btn btn-outline-danger"
                  (click)="verRechazadas()">
                  <i class="ph ph-x-circle"></i>
                  Rechazadas
                </button>
              </div>
            </div>
          </div>

          <!-- Filtros avanzados -->
          <div class="row">
            <div class="col-md-2 mb-16">
              <label class="form-label">Tipo de Guía</label>
              <select class="form-select" [(ngModel)]="filtroTipoGuia" (change)="aplicarFiltros()">
                <option value="">Todos</option>
                <option value="REMITENTE">GRE Remitente</option>
                <option value="INTERNO">Traslado Interno</option>
              </select>
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Estado SUNAT</label>
              <select class="form-select" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Serie</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="filtroSerie"
                (change)="aplicarFiltros()"
                placeholder="Ej: T001">
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Fecha Inicio</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="filtroFechaInicio"
                (change)="aplicarFiltros()">
            </div>
            <div class="col-md-2 mb-16">
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

          <!-- Loading state -->
          <div *ngIf="loading" class="gre-loading">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando guías de remisión...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="gre-alert alert-danger">
            <i class="ph ph-exclamation-triangle"></i>
            {{ error }}
            <button
              type="button"
              class="btn btn-sm btn-outline-danger ms-auto"
              (click)="cargarGuias()">
              <i class="ph ph-arrow-clockwise"></i>
              Reintentar
            </button>
          </div>

          <!-- Tabla -->
          <div *ngIf="!loading && !error" class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Destinatario</th>
                  <th>Peso (kg)</th>
                  <th>Estado SUNAT</th>
                  <th>Estado Logístico</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let guia of guias">
                  <!-- Número -->
                  <td class="td-number">{{ guia.numero_completo }}</td>

                  <!-- Tipo -->
                  <td>
                    <span class="gre-tipo-badge" [ngClass]="getTipoGuiaClass(guia.tipo_guia)">
                      {{ getTipoGuiaNombre(guia.tipo_guia) }}
                    </span>
                  </td>

                  <!-- Fecha -->
                  <td>{{ guia.fecha_emision | date:'dd/MM/yyyy' }}</td>

                  <!-- Cliente -->
                  <td>{{ guia.cliente?.razon_social || 'N/A' }}</td>

                  <!-- Destinatario -->
                  <td>{{ guia.destinatario_razon_social }}</td>

                  <!-- Peso -->
                  <td>{{ guia.peso_total | number:'1.2-2' }}</td>

                  <!-- Estado SUNAT -->
                  <td>
                    <div class="d-flex flex-wrap gap-2 align-items-center">
                      <span class="gre-badge" [ngClass]="getEstadoClass(guia.estado)">
                        {{ guia.estado_nombre || guia.estado }}
                      </span>
                      
                      <!-- Badge XML -->
                      <span *ngIf="guia.tiene_xml" 
                            class="badge bg-info" 
                            title="XML generado"
                            style="font-size: 0.7rem;">
                        <i class="ph ph-file-code"></i> XML
                      </span>
                      
                      <!-- Badge PDF -->
                      <span *ngIf="guia.tiene_pdf" 
                            class="badge bg-success" 
                            title="PDF disponible"
                            style="font-size: 0.7rem;">
                        <i class="ph ph-file-pdf"></i> PDF
                      </span>
                      
                      <!-- Badge Requiere SUNAT -->
                      <span *ngIf="guia.requiere_sunat && guia.estado === 'PENDIENTE'" 
                            class="badge bg-warning text-dark" 
                            title="Requiere envío a SUNAT"
                            style="font-size: 0.7rem;">
                        <i class="ph ph-cloud-arrow-up"></i> SUNAT
                      </span>
                    </div>
                  </td>

                  <!-- Estado Logístico -->
                  <td>
                    <span class="gre-badge" [ngClass]="getEstadoLogisticoClass(guia.estado_logistico || 'pendiente')">
                      {{ getEstadoLogisticoNombre(guia.estado_logistico || 'pendiente') }}
                    </span>
                  </td>

                  <!-- Acciones -->
                  <td>
                    <div class="position-relative">
                      <!-- Botón de menú -->
                      <button 
                        class="btn btn-sm bg-gray-100 hover-bg-gray-200 text-gray-600 px-8 py-6 rounded-6"
                        (click)="toggleMenu(guia.id!, $event)">
                        <i class="ph ph-dots-three-vertical"></i>
                      </button>

                      <!-- Menú desplegable -->
                      <div 
                        *ngIf="menuAbiertoId === guia.id"
                        class="dropdown-menu-custom"
                        (click)="$event.stopPropagation()">
                        
                        <!-- Ver Detalle (siempre disponible) -->
                        <button 
                          class="dropdown-item-custom text-primary"
                          (click)="verDetalle(guia); cerrarMenu()">
                          <i class="ph ph-eye me-2"></i>
                          <span>Ver Detalle</span>
                        </button>

                        <!-- Procesar y Enviar a SUNAT (solo PENDIENTE sin XML) -->
                        <button 
                          *ngIf="guia.requiere_sunat && guia.estado === 'PENDIENTE' && !guia.tiene_xml"
                          class="dropdown-item-custom text-success"
                          (click)="procesarYEnviarSunat(guia); cerrarMenu()"
                          [disabled]="loading || enviando">
                          <i class="ph ph-paper-plane me-2"></i>
                          <span>Procesar y Enviar a SUNAT</span>
                        </button>

                        <!-- Generar XML (solo PENDIENTE sin XML - opción manual) -->
                        <button 
                          *ngIf="guia.requiere_sunat && guia.estado === 'PENDIENTE' && !guia.tiene_xml"
                          class="dropdown-item-custom text-info"
                          (click)="generarXML(guia); cerrarMenu()"
                          [disabled]="loading">
                          <i class="ph ph-file-code me-2"></i>
                          <span>Solo Generar XML</span>
                        </button>

                        <!-- Enviar a SUNAT (solo PENDIENTE con XML) -->
                        <button 
                          *ngIf="guia.requiere_sunat && guia.estado === 'PENDIENTE' && guia.tiene_xml"
                          class="dropdown-item-custom text-success"
                          (click)="enviarSunat(guia); cerrarMenu()"
                          [disabled]="enviando">
                          <i class="ph ph-paper-plane me-2"></i>
                          <span>Enviar a SUNAT</span>
                        </button>

                        <!-- Ver XML (solo si tiene XML) -->
                        <button 
                          *ngIf="guia.tiene_xml"
                          class="dropdown-item-custom text-purple"
                          (click)="verXML(guia); cerrarMenu()">
                          <i class="ph ph-file-text me-2"></i>
                          <span>Ver XML</span>
                        </button>

                        <!-- Descargar CDR (solo ACEPTADO) -->
                        <button 
                          *ngIf="guia.estado === 'ACEPTADO'"
                          class="dropdown-item-custom text-warning"
                          (click)="descargarCDR(guia); cerrarMenu()"
                          [disabled]="descargando">
                          <i class="ph ph-download me-2"></i>
                          <span>Descargar CDR</span>
                        </button>

                        <!-- Ver PDF (siempre disponible) -->
                        <button 
                          class="dropdown-item-custom text-teal"
                          (click)="verPDF(guia); cerrarMenu()">
                          <i class="ph ph-file-pdf me-2"></i>
                          <span>Ver PDF</span>
                        </button>

                        <!-- Regenerar PDF (siempre disponible) -->
                        <button 
                          class="dropdown-item-custom text-info"
                          (click)="regenerarPDF(guia); cerrarMenu()"
                          [disabled]="loading">
                          <i class="ph ph-arrow-clockwise me-2"></i>
                          <span>Regenerar PDF</span>
                        </button>

                        <div class="dropdown-divider"></div>

                        <!-- Actualizar Estado Logístico -->
                        <button 
                          class="dropdown-item-custom text-info"
                          (click)="actualizarEstadoLogistico(guia); cerrarMenu()">
                          <i class="ph ph-truck me-2"></i>
                          <span>Estado Logístico</span>
                        </button>

                        <!-- Anular Traslado (solo si no está anulado) -->
                        <button 
                          *ngIf="guia.estado_logistico !== 'anulado'"
                          class="dropdown-item-custom text-danger"
                          (click)="anularTraslado(guia); cerrarMenu()">
                          <i class="ph ph-x-circle me-2"></i>
                          <span>Anular Traslado</span>
                        </button>

                        <div class="dropdown-divider"></div>

                        <!-- Enviar Email (siempre disponible) -->
                        <button 
                          class="dropdown-item-custom text-secondary"
                          (click)="enviarEmail(guia); cerrarMenu()"
                          [disabled]="enviandoEmail">
                          <i class="ph ph-envelope me-2"></i>
                          <span>Enviar por Email</span>
                        </button>

                        <!-- Enviar WhatsApp (siempre disponible) -->
                        <button 
                          class="dropdown-item-custom text-secondary"
                          (click)="enviarWhatsApp(guia); cerrarMenu()"
                          [disabled]="enviandoWhatsapp">
                          <i class="ph ph-whatsapp-logo me-2"></i>
                          <span>Enviar por WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Empty state -->
            <div *ngIf="guias.length === 0" class="gre-empty">
              <i class="ph ph-file-text"></i>
              <h6>No hay guías de remisión</h6>
              <p>No se encontraron guías con los filtros aplicados.</p>
              <button
                class="gre-btn-primary"
                (click)="nuevaGuia()">
                <i class="ph ph-plus"></i>
                Crear Primera Guía
              </button>
            </div>

            <!-- Paginación -->
            <div *ngIf="guias.length > 0 && totalPages > 1" class="gre-pagination">
              <div class="pagination-info">
                <span>Mostrando {{ (currentPage - 1) * perPage + 1 }} - {{ Math.min(currentPage * perPage, totalItems) }} de {{ totalItems }} registros</span>
                <select class="form-select form-select-sm" [(ngModel)]="perPage" (change)="cambiarPerPage($event)" style="width: auto; display: inline-block; margin-left: 1rem;">
                  <option [value]="10">10 por página</option>
                  <option [value]="15">15 por página</option>
                  <option [value]="25">25 por página</option>
                  <option [value]="50">50 por página</option>
                  <option [value]="100">100 por página</option>
                </select>
              </div>
              <nav>
                <ul class="pagination mb-0">
                  <li class="page-item" [class.disabled]="currentPage === 1">
                    <button class="page-link" (click)="paginaAnterior()" [disabled]="currentPage === 1">
                      <i class="ph ph-caret-left"></i>
                      Anterior
                    </button>
                  </li>
                  <li class="page-item" *ngFor="let pagina of getPaginasVisibles()" [class.active]="pagina === currentPage">
                    <button class="page-link" (click)="cambiarPagina(pagina)">{{ pagina }}</button>
                  </li>
                  <li class="page-item" [class.disabled]="currentPage === totalPages">
                    <button class="page-link" (click)="paginaSiguiente()" [disabled]="currentPage === totalPages">
                      Siguiente
                      <i class="ph ph-caret-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Guía de Remisión -->
    <app-guia-remision-modal
      [isOpen]="mostrarModal"
      [guiaId]="guiaSeleccionada"
      (onClose)="cerrarModal()"
      (onSuccess)="onGuiaCreada($event)">
    </app-guia-remision-modal>
  `
})
export class GuiasRemisionListComponent implements OnInit {
  guias: GuiaRemision[] = [];
  loading = false;
  error = '';
  enviando = false;
  consultando = false;
  descargando = false;
  enviandoEmail = false;
  enviandoWhatsapp = false;
  mostrarModal = false;
  guiaSeleccionada?: number;
  menuAbiertoId: number | null = null;

  // Exponer Math para el template
  Math = Math;

  // Filtros
  filtroTipoGuia: 'REMITENTE' | 'INTERNO' | '' = '';
  filtroEstado = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroSerie = '';
  filtroBusqueda = '';

  // Paginación
  currentPage = 1;
  perPage = 15;
  totalPages = 0;
  totalItems = 0;

  // Estadísticas
  estadisticas: EstadisticasGuias = {
    total_guias: 0,
    guias_pendientes: 0,
    guias_aceptadas: 0,
    guias_rechazadas: 0,
    peso_total_transportado: 0
  };

  constructor(
    private guiasService: GuiasRemisionService
  ) { }

  // ============================================
  // MÉTODOS PARA MENÚ DESPLEGABLE
  // ============================================

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

  ngOnInit(): void {
    this.cargarGuias();
    this.cargarEstadisticas();
  }

  cargarGuias(): void {
    this.loading = true;
    this.error = '';

    // Si hay búsqueda, usar endpoint de búsqueda
    if (this.filtroBusqueda && this.filtroBusqueda.trim() !== '') {
      this.buscarGuias();
      return;
    }

    const filtros: any = {
      estado: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin,
      page: this.currentPage,
      per_page: this.perPage
    };

    if (this.filtroTipoGuia) {
      filtros.tipo_guia = this.filtroTipoGuia;
    }

    if (this.filtroSerie) {
      filtros.serie = this.filtroSerie;
    }

    this.guiasService.getGuias(filtros).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        this.totalItems = response.data?.total || 0;
        this.currentPage = response.data?.current_page || 1;
        this.totalPages = Math.ceil(this.totalItems / this.perPage);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar guías de remisión';
        this.loading = false;
        console.error('Error al cargar guías:', err);
      }
    });
  }

  buscarGuias(): void {
    this.loading = true;
    this.error = '';

    const filtros: any = {
      page: this.currentPage,
      per_page: this.perPage
    };

    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    if (this.filtroTipoGuia) filtros.tipo_guia = this.filtroTipoGuia;

    this.guiasService.buscar(this.filtroBusqueda, filtros).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        this.totalItems = response.data?.total || 0;
        this.currentPage = response.data?.current_page || 1;
        this.totalPages = Math.ceil(this.totalItems / this.perPage);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al buscar guías';
        this.loading = false;
      }
    });
  }

  cargarEstadisticas(): void {
    const filtros = {
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin
    };

    this.guiasService.getEstadisticas(filtros).subscribe({
      next: (response) => {
        this.estadisticas = response.data;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarGuias();
    this.cargarEstadisticas();
  }

  limpiarFiltros(): void {
    this.filtroTipoGuia = '';
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroSerie = '';
    this.filtroBusqueda = '';
    this.currentPage = 1;
    this.cargarGuias();
    this.cargarEstadisticas();
  }

  // ============================================
  // MÉTODOS DE PAGINACIÓN
  // ============================================

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPages) return;
    this.currentPage = pagina;
    this.cargarGuias();
  }

  paginaAnterior(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cargarGuias();
    }
  }

  paginaSiguiente(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cargarGuias();
    }
  }

  cambiarPerPage(event: any): void {
    this.perPage = parseInt(event.target.value);
    this.currentPage = 1;
    this.cargarGuias();
  }

  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.currentPage - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPages, inicio + maxPaginas - 1);

    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  // ============================================
  // MÉTODOS DE BÚSQUEDA RÁPIDA
  // ============================================

  verPendientesEnvio(): void {
    this.loading = true;
    this.guiasService.getPendientesEnvio({ per_page: this.perPage }).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        this.totalItems = response.data?.total || 0;
        this.totalPages = Math.ceil(this.totalItems / this.perPage);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar guías pendientes';
        this.loading = false;
      }
    });
  }

  verRechazadas(): void {
    this.loading = true;
    this.guiasService.getRechazadas({ per_page: this.perPage }).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        this.totalItems = response.data?.total || 0;
        this.totalPages = Math.ceil(this.totalItems / this.perPage);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar guías rechazadas';
        this.loading = false;
      }
    });
  }

  getTipoGuiaClass(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'REMITENTE':
        return 'badge-remitente';
      case 'INTERNO':
        return 'badge-interno';
      default:
        return 'badge-interno';
    }
  }

  getTipoGuiaNombre(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'REMITENTE':
        return 'GRE Remitente';
      case 'INTERNO':
        return 'Traslado Interno';
      default:
        return tipo;
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACEPTADO':
        return 'badge-aceptado';
      case 'RECHAZADO':
        return 'badge-rechazado';
      case 'PENDIENTE':
        return 'badge-pendiente';
      case 'ANULADO':
        return 'badge-anulado';
      default:
        return 'badge-pendiente';
    }
  }

  getEstadoLogisticoClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'entregado':
        return 'badge-aceptado';
      case 'en_transito':
        return 'badge-enviado';
      case 'devuelto':
        return 'badge-rechazado';
      case 'pendiente':
        return 'badge-pendiente';
      case 'anulado':
        return 'badge-anulado';
      default:
        return 'badge-pendiente';
    }
  }

  getEstadoLogisticoNombre(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'entregado':
        return 'Entregado';
      case 'en_transito':
        return 'En Tránsito';
      case 'devuelto':
        return 'Devuelto';
      case 'pendiente':
        return 'Pendiente';
      case 'anulado':
        return 'Anulado';
      default:
        return estado || 'Pendiente';
    }
  }

  nuevaGuia(): void {
    this.guiaSeleccionada = undefined;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.guiaSeleccionada = undefined;
  }

  onGuiaCreada(_guia: any): void {
    this.cargarGuias();
    this.cargarEstadisticas();
    Swal.fire('Éxito', 'Guía de remisión creada exitosamente', 'success');
  }

  verDetalle(guia: GuiaRemision): void {
    this.guiasService.getGuia(guia.id!).subscribe({
      next: (response) => {
        const g = response.data;
        Swal.fire({
          title: 'Detalle de Guía de Remisión',
          html: `
            <div class="text-start">
              <p><strong>Número:</strong> ${g.numero_completo}</p>
              <p><strong>Cliente:</strong> ${g.cliente?.razon_social || 'N/A'}</p>
              <p><strong>Destinatario:</strong> ${g.destinatario_razon_social}</p>
              <p><strong>Fecha Traslado:</strong> ${g.fecha_inicio_traslado}</p>
              <p><strong>Peso Total:</strong> ${g.peso_total} kg</p>
              <p><strong>Estado:</strong> ${g.estado_nombre || g.estado}</p>
              ${g.mensaje_sunat ? `<p><strong>Mensaje SUNAT:</strong> ${g.mensaje_sunat}</p>` : ''}
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'Cerrar',
          width: '600px'
        });
      },
      error: (_err) => {
        Swal.fire('Error', 'No se pudo cargar el detalle de la guía', 'error');
      }
    });
  }

  /**
   * Procesar y enviar a SUNAT (Genera XML + Envía en un solo paso)
   */
  procesarYEnviarSunat(guia: GuiaRemision): void {
    Swal.fire({
      title: '¿Procesar y enviar a SUNAT?',
      html: `
        <p>Se realizarán las siguientes acciones:</p>
        <ol class="text-start">
          <li>Generar XML firmado</li>
          <li>Generar PDF automáticamente</li>
          <li>Enviar a SUNAT para validación</li>
        </ol>
        <p class="mt-3"><strong>Guía:</strong> ${guia.numero_completo}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.enviando = true;

        // Paso 1: Generar XML
        this.guiasService.generarXml(guia.id!).subscribe({
          next: (responseXml) => {
            console.log('✅ XML generado:', responseXml.message);

            // Paso 2: Enviar a SUNAT
            this.guiasService.enviarSunat(guia.id!).subscribe({
              next: (responseSunat) => {
                this.loading = false;
                this.enviando = false;
                Swal.fire({
                  title: '¡Éxito!',
                  html: `
                    <p>✅ XML generado correctamente</p>
                    <p>✅ PDF generado automáticamente</p>
                    <p>✅ ${responseSunat.message}</p>
                  `,
                  icon: 'success'
                });
                this.cargarGuias();
                this.cargarEstadisticas();
              },
              error: (errSunat) => {
                this.loading = false;
                this.enviando = false;
                Swal.fire({
                  title: 'Error al enviar a SUNAT',
                  html: `
                    <p>✅ XML generado correctamente</p>
                    <p>✅ PDF generado automáticamente</p>
                    <p>❌ ${errSunat.error?.message || 'Error al enviar a SUNAT'}</p>
                    <p class="mt-3 text-muted">Puede intentar enviar nuevamente desde el menú de acciones.</p>
                  `,
                  icon: 'warning'
                });
                this.cargarGuias();
              }
            });
          },
          error: (errXml) => {
            this.loading = false;
            this.enviando = false;
            Swal.fire('Error', errXml.error?.message || 'Error al generar XML', 'error');
          }
        });
      }
    });
  }

  enviarSunat(guia: GuiaRemision): void {
    // Validar que tenga XML generado
    if (!guia.tiene_xml) {
      Swal.fire({
        title: 'XML no generado',
        text: 'Debe generar el XML antes de enviar a SUNAT. Use la opción "Procesar y Enviar a SUNAT" para hacerlo automáticamente.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    Swal.fire({
      title: '¿Enviar a SUNAT?',
      text: `¿Desea enviar la guía ${guia.numero_completo} a SUNAT?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.enviando = true;
        this.guiasService.enviarSunat(guia.id!).subscribe({
          next: (response) => {
            this.enviando = false;
            Swal.fire('Éxito', response.message, 'success');
            this.cargarGuias();
            this.cargarEstadisticas();
          },
          error: (err) => {
            this.enviando = false;
            Swal.fire('Error', err.error?.message || 'Error al enviar a SUNAT', 'error');
          }
        });
      }
    });
  }

  consultarSunat(guia: GuiaRemision): void {
    this.consultando = true;
    this.guiasService.consultarSunat(guia.id!).subscribe({
      next: (response) => {
        this.consultando = false;
        Swal.fire('Éxito', response.message, 'success');
        this.cargarGuias();
        this.cargarEstadisticas();
      },
      error: (err) => {
        this.consultando = false;
        Swal.fire('Error', err.error?.message || 'Error al consultar SUNAT', 'error');
      }
    });
  }

  verPDF(guia: GuiaRemision): void {
    this.guiasService.getPdf(guia.id!).subscribe({
      next: (response) => {
        window.open(response.data.url, '_blank');
      },
      error: (_err: any) => {
        Swal.fire('Error', 'No se pudo obtener el PDF', 'error');
      }
    });
  }

  regenerarPDF(guia: GuiaRemision): void {
    Swal.fire({
      title: '¿Regenerar PDF?',
      text: `¿Desea regenerar el PDF de la guía ${guia.numero_completo}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.guiasService.generarPdf(guia.id!).subscribe({
          next: (response) => {
            this.loading = false;
            Swal.fire({
              title: 'PDF Regenerado',
              text: 'El PDF ha sido regenerado exitosamente',
              icon: 'success',
              confirmButtonText: 'Ver PDF'
            }).then((res) => {
              if (res.isConfirmed) {
                window.open(response.data.url, '_blank');
              }
            });
            this.cargarGuias();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire('Error', err.error?.message || 'Error al regenerar PDF', 'error');
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

  generarXML(guia: GuiaRemision): void {
    Swal.fire({
      title: '¿Generar XML?',
      text: `¿Desea generar el XML firmado para la guía ${guia.numero_completo}? También se generará el PDF automáticamente.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
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
            this.cargarEstadisticas();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire('Error', err.error?.message || 'Error al generar XML', 'error');
          }
        });
      }
    });
  }

  descargarCDR(guia: GuiaRemision): void {
    this.descargando = true;
    this.guiasService.descargarCdr(guia.id!).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `R-${guia.numero_completo}.xml`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.descargando = false;
      },
      error: (_err: any) => {
        this.descargando = false;
        Swal.fire('Error', 'No hay CDR disponible. La guía debe ser aceptada por SUNAT primero.', 'error');
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
              <label class="form-label">Email:</label>
              <input id="email" class="swal2-input" value="${response.data.email}" placeholder="correo@ejemplo.com">
              <label class="form-label mt-2">Mensaje (opcional):</label>
              <textarea id="mensaje" class="swal2-textarea" placeholder="Mensaje adicional...">${response.data.mensaje || ''}</textarea>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            const email = (document.getElementById('email') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value;
            if (!email) {
              Swal.showValidationMessage('El email es requerido');
              return false;
            }
            return { email, mensaje };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            this.enviandoEmail = true;
            this.guiasService.enviarEmail(guia.id!, result.value).subscribe({
              next: (res) => {
                this.enviandoEmail = false;
                Swal.fire('Éxito', res.message, 'success');
              },
              error: (err) => {
                this.enviandoEmail = false;
                Swal.fire('Error', err.error?.message || 'Error al enviar email', 'error');
              }
            });
          }
        });
      },
      error: (_err) => {
        Swal.fire('Error', 'No se pudo obtener los datos del email', 'error');
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
              <label class="form-label">Teléfono:</label>
              <input id="telefono" class="swal2-input" value="${response.data.telefono}" placeholder="+51999999999">
              <label class="form-label mt-2">Mensaje (opcional):</label>
              <textarea id="mensaje" class="swal2-textarea" placeholder="Mensaje adicional...">${response.data.mensaje || ''}</textarea>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            const telefono = (document.getElementById('telefono') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value;
            if (!telefono) {
              Swal.showValidationMessage('El teléfono es requerido');
              return false;
            }
            return { telefono, mensaje };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            this.enviandoWhatsapp = true;
            this.guiasService.enviarWhatsapp(guia.id!, result.value).subscribe({
              next: (res) => {
                this.enviandoWhatsapp = false;
                Swal.fire('Éxito', res.message, 'success');
              },
              error: (err) => {
                this.enviandoWhatsapp = false;
                Swal.fire('Error', err.error?.message || 'Error al enviar WhatsApp', 'error');
              }
            });
          }
        });
      },
      error: (_err) => {
        Swal.fire('Error', 'No se pudo obtener los datos de WhatsApp', 'error');
      }
    });
  }

  anularTraslado(guia: GuiaRemision): void {
    Swal.fire({
      title: '¿Anular traslado?',
      html: `
        <div class="text-start">
          <p>¿Desea anular el traslado de la guía <strong>${guia.numero_completo}</strong>?</p>
          <div class="alert alert-warning mt-3">
            <i class="ph ph-warning me-2"></i>
            <strong>Nota:</strong> Esta acción solo anula el traslado físico. 
            El estado en SUNAT no se modifica.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.guiasService.actualizarEstadoLogistico(guia.id!, 'anulado').subscribe({
          next: (res) => {
            Swal.fire('Anulado', 'El traslado ha sido anulado exitosamente', 'success');
            this.cargarGuias();
            this.cargarEstadisticas();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Error al anular traslado', 'error');
          }
        });
      }
    });
  }

  actualizarEstadoLogistico(guia: GuiaRemision): void {
    Swal.fire({
      title: 'Actualizar Estado Logístico',
      html: `
        <div class="text-start">
          <p class="mb-3">Guía: <strong>${guia.numero_completo}</strong></p>
          <p class="mb-3">Estado actual: <strong>${this.getEstadoLogisticoNombre(guia.estado_logistico || 'pendiente')}</strong></p>
          <label class="form-label">Nuevo estado:</label>
          <select id="estado-logistico" class="swal2-select">
            <option value="pendiente" ${guia.estado_logistico === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="en_transito" ${guia.estado_logistico === 'en_transito' ? 'selected' : ''}>En Tránsito</option>
            <option value="entregado" ${guia.estado_logistico === 'entregado' ? 'selected' : ''}>Entregado</option>
            <option value="devuelto" ${guia.estado_logistico === 'devuelto' ? 'selected' : ''}>Devuelto</option>
            <option value="anulado" ${guia.estado_logistico === 'anulado' ? 'selected' : ''}>Anulado</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const estado = (document.getElementById('estado-logistico') as HTMLSelectElement).value;
        return estado;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.guiasService.actualizarEstadoLogistico(guia.id!, result.value).subscribe({
          next: (res) => {
            Swal.fire('Éxito', res.message, 'success');
            this.cargarGuias();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Error al actualizar estado logístico', 'error');
          }
        });
      }
    });
  }
}
