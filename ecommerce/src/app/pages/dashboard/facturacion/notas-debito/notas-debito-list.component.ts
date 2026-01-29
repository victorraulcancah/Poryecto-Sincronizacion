import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotasDebitoService } from '../../../../services/notas-debito.service';
import { FileDownloadService } from '../../../../services/file-download.service';
import { NotaDebito, NotasPaginatedResponse } from '../../../../models/facturacion.model';
import { NotaDebitoModalComponent } from '../../../../components/nota-debito-modal/nota-debito-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notas-debito-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotaDebitoModalComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Notas de Débito</h5>
        <p class="text-gray-500 mb-0">Administra las notas de débito emitidas</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="abrirModalCrear()">
        <i class="ph ph-plus me-8"></i>
        Nueva Nota de Débito
      </button>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Estado SUNAT</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="generado">Generado</option>
              <option value="aceptado">Aceptado</option>
              <option value="rechazado">Rechazado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Tipo de Nota</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroTipo" (change)="aplicarFiltros()">
              <option value="">Todos los tipos</option>
              <option value="01">Intereses por mora</option>
              <option value="02">Aumento en el valor</option>
              <option value="03">Penalidades/otros conceptos</option>
              <option value="10">Ajustes de operaciones de exportación</option>
              <option value="11">Ajustes afectos al IVAP</option>
            </select>
          </div>
          <div class="col-md-2 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Fecha Inicio</label>
            <input 
              type="date" 
              class="form-control px-16 py-12 border rounded-8"
              [(ngModel)]="filtroFechaInicio" 
              (change)="aplicarFiltros()">
          </div>
          <div class="col-md-2 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Fecha Fin</label>
            <input 
              type="date" 
              class="form-control px-16 py-12 border rounded-8"
              [(ngModel)]="filtroFechaFin" 
              (change)="aplicarFiltros()">
          </div>
          <div class="col-md-2 mb-16">
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

    <!-- Estadísticas -->
    <div class="row g-4 mb-24">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-info-50 text-info-600">
                <i class="ph ph-file-text text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Total Notas</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.total }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-success-50 text-success-600">
                <i class="ph ph-check-circle text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Aceptadas</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.aceptadas }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-warning-50 text-warning-600">
                <i class="ph ph-clock text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Pendientes</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.pendientes }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-danger-50 text-danger-600">
                <i class="ph ph-x-circle text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Rechazadas</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.rechazadas }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de notas de débito -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando notas de débito...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarNotasDebito()">
            <i class="ph ph-arrow-clockwise me-4"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Número</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Cliente</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Comprobante Ref.</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Tipo/Motivo</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Total</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let nota of notasDebito" class="border-bottom border-gray-100">
                <!-- Número -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ nota.serie }}-{{ nota.numero }}</span>
                  <br>
                  <small class="text-gray-500">{{ nota.fecha_emision | date:'dd/MM/yyyy' }}</small>
                </td>

                <!-- Cliente -->
                <td class="px-24 py-16">
                  <div>
                    <span class="text-heading d-block">{{ getClienteNombre(nota.cliente) }}</span>
                    <small class="text-gray-500" *ngIf="nota.cliente?.numero_documento">
                      {{ nota.cliente?.tipo_documento === '6' ? 'RUC' : 'DNI' }}: {{ nota.cliente?.numero_documento }}
                    </small>
                  </div>
                </td>

                <!-- Comprobante Referencia -->
                <td class="px-24 py-16">
                  <span class="text-heading">
                    {{ nota.serie_comprobante_ref || 'N/A' }}-{{ nota.numero_comprobante_ref || 'N/A' }}
                  </span>
                  <br>
                  <small class="text-gray-500">{{ getTipoComprobanteNombre(nota.tipo_comprobante_ref) }}</small>
                </td>

                <!-- Tipo/Motivo -->
                <td class="px-24 py-16">
                  <div>
                    <span class="badge bg-warning-50 text-warning-600 px-12 py-6 rounded-pill fw-medium d-inline-block mb-8">
                      {{ getTipoNotaNombre(nota.tipo_nota_debito || '') }}
                    </span>
                    <br>
                    <small class="text-gray-500 d-block" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="nota.motivo">
                      {{ nota.motivo || 'Sin motivo' }}
                    </small>
                  </div>
                </td>

                <!-- Total (Subtotal sin IGV) -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ nota.moneda }} {{ nota.subtotal | number:'1.2-2' }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(nota.estado)">
                    {{ nota.estado | titlecase }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16">
                  <div class="position-relative">
                    <!-- Botón de menú -->
                    <button 
                      class="btn btn-sm bg-gray-100 hover-bg-gray-200 text-gray-600 px-8 py-6 rounded-6"
                      (click)="toggleMenu(nota.id, $event)">
                      <i class="ph ph-dots-three-vertical"></i>
                    </button>

                    <!-- Menú desplegable -->
                    <div 
                      *ngIf="menuAbiertoId === nota.id"
                      class="dropdown-menu-custom"
                      (click)="$event.stopPropagation()">
                      
                      <!-- Ver Detalle -->
                      <button 
                        class="dropdown-item-custom text-purple"
                        (click)="verDetalle(nota); cerrarMenu()">
                        <i class="ph ph-eye me-2"></i>
                        <span>Ver Detalle</span>
                      </button>
                      
                      <!-- Editar (solo si PENDIENTE) -->
                      <button 
                        *ngIf="puedeEditar(nota)"
                        class="dropdown-item-custom text-warning"
                        (click)="editarNota(nota); cerrarMenu()">
                        <i class="ph ph-pencil me-2"></i>
                        <span>Editar Nota</span>
                      </button>
                      
                      <div *ngIf="puedeEditar(nota)" class="dropdown-divider"></div>
                      
                      <!-- Generar XML (solo si PENDIENTE) -->
                      <button 
                        *ngIf="puedeGenerarXml(nota)"
                        class="dropdown-item-custom text-primary"
                        (click)="generarXml(nota); cerrarMenu()"
                        [disabled]="procesando">
                        <i class="ph ph-file-code me-2"></i>
                        <span>Generar XML</span>
                      </button>
                      
                      <!-- Enviar a SUNAT (solo si GENERADO o RECHAZADO) -->
                      <button 
                        *ngIf="puedeEnviarSunat(nota)"
                        class="dropdown-item-custom text-success"
                        (click)="enviarSunat(nota); cerrarMenu()"
                        [disabled]="procesando">
                        <i class="ph ph-paper-plane-tilt me-2"></i>
                        <span>{{ nota.estado?.toLowerCase() === 'rechazado' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT' }}</span>
                      </button>
                      
                      <!-- Consultar Estado en SUNAT (solo si XML generado) -->
                      <button 
                        *ngIf="tieneXml(nota)"
                        class="dropdown-item-custom text-teal"
                        (click)="consultarEstado(nota); cerrarMenu()"
                        [disabled]="consultando">
                        <i class="ph ph-arrows-clockwise me-2"></i>
                        <span>Consultar en SUNAT</span>
                      </button>
                      
                      <div *ngIf="puedeGenerarXml(nota) || puedeEnviarSunat(nota) || tieneXml(nota)" class="dropdown-divider"></div>
                      
                      <!-- Ver PDF (solo si XML generado) -->
                      <button 
                        *ngIf="tieneXml(nota)"
                        class="dropdown-item-custom text-danger"
                        (click)="descargarPDF(nota); cerrarMenu()">
                        <i class="ph ph-file-pdf me-2"></i>
                        <span>📄 Ver PDF</span>
                      </button>
                      
                      <!-- Ver XML (solo si XML generado) -->
                      <button 
                        *ngIf="tieneXml(nota)"
                        class="dropdown-item-custom text-warning"
                        (click)="descargarXML(nota); cerrarMenu()">
                        <i class="ph ph-file-code me-2"></i>
                        <span>Ver XML</span>
                      </button>
                      
                      <!-- Descargar CDR (solo si tiene CDR) -->
                      <button 
                        *ngIf="nota.cdr_url"
                        class="dropdown-item-custom text-success"
                        (click)="descargarCDR(nota); cerrarMenu()">
                        <i class="ph ph-file-check me-2"></i>
                        <span>Descargar CDR</span>
                      </button>
                      
                      <!-- Compartir (solo si XML generado) -->
                      <div *ngIf="tieneXml(nota)" class="dropdown-divider"></div>
                      
                      <button 
                        *ngIf="tieneXml(nota)"
                        class="dropdown-item-custom text-primary"
                        (click)="abrirModalCompartir(nota); cerrarMenu()">
                        <i class="ph ph-share-network me-2"></i>
                        <span>Compartir</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="notasDebito.length === 0" class="text-center py-40">
            <i class="ph ph-file-text text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay notas de débito</h6>
            <p class="text-gray-500 mb-16">No se encontraron notas de débito con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="abrirModalCrear()">
              <i class="ph ph-plus me-8"></i>
              Crear Primera Nota de Débito
            </button>
          </div>
        </div>

        <!-- Paginación -->
        <div *ngIf="!loading && !error && totalPaginas > 1" class="card-footer bg-white border-top p-24">
          <div class="d-flex justify-content-between align-items-center">
            <div class="text-gray-500">
              Mostrando {{ (paginaActual - 1) * registrosPorPagina + 1 }} - 
              {{ Math.min(paginaActual * registrosPorPagina, totalRegistros) }} 
              de {{ totalRegistros }} registros
            </div>
            <nav>
              <ul class="pagination mb-0">
                <li class="page-item" [class.disabled]="paginaActual === 1">
                  <a class="page-link" href="javascript:void(0)" (click)="paginaAnterior()">
                    <i class="ph ph-caret-left"></i>
                  </a>
                </li>
                <ng-container *ngFor="let p of [].constructor(totalPaginas); let i = index">
                  <li class="page-item" 
                      [class.active]="i + 1 === paginaActual"
                      *ngIf="i + 1 === 1 || i + 1 === totalPaginas || (i + 1 >= paginaActual - 2 && i + 1 <= paginaActual + 2)">
                    <a class="page-link" href="javascript:void(0)" (click)="cambiarPagina(i + 1)">
                      {{ i + 1 }}
                    </a>
                  </li>
                </ng-container>
                <li class="page-item" [class.disabled]="paginaActual === totalPaginas">
                  <a class="page-link" href="javascript:void(0)" (click)="paginaSiguiente()">
                    <i class="ph ph-caret-right"></i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Nota de Débito -->
    <app-nota-debito-modal
      [mostrar]="mostrarModalCrear"
      (cerrarModal)="cerrarModalCrear()"
      (notaDebitoEmitida)="onNotaDebitoEmitida($event)">
    </app-nota-debito-modal>
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
      
      .dropdown-item-custom:hover {
        background: #f8f9fa;
      }
      
      .dropdown-item-custom i {
        font-size: 18px;
      }
      
      .dropdown-divider {
        height: 1px;
        background: #e9ecef;
        margin: 8px 0;
      }
      
      .text-purple {
        color: #6f42c1;
      }
      
      .text-teal {
        color: #20c997;
      }
      
      .text-blue {
        color: #0d6efd;
      }
      
      .cursor-pointer {
        cursor: pointer;
      }
      
      .cursor-pointer:hover {
        opacity: 0.8;
        transform: scale(1.1);
        transition: all 0.2s ease;
      }
    `,
  ],
})
export class NotasDebitoListComponent implements OnInit {
  notasDebito: NotaDebito[] = [];
  loading = false;
  error = '';
  consultando = false;
  descargando = false;
  procesando = false;
  mostrarModalCrear = false;
  menuAbiertoId: number | null = null;

  // Filtros
  filtroEstado = '';
  filtroTipo = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  // Paginación
  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;
  registrosPorPagina = 20;

  // Estadísticas
  estadisticas = {
    total: 0,
    aceptadas: 0,
    pendientes: 0,
    rechazadas: 0
  };

  // Helper para template
  Math = Math;

  constructor(
    private notasDebitoService: NotasDebitoService,
    private fileDownloadService: FileDownloadService
  ) { }

  ngOnInit(): void {
    this.cargarNotasDebito();
    this.cargarEstadisticas();

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', () => {
      this.cerrarMenu();
    });
  }

  toggleMenu(notaId: number, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === notaId ? null : notaId;
  }

  cerrarMenu(): void {
    this.menuAbiertoId = null;
  }

  cargarNotasDebito(): void {
    this.loading = true;
    this.error = '';

    const filtros: any = {
      page: this.paginaActual
    };

    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    if (this.filtroTipo) filtros.tipo_nota_debito = this.filtroTipo;
    if (this.filtroFechaInicio) filtros.fecha_inicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) filtros.fecha_fin = this.filtroFechaFin;

    this.notasDebitoService.getAll(filtros).subscribe({
      next: (res: NotasPaginatedResponse) => {
        this.notasDebito = (res.data as NotaDebito[]) || [];
        this.paginaActual = res.current_page;
        this.totalPaginas = res.last_page;
        this.totalRegistros = res.total;
        this.registrosPorPagina = res.per_page;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.error || e?.error?.message || 'Error al cargar notas de débito';
        this.loading = false;
        console.error('Error al cargar notas de débito:', e);
      }
    });
  }

  cargarEstadisticas(): void {
    const params: any = {};
    if (this.filtroFechaInicio) params.fecha_inicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) params.fecha_fin = this.filtroFechaFin;

    this.notasDebitoService.getEstadisticas(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          this.estadisticas.total = data.total_notas || 0;

          // Procesar estadísticas por estado
          const porEstado = data.por_estado || [];
          this.estadisticas.aceptadas = porEstado.find((e: any) => e.estado === 'ACEPTADO')?.cantidad || 0;
          this.estadisticas.pendientes = porEstado.find((e: any) => e.estado === 'PENDIENTE')?.cantidad || 0;
          this.estadisticas.rechazadas = porEstado.find((e: any) => e.estado === 'RECHAZADO')?.cantidad || 0;
        }
      },
      error: (e) => {
        // Si falla, calcular localmente
        this.calcularEstadisticas();
      }
    });
  }

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.cargarNotasDebito();
    this.cargarEstadisticas();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroTipo = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.paginaActual = 1;
    this.cargarNotasDebito();
    this.cargarEstadisticas();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarNotasDebito();
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.cambiarPagina(this.paginaActual - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.cambiarPagina(this.paginaActual + 1);
    }
  }

  calcularEstadisticas(): void {
    const total = this.notasDebito.length;
    const aceptadas = this.notasDebito.filter(n => n.estado?.toLowerCase() === 'aceptado').length;
    const pendientes = this.notasDebito.filter(n => n.estado?.toLowerCase() === 'pendiente').length;
    const rechazadas = this.notasDebito.filter(n => n.estado?.toLowerCase() === 'rechazado').length;

    this.estadisticas = {
      total,
      aceptadas,
      pendientes,
      rechazadas
    };
  }

  getTipoNotaNombre(tipo: string): string {
    const tipos: { [key: string]: string } = {
      '01': 'Intereses por mora',
      '02': 'Aumento en el valor',
      '03': 'Penalidades/otros conceptos',
      '10': 'Ajustes de operaciones de exportación',
      '11': 'Ajustes afectos al IVAP'
    };
    return tipos[tipo] || 'Desconocido';
  }

  getTipoComprobanteNombre(tipo: string): string {
    const tipos: { [key: string]: string } = {
      '01': 'Factura',
      '03': 'Boleta',
      '07': 'Nota de Crédito',
      '08': 'Nota de Débito'
    };
    return tipos[tipo] || 'Comprobante';
  }

  getClienteNombre(cliente: any): string {
    if (!cliente) return 'Sin cliente';
    return cliente.razon_social || cliente.nombre || 'Sin cliente';
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'bg-gray-50 text-gray-600';

    switch (estado.toUpperCase()) {
      case 'ACEPTADO':
        return 'bg-success-50 text-success-600';
      case 'ACEPTADO_OBS':
        return 'bg-warning-50 text-warning-600';
      case 'RECHAZADO':
        return 'bg-danger-50 text-danger-600';
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      case 'GENERADO':
        return 'bg-info-50 text-info-600';
      case 'ENVIADO':
        return 'bg-primary-50 text-primary-600';
      case 'ANULADO':
        return 'bg-gray-50 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear = false;
  }

  onNotaDebitoEmitida(nota: any): void {
    const numeroCompleto = nota.numero_completo || `${nota.serie}-${nota.numero}`;
    Swal.fire({
      icon: 'success',
      title: 'Nota de Débito Creada',
      text: `La nota de débito ${numeroCompleto} ha sido creada exitosamente`,
      confirmButtonText: 'Entendido'
    });

    // Recargar la lista
    this.cargarNotasDebito();
  }

  verDetalle(nota: NotaDebito): void {
    if (!nota.id) return;

    this.loading = true;
    this.notasDebitoService.getById(nota.id).subscribe({
      next: (response) => {
        this.loading = false;
        const notaDetalle = response.data || nota;
        const numeroCompleto = `${notaDetalle.serie}-${notaDetalle.numero}`;
        const comprobanteRef = `${notaDetalle.serie_comprobante_ref || 'N/A'}-${notaDetalle.numero_comprobante_ref || 'N/A'}`;
        const clienteNombre = this.getClienteNombre(notaDetalle.cliente);

        Swal.fire({
          title: 'Detalle de la Nota de Débito',
          html: `
            <div class="text-start">
              <p><strong>Número:</strong> ${numeroCompleto}</p>
              <p><strong>Fecha Emisión:</strong> ${notaDetalle.fecha_emision}</p>
              <p><strong>Cliente:</strong> ${clienteNombre}</p>
              <p><strong>Comprobante Referencia:</strong> ${comprobanteRef}</p>
              <p><strong>Tipo:</strong> ${this.getTipoNotaNombre(notaDetalle.tipo_nota_debito || '')}</p>
              <p><strong>Motivo:</strong> ${notaDetalle.motivo}</p>
              <p><strong>Subtotal:</strong> ${notaDetalle.moneda} ${notaDetalle.subtotal}</p>
              <p><strong>IGV:</strong> ${notaDetalle.moneda} ${notaDetalle.igv}</p>
              <p><strong>Total:</strong> ${notaDetalle.moneda} ${notaDetalle.total}</p>
              <p><strong>Estado:</strong> <span class="badge bg-${this.getEstadoBadgeColor(notaDetalle.estado)}">${notaDetalle.estado}</span></p>
              ${notaDetalle.observaciones ? `<p><strong>Observaciones:</strong> ${notaDetalle.observaciones}</p>` : ''}
            </div>
          `,
          icon: 'info',
          width: '600px',
          confirmButtonText: 'Cerrar'
        });
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el detalle de la nota',
          confirmButtonText: 'Cerrar'
        });
      }
    });
  }

  descargarPDF(nota: NotaDebito): void {
    if (!nota.id) return;
    // Abre la URL del PDF en nueva pestaña
    if (nota.pdf_url) {
      window.open(nota.pdf_url, '_blank');
    }
  }

  descargarXML(nota: NotaDebito): void {
    if (!nota.id) return;
    // Abre la URL del XML en nueva pestaña
    if (nota.xml_url) {
      window.open(nota.xml_url, '_blank');
    }
  }

  descargarCDR(nota: NotaDebito): void {
    if (!nota.id) return;

    this.descargando = true;
    this.notasDebitoService.descargarCdr(nota.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CDR-ND-${nota.serie}-${nota.numero}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.descargando = false;
      },
      error: (error) => {
        this.descargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al descargar CDR',
          text: error?.error?.message || 'CDR no disponible',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  // Verificar si se puede editar (solo PENDIENTE)
  puedeEditar(nota: NotaDebito): boolean {
    return nota.estado?.toLowerCase() === 'pendiente';
  }

  // Verificar si se puede generar XML (solo PENDIENTE)
  puedeGenerarXml(nota: NotaDebito): boolean {
    return nota.estado?.toLowerCase() === 'pendiente';
  }

  // Verificar si se puede enviar a SUNAT (PENDIENTE, GENERADO o RECHAZADO)
  puedeEnviarSunat(nota: NotaDebito): boolean {
    const estado = nota.estado?.toLowerCase() || '';
    return estado === 'pendiente' || estado === 'generado' || estado === 'rechazado';
  }

  // Verificar si tiene XML generado
  tieneXml(nota: NotaDebito): boolean {
    const estado = nota.estado?.toLowerCase() || '';
    return estado === 'generado' || estado === 'aceptado' || estado === 'rechazado';
  }

  // Editar nota (solo si PENDIENTE)
  editarNota(nota: NotaDebito): void {
    Swal.fire({
      icon: 'info',
      title: 'Función en desarrollo',
      text: 'La edición de notas de débito estará disponible próximamente',
      confirmButtonText: 'Entendido'
    });
  }

  // Generar XML (estado: PENDIENTE → GENERADO)
  generarXml(nota: NotaDebito): void {
    if (!nota.id) return;

    const numeroCompleto = `${nota.serie}-${nota.numero}`;
    
    Swal.fire({
      title: '¿Generar XML?',
      text: `¿Desea generar el XML de la nota de débito ${numeroCompleto}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.notasDebitoService.generarXml(nota.id!)
          .toPromise()
          .then(response => {
            if (!response.success && response.success !== undefined) {
              throw new Error(response.message || 'Error al generar XML');
            }
            return response;
          })
          .catch(error => {
            Swal.showValidationMessage(
              error?.error?.message || error.message || 'Error al generar XML'
            );
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          icon: 'success',
          title: 'XML Generado',
          text: result.value.message || 'El XML se generó exitosamente. Ahora puede enviar a SUNAT.',
          confirmButtonText: 'Entendido'
        }).then(() => {
          this.cargarNotasDebito();
        });
      }
    });
  }

  // Abrir modal para compartir
  abrirModalCompartir(nota: NotaDebito): void {
    if (!nota.id || !nota.pdf_url) return;

    const numeroCompleto = `${nota.serie}-${nota.numero}`;
    const clienteNombre = this.getClienteNombre(nota.cliente);

    Swal.fire({
      title: '📤 Compartir Nota de Débito',
      html: `
        <div class="text-start">
          <div class="alert alert-info mb-3">
            <strong>📄 Nota:</strong> ${numeroCompleto}<br>
            <strong>👤 Cliente:</strong> ${clienteNombre}
          </div>

          <div class="d-grid gap-2">
            <button id="btnWhatsApp" class="btn btn-success btn-lg">
              <i class="ph ph-whatsapp-logo me-2"></i>
              Enviar por WhatsApp
            </button>
            
            <button id="btnEmail" class="btn btn-primary btn-lg">
              <i class="ph ph-envelope me-2"></i>
              Enviar por Email
            </button>
          </div>

          <div class="mt-3">
            <small class="text-muted">
              <i class="ph ph-info me-1"></i>
              Se compartirá solo el PDF de la nota
            </small>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '500px',
      didOpen: () => {
        document.getElementById('btnWhatsApp')?.addEventListener('click', () => {
          Swal.close();
          this.enviarPorWhatsApp(nota);
        });

        document.getElementById('btnEmail')?.addEventListener('click', () => {
          Swal.close();
          this.enviarPorEmail(nota);
        });
      }
    });
  }

  // Enviar por WhatsApp (simplificado)
  enviarPorWhatsApp(nota: NotaDebito): void {
    if (!nota.id || !nota.pdf_url) return;

    const telefonoCliente = nota.cliente?.telefono || nota.cliente?.celular || '';
    const nombreCliente = this.getClienteNombre(nota.cliente);
    const numeroCompleto = `${nota.serie}-${nota.numero}`;

    Swal.fire({
      title: '📱 Enviar por WhatsApp',
      html: `
        <div class="text-start">
          <div class="alert alert-info mb-3">
            <strong>📄 Nota de Débito:</strong> ${numeroCompleto}<br>
            <strong>👤 Cliente:</strong> ${nombreCliente}
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Teléfono (WhatsApp)</label>
            <input 
              type="tel" 
              id="telefono" 
              class="form-control" 
              value="${telefonoCliente}"
              placeholder="+51987654321">
            <small class="text-muted">Incluir código de país (+51)</small>
            ${!telefonoCliente ? '<small class="text-danger d-block">⚠️ Teléfono no disponible - Ingrese manualmente</small>' : ''}
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Mensaje personalizado (opcional)</label>
            <textarea 
              id="mensaje" 
              class="form-control" 
              rows="3"
              placeholder="Mensaje adicional..."></textarea>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: '<i class="ph ph-whatsapp-logo me-2"></i>Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#25d366',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const telefono = (document.getElementById('telefono') as HTMLInputElement).value.trim();
        const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value.trim();
        
        if (!telefono) {
          Swal.showValidationMessage('Debe ingresar un número de teléfono');
          return false;
        }
        
        return { telefono, mensaje };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        // Enviar solo la URL del PDF
        const mensaje = result.value.mensaje 
          ? `${result.value.mensaje}\n\n📄 Ver comprobante:\n${nota.pdf_url}`
          : `Hola ${nombreCliente}, adjunto tu Nota de Débito ${numeroCompleto} 📄\n\nVer comprobante:\n${nota.pdf_url}`;
        const whatsappUrl = `https://wa.me/${result.value.telefono.replace(/\+/g, '')}?text=${encodeURIComponent(mensaje)}`;
        
        Swal.fire({
          title: '✅ ¡Listo!',
          html: `
            <div class="text-center">
              <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
              <p>WhatsApp se abrirá automáticamente</p>
              <p class="fw-bold">${result.value.telefono}</p>
            </div>
          `,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 500);
      }
    });
  }

  // Enviar por Email
  enviarPorEmail(nota: NotaDebito): void {
    if (!nota.id || !nota.pdf_url) return;

    const emailCliente = nota.cliente?.email || '';
    const nombreCliente = this.getClienteNombre(nota.cliente);
    const numeroCompleto = `${nota.serie}-${nota.numero}`;
    
    Swal.fire({
      title: '📧 Enviar por Email',
      html: `
        <div class="text-start">
          <div class="alert alert-info mb-3">
            <strong>📄 Nota de Débito:</strong> ${numeroCompleto}<br>
            <strong>👤 Cliente:</strong> ${nombreCliente}
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <input 
              type="email" 
              id="email" 
              class="form-control" 
              value="${emailCliente}"
              placeholder="correo@ejemplo.com">
            ${!emailCliente ? '<small class="text-danger">⚠️ Email no disponible - Ingrese manualmente</small>' : ''}
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Mensaje personalizado (opcional)</label>
            <textarea 
              id="mensaje" 
              class="form-control" 
              rows="3"
              placeholder="Mensaje adicional..."></textarea>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: '<i class="ph ph-envelope me-2"></i>Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value.trim();
        
        if (!email) {
          Swal.showValidationMessage('Debe ingresar un email');
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage('El formato del email no es válido');
          return false;
        }
        
        return { email, mensaje };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: '📤 Enviando Email...',
          text: 'Por favor espere',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.notasDebitoService.enviarEmail(nota.id!, result.value.email, undefined, result.value.mensaje).subscribe({
          next: (response) => {
            Swal.fire({
              title: '✅ ¡Enviado!',
              html: `
                <div class="text-center">
                  <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                  <p>El email ha sido enviado exitosamente a:</p>
                  <p class="fw-bold">${result.value.email}</p>
                  <div class="alert alert-info mt-3 text-start">
                    <strong>📄 Archivos adjuntos:</strong> PDF, XML
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#198754'
            });
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: '❌ Error al enviar',
              html: `
                <div class="text-start">
                  <p class="mb-3">${error?.error?.message || 'Error al enviar el email'}</p>
                  ${error?.error?.data?.estado_actual ? `
                    <div class="alert alert-warning">
                      <strong>Estado actual:</strong> ${error.error.data.estado_actual}
                    </div>
                  ` : ''}
                </div>
              `,
              confirmButtonText: 'Entendido'
            });
          }
        });
      }
    });
  }

  enviarSunat(nota: NotaDebito): void {
    if (!nota.id) return;

    // Verificar estado - permitir GENERADO y RECHAZADO
    const estadoLower = nota.estado?.toLowerCase() || '';
    if (estadoLower !== 'generado' && estadoLower !== 'rechazado') {
      Swal.fire({
        icon: 'warning',
        title: 'XML no generado',
        text: 'Debe generar el XML antes de enviar a SUNAT. Use el botón "Generar XML".',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const numeroCompleto = `${nota.serie}-${nota.numero}`;

    Swal.fire({
      title: '¿Enviar a SUNAT?',
      text: `¿Desea enviar la nota de débito ${numeroCompleto} a SUNAT?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.notasDebitoService.enviarSunat(nota.id!)
          .toPromise()
          .then(response => {
            if (!response.success && response.success !== undefined) {
              throw new Error(response.message || 'Error al enviar');
            }
            return response;
          })
          .catch(error => {
            const errorMsg = error?.error?.message || error.message || 'Error al enviar a SUNAT';
            const errorDetail = error?.error?.error;
            const sugerencia = error?.error?.data?.sugerencia;

            let mensajeCompleto = errorMsg;
            if (errorDetail) {
              mensajeCompleto += `\n\n${errorDetail}`;
            }
            if (sugerencia) {
              mensajeCompleto += `\n\n💡 Sugerencia: ${sugerencia}`;
            }

            Swal.showValidationMessage(mensajeCompleto);
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          icon: 'success',
          title: 'Enviado a SUNAT',
          text: result.value.message || 'La nota de débito se envió exitosamente',
          confirmButtonText: 'Entendido'
        }).then(() => {
          // Recargar la lista
          this.cargarNotasDebito();
        });
      }
    });
  }

  consultarEstado(nota: NotaDebito): void {
    if (!nota.id) return;

    const numeroCompleto = `${nota.serie}-${nota.numero}`;

    Swal.fire({
      title: '🔍 Consultando SUNAT...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.notasDebitoService.consultarSunat(nota.id).subscribe({
      next: (response) => {
        const data = response.data || response;
        const estadoSunat = data.estado_sunat || 'DESCONOCIDO';
        const codigoRespuesta = data.codigo_respuesta || 'N/A';
        const descripcionRespuesta = data.descripcion_respuesta || 'Sin descripción';
        const tieneCdr = data.tiene_cdr || false;
        const cdrDescargado = data.cdr_descargado || false;

        // Determinar icono según estado
        let icono: 'success' | 'error' | 'warning' | 'info' = 'info';
        if (estadoSunat === 'ACEPTADO') icono = 'success';
        else if (estadoSunat === 'RECHAZADO') icono = 'error';
        else if (estadoSunat === 'PENDIENTE') icono = 'warning';

        Swal.fire({
          title: '📋 Estado en SUNAT',
          html: `
            <div class="text-start">
              <div class="alert alert-${estadoSunat === 'ACEPTADO' ? 'success' : estadoSunat === 'RECHAZADO' ? 'danger' : 'warning'} mb-3">
                <strong>📄 Comprobante:</strong> ${numeroCompleto}<br>
                <strong>📊 Estado SUNAT:</strong> 
                <span class="badge ${this.getEstadoSunatClase(estadoSunat)}">
                  ${estadoSunat}
                </span>
              </div>

              <div class="mb-3">
                <strong>🔢 Código de Respuesta:</strong> ${codigoRespuesta}<br>
                <strong>📝 Descripción:</strong> ${descripcionRespuesta}<br>
                <strong>📅 Fecha Consulta:</strong> ${data.fecha_consulta || new Date().toLocaleString('es-PE')}
              </div>

              ${tieneCdr ? `
                <div class="alert alert-success">
                  <i class="ph ph-check-circle me-2"></i>
                  <strong>CDR Disponible</strong><br>
                  ${cdrDescargado ? 
                    '✅ El CDR ya fue descargado y está disponible' : 
                    '⚠️ El CDR está disponible pero no se ha descargado aún'}
                </div>
              ` : estadoSunat === 'ACEPTADO' ? `
                <div class="alert alert-warning">
                  <i class="ph ph-warning me-2"></i>
                  <strong>CDR Pendiente</strong><br>
                  El comprobante fue aceptado pero el CDR aún no está disponible
                </div>
              ` : ''}

              ${estadoSunat === 'RECHAZADO' ? `
                <div class="alert alert-danger">
                  <i class="ph ph-x-circle me-2"></i>
                  <strong>Comprobante Rechazado</strong><br>
                  Debe corregir los errores antes de reenviar
                </div>
              ` : ''}
            </div>
          `,
          icon: icono,
          confirmButtonText: 'Cerrar',
          width: '600px'
        });

        // Recargar la lista para actualizar el estado
        this.cargarNotasDebito();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: '❌ Error al Consultar',
          html: `
            <div class="text-start">
              <p class="mb-3">${error?.error?.message || 'No se pudo consultar el estado en SUNAT'}</p>
              ${error?.error?.data ? `
                <div class="alert alert-warning">
                  <strong>Información adicional:</strong><br>
                  ${JSON.stringify(error.error.data, null, 2)}
                </div>
              ` : ''}
            </div>
          `,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  private getEstadoSunatClase(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACEPTADO':
        return 'bg-success-50 text-success-600';
      case 'RECHAZADO':
        return 'bg-danger-50 text-danger-600';
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  private getEstadoBadgeColor(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'aceptado':
      case 'enviado':
        return 'success';
      case 'rechazado':
        return 'danger';
      case 'pendiente':
        return 'warning';
      default:
        return 'secondary';
    }
  }
}