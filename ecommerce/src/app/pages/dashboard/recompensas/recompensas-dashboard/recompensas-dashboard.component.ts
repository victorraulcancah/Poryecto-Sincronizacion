import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecompensasService } from '../../../../services/recompensas.service';
import { 
  DashboardStats, 
  RecompensaReciente, 
  TipoRecompensa, 
  EstadoRecompensa,
  FiltrosRecompensas
} from '../../../../models/recompensa.model';

@Component({
  selector: 'app-recompensas-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, TitleCasePipe, DatePipe, RouterModule],
  templateUrl: './recompensas-dashboard.component.html',
  styleUrls: ['./recompensas-dashboard.component.scss']
})
export class RecompensasDashboardComponent implements OnInit {
  stats: DashboardStats = {
    recompensas_activas: 0,
    recompensas_activas_crecimiento: 0,
    puntos_canjeados: 0,
    puntos_crecimiento: 0,
    clientes_beneficiados: 0,
    clientes_crecimiento: 0,
    tasa_conversion: 0,
    conversion_crecimiento: 0
  };

  recompensasRecientes: RecompensaReciente[] = [];
  
  // Datos adicionales de las estadísticas
  estadisticasCompletas: any = null;
  estadisticasPorTipo: any = {};
  estadisticasMesActual: any = {};
  comparativaMesAnterior: any = {};
  loadingStats = false;
  openMenuId: number | null = null;

  // Modal de edición (reutilizado del listado)
  mostrarModalEditar = false;
  recompensaEditando: any = null;
  cargandoEdicion = false;
  errorEdicion: string | null = null;

  constructor(
    private recompensasService: RecompensasService,
    private router: Router
  ) {}

  // Método para abrir el modal de crear recompensa
  crearRecompensa(): void {
    this.router.navigate(['/dashboard/recompensas/lista'], { 
      queryParams: { crear: 'true' } 
    });
  }

  ngOnInit(): void {
    this.cargarStats();
    this.cargarRecompensasRecientes();
  }

  /**
   * Método de debug para investigar el problema
   */
  debugRecompensasRecientes(): void {
    console.log('🐛 DEBUG: Estado actual de recompensas recientes');
    console.log('📊 recompensasRecientes:', this.recompensasRecientes);
    console.log('📊 Longitud:', this.recompensasRecientes.length);
    console.log('🔄 Forzando recarga...');
    
    // Limpiar array
    this.recompensasRecientes = [];
    console.log('🧹 Array limpiado');
    
    // Forzar recarga
    setTimeout(() => {
      this.cargarRecompensasRecientes();
    }, 100);
  }

  cargarStats(): void {
    this.loadingStats = true;
    this.recompensasService.obtenerEstadisticas().subscribe({
      next: (response) => {
        if (response.success) {
          // Guardar datos completos
          this.estadisticasCompletas = response.data;
          this.estadisticasPorTipo = response.data.por_tipo || {};
          this.estadisticasMesActual = response.data.mes_actual || {};
          this.comparativaMesAnterior = response.data.comparativa_mes_anterior || {};
          
          // Mapear los datos de la API a la interfaz del componente
          this.stats = {
            recompensas_activas: response.data.resumen?.recompensas_activas || 0,
            recompensas_activas_crecimiento: response.data.comparativa_mes_anterior?.aplicaciones?.tendencia?.porcentaje || 0,
            puntos_canjeados: response.data.mes_actual?.puntos_otorgados || 0,
            puntos_crecimiento: response.data.comparativa_mes_anterior?.puntos_otorgados?.tendencia?.porcentaje || 0,
            clientes_beneficiados: response.data.mes_actual?.clientes_beneficiados || 0,
            clientes_crecimiento: response.data.comparativa_mes_anterior?.clientes_beneficiados?.tendencia?.porcentaje || 0,
            tasa_conversion: response.data.resumen?.tasa_activacion || 0,
            conversion_crecimiento: 0 // No disponible en la API actual
          };
        }
        this.loadingStats = false;
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        
        // Manejo específico de errores
        if (error.status === 500) {
          console.warn('Error 500 en estadísticas - Backend no configurado correctamente');
        } else if (error.status === 404) {
          console.warn('Endpoint de estadísticas no encontrado');
        } else if (error.status === 403) {
          console.warn('Sin permisos para ver estadísticas');
        }
        
        // Resetear a valores por defecto en caso de error
        this.stats = {
          recompensas_activas: 0,
          recompensas_activas_crecimiento: 0,
          puntos_canjeados: 0,
          puntos_crecimiento: 0,
          clientes_beneficiados: 0,
          clientes_crecimiento: 0,
          tasa_conversion: 0,
          conversion_crecimiento: 0
        };
        
        // Limpiar datos de estadísticas por tipo
        this.estadisticasPorTipo = {};
        this.estadisticasMesActual = {};
        this.comparativaMesAnterior = {};
        
        this.loadingStats = false;
      }
    });
  }

  cargarRecompensasRecientes(): void {
    console.log('🔄 Iniciando carga de recompensas recientes...');
    
    // Intentar obtener desde estadísticas primero
    this.recompensasService.obtenerEstadisticas().subscribe({
      next: (response) => {
        console.log('📊 Respuesta de estadísticas:', response);
        
        if (response.success && response.data.top_recompensas_mes) {
          console.log('✅ Datos de estadísticas disponibles:', response.data.top_recompensas_mes);
          
          // Mapear las top recompensas a la interfaz del componente
          this.recompensasRecientes = response.data.top_recompensas_mes.map((recompensa: any) => ({
            id: recompensa.id,
            nombre: recompensa.nombre,
            tipo: recompensa.tipo,
            estado: 'activa', // Las top recompensas del mes están activas
            fecha_inicio: new Date().toISOString().split('T')[0], // Fecha actual
            beneficiarios: recompensa.clientes_unicos || 0
          }));
          
          console.log('✅ Recompensas recientes cargadas desde estadísticas:', this.recompensasRecientes);
        } else {
          console.log('⚠️ No hay datos de estadísticas, usando fallback...');
          // Fallback: obtener recompensas recientes de la lista
          this.cargarRecompensasRecientesFallback();
        }
      },
      error: (error) => {
        console.error('❌ Error cargando recompensas recientes desde estadísticas:', error);
        
        // Manejo específico de errores
        if (error.status === 500) {
          console.warn('⚠️ Error 500 en estadísticas - Usando fallback para recompensas recientes');
        } else if (error.status === 404) {
          console.warn('⚠️ Endpoint de estadísticas no encontrado - Usando fallback');
        }
        
        // Fallback: obtener recompensas recientes de la lista
        this.cargarRecompensasRecientesFallback();
      }
    });
  }

  /**
   * Método de fallback para cargar recompensas recientes desde la lista
   */
  cargarRecompensasRecientesFallback(): void {
    console.log('🔄 Cargando recompensas recientes usando fallback...');
    
    // Obtener las últimas 10 recompensas creadas
    const filtros: FiltrosRecompensas = {
      page: 1,
      per_page: 10,
      order_by: 'created_at',
      order_direction: 'desc'
    };

    console.log('📋 Filtros para fallback:', filtros);

    this.recompensasService.obtenerLista(filtros).subscribe({
      next: (response: any) => {
        console.log('📊 Respuesta del fallback:', response);
        
        if (response.success && response.data.data) {
          console.log('✅ Datos encontrados en fallback:', response.data.data.length, 'recompensas');
          
          // Mapear las recompensas a la interfaz del componente
          this.recompensasRecientes = response.data.data.map((recompensa: any) => ({
            id: recompensa.id,
            nombre: recompensa.nombre,
            tipo: recompensa.tipo,
            estado: recompensa.estado || this.getEstadoReal(recompensa),
            fecha_inicio: recompensa.fecha_inicio,
            beneficiarios: recompensa.total_clientes || 0
          }));
          
          console.log('✅ Recompensas recientes cargadas desde fallback:', this.recompensasRecientes.length);
          console.log('📋 Datos finales:', this.recompensasRecientes);
        } else {
          this.recompensasRecientes = [];
          console.log('⚠️ No se encontraron recompensas recientes en fallback');
          console.log('📊 Respuesta completa:', response);
        }
      },
      error: (error) => {
        console.error('❌ Error en fallback de recompensas recientes:', error);
        this.recompensasRecientes = [];
      }
    });
  }

  /**
   * Determinar el estado real de una recompensa (método auxiliar)
   */
  private getEstadoReal(recompensa: any): string {
    try {
      // Si el backend ya proporciona el estado, lo usamos
      if (recompensa.estado && ['programada', 'activa', 'pausada', 'expirada', 'cancelada'].includes(recompensa.estado)) {
        return recompensa.estado;
      }

      // Fallback: calcular estado basado en fechas
      const ahora = new Date();
      const fechaInicio = new Date(recompensa.fecha_inicio);
      const fechaFin = new Date(recompensa.fecha_fin);

      if (recompensa.activo === false) return 'pausada';
      if (ahora < fechaInicio) return 'programada';
      if (ahora > fechaFin) return 'expirada';
      if (ahora >= fechaInicio && ahora <= fechaFin && recompensa.activo !== false) return 'activa';
      
      return 'pausada';
    } catch (error) {
      return 'pausada';
    }
  }

  getTipoBadgeClass(tipo: string): string {
    const classes = {
      'puntos': 'bg-warning',
      'descuento': 'bg-info',
      'envio_gratis': 'bg-primary',
      'regalo': 'bg-success'
    };
    return classes[tipo as keyof typeof classes] || 'bg-secondary';
  }

  getTipoIcon(tipo: string): string {
    const icons = {
      'puntos': 'fas fa-coins fa-2x',
      'descuento': 'fas fa-percentage fa-2x',
      'envio_gratis': 'fas fa-shipping-fast fa-2x',
      'regalo': 'fas fa-gift fa-2x'
    };
    return icons[tipo as keyof typeof icons] || 'fas fa-question fa-2x';
  }

  getTipoColor(tipo: string): string {
    const colors = {
      'puntos': '#ffc107',
      'descuento': '#17a2b8',
      'envio_gratis': '#007bff',
      'regalo': '#28a745'
    };
    return colors[tipo as keyof typeof colors] || '#6c757d';
  }

  getTipoLabel(tipo: string): string {
    const labels = {
      'puntos': 'Sistema de Puntos',
      'descuento': 'Descuentos',
      'envio_gratis': 'Envío Gratuito',
      'regalo': 'Productos de Regalo'
    };
    return labels[tipo as keyof typeof labels] || tipo;
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      'activa': 'bg-success',
      'pausada': 'bg-warning',
      'expirada': 'bg-danger',
      'programada': 'bg-info',
      'cancelada': 'bg-secondary'
    };
    return classes[estado as keyof typeof classes] || 'bg-secondary';
  }

  editarRecompensa(id: number): void {
    this.mostrarModalEditar = true;
    this.cargarDetalleParaEdicion(id);
  }

  private cargarDetalleParaEdicion(id: number): void {
    this.cargandoEdicion = true;
    this.errorEdicion = null;

    this.recompensasService.obtenerDetalle(id).subscribe({
      next: (response: any) => {
        this.recompensaEditando = response.recompensa || response.data?.recompensa || response.data || response;
        this.cargandoEdicion = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle para edición:', error);
        this.errorEdicion = 'Error al cargar los datos de la recompensa';
        this.cargandoEdicion = false;
      }
    });
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

    const datosActualizacion = {
      nombre: this.recompensaEditando.nombre?.trim(),
      descripcion: this.recompensaEditando.descripcion?.trim(),
      tipo: this.recompensaEditando.tipo,
      fecha_inicio: this.recompensaEditando.fecha_inicio,
      fecha_fin: this.recompensaEditando.fecha_fin,
      estado: this.recompensaEditando.estado
    };

    this.recompensasService.actualizar(this.recompensaEditando.id, datosActualizacion).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.cerrarModalEditar();
          this.cargarRecompensasRecientes();
          this.cargarStats();
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

  toggleEstado(recompensa: RecompensaReciente): void {
    const nuevoEstado = recompensa.estado === 'activa' ? 'pausada' : 'activa';
    
    this.recompensasService.cambiarEstado(recompensa.id, nuevoEstado).subscribe({
      next: () => {
        recompensa.estado = nuevoEstado;
        this.cargarStats(); // Recargar stats
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
      }
    });
  }
}
