import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PopupsService } from '../../../../services/popups.service';
import { RecompensasService } from '../../../../services/recompensas.service';
import {
  RecompensaConPopups,
  PopupFilters,
  Popup,
  PopupCreateRequest,
  PopupUpdateRequest
} from '../../../../models/popup.model';
type PopupFormData = PopupCreateRequest & PopupUpdateRequest;
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-recompensas-popups-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recompensas-popups-global.component.html',
  styleUrls: ['./recompensas-popups-global.component.scss']
})
export class RecompensasPopupsGlobalComponent implements OnInit, OnDestroy {
  // NOTA IMPORTANTE: Según la documentación, NO existe un endpoint global para listar
  // todas las recompensas con información de popups. Solo existen endpoints para:
  // - Listar recompensas (endpoint existente del sistema)
  // - Listar popups de una recompensa específica: GET /api/admin/recompensas/{id}/popups
  // 
  // Por lo tanto, este componente:
  // 1. Carga recompensas del endpoint existente
  // 2. Para cada recompensa, intenta cargar sus popups individualmente
  // 3. Si el endpoint de popups no está implementado, muestra "sin popups"
  
  // Datos principales
  recompensas: RecompensaConPopups[] = [];
  loading = false;
  error: string | null = null;

  // Filtros de búsqueda - Solo mostrar recompensas activas y programadas
  filtros: any = {
    nombre: '',
    tipo: 'todos',
    vigente: false, // Filtro por vigencia
    page: 1,
    per_page: 12
  };

  // Opciones de filtros
  tiposRecompensa = [
    { value: 'todos', label: 'Todos' },
    { value: 'puntos', label: 'Puntos' },
    { value: 'descuento', label: 'Descuento' },
    { value: 'envio_gratis', label: 'Envío Gratis' },
    { value: 'regalo', label: 'Regalo' }
  ];

  estadosRecompensa = [
    { value: 'todos', label: 'Todos' },
    { value: 'activa', label: 'Activa' },
    { value: 'inactiva', label: 'Inactiva' },
    { value: 'borrador', label: 'Borrador' }
  ];

  // Paginación
  totalRecompensas = 0;
  currentPage = 1;
  lastPage = 1;
  perPage = 12;

  // Modal de popup
  showPopupModal = false;
  popupModalTitle = '';
  popupModalMode: 'create' | 'edit' = 'create';
  popupModalData: PopupFormData = {
    titulo: '',
    descripcion: '',
    texto_boton: 'Ver más',
    url_destino: '',
    mostrar_cerrar: true,
    auto_cerrar_segundos: 0, // Cambiado a 0 según la documentación
    popup_activo: false
  };
  popupModalLoading = false;
  popupModalError: string | null = null;
  selectedRecompensaId: number | null = null;
  selectedPopupId: number | null = null;

  // Popups de una recompensa específica
  popupsRecompensa: Popup[] = [];
  showPopupsList = false;
  selectedRecompensa: RecompensaConPopups | null = null;
  loadingPopups = false;

  constructor(
    private http: HttpClient,
    private popupsService: PopupsService,
    private recompensasService: RecompensasService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.cargarRecompensas();
  }

  // ===== MÉTODOS PRINCIPALES =====

  cargarRecompensas(): void {
    this.loading = true;
    this.error = null;

    // Cargar recompensas activas y programadas
    this.cargarRecompensasActivasYProgramadas();
  }

  cargarRecompensasActivasYProgramadas(): void {
    console.log('Cargando recompensas con filtros:', this.filtros);

    // Construir parámetros según la documentación del endpoint
    let params = new HttpParams();
    
    // Solo agregar parámetros que no sean valores por defecto
    if (this.filtros.nombre && this.filtros.nombre.trim() !== '') {
      params = params.set('nombre', this.filtros.nombre.trim());
    }
    
    if (this.filtros.tipo && this.filtros.tipo !== 'todos') {
      params = params.set('tipo', this.filtros.tipo);
    }
    
    if (this.filtros.vigente !== undefined && this.filtros.vigente !== false) {
      params = params.set('vigente', this.filtros.vigente.toString());
    }
    
    if (this.filtros.page && this.filtros.page > 1) {
      params = params.set('page', this.filtros.page.toString());
    }
    
    if (this.filtros.per_page && this.filtros.per_page !== 12) {
      params = params.set('per_page', this.filtros.per_page.toString());
    }

    console.log('Parámetros enviados al endpoint:', params.toString());

    this.http.get(`${environment.apiUrl}/admin/recompensas/popups`, {
      params: params
    }).subscribe({
      next: (response: any) => {
        console.log('Respuesta del endpoint de popups:', response);
        
        if (response.success && response.data && Array.isArray(response.data)) {
          this.recompensas = response.data.map((recompensa: any) => ({
            id: recompensa.id,
            nombre: recompensa.nombre,
            tipo: recompensa.tipo,
            tipo_nombre: this.getTipoLabel(recompensa.tipo),
            estado: recompensa.estado,
            descripcion: recompensa.descripcion || '',
            fecha_inicio: recompensa.fecha_inicio,
            fecha_fin: recompensa.fecha_fin,
            vigente: this.esVigente(recompensa.fecha_inicio, recompensa.fecha_fin),
            productos_count: recompensa.productos_count || 0,
            popups_count: recompensa.total_popups || 0,
            popups_activos_count: recompensa.popups_activos_count || 0,
            popup_status: recompensa.tiene_popup ? 'con_popups' : 'sin_popups',
            created_at: recompensa.created_at,
            updated_at: recompensa.updated_at
          }));
          
          this.totalRecompensas = response.total || 0;
          this.currentPage = response.current_page || 1;
          this.lastPage = response.last_page || 1;
          this.perPage = response.per_page || 12;
        } else {
          this.recompensas = [];
          this.error = 'No se encontraron recompensas';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando recompensas:', error);
        this.error = 'Error al cargar recompensas';
        this.recompensas = [];
        this.loading = false;
      }
    });
  }


  buscar(): void {
    console.log('🔍 Aplicando filtros:', this.filtros);
    this.filtros.page = 1;
    this.cargarRecompensas();
  }

  limpiarFiltros(): void {
    this.filtros = {
      nombre: '',
      tipo: 'todos',
      vigente: false,
      page: 1,
      per_page: 12
    };
    this.cargarRecompensas();
  }

  // ===== MÉTODOS DE PAGINACIÓN =====

  cambiarPagina(pagina: number): void {
    this.filtros.page = pagina;
    this.cargarRecompensas();
  }

  get paginas(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.currentPage - 2);
    const fin = Math.min(this.lastPage, this.currentPage + 2);
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  // ===== MÉTODOS DE POPUPS =====

  verPopups(recompensa: RecompensaConPopups): void {
    this.selectedRecompensa = recompensa;
    this.loadingPopups = true;
    this.showPopupsList = true;

    // Usar el endpoint correcto: /api/admin/recompensas/{recompensaId}/popups
    this.http.get(`${environment.apiUrl}/admin/recompensas/${recompensa.id}/popups`).subscribe({
      next: (response: any) => {
        console.log('=== DEBUG VER POPUPS ===');
        console.log('Respuesta completa:', response);
        console.log('response.success:', response.success);
        console.log('response.data:', response.data);
        console.log('response.data.popups:', response.data?.popups);
        
        if (response.success && response.data && response.data.popups) {
          this.popupsRecompensa = response.data.popups.map((popup: any) => {
            console.log('Popup individual:', popup);
            console.log('Imagen popup:', popup.imagen_popup);
            console.log('Imagen popup URL:', popup.imagen_popup_url);
            return popup;
          });
          console.log('✅ Popups cargados:', this.popupsRecompensa);
        } else {
          this.popupsRecompensa = [];
          console.log('❌ No se encontraron popups');
        }
        this.loadingPopups = false;
      },
      error: (error) => {
        console.error('Error cargando popups:', error);
        this.popupsRecompensa = [];
        this.loadingPopups = false;
      }
    });
  }

  crearPopup(recompensa: RecompensaConPopups): void {
    this.selectedRecompensaId = recompensa.id;
    this.popupModalMode = 'create';
    this.popupModalTitle = `Crear Popup - ${recompensa.nombre}`;
    this.popupModalData = {
      titulo: '',
      descripcion: '',
      texto_boton: 'Ver más',
      url_destino: this.popupsService.generarUrlDestinoDefault(recompensa.id),
      mostrar_cerrar: true,
      auto_cerrar_segundos: 30,
      popup_activo: false,
      // Nuevas propiedades de configuración visual con valores por defecto
      size: 'medium',
      position: 'center',
      theme: 'light',
      blur_backdrop: true,
      close_on_backdrop: false,
      animation: 'fade',
      imagen_aspect_ratio: '16:9'
    };
    this.popupModalError = null;
    this.showPopupModal = true;
  }

  editarPopup(popup: Popup): void {
    this.selectedRecompensaId = popup.recompensa_id;
    this.selectedPopupId = popup.id;
    this.popupModalMode = 'edit';
    this.popupModalTitle = `Editar Popup - ${popup.titulo}`;
    this.popupModalData = {
      titulo: popup.titulo,
      descripcion: popup.descripcion || '',
      texto_boton: popup.texto_boton,
      url_destino: popup.url_destino,
      mostrar_cerrar: popup.mostrar_cerrar,
      auto_cerrar_segundos: popup.auto_cerrar_segundos,
      popup_activo: popup.popup_activo,
      // Nuevas propiedades de configuración visual (con fallback a valores por defecto)
      size: popup.size || 'medium',
      position: popup.position || 'center',
      theme: popup.theme || 'light',
      blur_backdrop: popup.blur_backdrop ?? true,
      close_on_backdrop: popup.close_on_backdrop ?? false,
      animation: popup.animation || 'fade',
      imagen_aspect_ratio: popup.imagen_aspect_ratio || '16:9'
    };
    this.popupModalError = null;
    this.showPopupModal = true;
  }

  guardarPopup(): void {
    if (!this.selectedRecompensaId) return;

    this.popupModalLoading = true;
    this.popupModalError = null;

    console.log('Guardando popup:', this.popupModalData);
    console.log('Modo:', this.popupModalMode);
    console.log('Recompensa ID:', this.selectedRecompensaId);

    const request = this.popupModalMode === 'create' 
      ? this.popupsService.crearPopup(this.selectedRecompensaId, this.popupModalData as PopupCreateRequest)
      : this.popupsService.actualizarPopup(this.selectedRecompensaId, this.selectedPopupId!, this.popupModalData as PopupUpdateRequest);

    request.subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        if (response.success) {
          this.cerrarPopupModal();
          this.cargarRecompensas();
          if (this.showPopupsList) {
            this.verPopups(this.selectedRecompensa!);
          }
          this.mostrarModalExito('Popup guardado exitosamente');
        } else {
          this.popupModalError = 'Error al guardar el popup';
        }
        this.popupModalLoading = false;
      },
      error: (error) => {
        console.error('Error guardando popup:', error);
        console.error('Error completo:', error.error);
        console.error('Status:', error.status);
        console.error('Status Text:', error.statusText);
        
        // Log detallado de los errores de validación
        if (error.error && error.error.errors) {
          console.error('🔍 ERRORES DE VALIDACIÓN DETALLADOS:');
          console.error('Errores:', error.error.errors);
          console.error('Mensaje:', error.error.message);
          
          // Mostrar cada error individualmente
          Object.keys(error.error.errors).forEach(campo => {
            console.error(`❌ Campo "${campo}":`, error.error.errors[campo]);
          });
        }
        
        // Mostrar detalles del error si están disponibles
        if (error.error && error.error.message) {
          this.popupModalError = `Error: ${error.error.message}`;
        } else if (error.error && error.error.errors) {
          // Si hay errores de validación específicos
          console.log('Errores de validación:', error.error.errors);
          const validationErrors = Object.values(error.error.errors).flat();
          this.popupModalError = `Errores de validación: ${validationErrors.join(', ')}`;
        } else {
          this.popupModalError = `Error al guardar el popup (${error.status}: ${error.statusText})`;
        }
        
        this.popupModalLoading = false;
      }
    });
  }

  togglePopup(popup: Popup): void {
    this.popupsService.togglePopup(popup.recompensa_id, popup.id).subscribe({
      next: (response) => {
        if (response.success) {
          // Actualizar el estado del popup en la lista
          const index = this.popupsRecompensa.findIndex(p => p.id === popup.id);
          if (index !== -1) {
            // Actualizar el estado del popup con los datos de la respuesta
            this.popupsRecompensa[index].popup_activo = (response.data as any).popup_activo;
            this.popupsRecompensa[index].esta_activo = (response.data as any).esta_activo;
          }
          this.cargarRecompensas();
        }
      },
      error: (error) => {
        console.error('Error cambiando estado del popup:', error);
      }
    });
  }

  eliminarPopup(popup: Popup): void {
    if (confirm('¿Estás seguro de que quieres eliminar este popup?')) {
      this.popupsService.eliminarPopup(popup.recompensa_id, popup.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.verPopups(this.selectedRecompensa!);
            this.cargarRecompensas();
          }
        },
        error: (error) => {
          console.error('Error eliminando popup:', error);
        }
      });
    }
  }

  cerrarPopupModal(): void {
    this.showPopupModal = false;
    this.popupModalData = {
      titulo: '',
      descripcion: '',
      texto_boton: 'Ver más',
      url_destino: this.selectedRecompensaId ? `/recompensas/${this.selectedRecompensaId}` : '',
      mostrar_cerrar: true,
      auto_cerrar_segundos: 0, // Cambiado a 0 según la documentación
      popup_activo: false
    };
    this.popupModalError = null;
    this.selectedRecompensaId = null;
    this.selectedPopupId = null;
  }

  cerrarListaPopups(): void {
    this.showPopupsList = false;
    this.popupsRecompensa = [];
    this.selectedRecompensa = null;
  }

  // ===== MÉTODOS AUXILIARES =====

  getTipoIcon(tipo: string): string {
    const iconos: { [key: string]: string } = {
      puntos: 'fas fa-coins',
      descuento: 'fas fa-percentage',
      envio_gratis: 'fas fa-shipping-fast',
      regalo: 'fas fa-gift'
    };
    return iconos[tipo] || 'fas fa-star';
  }

  getTipoColor(tipo: string): string {
    const colores: { [key: string]: string } = {
      puntos: '#ffc107',
      descuento: '#28a745',
      envio_gratis: '#17a2b8',
      regalo: '#e83e8c'
    };
    return colores[tipo] || '#6c757d';
  }

  getTipoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      puntos: 'Puntos',
      descuento: 'Descuento',
      envio_gratis: 'Envío Gratis',
      regalo: 'Regalo'
    };
    return labels[tipo] || tipo;
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      activa: 'badge-success',
      inactiva: 'badge-secondary',
      borrador: 'badge-warning'
    };
    return clases[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      activa: 'ACTIVA',
      inactiva: 'INACTIVA',
      borrador: 'BORRADOR'
    };
    return labels[estado] || estado.toUpperCase();
  }

  esVigente(fechaInicio: string, fechaFin: string): boolean {
    const ahora = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return ahora >= inicio && ahora <= fin;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.popupModalData.imagen_popup = file;
    }
  }

  removeImage(): void {
    this.popupModalData.imagen_popup = undefined;
    // Limpiar el input de archivo
    const fileInput = document.getElementById('imagen_popup') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('imagen_popup') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  obtenerUrlImagen(imagenPath: string): string {
    console.log('🔍 Obteniendo URL de imagen:', imagenPath);
    const url = this.popupsService.obtenerUrlImagen(imagenPath);
    console.log('🔍 URL generada:', url);
    return url;
  }

  obtenerImagenPopup(popup: any): string {
    const imagenUrl = popup.imagen_popup_url || popup.imagen_popup || '';
    return this.obtenerUrlImagen(imagenUrl);
  }

  private imagePreviewCache = new Map<File, string>();

  obtenerPreviewImagen(file: File): string {
    if (!file) return '';
    
    // Usar caché para evitar crear nuevas URLs en cada ciclo
    if (this.imagePreviewCache.has(file)) {
      return this.imagePreviewCache.get(file)!;
    }
    
    const blobUrl = URL.createObjectURL(file);
    this.imagePreviewCache.set(file, blobUrl);
    return blobUrl;
  }

  onImageError(event: any): void {
    console.error('Error cargando imagen:', event);
    console.error('URL de imagen:', event.target.src);
  }

  onImageLoad(event: any): void {
    console.log('Imagen cargada correctamente:', event.target.src);
  }

  ngOnDestroy(): void {
    // Limpiar URLs blob para evitar memory leaks
    this.imagePreviewCache.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.imagePreviewCache.clear();
  }

  showImageDebug = true; // Temporal para debug

  // Modal de éxito
  showSuccessModal = false;
  successMessage = '';

  mostrarModalExito(mensaje: string): void {
    this.successMessage = mensaje;
    this.showSuccessModal = true;
  }

  cerrarModalExito(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
  }
}