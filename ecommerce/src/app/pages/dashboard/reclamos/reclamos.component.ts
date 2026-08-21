import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ReclamosService, Reclamo } from '../../../services/reclamos.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

/** Pestañas del modal de detalle del reclamo. */
type TabReclamo = 'consumidor' | 'compra' | 'detalle' | 'adjuntos' | 'respuesta';

@Component({
  selector: 'app-dashboard-reclamos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reclamos.component.html',
  styleUrl: './reclamos.component.scss'
})
export class ReclamosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos
  reclamos: Reclamo[] = [];
  reclamoSeleccionado: Reclamo | null = null;
  estadisticas: any = {};
  
  // Estados
  isLoading = false;
  isLoadingStats = false;
  isUpdatingReclamo = false;
  mostrandoFormularioRespuesta = false;
  
  // Formulario de respuesta
  respuestaTexto = '';
  fechaRespuesta = new Date().toISOString().split('T')[0];

  // Filtros
  filtros = {
    search: '',
    estado: '',
    tipo_solicitud: '',
    fecha_desde: '',
    fecha_hasta: ''
  };

  // Paginación
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Estados disponibles
  estadosDisponibles = [
    { value: 'pendiente', label: 'Pendiente', class: 'bg-warning-50 text-warning-600' },
    { value: 'en_proceso', label: 'En Proceso', class: 'bg-info-50 text-info-600' },
    { value: 'resuelto', label: 'Resuelto', class: 'bg-success-50 text-success-600' },
    { value: 'cerrado', label: 'Cerrado', class: 'bg-secondary-50 text-secondary-600' }
  ];

  constructor(private reclamosService: ReclamosService) {}

  ngOnInit(): void {
    this.cargarReclamos();
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarReclamos(): void {
    this.isLoading = true;

    const params = {
      page: this.currentPage,
      per_page: this.itemsPerPage,
      ...this.filtros
    };

    // Filtrar parámetros vacíos
    Object.keys(params).forEach(key => {
      if (!params[key as keyof typeof params]) {
        delete params[key as keyof typeof params];
      }
    });

    this.reclamosService.obtenerTodosReclamos(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.reclamos = response.reclamos || [];
            if (response.pagination) {
              this.currentPage = response.pagination.current_page;
              this.totalPages = response.pagination.last_page;
              this.totalItems = response.pagination.total;
            }
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando reclamos:', error);
          this.isLoading = false;
          this.mostrarError('Error al cargar reclamos');
        }
      });
  }

  cargarEstadisticas(): void {
    this.isLoadingStats = true;
    this.reclamosService.obtenerEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.estadisticas = response.estadisticas;
          }
          this.isLoadingStats = false;
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
          this.isLoadingStats = false;
        }
      });
  }

  aplicarFiltros(): void {
    this.currentPage = 1;
    this.cargarReclamos();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      estado: '',
      tipo_solicitud: '',
      fecha_desde: '',
      fecha_hasta: ''
    };
    this.currentPage = 1;
    this.cargarReclamos();
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cargarReclamos();
    }
  }

  // ── Modal de detalle ──────────────────────────────────────────────────

  /** Pestañas del modal, para no apilar todo en un scroll largo. */
  readonly pestanas: { id: TabReclamo; label: string; icono: string }[] = [
    { id: 'consumidor', label: 'Consumidor', icono: 'ph-user' },
    { id: 'compra', label: 'Compra', icono: 'ph-receipt' },
    { id: 'detalle', label: 'Detalle', icono: 'ph-chat-text' },
    { id: 'adjuntos', label: 'Adjuntos', icono: 'ph-paperclip' },
    { id: 'respuesta', label: 'Respuesta', icono: 'ph-check-square' },
  ];

  tab: TabReclamo = 'consumidor';
  mostrarDetalle = false;

  verDetalle(reclamo: Reclamo): void {
    this.reclamoSeleccionado = reclamo;
    this.tab = 'consumidor';
    this.mostrandoFormularioRespuesta = false;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.reclamoSeleccionado = null;
    this.mostrandoFormularioRespuesta = false;
  }

  /** URL absoluta de un adjunto guardado como "storage/reclamos/xxx.jpg". */
  urlAdjunto(ruta?: string | null): string {
    if (!ruta) return '';
    if (/^https?:\/\//i.test(ruta)) return ruta;
    return `${environment.baseUrl}/${ruta.replace(/^\/+/, '')}`;
  }

  get tieneAdjuntos(): boolean {
    const r = this.reclamoSeleccionado;
    return !!(r?.foto || r?.factura || r?.video);
  }

  /** Lo que el consumidor pidió: la opción del desplegable o su texto libre. */
  get solucionPedida(): string {
    const r = this.reclamoSeleccionado;
    if (!r) return '';
    if (r.solucion_esperada && r.solucion_esperada !== 'Otro') return r.solucion_esperada;
    return r.otra_solucion || r.solucion_esperada || '';
  }

  cambiarEstado(reclamo: Reclamo, nuevoEstado: string): void {
    if (reclamo.estado === nuevoEstado) return;

    Swal.fire({
      title: '¿Cambiar estado del reclamo?',
      text: `¿Está seguro de cambiar el estado a "${this.getEstadoLabel(nuevoEstado)}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isUpdatingReclamo = true;
        this.reclamosService.cambiarEstado(reclamo.id!, nuevoEstado)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.status === 'success') {
                reclamo.estado = nuevoEstado as any;
                this.mostrarExito('Estado actualizado correctamente');
                this.cargarEstadisticas();
              }
              this.isUpdatingReclamo = false;
            },
            error: (error) => {
              console.error('Error cambiando estado:', error);
              this.isUpdatingReclamo = false;
              this.mostrarError('Error al cambiar el estado');
            }
          });
      }
    });
  }

  responderReclamo(): void {
    this.mostrandoFormularioRespuesta = true;
    this.respuestaTexto = '';
    this.fechaRespuesta = new Date().toISOString().split('T')[0];
  }

  cancelarRespuesta(): void {
    this.mostrandoFormularioRespuesta = false;
    this.respuestaTexto = '';
  }

  enviarRespuesta(): void {
    if (!this.reclamoSeleccionado || !this.respuestaTexto.trim() || this.respuestaTexto.trim().length < 10) {
      this.mostrarError('La respuesta debe tener al menos 10 caracteres');
      return;
    }

    this.actualizarRespuesta(this.reclamoSeleccionado.id!, this.respuestaTexto.trim(), this.fechaRespuesta);
  }

  private actualizarRespuesta(id: number, respuesta: string, fechaRespuesta: string): void {
    this.isUpdatingReclamo = true;
    this.reclamosService.actualizarRespuesta(id, respuesta, fechaRespuesta)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            // Actualizar el reclamo seleccionado
            if (this.reclamoSeleccionado) {
              this.reclamoSeleccionado.respuesta_proveedor = respuesta;
              this.reclamoSeleccionado.fecha_respuesta = fechaRespuesta;
              this.reclamoSeleccionado.estado = 'resuelto';
            }
            
            // Actualizar en la lista
            const index = this.reclamos.findIndex(r => r.id === id);
            if (index >= 0) {
              this.reclamos[index] = { ...this.reclamos[index], ...response.reclamo };
            }
            
            this.mostrarExito('Respuesta enviada correctamente');
            this.cargarEstadisticas();
            this.mostrandoFormularioRespuesta = false;
            this.respuestaTexto = '';
          }
          this.isUpdatingReclamo = false;
        },
        error: (error) => {
          console.error('Error enviando respuesta:', error);
          this.isUpdatingReclamo = false;
          this.mostrarError('Error al enviar la respuesta');
          this.mostrandoFormularioRespuesta = false;
        }
      });
  }

  eliminarReclamo(reclamo: Reclamo): void {
    Swal.fire({
      title: '¿Eliminar reclamo?',
      text: `¿Está seguro de eliminar el reclamo ${reclamo.numero_reclamo}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reclamosService.eliminarReclamo(reclamo.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.status === 'success') {
                this.reclamos = this.reclamos.filter(r => r.id !== reclamo.id);
                this.mostrarExito('Reclamo eliminado correctamente');
                this.cargarEstadisticas();
              }
            },
            error: (error) => {
              console.error('Error eliminando reclamo:', error);
              this.mostrarError('Error al eliminar el reclamo');
            }
          });
      }
    });
  }

  // Utilidades
  getEstadoClass(estado: string): string {
    return this.reclamosService.getEstadoClass(estado);
  }

  getEstadoLabel(estado: string): string {
    const estadoObj = this.estadosDisponibles.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : 'Desconocido';
  }

  getTipoSolicitudLabel(tipo: string): string {
    return tipo === 'reclamo' ? 'Reclamo' : 'Queja';
  }

  getTipoBienLabel(tipo: string): string {
    return tipo === 'producto' ? 'Producto' : 'Servicio';
  }

  isReclamoVencido(fechaLimite: string, estado: string): boolean {
    if (!fechaLimite || estado === 'resuelto' || estado === 'cerrado') {
      return false;
    }
    const limite = new Date(fechaLimite);
    const hoy = new Date();
    return limite < hoy;
  }

  calcularDiasRestantes(fechaLimite: string): number {
    if (!fechaLimite) return 0;
    const limite = new Date(fechaLimite);
    const hoy = new Date();
    const diferencia = limite.getTime() - hoy.getTime();
    const dias = Math.ceil(diferencia / (1000 * 3600 * 24));
    return dias > 0 ? dias : 0;
  }

  exportarDatos(): void {
    // TODO: Implementar exportación a Excel/PDF
    this.mostrarInfo('Funcionalidad de exportación en desarrollo');
  }

  private mostrarExito(mensaje: string): void {
    Swal.fire({
      title: 'Éxito',
      text: mensaje,
      icon: 'success',
      timer: 3000,
      showConfirmButton: false
    });
  }

  private mostrarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#d33'
    });
  }

  private mostrarInfo(mensaje: string): void {
    Swal.fire({
      title: 'Información',
      text: mensaje,
      icon: 'info',
      confirmButtonColor: '#3085d6'
    });
  }

  // Getters para el template
  get paginaInicio(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get paginaFin(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  get hayReclamos(): boolean {
    return this.reclamos.length > 0;
  }

  get hayFiltrosActivos(): boolean {
    return Object.values(this.filtros).some(valor => valor !== '');
  }
}