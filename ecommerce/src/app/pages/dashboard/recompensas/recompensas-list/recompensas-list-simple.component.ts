import { Component, OnInit, ViewChild, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../../../components/shared/status-badge/status-badge.component';
import { SearchInputComponent } from '../../../../components/shared/search-input/search-input.component';
import { RecompensasCrearModalComponent } from '../recompensas-crear-modal/recompensas-crear-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import { RecompensasService } from '../../../../services/recompensas.service';
import { ProductosService } from '../../../../services/productos.service';
import { CategoriasService } from '../../../../services/categorias.service';
import { 
  RecompensaLista, 
  TipoRecompensa, 
  EstadoRecompensa, 
  FiltrosRecompensas,
  PaginatedResponse,
  ApiResponse
} from '../../../../models/recompensa.model';

@Component({
  selector: 'app-recompensas-list-simple',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    SearchInputComponent,
    RecompensasCrearModalComponent
  ],
  templateUrl: './recompensas-list-simple.component.html',
  styleUrls: ['./recompensas-list-simple.component.scss']
})
export class RecompensasListSimpleComponent implements OnInit {
  @ViewChild('deleteModal', { static: true }) deleteModal!: TemplateRef<any>;
  @ViewChild('duplicateModal', { static: true }) duplicateModal!: TemplateRef<any>;

  // Servicios
  private recompensasService = inject(RecompensasService);
  private productosService = inject(ProductosService);
  private categoriasService = inject(CategoriasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Datos de la tabla
  recompensas: RecompensaLista[] = [];
  loading = false;
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  tiposRecompensa: any[] = [];
  estadosRecompensa: any[] = [];
  vistaCompacta = true;
  // Control del menú de acciones por fila
  openMenuId: number | null = null;
  // Control de expansión de filtros
  filtrosExpandidos = true;

  // Recompensa seleccionada para acciones
  recompensaSeleccionada: RecompensaLista | null = null;

  // Filtros
  filtros: FiltrosRecompensas = {
    buscar: '',
    tipo: undefined,
    estado: undefined,
    vigente: undefined,
    fecha_inicio: '',
    fecha_fin: '',
    page: 1,
    per_page: 10
  };

  // Handle two-way binding for search input
  get searchValue(): string {
    return this.filtros.buscar || '';
  }

  set searchValue(value: string) {
    this.filtros.buscar = value;
  }


  
  // Modal de detalle
  mostrarModalDetalle = false;
  detalleRecompensa: any = null;
  cargandoDetalle = false;
  errorDetalle: string | null = null;
  
  // Modal de confirmación
  mostrarModalConfirmacion = false;
  
  // Modal de edición
  mostrarModalEditar = false;
  recompensaEditando: any = null;
  modoEdicion = false;
  modoSoloLectura = false;
  cargandoEdicion = false;
  errorEdicion: string | null = null;
  
  // Notificaciones
  mostrarNotificacion = false;
  mensajeNotificacion = '';
  tipoNotificacion: 'success' | 'error' | 'info' = 'info';

  // Modal wizard compacto para crear recompensas
  mostrarModalCarrusel = false;
  carruselActivo = 0;
  
  // Datos de la nueva recompensa
  nuevaRecompensa: any = {
    nombre: '',
    descripcion: '',
    tipo: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: '',
    tipoSegmentacion: 'todos',
    segmentosSeleccionados: [],
    
    // Productos y categorías
    productosSeleccionados: [],
    categoriasSeleccionadas: [],
    config: {
      puntos_por_sol: 1,
      puntos_minimos: 100,
      tipo_descuento: 'porcentaje',
      valor_descuento: 10,
      compra_minima: 100,
      zonas: 'todas',
      producto_regalo: '',
      compra_minima_regalo: 200
    }
  };

  // Segmentos disponibles
  segmentosDisponibles = [
    {
      id: 'todos',
      nombre: 'Todos los clientes',
      descripcion: 'Todos los clientes activos del sistema'
    },
    {
      id: 'nuevos',
      nombre: 'Clientes nuevos (últimos 30 días)',
      descripcion: 'Clientes registrados en los últimos 30 días'
    },
    {
      id: 'recurrentes',
      nombre: 'Clientes recurrentes (más de 1 compra)',
      descripcion: 'Clientes con 30-365 días de antigüedad'
    },
    {
      id: 'vip',
      nombre: 'Clientes VIP (compras > S/1000)',
      descripcion: 'Clientes con más de 365 días, +5 pedidos, +$1000 gastado y compra reciente'
    },
    {
      id: 'no_registrados',
      nombre: 'Clientes no registrados',
      descripcion: 'Usuarios que no tienen cuenta registrada'
    }
  ];

  // Productos y categorías
  productosDisponibles: any[] = [];
  categoriasDisponibles: any[] = [];
  productosFiltrados: any[] = [];
  categoriasFiltradas: any[] = [];
  filtroProductos = '';
  filtroCategorias = '';

  // Clientes específicos
  clientesDisponibles: any[] = [];
  clientesFiltrados: any[] = [];
  filtroClientes = '';
  clientesSeleccionados: any[] = [];

  // Estados de carga
  cargandoSegmentos = false;
  cargandoClientes = false;
  cargandoProductos = false;
  cargandoCategorias = false;

  // Estados disponibles según fecha
  estadosDisponibles: any[] = [];
  mensajeValidacionFecha = '';
  fechaMinima = '';
  tiposRecompensaCarrusel = [
    {
      id: 'puntos',
      titulo: 'Sistema de Puntos',
      descripcion: 'Permite a los clientes acumular puntos por sus compras y canjearlos por beneficios',
      icono: 'ph-coins',
      color: 'warning',
      beneficios: ['Fidelización de clientes', 'Aumento de compras repetidas', 'Engagement continuo']
    },
    {
      id: 'descuento',
      titulo: 'Descuentos Especiales',
      descripcion: 'Ofrece descuentos porcentuales o fijos en productos específicos o categorías',
      icono: 'ph-percent',
      color: 'success',
      beneficios: ['Incremento inmediato de ventas', 'Liquidación de inventario', 'Atracción de nuevos clientes']
    },
    {
      id: 'envio_gratis',
      titulo: 'Envío Gratuito',
      descripcion: 'Elimina los costos de envío para incentivar compras en línea',
      icono: 'ph-truck',
      color: 'info',
      beneficios: ['Reduce abandono de carrito', 'Aumenta ticket promedio', 'Mejora experiencia de compra']
    },
    {
      id: 'regalo',
      titulo: 'Productos de Regalo',
      descripcion: 'Regala productos específicos al cumplir ciertas condiciones de compra',
      icono: 'ph-gift',
      color: 'purple',
      beneficios: ['Sorprende a tus clientes', 'Promociona nuevos productos', 'Genera expectativa']
    }
  ];


  constructor() {}

  ngOnInit(): void {
    this.cargarTiposYEstados();
    this.cargarRecompensas();
    this.inicializarFechas();
    this.cargarProductosYCategorias();
    this.cargarClientes();
    
    // Verificar si se debe abrir el modal de crear recompensa
    this.route.queryParams.subscribe(params => {
      if (params['crear'] === 'true') {
        // Limpiar el parámetro de la URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
        // Abrir el modal
        this.crearRecompensa();
      }
    });
  }

  inicializarFechas(): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.fechaMinima = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  cargarProductosYCategorias(): void {
    // Cargar productos desde la API
    this.cargarProductos();
    
    // Cargar categorías desde la API
    this.cargarCategorias();
  }

  cargarClientes(): void {
    this.cargandoClientes = true;
    
    // Intentar cargar clientes con diferentes parámetros
    const intentarCargarClientes = (filtros: any) => {
      this.recompensasService.obtenerClientesDisponibles(filtros).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.clientesDisponibles = response.data.clientes || [];
          this.clientesFiltrados = [...this.clientesDisponibles];
          console.log('✅ Clientes cargados:', this.clientesDisponibles.length);
        } else {
          console.warn('⚠️ No se pudieron cargar los clientes:', response.message);
          this.clientesDisponibles = [];
          this.clientesFiltrados = [];
        }
        this.cargandoClientes = false;
      },
      error: (error) => {
          console.warn('⚠️ Error al cargar clientes (continuando sin clientes):', error.status);
          // No mostrar error al usuario ya que la funcionalidad principal funciona sin clientes
        this.clientesDisponibles = [];
        this.clientesFiltrados = [];
        this.cargandoClientes = false;
      }
    });
    };

    // Intentar primero con parámetros mínimos (buscar requiere mínimo 2 caracteres)
    intentarCargarClientes({ buscar: 'ab', limite: 50 });
  }

  cargarProductos(): void {
    this.cargandoProductos = true;
    
    // Usar el servicio de productos existente que ya funciona
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productosDisponibles = productos || [];
        this.productosFiltrados = [...this.productosDisponibles];
        console.log('✅ Productos cargados:', this.productosDisponibles.length);
        this.cargandoProductos = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
        this.productosDisponibles = [];
        this.productosFiltrados = [];
        this.cargandoProductos = false;
        this.showError('Error al cargar los productos disponibles');
      }
    });
  }

  cargarCategorias(): void {
    this.cargandoCategorias = true;
    // Usar el servicio de categorías existente que ya funciona
    this.categoriasService.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categoriasDisponibles = categorias || [];
        this.categoriasFiltradas = [...this.categoriasDisponibles];
        console.log('✅ Categorías cargadas:', this.categoriasDisponibles.length);
        this.cargandoCategorias = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar categorías:', error);
        this.categoriasDisponibles = [];
        this.categoriasFiltradas = [];
        this.cargandoCategorias = false;
        this.showError('Error al cargar las categorías disponibles');
      }
    });
  }

  cargarTiposYEstados(): void {
    this.recompensasService.obtenerTipos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tiposRecompensa = response.data.tipos || [];
          this.estadosRecompensa = response.data.estados || [];
        }
      },
      error: (error) => {
        console.error('Error cargando tipos y estados:', error);
        // Usar valores por defecto
        this.tiposRecompensa = [
          { value: 'puntos', label: 'Puntos' },
          { value: 'descuento', label: 'Descuento' },
          { value: 'envio_gratis', label: 'Envío Gratis' },
          { value: 'regalo', label: 'Regalo' }
        ];
        this.estadosRecompensa = [
          { value: 'programada', label: 'Programada' },
          { value: 'activa', label: 'Activa' },
          { value: 'pausada', label: 'Pausada' },
          { value: 'expirada', label: 'Expirada' },
          { value: 'cancelada', label: 'Cancelada' }
        ];
      }
    });
  }

  cargarRecompensas(): void {
    this.loading = true;
    
    // Preparar filtros para la API
    const filtrosParaAPI = { ...this.filtros };
    filtrosParaAPI.page = this.currentPage + 1;
    filtrosParaAPI.per_page = this.pageSize as 10 | 15 | 25 | 50 | 100;
    
    // Limpiar filtros vacíos
    Object.keys(filtrosParaAPI).forEach(key => {
      const value = filtrosParaAPI[key as keyof typeof filtrosParaAPI];
      if (value === '' || value === undefined || value === null) {
        delete filtrosParaAPI[key as keyof typeof filtrosParaAPI];
      }
    });

    console.log('Filtros enviados a la API:', filtrosParaAPI);

    this.recompensasService.obtenerLista(filtrosParaAPI).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.recompensas = response.data.data || [];
          this.totalElements = response.data.total || 0;
          this.totalPages = response.data.last_page || 0;
          console.log('Recompensas cargadas:', this.recompensas.length);
        } else {
          this.showError('Error al cargar las recompensas');
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar recompensas:', error);
        
        // Manejo específico de errores
        if (error.status === 500) {
          this.showError('Error del servidor (500). Verifica que el backend esté funcionando correctamente.');
        } else if (error.status === 404) {
          this.showError('Endpoint no encontrado (404). Verifica la configuración del backend.');
        } else if (error.status === 403) {
          this.showError('No tienes permisos para acceder a las recompensas (403).');
        } else if (error.status === 0) {
          this.showError('No se puede conectar con el servidor. Verifica tu conexión.');
        } else {
          this.showError(`Error al cargar las recompensas (${error.status}). Intenta nuevamente.`);
        }
        
        // Datos de fallback para evitar errores de UI
        this.recompensas = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.loading = false;
      }
    });
  }

  // Métodos de filtrado
  aplicarFiltros(): void {
    console.log('Aplicando filtros:', this.filtros);
    this.currentPage = 0;
    this.filtros.page = 1; // Resetear a la primera página
    this.cargarRecompensas();
  }

  limpiarFiltros(): void {
    console.log('Limpiando filtros');
    this.filtros = {
      buscar: '',
      tipo: undefined,
      estado: undefined,
      vigente: undefined,
      fecha_inicio: '',
      fecha_fin: '',
      page: 1,
      per_page: 10
    };
    this.aplicarFiltros();
  }

  // Búsqueda en tiempo real con debounce
  onBuscarChange(): void {
    // Aplicar filtros automáticamente después de escribir
    this.aplicarFiltros();
  }

  // Cambio en filtros de tipo
  onTipoChange(): void {
    console.log('Tipo cambiado a:', this.filtros.tipo);
    this.aplicarFiltros();
  }

  // Cambio en filtros de estado
  onEstadoChange(): void {
    console.log('Estado cambiado a:', this.filtros.estado);
    this.aplicarFiltros();
  }

  // Cambio en filtros de vigencia
  onVigenciaChange(): void {
    console.log('Vigencia cambiada a:', this.filtros.vigente);
    this.aplicarFiltros();
  }

  // Cambio en fechas
  onFechaChange(): void {
    console.log('Fechas cambiadas:', this.filtros.fecha_inicio, this.filtros.fecha_fin);
    this.aplicarFiltros();
  }

  // Verificar si hay filtros activos
  tieneFiltrosActivos(): boolean {
    return !!(
      this.filtros.buscar ||
      this.filtros.tipo ||
      this.filtros.estado ||
      this.filtros.fecha_inicio ||
      this.filtros.fecha_fin
    );
  }

  // TrackBy function para optimizar el rendering
  trackByRecompensaId(index: number, recompensa: any): number {
    return recompensa.id;
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.cargarRecompensas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cargarRecompensas();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cargarRecompensas();
    }
  }

  // Métodos de acciones
  crearRecompensa(): void {
    this.mostrarModalCarrusel = true;
    this.carruselActivo = 0;
    // Cargar datos necesarios para el modal
    this.cargarProductosYCategorias();
    this.cargarClientes();
  }

  // Métodos del modal wizard compacto
  cerrarModalCarrusel(): void {
    this.mostrarModalCarrusel = false;
    this.carruselActivo = 0;
    this.modoEdicion = false;
    this.modoSoloLectura = false;
    this.recompensaEditando = null;
    this.resetearFormulario();
  }

  // Método para manejar cuando se crea una recompensa exitosamente
  onRecompensaCreada(event: any): void {
    console.log('Recompensa creada, recargando lista...', event);
    this.cargarRecompensas(); // Recargar la lista
    this.showSuccess('Recompensa creada exitosamente');
  }

  resetearFormulario(): void {
    this.nuevaRecompensa = {
      nombre: '',
      descripcion: '',
      tipo: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: '',
      tipoSegmentacion: 'todos',
      segmentosSeleccionados: [],
      clientesSeleccionados: [],
      productosSeleccionados: [],
      categoriasSeleccionadas: [],
      config: {
        puntos_por_sol: 1,
        puntos_minimos: 100,
        tipo_descuento: 'porcentaje',
        valor_descuento: 10,
        compra_minima: 100,
        zonas: 'todas',
        producto_regalo: '',
        compra_minima_regalo: 200
      }
    };
    this.estadosDisponibles = [];
    this.mensajeValidacionFecha = '';
  }

  // Validación y carga de estados según fecha
  onFechaInicioChange(): void {
    if (!this.nuevaRecompensa.fecha_inicio) {
      this.estadosDisponibles = [];
      this.mensajeValidacionFecha = '';
      this.nuevaRecompensa.estado = '';
      return;
    }

    // Comparar fechas como strings (formato YYYY-MM-DD)
    const fechaInicio = this.nuevaRecompensa.fecha_inicio;
    const hoy = this.fechaMinima;

    console.log('Fecha inicio:', fechaInicio);
    console.log('Hoy:', hoy);
    console.log('Comparación string:', fechaInicio, 'vs', hoy);

    // Validar que no sea fecha pasada (permitir fecha de hoy)
    if (fechaInicio < hoy) {
      this.mensajeValidacionFecha = 'No se pueden crear recompensas con fechas pasadas';
      this.estadosDisponibles = [];
      this.nuevaRecompensa.estado = '';
      return;
    }

    // Cargar estados disponibles (temporalmente local hasta que tengamos la API)
    this.determinarEstadosLocalmente();
  }

  cargarEstadosDisponibles(): void {
    if (!this.nuevaRecompensa.fecha_inicio) return;

    this.recompensasService.obtenerEstadosDisponibles(this.nuevaRecompensa.fecha_inicio).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.estadosDisponibles = response.data.estados || [];
          this.mensajeValidacionFecha = response.data.mensaje || '';
          
          // Asignar estado por defecto
          const estadoDefecto = this.estadosDisponibles.find(e => e.es_defecto);
          if (estadoDefecto) {
            this.nuevaRecompensa.estado = estadoDefecto.value;
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar estados disponibles:', error);
        // Fallback: determinar estados localmente
        this.determinarEstadosLocalmente();
      }
    });
  }

  determinarEstadosLocalmente(): void {
    const fechaInicio = this.nuevaRecompensa.fecha_inicio;
    const hoy = this.fechaMinima;

    console.log('Determinando estados - Fecha inicio:', fechaInicio, 'Hoy:', hoy);

    if (fechaInicio === hoy) {
      // Fecha de hoy - puede ser activa o pausada
      this.estadosDisponibles = [
        { value: 'activa', label: 'Activa', descripcion: 'La recompensa estará activa inmediatamente', es_defecto: true },
        { value: 'pausada', label: 'Pausada', descripcion: 'La recompensa estará pausada y requerirá activación manual', es_defecto: false }
      ];
      this.mensajeValidacionFecha = 'Para fechas de hoy, la recompensa puede estar activa o pausada';
      this.nuevaRecompensa.estado = 'activa';
    } else if (fechaInicio > hoy) {
      // Fecha futura - puede ser programada o activa
      this.estadosDisponibles = [
        { value: 'programada', label: 'Programada', descripcion: 'La recompensa se activará automáticamente en la fecha de inicio', es_defecto: true },
        { value: 'activa', label: 'Activa', descripcion: 'La recompensa estará activa desde ahora hasta la fecha de fin', es_defecto: false }
      ];
      this.mensajeValidacionFecha = 'Para fechas futuras, la recompensa puede estar programada o activa';
      this.nuevaRecompensa.estado = 'programada';
    } else {
      // Fecha pasada - no permitido
      this.estadosDisponibles = [];
      this.mensajeValidacionFecha = 'No se pueden crear recompensas con fechas pasadas';
      this.nuevaRecompensa.estado = '';
    }
  }

  // Validar fecha de fin
  onFechaFinChange(): void {
    if (this.nuevaRecompensa.fecha_inicio && this.nuevaRecompensa.fecha_fin) {
      const fechaInicio = new Date(this.nuevaRecompensa.fecha_inicio);
      const fechaFin = new Date(this.nuevaRecompensa.fecha_fin);

      if (fechaFin <= fechaInicio) {
        this.showError('La fecha de fin debe ser posterior a la fecha de inicio');
        this.nuevaRecompensa.fecha_fin = '';
      }
    }
  }

  siguienteStep(): void {
    if (this.carruselActivo < 4 && this.puedeAvanzar()) {
      this.carruselActivo++;
    }
  }

  anteriorStep(): void {
    if (this.carruselActivo > 0) {
      this.carruselActivo--;
    }
  }

  irAStep(index: number): void {
    this.carruselActivo = index;
  }

  // Métodos de validación
  puedeAvanzar(): boolean {
    switch (this.carruselActivo) {
      case 0: // Datos generales
        return !!(this.nuevaRecompensa.nombre && 
                 this.nuevaRecompensa.descripcion && 
                 this.nuevaRecompensa.fecha_inicio && 
                 this.nuevaRecompensa.fecha_fin &&
                 this.nuevaRecompensa.estado &&
                 this.estadosDisponibles.length > 0 &&
                 this.nuevaRecompensa.tipo); // Incluir validación del tipo
              case 1: // Segmentación
                if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
                  return true;
                } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos') {
                  return this.nuevaRecompensa.segmentosSeleccionados.length > 0;
                } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos') {
                  return this.nuevaRecompensa.clientesSeleccionados.length > 0;
                }
                return false;
      case 2: // Productos y Categorías
        return true; // Siempre puede avanzar (opcional seleccionar productos/categorías)
      case 3: // Configuración
        return true; // Siempre puede avanzar desde configuración
      default:
        return false;
    }
  }

  esFormularioValido(): boolean {
    return !!(this.nuevaRecompensa.nombre && 
             this.nuevaRecompensa.descripcion && 
             this.nuevaRecompensa.tipo && 
             this.nuevaRecompensa.fecha_inicio && 
             this.nuevaRecompensa.fecha_fin &&
             this.nuevaRecompensa.estado &&
             this.estadosDisponibles.length > 0);
  }

  // Validar si la fecha es válida
  esFechaValida(): boolean {
    if (!this.nuevaRecompensa.fecha_inicio) return false;
    
    const fechaInicio = new Date(this.nuevaRecompensa.fecha_inicio);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaInicio.setHours(0, 0, 0, 0);
    
    return fechaInicio >= hoy;
  }

  // Métodos de información
  getTituloStep(): string {
    const titulos = [
      'Información básica de la recompensa',
      'Segmentación de clientes',
      'Productos y categorías',
      'Configuración de la recompensa',
      'Revisa y confirma la creación'
    ];
    return titulos[this.carruselActivo] || '';
  }

  getTipoLabel(tipo: string): string {
    const labels: any = {
      'puntos': 'Sistema de Puntos',
      'descuento': 'Descuentos Especiales',
      'envio_gratis': 'Envío Gratuito',
      'regalo': 'Productos de Regalo'
    };
    return labels[tipo] || 'No seleccionado';
  }


  getSegmentoLabel(segmento: string): string {
    const labels: any = {
      'todos': 'Todos los clientes',
      'nuevos': 'Clientes nuevos (últimos 30 días)',
      'vip': 'Clientes VIP (compras > S/1000)'
    };
    return labels[segmento] || 'No seleccionado';
  }

  getEstadoLabel(estado: string): string {
    const estados: { [key: string]: string } = {
      'programada': 'Programada',
      'activa': 'Activa',
      'pausada': 'Pausada',
      'expirada': 'Expirada',
      'cancelada': 'Cancelada'
    };
    return estados[estado] || estado;
  }

  getEstadoDescripcion(estado: string): string {
    const descripciones: { [key: string]: string } = {
      'programada': 'La recompensa se activará automáticamente en la fecha de inicio',
      'activa': 'La recompensa estará activa inmediatamente',
      'pausada': 'La recompensa estará pausada y requerirá activación manual',
      'expirada': 'La recompensa ha expirado',
      'cancelada': 'La recompensa ha sido cancelada'
    };
    return descripciones[estado] || '';
  }

  getConfigResumen(): string {
    if (!this.nuevaRecompensa.tipo) return 'No configurado';
    
    switch (this.nuevaRecompensa.tipo) {
      case 'puntos':
        return `${this.nuevaRecompensa.config.puntos_por_sol} puntos por S/1, mínimo ${this.nuevaRecompensa.config.puntos_minimos} para canje`;
      case 'descuento':
        const valor = this.nuevaRecompensa.config.valor_descuento;
        const simbolo = this.nuevaRecompensa.config.tipo_descuento === 'porcentaje' ? '%' : 'S/';
        return `${valor}${simbolo} de descuento`;
      case 'envio_gratis':
        return `Envío gratis en compras > S/${this.nuevaRecompensa.config.compra_minima} (${this.nuevaRecompensa.config.zonas})`;
      case 'regalo':
        return `Regalo en compras > S/${this.nuevaRecompensa.config.compra_minima_regalo}`;
      default:
        return 'No configurado';
    }
  }

  // Métodos de acción
  guardarBorrador(): void {
    console.log('Guardando borrador:', this.nuevaRecompensa);
    this.showInfo('Borrador guardado exitosamente');
  }

  crearRecompensaFinal(): void {
    if (!this.esFormularioValido()) {
      this.showError('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    
    // Preparar datos para la API según la estructura del endpoint
    const datosRecompensa = {
      nombre: this.nuevaRecompensa.nombre,
      descripcion: this.nuevaRecompensa.descripcion,
      tipo: this.nuevaRecompensa.tipo,
      fecha_inicio: this.nuevaRecompensa.fecha_inicio,
      fecha_fin: this.nuevaRecompensa.fecha_fin,
      estado: this.nuevaRecompensa.estado
    };

    if (this.modoEdicion && this.recompensaEditando) {
      // Modo edición
      console.log('Actualizando recompensa:', this.recompensaEditando.id, datosRecompensa);
      this.recompensasService.actualizar(this.recompensaEditando.id, datosRecompensa).subscribe({
        next: (response: any) => {
          console.log('Recompensa actualizada exitosamente:', response);
          if (response.success) {
            this.showSuccess('Recompensa actualizada exitosamente');
            this.cerrarModalCarrusel();
            this.cargarRecompensas();
          } else {
            this.showError(response.message || 'Error al actualizar la recompensa');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al actualizar recompensa:', error);
          this.showError('Error al actualizar la recompensa: ' + (error.error?.message || error.message));
          this.loading = false;
        }
      });
    } else {
      // Modo creación
    console.log('Creando recompensa:', datosRecompensa);
    this.recompensasService.crear(datosRecompensa).subscribe({
      next: (response: any) => {
        console.log('🔍 Respuesta completa del backend:', response);
        console.log('🔍 response.data:', response.data);
        console.log('🔍 response.data.recompensa:', response.data?.recompensa);
        console.log('🔍 response.data.recompensa?.id:', response.data?.recompensa?.id);
        
        if (response.success && response.data) {
          // El ID está en response.data.recompensa.id según la especificación
          const recompensaId = response.data.recompensa?.id;
          console.log('✅ recompensaId extraído:', recompensaId);
          
          if (recompensaId) {
            // Crear configuración específica según el tipo y asignar productos/categorías
            this.completarConfiguracionRecompensa(recompensaId);
          } else {
            this.showError('No se pudo obtener el ID de la recompensa creada');
            this.loading = false;
          }
        } else {
          this.showError(response.message || 'Error al crear la recompensa');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error al crear recompensa:', error);
        this.showError('Error al crear la recompensa: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
    }
  }


  // Métodos de segmentación
  toggleSegmento(segmento: any): void {
    const index = this.nuevaRecompensa.segmentosSeleccionados.findIndex((s: any) => s.id === segmento.id);
    if (index > -1) {
      this.nuevaRecompensa.segmentosSeleccionados.splice(index, 1);
    } else {
      this.nuevaRecompensa.segmentosSeleccionados.push(segmento);
    }
  }

  isSegmentoSeleccionado(segmento: any): boolean {
    return this.nuevaRecompensa.segmentosSeleccionados.some((s: any) => s.id === segmento.id);
  }

  removeSegmento(segmento: any): void {
    const index = this.nuevaRecompensa.segmentosSeleccionados.findIndex((s: any) => s.id === segmento.id);
    if (index > -1) {
      this.nuevaRecompensa.segmentosSeleccionados.splice(index, 1);
    }
  }

  getSegmentationAlertClass(): string {
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      return 'success';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
      return 'warning';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length > 0) {
      return 'success';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length === 0) {
      return 'warning';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length > 0) {
      return 'success';
    }
    return 'warning';
  }

  getSegmentationAlertIcon(): string {
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      return 'ph-check-circle';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
      return 'ph-warning-circle';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length > 0) {
      return 'ph-check-circle';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length === 0) {
      return 'ph-warning-circle';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length > 0) {
      return 'ph-check-circle';
    }
    return 'ph-warning-circle';
  }

  getSegmentationAlertTitle(): string {
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      return 'Configuración completa';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
      return 'Configuración incompleta';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length > 0) {
      return 'Configuración completa';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length === 0) {
      return 'Configuración incompleta';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length > 0) {
      return 'Configuración completa';
    }
    return 'Configuración incompleta';
  }

  getSegmentationAlertMessage(): string {
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      return 'La recompensa estará disponible para todos los clientes';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
      return 'Debes seleccionar al menos un segmento para continuar';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos' && this.nuevaRecompensa.segmentosSeleccionados.length > 0) {
      return `La recompensa estará disponible para ${this.nuevaRecompensa.segmentosSeleccionados.length} segmento(s) seleccionado(s)`;
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length === 0) {
      return 'Debes seleccionar al menos un cliente específico para continuar';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos' && this.nuevaRecompensa.clientesSeleccionados.length > 0) {
      return `La recompensa estará disponible para ${this.nuevaRecompensa.clientesSeleccionados.length} cliente(s) específico(s)`;
    }
    return 'Debes seleccionar al menos un segmento o cliente para continuar';
  }

  // Métodos de productos y categorías
  toggleProducto(producto: any): void {
    const index = this.nuevaRecompensa.productosSeleccionados.findIndex((p: any) => p.id === producto.id);
    if (index > -1) {
      this.nuevaRecompensa.productosSeleccionados.splice(index, 1);
    } else {
      this.nuevaRecompensa.productosSeleccionados.push(producto);
    }
  }

  isProductoSeleccionado(producto: any): boolean {
    return this.nuevaRecompensa.productosSeleccionados.some((p: any) => p.id === producto.id);
  }

  toggleCategoria(categoria: any): void {
    const index = this.nuevaRecompensa.categoriasSeleccionadas.findIndex((c: any) => c.id === categoria.id);
    if (index > -1) {
      this.nuevaRecompensa.categoriasSeleccionadas.splice(index, 1);
    } else {
      this.nuevaRecompensa.categoriasSeleccionadas.push(categoria);
    }
  }

  isCategoriaSeleccionada(categoria: any): boolean {
    return this.nuevaRecompensa.categoriasSeleccionadas.some((c: any) => c.id === categoria.id);
  }

  filtrarProductos(): void {
    if (!this.filtroProductos.trim()) {
      this.productosFiltrados = [...this.productosDisponibles];
    } else {
      this.productosFiltrados = this.productosDisponibles.filter(producto =>
        producto.nombre.toLowerCase().includes(this.filtroProductos.toLowerCase()) ||
        producto.descripcion?.toLowerCase().includes(this.filtroProductos.toLowerCase())
      );
    }
  }

  filtrarCategorias(): void {
    if (!this.filtroCategorias.trim()) {
      this.categoriasFiltradas = [...this.categoriasDisponibles];
    } else {
      this.categoriasFiltradas = this.categoriasDisponibles.filter(categoria =>
        categoria.nombre.toLowerCase().includes(this.filtroCategorias.toLowerCase())
      );
    }
  }

  getProductosAlertClass(): string {
    const totalSeleccionados = this.nuevaRecompensa.productosSeleccionados.length + this.nuevaRecompensa.categoriasSeleccionadas.length;
    if (totalSeleccionados === 0) {
      return 'info';
    } else {
      return 'success';
    }
  }

  getProductosAlertIcon(): string {
    const totalSeleccionados = this.nuevaRecompensa.productosSeleccionados.length + this.nuevaRecompensa.categoriasSeleccionadas.length;
    if (totalSeleccionados === 0) {
      return 'ph-info-circle';
    } else {
      return 'ph-check-circle';
    }
  }

  getProductosAlertTitle(): string {
    const totalSeleccionados = this.nuevaRecompensa.productosSeleccionados.length + this.nuevaRecompensa.categoriasSeleccionadas.length;
    if (totalSeleccionados === 0) {
      return 'Sin productos ni categorías seleccionados';
    } else {
      return 'Productos y categorías seleccionados';
    }
  }

  getProductosAlertMessage(): string {
    const totalSeleccionados = this.nuevaRecompensa.productosSeleccionados.length + this.nuevaRecompensa.categoriasSeleccionadas.length;
    if (totalSeleccionados === 0) {
      return 'No has seleccionado productos ni categorías. La recompensa se aplicará a todos los productos.';
    } else {
      const productos = this.nuevaRecompensa.productosSeleccionados.length;
      const categorias = this.nuevaRecompensa.categoriasSeleccionadas.length;
      let mensaje = 'La recompensa se aplicará a: ';
      if (productos > 0 && categorias > 0) {
        mensaje += `${productos} producto(s) específico(s) y ${categorias} categoría(s)`;
      } else if (productos > 0) {
        mensaje += `${productos} producto(s) específico(s)`;
      } else {
        mensaje += `${categorias} categoría(s)`;
      }
      return mensaje;
    }
  }

  // Métodos para clientes específicos
  filtrarClientes(): void {
    if (!this.filtroClientes.trim()) {
      this.clientesFiltrados = [...this.clientesDisponibles];
    } else {
      this.clientesFiltrados = this.clientesDisponibles.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(this.filtroClientes.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(this.filtroClientes.toLowerCase()) ||
        cliente.telefono?.toLowerCase().includes(this.filtroClientes.toLowerCase())
      );
    }
  }

  agregarCliente(cliente: any): void {
    if (!this.nuevaRecompensa.clientesSeleccionados.some((c: any) => c.id === cliente.id)) {
      this.nuevaRecompensa.clientesSeleccionados.push(cliente);
    }
  }

  removerCliente(cliente: any): void {
    const index = this.nuevaRecompensa.clientesSeleccionados.findIndex((c: any) => c.id === cliente.id);
    if (index > -1) {
      this.nuevaRecompensa.clientesSeleccionados.splice(index, 1);
    }
  }

  isClienteSeleccionado(cliente: any): boolean {
    return this.nuevaRecompensa.clientesSeleccionados.some((c: any) => c.id === cliente.id);
  }

  editarRecompensa(recompensa: RecompensaLista): void {
    this.recompensaEditando = recompensa;
    this.modoEdicion = true;
    this.modoSoloLectura = false;
    this.mostrarModalCarrusel = true;
    this.carruselActivo = 0;
    // El modal cargará los datos internamente
  }

  verDetalle(recompensa: RecompensaLista): void {
    this.recompensaSeleccionada = recompensa;
    this.recompensaEditando = recompensa; // Pasar la recompensa al modal
    this.modoSoloLectura = true;
    this.modoEdicion = false;
    this.mostrarModalCarrusel = true;
    this.carruselActivo = 0;
    this.modoEdicion = false;
    this.mostrarModalCarrusel = true;
    this.carruselActivo = 0;
    this.cargarDetalleParaVisualizacion(recompensa.id);
  }

  cargarDetalleRecompensa(id: number): void {
    this.cargandoDetalle = true;
    this.errorDetalle = null;

    this.recompensasService.obtenerDetalle(id).subscribe({
      next: (response: any) => {
        console.log('🔍 Respuesta del detalle:', response);

        if (response.success && response.data) {
          this.detalleRecompensa = response.data;
          console.log('✅ Detalle cargado:', this.detalleRecompensa);
        } else {
          this.errorDetalle = 'Error al cargar el detalle de la recompensa';
        }
        this.cargandoDetalle = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        this.errorDetalle = 'Error al cargar el detalle de la recompensa';
        this.cargandoDetalle = false;
      }
    });
  }

  cargarDetalleParaVisualizacion(id: number): void {
    this.cargandoDetalle = true;
    this.errorDetalle = null;

    // Cargar detalle completo de la recompensa usando la misma lógica que edición
    this.recompensasService.obtenerDetalle(id).subscribe({
      next: (response: any) => {
        console.log('🔍 Detalle de recompensa cargado para visualización:', response);
        console.log('🔍 response.data:', response.data);
        console.log('🔍 response.data.configuracion:', response.data?.configuracion);

        // Extraer datos según la estructura documentada
        const detalle = response.data?.recompensa;
        console.log('🔍 Detalle extraído:', detalle);

        // Extraer configuración según la estructura documentada
        const configuracion = response.data?.configuracion || {};
        console.log('🔍 Configuración extraída:', configuracion);

        // Cargar datos básicos en el formulario del wizard (modo solo lectura)
        this.nuevaRecompensa = {
          nombre: detalle.nombre || '',
          descripcion: detalle.descripcion || '',
          tipo: detalle.tipo || 'descuento',
          fecha_inicio: this.formatearFechaParaInput(detalle.fecha_inicio) || '',
          fecha_fin: this.formatearFechaParaInput(detalle.fecha_fin) || '',
          estado: detalle.estado || 'programada',
          // Cargar datos asignados desde la configuración
          productosSeleccionados: this.extraerProductosAsignados(configuracion.productos || []),
          categoriasSeleccionadas: this.extraerCategoriasAsignadas(configuracion.productos || []),
          clientesSeleccionados: this.extraerClientesAsignados(configuracion.clientes || []),
          segmentosSeleccionados: this.extraerSegmentosAsignados(configuracion.clientes || []),
          tipoSegmentacion: this.determinarTipoSegmentacion({
            segmentos_asignados: this.extraerSegmentosAsignados(configuracion.clientes || []),
            clientes_asignados: this.extraerClientesAsignados(configuracion.clientes || [])
          })
        };

        // Actualizar estados disponibles según la fecha de inicio
        this.actualizarEstadosDisponibles(this.nuevaRecompensa.fecha_inicio);

        // Cargar configuraciones específicas desde la respuesta
        this.cargarConfiguracionesDesdeRespuesta(configuracion, detalle.tipo);

        this.cargandoDetalle = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle para visualización:', error);
        this.errorDetalle = 'Error al cargar los datos de la recompensa';
        this.cargandoDetalle = false;
      }
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.recompensaSeleccionada = null;
    this.detalleRecompensa = null;
  }

  // Métodos auxiliares para el modal de detalle
  getTipoSegmentacionDetalle(): string {
    if (!this.detalleRecompensa?.configuracion?.clientes) return 'Todos los clientes';
    
    const clientes = this.detalleRecompensa.configuracion.clientes;
    const tieneSegmentos = clientes.some((c: any) => !c.es_cliente_especifico);
    const tieneClientesEspecificos = clientes.some((c: any) => c.es_cliente_especifico);
    
    if (tieneSegmentos && tieneClientesEspecificos) return 'Mixto';
    if (tieneSegmentos) return 'Por Segmentos';
    if (tieneClientesEspecificos) return 'Clientes Específicos';
    return 'Todos los clientes';
  }

  getSegmentosDetalle(): any[] {
    if (!this.detalleRecompensa?.configuracion?.clientes) return [];
    
    return this.detalleRecompensa.configuracion.clientes
      .filter((c: any) => !c.es_cliente_especifico && c.segmento)
      .map((c: any) => ({
        id: c.segmento,
        nombre: c.segmento_nombre || c.segmento
      }));
  }

  getClientesDetalle(): any[] {
    if (!this.detalleRecompensa?.configuracion?.clientes) return [];
    
    return this.detalleRecompensa.configuracion.clientes
      .filter((c: any) => c.es_cliente_especifico && c.cliente)
      .map((c: any) => c.cliente);
  }

  getProductosDetalle(): any[] {
    if (!this.detalleRecompensa?.configuracion?.productos) return [];
    
    return this.detalleRecompensa.configuracion.productos
      .filter((p: any) => p.tipo_elemento === 'producto' && p.producto)
      .map((p: any) => p.producto);
  }

  getCategoriasDetalle(): any[] {
    if (!this.detalleRecompensa?.configuracion?.productos) return [];
    
    return this.detalleRecompensa.configuracion.productos
      .filter((p: any) => p.tipo_elemento === 'categoria' && p.categoria)
      .map((p: any) => p.categoria);
  }

  getConfiguracionDescuento(): any {
    if (!this.detalleRecompensa?.configuracion?.descuentos || this.detalleRecompensa.configuracion.descuentos.length === 0) {
      return { tipo_descuento: 'porcentaje', valor_descuento: 0, compra_minima: 0 };
    }
    
    const descuento = this.detalleRecompensa.configuracion.descuentos[0];
    return {
      tipo_descuento: descuento.tipo_calculo || 'porcentaje',
      valor_descuento: parseFloat(descuento.valor) || 0,
      compra_minima: parseFloat(descuento.minimo_compra) || 0
    };
  }

  getConfiguracionPuntos(): any {
    if (!this.detalleRecompensa?.configuracion?.puntos || this.detalleRecompensa.configuracion.puntos.length === 0) {
      return { puntos_por_sol: 0, puntos_registro: 0 };
    }
    
    const puntos = this.detalleRecompensa.configuracion.puntos[0];
    return {
      puntos_por_sol: parseFloat(puntos.valor) || 0,
      puntos_registro: parseFloat(puntos.puntos_registro) || 0
    };
  }

  getConfiguracionEnvio(): any {
    if (!this.detalleRecompensa?.configuracion?.envios || this.detalleRecompensa.configuracion.envios.length === 0) {
      return { compra_minima: 0, zonas: 'Todas' };
    }
    
    const envio = this.detalleRecompensa.configuracion.envios[0];
    return {
      compra_minima: parseFloat(envio.minimo_compra) || 0,
      zonas: envio.zonas_aplicables || 'Todas'
    };
  }

  getConfiguracionRegalo(): any {
    if (!this.detalleRecompensa?.configuracion?.regalos || this.detalleRecompensa.configuracion.regalos.length === 0) {
      return { producto_regalo: null, cantidad: 1, compra_minima: 0 };
    }
    
    const regalo = this.detalleRecompensa.configuracion.regalos[0];
    return {
      producto_regalo: regalo.producto_id || null,
      cantidad: regalo.cantidad || 1,
      compra_minima: parseFloat(regalo.minimo_compra) || 0
    };
  }

  cargarDetalleParaEdicion(id: number): void {
    this.cargandoDetalle = true;
    this.errorDetalle = null;

    // Cargar detalle básico de la recompensa
    this.recompensasService.obtenerDetalle(id).subscribe({
      next: (response: any) => {
        console.log('🔍 Detalle de recompensa cargado para edición:', response);
        console.log('🔍 response.data:', response.data);
        console.log('🔍 response.data.configuracion:', response.data?.configuracion);
        
        // Extraer datos según la estructura documentada
        const detalle = response.data?.recompensa;
        console.log('🔍 Detalle extraído:', detalle);
        
        // Extraer configuración según la estructura documentada
        const configuracion = response.data?.configuracion || {};
        console.log('🔍 Configuración extraída:', configuracion);
        
        // Cargar datos básicos en el formulario del wizard
        this.nuevaRecompensa = {
          nombre: detalle.nombre || '',
          descripcion: detalle.descripcion || '',
          tipo: detalle.tipo || 'descuento',
          fecha_inicio: this.formatearFechaParaInput(detalle.fecha_inicio) || '',
          fecha_fin: this.formatearFechaParaInput(detalle.fecha_fin) || '',
          estado: detalle.estado || 'programada',
          // Cargar datos asignados desde la configuración
          productosSeleccionados: this.extraerProductosAsignados(configuracion.productos || []),
          categoriasSeleccionadas: this.extraerCategoriasAsignadas(configuracion.productos || []),
          clientesSeleccionados: this.extraerClientesAsignados(configuracion.clientes || []),
          segmentosSeleccionados: this.extraerSegmentosAsignados(configuracion.clientes || []),
          tipoSegmentacion: this.determinarTipoSegmentacion({
            segmentos_asignados: this.extraerSegmentosAsignados(configuracion.clientes || []),
            clientes_asignados: this.extraerClientesAsignados(configuracion.clientes || [])
          })
        };

        // Actualizar estados disponibles según la fecha de inicio
        this.actualizarEstadosDisponibles(this.nuevaRecompensa.fecha_inicio);
        
        // Cargar configuraciones específicas desde la respuesta
        this.cargarConfiguracionesDesdeRespuesta(configuracion, detalle.tipo);
        
        this.cargandoDetalle = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle para edición:', error);
        this.errorDetalle = 'Error al cargar los datos de la recompensa';
        this.cargandoDetalle = false;
      }
    });
  }

  // Métodos para extraer datos de la configuración del endpoint principal
  extraerProductosAsignados(productosConfig: any[]): any[] {
    console.log('🔍 Extraer productos - productosConfig:', productosConfig);
    const productos = productosConfig
      .filter(item => item.tipo_elemento === 'producto' && item.producto)
      .map(item => item.producto);
    console.log('🔍 Productos extraídos:', productos);
    return productos;
  }

  extraerCategoriasAsignadas(productosConfig: any[]): any[] {
    console.log('🔍 Extraer categorías - productosConfig:', productosConfig);
    const categorias = productosConfig
      .filter(item => item.tipo_elemento === 'categoria' && item.categoria)
      .map(item => item.categoria);
    console.log('🔍 Categorías extraídas:', categorias);
    return categorias;
  }

  extraerSegmentosAsignados(clientesConfig: any[]): any[] {
    console.log('🔍 Extraer segmentos - clientesConfig:', clientesConfig);
    const segmentos = clientesConfig
      .filter(item => item.es_cliente_especifico === false && item.segmento)
      .map(item => ({
        id: item.segmento,
        nombre: item.segmento_nombre || item.segmento
      }));
    console.log('🔍 Segmentos extraídos:', segmentos);
    return segmentos;
  }

  extraerClientesAsignados(clientesConfig: any[]): any[] {
    console.log('🔍 Extraer clientes - clientesConfig:', clientesConfig);
    const clientes = clientesConfig
      .filter(item => item.es_cliente_especifico === true && item.cliente)
      .map(item => item.cliente);
    console.log('🔍 Clientes extraídos:', clientes);
    return clientes;
  }

  cargarConfiguracionesDesdeRespuesta(configuracion: any, tipo: string): void {
    console.log('🔍 Cargar configuraciones - configuracion:', configuracion);
    console.log('🔍 Cargar configuraciones - tipo:', tipo);
    
    // Cargar configuración específica según el tipo
    switch (tipo) {
      case 'descuento':
        if (configuracion.descuentos && configuracion.descuentos.length > 0) {
          const descuento = configuracion.descuentos[0];
          this.nuevaRecompensa.config = {
            tipo_descuento: descuento.tipo_calculo || 'porcentaje',
            valor_descuento: parseFloat(descuento.valor) || 10,
            compra_minima: parseFloat(descuento.minimo_compra) || 0
          };
        } else {
          this.nuevaRecompensa.config = this.getConfiguracionPorDefecto('descuento');
        }
        break;
        
      case 'puntos':
        if (configuracion.puntos && configuracion.puntos.length > 0) {
          const puntos = configuracion.puntos[0];
          this.nuevaRecompensa.config = {
            puntos_por_sol: puntos.valor || 1,
            puntos_registro: puntos.puntos_registro || 0
          };
        } else {
          this.nuevaRecompensa.config = this.getConfiguracionPorDefecto('puntos');
        }
        break;
        
      case 'envio_gratis':
        if (configuracion.envios && configuracion.envios.length > 0) {
          const envio = configuracion.envios[0];
          this.nuevaRecompensa.config = {
            compra_minima: envio.minimo_compra || 0,
            zonas: envio.zonas_aplicables || 'todas'
          };
        } else {
          this.nuevaRecompensa.config = this.getConfiguracionPorDefecto('envio_gratis');
        }
        break;
        
      case 'regalo':
        if (configuracion.regalos && configuracion.regalos.length > 0) {
          const regalo = configuracion.regalos[0];
          this.nuevaRecompensa.config = {
            producto_regalo: regalo.producto_id || null,
            cantidad: regalo.cantidad || 1,
            compra_minima: regalo.minimo_compra || 0
          };
        } else {
          this.nuevaRecompensa.config = this.getConfiguracionPorDefecto('regalo');
        }
        break;
        
      default:
        this.nuevaRecompensa.config = this.getConfiguracionPorDefecto(tipo);
    }
    
    console.log('Configuración cargada:', this.nuevaRecompensa.config);
  }



  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.recompensaEditando = null;
    this.errorEdicion = null;
  }

  guardarEdicion(): void {
    if (!this.recompensaEditando) return;

    this.cargandoEdicion = true;
    this.errorEdicion = null;

    // Preparar datos para actualizar
    const datosActualizacion = {
      nombre: this.recompensaEditando.nombre?.trim(),
      descripcion: this.recompensaEditando.descripcion?.trim(),
      tipo: this.recompensaEditando.tipo,
      fecha_inicio: this.recompensaEditando.fecha_inicio,
      fecha_fin: this.recompensaEditando.fecha_fin,
      estado: this.recompensaEditando.estado
    };

    // Validar que los datos requeridos no estén vacíos
    if (!datosActualizacion.nombre || !datosActualizacion.descripcion || !datosActualizacion.fecha_inicio || !datosActualizacion.fecha_fin) {
      this.errorEdicion = 'Por favor completa todos los campos requeridos';
      this.cargandoEdicion = false;
      return;
    }

    console.log('Actualizando recompensa:', this.recompensaEditando.id, datosActualizacion);

    this.recompensasService.actualizar(this.recompensaEditando.id, datosActualizacion).subscribe({
      next: (response: any) => {
        console.log('Recompensa actualizada exitosamente:', response);
        if (response.success) {
          this.showSuccess('Recompensa actualizada exitosamente');
          this.cerrarModalEditar();
          this.cargarRecompensas(); // Recargar la lista
        } else {
          this.errorEdicion = response.message || 'Error al actualizar la recompensa';
        }
        this.cargandoEdicion = false;
      },
      error: (error) => {
        console.error('Error al actualizar recompensa:', error);
        this.errorEdicion = error.error?.message || 'Error al actualizar la recompensa';
        this.cargandoEdicion = false;
      }
    });
  }

  duplicarRecompensa(recompensa: RecompensaLista): void {
    console.log('Duplicando recompensa:', recompensa);
    
    // Cargar detalle de la recompensa para duplicar
    this.recompensasService.obtenerDetalle(recompensa.id).subscribe({
      next: (response: any) => {
        console.log('Detalle cargado para duplicar:', response);
        
        const detalle = response.recompensa || response.data?.recompensa || response.data || response;
        
        // Preparar datos duplicados
        this.nuevaRecompensa = {
          nombre: `${detalle.nombre} (Copia)`,
          descripcion: detalle.descripcion || '',
          tipo: detalle.tipo || 'descuento',
          fecha_inicio: '', // Requerirá nueva fecha
          fecha_fin: '', // Requerirá nueva fecha
          estado: 'programada', // Estado seguro para duplicar
          productosSeleccionados: [],
          categoriasSeleccionadas: [],
          clientesSeleccionados: []
        };
        
        // Abrir modal de crear con datos pre-cargados
        this.modoEdicion = false;
        this.mostrarModalCarrusel = true;
        this.carruselActivo = 0;
        
        this.showInfo('Datos de la recompensa cargados. Completa las fechas y configuración.');
      },
      error: (error) => {
        console.error('Error al cargar detalle para duplicar:', error);
        this.showError('Error al cargar los datos de la recompensa para duplicar');
      }
    });
  }



  confirmarEliminar(): void {
    if (this.recompensaSeleccionada) {
      this.recompensasService.eliminar(this.recompensaSeleccionada.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.showSuccess('Recompensa eliminada exitosamente');
            this.cargarRecompensas();
          } else {
            this.showError(response.message || 'Error al eliminar la recompensa');
          }
        },
        error: (error) => {
          console.error('Error al eliminar recompensa:', error);
          this.showError('Error al eliminar la recompensa');
        }
      });
    }
  }

  // ===== Menú de acciones desplegable =====
  toggleAccionesMenu(recompensaId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.openMenuId = this.openMenuId === recompensaId ? null : recompensaId;
  }

  closeAccionesMenu(): void {
    this.openMenuId = null;
  }

  // Método unificado para cambiar estado
  cambiarEstadoRecompensa(recompensa: RecompensaLista): void {
    const estadoActual = this.getEstadoReal(recompensa);
    console.log('Cambiando estado de recompensa:', recompensa.id, 'Estado actual:', estadoActual);
    
    if (estadoActual === 'activa') {
      this.pausarRecompensa(recompensa);
    } else if (estadoActual === 'pausada' || estadoActual === 'programada') {
      this.activarRecompensa(recompensa);
    } else {
      this.showError('No se puede cambiar el estado de una recompensa expirada o cancelada');
    }
  }

  // Métodos de estado
  activarRecompensa(recompensa: RecompensaLista): void {
    console.log('Activando recompensa:', recompensa.id);
    this.loading = true;
    this.recompensasService.activar(recompensa.id).subscribe({
      next: (response: any) => {
        console.log('Respuesta de activación:', response);
        if (response.success) {
          this.showSuccess('Recompensa activada exitosamente');
          this.cargarRecompensas();
        } else {
          this.showError(response.message || 'Error al activar la recompensa');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al activar recompensa:', error);
        this.showError('Error al activar la recompensa: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  pausarRecompensa(recompensa: RecompensaLista): void {
    console.log('Pausando recompensa:', recompensa.id);
    this.loading = true;
    this.recompensasService.pausar(recompensa.id).subscribe({
      next: (response: any) => {
        console.log('Respuesta de pausa:', response);
        if (response.success) {
          this.showSuccess('Recompensa pausada exitosamente');
          this.cargarRecompensas();
        } else {
          this.showError(response.message || 'Error al pausar la recompensa');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al pausar recompensa:', error);
        this.showError('Error al pausar la recompensa: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  desactivarRecompensa(recompensa: RecompensaLista): void {
    console.log('Desactivando recompensa:', recompensa.id);
    this.recompensasService.pausar(recompensa.id).subscribe({
      next: (response: any) => {
        console.log('Respuesta de desactivación:', response);
        if (response.success) {
          this.showSuccess('Recompensa desactivada exitosamente');
          this.cargarRecompensas();
        } else {
          this.showError(response.message || 'Error al desactivar la recompensa');
        }
      },
      error: (error) => {
        console.error('Error al desactivar recompensa:', error);
        this.showError('Error al desactivar la recompensa: ' + (error.error?.message || error.message));
      }
    });
  }

  eliminarRecompensa(recompensa: RecompensaLista): void {
    this.recompensaSeleccionada = recompensa;
    this.mostrarModalConfirmacion = true;
  }

  confirmarEliminacion(): void {
    if (!this.recompensaSeleccionada) return;
    
    console.log('Eliminando recompensa:', this.recompensaSeleccionada.id);
    this.loading = true;
    this.recompensasService.eliminar(this.recompensaSeleccionada.id).subscribe({
      next: (response: any) => {
        console.log('Respuesta de eliminación:', response);
        if (response.success) {
          this.showSuccess('Recompensa cancelada exitosamente');
          this.cargarRecompensas();
        } else {
          this.showError(response.message || 'Error al cancelar la recompensa');
        }
        this.loading = false;
        this.cerrarModalConfirmacion();
      },
      error: (error) => {
        console.error('Error al eliminar recompensa:', error);
        this.showError('Error al cancelar la recompensa: ' + (error.error?.message || error.message));
        this.loading = false;
        this.cerrarModalConfirmacion();
      }
    });
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.recompensaSeleccionada = null;
  }

  // Métodos auxiliares
  getEstadoClass(estado: EstadoRecompensa): string {
    const classes: { [key in EstadoRecompensa]: string } = {
      'activa': 'badge-success',
      'pausada': 'badge-warning',
      'programada': 'badge-info',
      'expirada': 'badge-secondary',
      'cancelada': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  // Determinar el estado real de la recompensa basado en fechas y estado del backend
  getEstadoReal(recompensa: any): EstadoRecompensa {
    try {
      // Si el backend ya proporciona el estado, lo usamos
      if (recompensa.estado && ['programada', 'activa', 'pausada', 'expirada', 'cancelada'].includes(recompensa.estado)) {
        return recompensa.estado as EstadoRecompensa;
      }

      // Fallback: calcular estado basado en fechas (para compatibilidad)
      const ahora = new Date();
      const fechaInicio = new Date(recompensa.fecha_inicio);
      const fechaFin = new Date(recompensa.fecha_fin);

      // Si está explícitamente marcada como inactiva (compatibilidad con campo activo)
      if (recompensa.activo === false) {
        return 'pausada';
      }

      // Si aún no ha comenzado
      if (ahora < fechaInicio) {
        return 'programada';
      }

      // Si ya expiró
      if (ahora > fechaFin) {
        return 'expirada';
      }

      // Si está en el rango de fechas y está activa
      if (ahora >= fechaInicio && ahora <= fechaFin && recompensa.activo !== false) {
        return 'activa';
      }

      // Por defecto, pausada
      return 'pausada';
    } catch (error) {
      console.error('Error calculando estado real:', error);
      return 'pausada';
    }
  }

  getTipoIcon(tipo: string): string {
    const icons: any = {
      'puntos': 'ph ph-coins',
      'descuento': 'ph ph-percent',
      'envio_gratis': 'ph ph-truck',
      'regalo': 'ph ph-gift'
    };
    return icons[tipo] || 'ph ph-question';
  }

  getTipoColor(tipo: string): string {
    const colors: any = {
      'puntos': 'warning',
      'descuento': 'success',
      'envio_gratis': 'info',
      'regalo': 'purple'
    };
    return colors[tipo] || 'gray';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatearFechaParaInput(fecha: string): string {
    if (!fecha) return '';
    const fechaObj = new Date(fecha);
    // Convertir a formato YYYY-MM-DD para input type="date"
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  actualizarEstadosDisponibles(fechaInicio: string): void {
    if (!fechaInicio) {
      this.estadosDisponibles = [];
      this.mensajeValidacionFecha = 'Selecciona una fecha de inicio para ver los estados disponibles';
      return;
    }

    const fechaInicioObj = new Date(fechaInicio);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaInicioObj < hoy) {
      // Fecha pasada - solo puede estar activa o pausada
      this.estadosDisponibles = [
        { value: 'activa', label: 'Activa', descripcion: 'La recompensa estará activa inmediatamente', es_defecto: true },
        { value: 'pausada', label: 'Pausada', descripcion: 'La recompensa estará pausada y requerirá activación manual', es_defecto: false }
      ];
      this.mensajeValidacionFecha = 'Para fechas pasadas, la recompensa puede estar activa o pausada';
      this.nuevaRecompensa.estado = 'activa';
    } else if (fechaInicioObj.getTime() === hoy.getTime()) {
      // Fecha actual - puede estar activa o programada
      this.estadosDisponibles = [
        { value: 'activa', label: 'Activa', descripcion: 'La recompensa estará activa inmediatamente', es_defecto: true },
        { value: 'programada', label: 'Programada', descripcion: 'La recompensa se activará automáticamente en la fecha de inicio', es_defecto: false }
      ];
      this.mensajeValidacionFecha = 'Para fechas actuales, la recompensa puede estar activa o programada';
      this.nuevaRecompensa.estado = 'activa';
    } else {
      // Fecha futura - puede ser programada o activa
      this.estadosDisponibles = [
        { value: 'programada', label: 'Programada', descripcion: 'La recompensa se activará automáticamente en la fecha de inicio', es_defecto: true },
        { value: 'activa', label: 'Activa', descripcion: 'La recompensa estará activa desde ahora hasta la fecha de fin', es_defecto: false }
      ];
      this.mensajeValidacionFecha = 'Para fechas futuras, la recompensa puede estar programada o activa';
      this.nuevaRecompensa.estado = 'programada';
    }
  }

  determinarTipoSegmentacion(detalle: any): string {
    // Determinar el tipo de segmentación basado en los datos existentes
    if (detalle.segmentos_asignados && detalle.segmentos_asignados.length > 0) {
      return 'segmentos';
    } else if (detalle.clientes_asignados && detalle.clientes_asignados.length > 0) {
      return 'especificos';
    } else {
      return 'todos';
    }
  }

  cargarConfiguracionesExistentes(detalle: any): void {
    // Cargar configuraciones específicas según el tipo de recompensa
    if (detalle.configuraciones) {
      this.nuevaRecompensa.config = detalle.configuraciones;
    } else {
      // Configuración por defecto según el tipo
      this.nuevaRecompensa.config = this.getConfiguracionPorDefecto(detalle.tipo);
    }
  }

  getConfiguracionPorDefecto(tipo: string): any {
    switch (tipo) {
      case 'descuento':
        return {
          tipo_descuento: 'porcentaje',
          valor_descuento: 10,
          compra_minima: 0
        };
      case 'puntos':
        return {
          puntos_por_sol: 1,
          puntos_registro: 0
        };
      case 'envio_gratis':
        return {
          compra_minima: 0,
          zonas: 'todas'
        };
      case 'regalo':
        return {
          producto_regalo: null,
          cantidad: 1,
          compra_minima: 0
        };
      default:
        return {};
    }
  }

  formatearMoneda(valor: number): string {
    // Si el valor es 0 o null, mostrar un valor por defecto basado en el tipo
    if (!valor || valor === 0) {
      return 'S/ 0.00';
    }
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  }

  // Calcular valor estimado de la recompensa
  calcularValorEstimado(recompensa: any): number {
    // Si ya tiene un valor calculado, usarlo
    if (recompensa.valor_total_recompensa && recompensa.valor_total_recompensa > 0) {
      return recompensa.valor_total_recompensa;
    }

    // Calcular valor estimado basado en el tipo
    const totalProductos = recompensa.total_productos_aplicables || 0;
    const totalClientes = recompensa.total_clientes_aplicables || 0;
    
    switch (recompensa.tipo) {
      case 'descuento':
        // Estimación: 10% de descuento promedio por producto
        return totalProductos * 50; // S/ 50 promedio por producto
      case 'envio_gratis':
        // Estimación: S/ 15 por envío
        return totalClientes * 15;
      case 'puntos':
        // Estimación: 100 puntos por cliente
        return totalClientes * 100;
      case 'regalo':
        // Estimación: S/ 25 por regalo
        return totalClientes * 25;
      default:
        return 0;
    }
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-PE').format(valor);
  }

  // Métodos de exportación
  exportarExcel(): void {
    // TODO: Implementar exportación a Excel
    this.showInfo('Funcionalidad de exportación a Excel en desarrollo');
  }

  exportarPDF(): void {
    // TODO: Implementar exportación a PDF
    this.showInfo('Funcionalidad de exportación a PDF en desarrollo');
  }

  // Métodos de búsqueda rápida
  buscarRapido(termino: string): void {
    this.filtros.buscar = termino;
    this.aplicarFiltros();
  }

  // Métodos para obtener páginas
  getPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Método para acceder a Math desde el template
  get Math() {
    return Math;
  }

  // Get number of active rewards
  getRecompensasActivas(): number {
    return this.recompensas.filter(r => r.estado === 'activa').length;
  }


  /**
   * Muestra un mensaje de éxito
   */
  private showSuccess(message: string): void {
    console.log('✅ Éxito:', message);
    this.mostrarNotificacion = true;
    this.mensajeNotificacion = message;
    this.tipoNotificacion = 'success';
    setTimeout(() => this.mostrarNotificacion = false, 3000);
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string): void {
    console.error('❌ Error:', message);
    this.mostrarNotificacion = true;
    this.mensajeNotificacion = message;
    this.tipoNotificacion = 'error';
    setTimeout(() => this.mostrarNotificacion = false, 5000);
  }

  /**
   * Muestra un mensaje de información
   */
  private showInfo(message: string): void {
    console.info('ℹ️ Info:', message);
    this.mostrarNotificacion = true;
    this.mensajeNotificacion = message;
    this.tipoNotificacion = 'info';
    setTimeout(() => this.mostrarNotificacion = false, 3000);
  }

  /**
   * Cierra la notificación manualmente
   */
  cerrarNotificacion(): void {
    this.mostrarNotificacion = false;
  }

  /**
   * Cambia entre vista compacta y expandida
   */
  cambiarVista(compacta: boolean): void {
    this.vistaCompacta = compacta;
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: any): void {
    // Reemplazar con una imagen placeholder local o un icono
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEOUQ5RDkiLz4KPHBhdGggZD0iTTI1IDI1SDM1VjM1SDI1VjI1WiIgZmlsbD0iI0NDQ0NDQyIvPgo8L3N2Zz4K';
  }

  /**
   * Valida y sanitiza datos para pipes
   */
  safeString(value: any): string {
    if (typeof value === 'string') {
      return value;
    } else if (value && typeof value === 'object' && value.label) {
      return value.label;
    } else if (value && typeof value === 'object' && value.value) {
      return value.value;
    }
    return '';
  }

  /**
   * Genera filas vacías para completar el pageSize
   */
  getEmptyRows(): any[] {
    const emptyRowsCount = Math.max(0, this.pageSize - this.recompensas.length);
    return new Array(emptyRowsCount).fill(null);
  }

  /**
   * TrackBy function para filas vacías
   */
  trackByIndex(index: number): number {
    return index;
  }


  /**
   * Obtiene el SVG del icono para el tipo de recompensa
   */
  getTipoIconSVG(tipo: TipoRecompensa): string {
    const icons: { [key in TipoRecompensa]: string } = {
      'puntos': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
      'descuento': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />',
      'envio_gratis': '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />',
      'regalo': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />'
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">${icons[tipo] || ''}</svg>`;
  }

  /**
   * Calcula el total de clientes alcanzados sumando todos los clientes aplicables
   */
  getTotalClientesAlcanzados(): number {
    return this.recompensas.reduce((sum, r) => sum + (r.total_clientes_aplicables || 0), 0);
  }

  /**
   * Calcula el valor total estimado de todas las recompensas
   */
  getValorTotalEstimado(): number {
    return this.recompensas.reduce((sum, r) => sum + this.calcularValorEstimado(r), 0);
  }

  /**
   * Calcula el total de productos aplicables sumando todos los productos
   */
  getTotalProductosAplicables(): number {
    return this.recompensas.reduce((sum, r) => sum + (r.total_productos_aplicables || 0), 0);
  }

  // Métodos adicionales para el modal
  onTipoSegmentacionChangeModal(): void {
    // Limpiar selecciones cuando cambia el tipo
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      this.nuevaRecompensa.segmentosSeleccionados = [];
      this.nuevaRecompensa.clientesSeleccionados = [];
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos') {
      this.nuevaRecompensa.clientesSeleccionados = [];
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos') {
      this.nuevaRecompensa.segmentosSeleccionados = [];
    }
  }

  toggleClienteModal(cliente: any): void {
    const index = this.nuevaRecompensa.clientesSeleccionados.findIndex((c: any) => c.id === cliente.id);
    if (index > -1) {
      this.nuevaRecompensa.clientesSeleccionados.splice(index, 1);
    } else {
      this.nuevaRecompensa.clientesSeleccionados.push(cliente);
    }
  }

  getSegmentosLabelsModal(): string {
    if (this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
      return 'Ninguno seleccionado';
    }
    return this.nuevaRecompensa.segmentosSeleccionados.map((s: any) => s.nombre).join(', ');
  }

  getClientesNombresModal(): string {
    if (this.nuevaRecompensa.clientesSeleccionados.length === 0) {
      return 'Ninguno seleccionado';
    }
    return this.nuevaRecompensa.clientesSeleccionados.map((c: any) => c.nombre).join(', ');
  }

  getProductosNombresModal(): string {
    if (this.nuevaRecompensa.productosSeleccionados.length === 0) {
      return 'Ninguno seleccionado';
    }
    return this.nuevaRecompensa.productosSeleccionados.map((p: any) => p.nombre).join(', ');
  }

  getCategoriasNombresModal(): string {
    if (this.nuevaRecompensa.categoriasSeleccionadas.length === 0) {
      return 'Ninguna seleccionada';
    }
    return this.nuevaRecompensa.categoriasSeleccionadas.map((c: any) => c.nombre).join(', ');
  }

  getSegmentacionResumen(): string {
    if (this.nuevaRecompensa.tipoSegmentacion === 'todos') {
      return 'Todos los clientes';
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'segmentos') {
      if (this.nuevaRecompensa.segmentosSeleccionados.length === 0) {
        return 'Ningún segmento seleccionado';
      }
      return this.nuevaRecompensa.segmentosSeleccionados.map((s: any) => s.nombre).join(', ');
    } else if (this.nuevaRecompensa.tipoSegmentacion === 'especificos') {
      if (this.nuevaRecompensa.clientesSeleccionados.length === 0) {
        return 'Ningún cliente seleccionado';
      }
      return `${this.nuevaRecompensa.clientesSeleccionados.length} cliente(s) específico(s)`;
    }
    return 'No seleccionado';
  }

  removerProducto(producto: any): void {
    const index = this.nuevaRecompensa.productosSeleccionados.findIndex((p: any) => p.id === producto.id);
    if (index > -1) {
      this.nuevaRecompensa.productosSeleccionados.splice(index, 1);
    }
  }

  removerCategoria(categoria: any): void {
    const index = this.nuevaRecompensa.categoriasSeleccionadas.findIndex((c: any) => c.id === categoria.id);
    if (index > -1) {
      this.nuevaRecompensa.categoriasSeleccionadas.splice(index, 1);
    }
  }

  getTotalProductosAplicablesModal(): number {
    return this.nuevaRecompensa.productosSeleccionados.length;
  }

  getTotalProductosEnCategoriasModal(): number {
    return this.nuevaRecompensa.categoriasSeleccionadas.length;
  }

  // Método para completar la configuración de la recompensa de forma secuencial
  completarConfiguracionRecompensa(recompensaId: number): void {
    console.log('🚀 Iniciando configuración completa para recompensa ID:', recompensaId);
    console.log('🚀 Tipo de recompensa:', this.nuevaRecompensa.tipo);
    console.log('🚀 Productos seleccionados:', this.nuevaRecompensa.productosSeleccionados.length);
    console.log('🚀 Categorías seleccionadas:', this.nuevaRecompensa.categoriasSeleccionadas.length);
    console.log('🚀 Segmentos seleccionados:', this.nuevaRecompensa.segmentosSeleccionados.length);
    console.log('🚀 Clientes seleccionados:', this.nuevaRecompensa.clientesSeleccionados.length);
    
    // Contador para rastrear las operaciones completadas
    let operacionesCompletadas = 0;
    const totalOperaciones = 2; // Configuración + Asignaciones
    
    const verificarCompletado = () => {
      operacionesCompletadas++;
      console.log(`✅ Operación completada: ${operacionesCompletadas}/${totalOperaciones}`);
      
      if (operacionesCompletadas >= totalOperaciones) {
        console.log('🎉 Todas las operaciones completadas');
        this.showSuccess('¡Recompensa creada exitosamente!');
        this.cerrarModalCarrusel();
        this.cargarRecompensas();
        this.loading = false;
      }
    };

    // 1. Crear configuración específica según el tipo
    console.log('🔧 Paso 1: Creando configuración específica...');
    this.crearConfiguracionEspecifica(recompensaId, verificarCompletado);
    
    // 2. Asignar productos y categorías
    console.log('🔧 Paso 2: Asignando productos y categorías...');
    this.asignarProductosYCategorias(recompensaId, verificarCompletado);
  }

  // Método para crear configuración específica según el tipo de recompensa
  crearConfiguracionEspecifica(recompensaId: number, callback?: () => void): void {
    console.log('🔧 Creando configuración específica para recompensa ID:', recompensaId);
    console.log('🔧 Tipo de recompensa:', this.nuevaRecompensa.tipo);
    console.log('🔧 Configuración actual:', this.nuevaRecompensa);

    // Crear configuración según el tipo usando los endpoints específicos
    switch (this.nuevaRecompensa.tipo) {
      case 'descuento':
        console.log('🔧 Configurando descuento...');
        this.crearConfiguracionDescuento(recompensaId, callback);
        break;
      case 'puntos':
        console.log('🔧 Configurando puntos...');
        this.crearConfiguracionPuntos(recompensaId, callback);
        break;
      case 'envio_gratis':
        console.log('🔧 Configurando envío...');
        this.crearConfiguracionEnvio(recompensaId, callback);
        break;
      case 'regalo':
        console.log('🔧 Configurando regalo...');
        this.crearConfiguracionRegalo(recompensaId, callback);
        break;
      default:
        console.log('⚠️ Tipo de recompensa no reconocido, saltando configuración');
        if (callback) callback();
        break;
    }
  }

  // Crear configuración de descuento
  crearConfiguracionDescuento(recompensaId: number, callback?: () => void): void {
    const configuracion = {
      tipo_descuento: 'porcentaje',
      valor_descuento: this.nuevaRecompensa.valorDescuento || 10, // Valor por defecto si es 0
      compra_minima: this.nuevaRecompensa.minimoCompra || 50 // Valor por defecto si es 0
    };

    console.log('💰 Creando configuración de descuento:', configuracion);
    console.log('💰 Endpoint:', `/api/admin/recompensas/${recompensaId}/descuentos`);

    this.recompensasService.crearConfiguracionDescuentos(recompensaId, configuracion).subscribe({
      next: (response) => {
        console.log('✅ Configuración de descuento creada exitosamente:', response);
        if (callback) callback();
      },
      error: (error) => {
        console.error('❌ Error al crear configuración de descuento:', error);
        console.error('❌ Error completo:', error);
        if (callback) callback(); // Llamar callback incluso en caso de error
      }
    });
  }

  // Crear configuración de puntos
  crearConfiguracionPuntos(recompensaId: number, callback?: () => void): void {
    const configuracion = {
      puntos_por_compra: this.nuevaRecompensa.puntosPorSol || 0,
      puntos_por_monto: 0.1,
      puntos_registro: this.nuevaRecompensa.puntosRegistro || 0
    };

    console.log('Creando configuración de puntos:', configuracion);

    this.recompensasService.crearConfiguracionPuntos(recompensaId, configuracion).subscribe({
      next: (response) => {
        console.log('Configuración de puntos creada exitosamente:', response);
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error al crear configuración de puntos:', error);
        if (callback) callback();
      }
    });
  }

  // Crear configuración de envío
  crearConfiguracionEnvio(recompensaId: number, callback?: () => void): void {
    const configuracion = {
      minimo_compra: this.nuevaRecompensa.compraMinima || 0,
      zonas_aplicables: ['150101', '150102', '070101'] // Zonas por defecto con códigos de ubigeo
    };

    console.log('Creando configuración de envío:', configuracion);

    this.recompensasService.crearConfiguracionEnvios(recompensaId, configuracion).subscribe({
      next: (response) => {
        console.log('Configuración de envío creada exitosamente:', response);
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error al crear configuración de envío:', error);
        if (callback) callback();
      }
    });
  }

  // Crear configuración de regalo
  crearConfiguracionRegalo(recompensaId: number, callback?: () => void): void {
    const configuracion = {
      producto_id: this.nuevaRecompensa.productoRegaloId || null,
      cantidad: 1
    };

    console.log('Creando configuración de regalo:', configuracion);

    this.recompensasService.crearConfiguracionRegalos(recompensaId, configuracion).subscribe({
      next: (response) => {
        console.log('Configuración de regalo creada exitosamente:', response);
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error al crear configuración de regalo:', error);
        if (callback) callback();
      }
    });
  }

  // Método para asignar productos y categorías
  asignarProductosYCategorias(recompensaId: number, callback?: () => void): void {
    console.log('📦 Asignando productos y categorías para recompensa ID:', recompensaId);
    console.log('📦 Productos seleccionados:', this.nuevaRecompensa.productosSeleccionados);
    console.log('📦 Categorías seleccionadas:', this.nuevaRecompensa.categoriasSeleccionadas);
    console.log('📦 Segmentos seleccionados:', this.nuevaRecompensa.segmentosSeleccionados);
    console.log('📦 Clientes seleccionados:', this.nuevaRecompensa.clientesSeleccionados);

    // Contar total de asignaciones a realizar
    const totalAsignaciones = 
      this.nuevaRecompensa.productosSeleccionados.length +
      this.nuevaRecompensa.categoriasSeleccionadas.length +
      this.nuevaRecompensa.segmentosSeleccionados.length +
      this.nuevaRecompensa.clientesSeleccionados.length;

    console.log('Total de asignaciones a realizar:', totalAsignaciones);

    if (totalAsignaciones === 0) {
      console.log('No hay asignaciones que realizar');
      if (callback) callback();
      return;
    }

    let asignacionesCompletadas = 0;

    const verificarAsignacionesCompletadas = () => {
      asignacionesCompletadas++;
      console.log(`Asignación completada: ${asignacionesCompletadas}/${totalAsignaciones}`);
      
      if (asignacionesCompletadas >= totalAsignaciones) {
        console.log('Todas las asignaciones completadas');
        if (callback) callback();
      }
    };

    // Asignar productos específicos (uno por uno según la estructura del backend)
    if (this.nuevaRecompensa.productosSeleccionados.length > 0) {
      this.nuevaRecompensa.productosSeleccionados.forEach((producto: any) => {
        const productoData: any = {
          tipo: 'producto',
          producto_id: producto.id
          // NO incluir categoria_id
        };

        console.log('📦 Asignando producto:', productoData);
        console.log('📦 Endpoint:', `/api/admin/recompensas/${recompensaId}/productos`);

        this.recompensasService.asignarProducto(recompensaId, productoData).subscribe({
          next: (response) => {
            console.log('✅ Producto asignado exitosamente:', response);
            verificarAsignacionesCompletadas();
          },
          error: (error) => {
            console.error('❌ Error al asignar producto:', error);
            console.error('❌ Error completo:', error);
            verificarAsignacionesCompletadas();
          }
        });
      });
    }

    // Asignar categorías (una por una según la estructura del backend)
    if (this.nuevaRecompensa.categoriasSeleccionadas.length > 0) {
      this.nuevaRecompensa.categoriasSeleccionadas.forEach((categoria: any) => {
        const categoriaData: any = {
          tipo: 'categoria',
          categoria_id: categoria.id
          // NO incluir producto_id
        };

        console.log('Asignando categoría:', categoriaData);

        this.recompensasService.asignarProducto(recompensaId, categoriaData).subscribe({
          next: (response) => {
            console.log('Categoría asignada exitosamente:', response);
            verificarAsignacionesCompletadas();
          },
          error: (error) => {
            console.error('Error al asignar categoría:', error);
            verificarAsignacionesCompletadas();
          }
        });
      });
    }

    // Asignar segmentos (uno por uno según la estructura del backend)
    if (this.nuevaRecompensa.segmentosSeleccionados.length > 0) {
      this.nuevaRecompensa.segmentosSeleccionados.forEach((segmento: any) => {
        // Mapear nombres a valores válidos según la especificación
        let segmentoValido = 'todos'; // valor por defecto
        if (segmento.nombre || segmento.tipo) {
          const nombreSegmento = (segmento.nombre || segmento.tipo).toLowerCase();
          if (nombreSegmento.includes('vip')) segmentoValido = 'vip';
          else if (nombreSegmento.includes('nuevo')) segmentoValido = 'nuevos';
          else if (nombreSegmento.includes('recurrente')) segmentoValido = 'recurrentes';
          else if (nombreSegmento.includes('no registrado')) segmentoValido = 'no_registrados';
          else segmentoValido = 'todos';
        }

        const segmentoData = {
          segmento: segmentoValido,
          cliente_id: undefined
        };

        console.log('👥 Asignando segmento:', segmentoData);
        console.log('👥 Endpoint:', `/api/admin/recompensas/${recompensaId}/segmentos`);

        this.recompensasService.asignarSegmento(recompensaId, segmentoData).subscribe({
          next: (response) => {
            console.log('✅ Segmento asignado exitosamente:', response);
            verificarAsignacionesCompletadas();
          },
          error: (error) => {
            console.error('❌ Error al asignar segmento:', error);
            console.error('❌ Error completo:', error);
            verificarAsignacionesCompletadas();
          }
        });
      });
    }

    // Asignar clientes específicos (uno por uno según la estructura del backend)
    if (this.nuevaRecompensa.clientesSeleccionados.length > 0) {
      this.nuevaRecompensa.clientesSeleccionados.forEach((cliente: any) => {
        const clienteData = {
          segmento: 'todos', // según especificación, debe ser 'todos' para clientes específicos
          cliente_id: cliente.id
        };

        console.log('Asignando cliente:', clienteData);

        this.recompensasService.asignarSegmento(recompensaId, clienteData).subscribe({
          next: (response) => {
            console.log('Cliente asignado exitosamente:', response);
            verificarAsignacionesCompletadas();
          },
          error: (error) => {
            console.error('Error al asignar cliente:', error);
            verificarAsignacionesCompletadas();
          }
        });
      });
    }
  }
}