import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  AuditoriaRecompensa, 
  FiltrosAuditoria, 
  ResumenAuditoria,
  TipoAccionAuditoria
} from '../../../../models/recompensa-auditoria.model';
import { PaginatedResponse } from '../../../../models/recompensa.model';

@Component({
  selector: 'app-recompensas-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './recompensas-auditoria.component.html',
  styleUrls: ['./recompensas-auditoria.component.scss']
})
export class RecompensasAuditoriaComponent implements OnInit {
  // Datos de auditoría
  auditoria: AuditoriaRecompensa[] = [];
  resumen: ResumenAuditoria | null = null;
  loading = false;
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  totalPages = 0;

  // Filtros
  filtros: FiltrosAuditoria = {
    buscar: '',
    accion: undefined,
    usuario_id: undefined,
    fecha_desde: '',
    fecha_hasta: '',
    page: 1,
    per_page: 10
  };

  // Opciones para filtros
  tiposAccion: TipoAccionAuditoria[] = [
    'creacion', 'modificacion', 'activacion', 'pausa', 'reanudacion', 'eliminacion', 'duplicacion', 'configuracion_cambio'
  ];

  usuarios = [
    { id: 1, nombre: 'Admin Sistema', email: 'admin@sistema.com' },
    { id: 2, nombre: 'Juan Pérez', email: 'juan@empresa.com' },
    { id: 3, nombre: 'María García', email: 'maria@empresa.com' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.cargarAuditoria();
    this.cargarResumen();
  }

  cargarAuditoria(): void {
    this.loading = true;
    this.filtros.page = this.currentPage + 1;
    this.filtros.per_page = this.pageSize;

    // Mock data para desarrollo
    const mockAuditoria: AuditoriaRecompensa[] = [
      {
        id: 1,
        recompensa_id: 1,
        accion: 'creacion',
        usuario_id: 1,
        usuario_nombre: 'Admin Sistema',
        usuario_email: 'admin@sistema.com',
        detalles: 'Recompensa creada: Puntos por Compra',
        fecha_accion: '2024-01-15T10:30:00Z',
        ip_address: '192.168.1.100'
      },
      {
        id: 2,
        recompensa_id: 1,
        accion: 'activacion',
        usuario_id: 2,
        usuario_nombre: 'Juan Pérez',
        usuario_email: 'juan@empresa.com',
        detalles: 'Recompensa activada para todos los clientes',
        fecha_accion: '2024-01-15T11:00:00Z',
        ip_address: '192.168.1.101'
      },
      {
        id: 3,
        recompensa_id: 2,
        accion: 'modificacion',
        usuario_id: 3,
        usuario_nombre: 'María García',
        usuario_email: 'maria@empresa.com',
        detalles: 'Descuento modificado de 15% a 20%',
        fecha_accion: '2024-01-16T09:15:00Z',
        ip_address: '192.168.1.102'
      }
    ];

    // Simular carga
    setTimeout(() => {
      this.auditoria = mockAuditoria;
      this.totalElements = mockAuditoria.length;
      this.totalPages = Math.ceil(this.totalElements / this.pageSize);
      this.loading = false;
    }, 1000);
  }

  cargarResumen(): void {
    // Mock data para resumen
    this.resumen = {
      total_acciones: 156,
      acciones_por_tipo: [
        { tipo: 'creacion', cantidad: 25, porcentaje: 16.0 },
        { tipo: 'modificacion', cantidad: 45, porcentaje: 28.8 },
        { tipo: 'activacion', cantidad: 30, porcentaje: 19.2 },
        { tipo: 'pausa', cantidad: 20, porcentaje: 12.8 },
        { tipo: 'eliminacion', cantidad: 5, porcentaje: 3.2 },
        { tipo: 'duplicacion', cantidad: 15, porcentaje: 9.6 },
        { tipo: 'configuracion_cambio', cantidad: 16, porcentaje: 10.3 }
      ],
      usuarios_mas_activos: [
        { usuario_id: 1, usuario_nombre: 'Admin Sistema', total_acciones: 45 },
        { usuario_id: 2, usuario_nombre: 'Juan Pérez', total_acciones: 38 },
        { usuario_id: 3, usuario_nombre: 'María García', total_acciones: 28 }
      ],
      recompensas_mas_modificadas: [
        { recompensa_id: 1, recompensa_nombre: 'Puntos por Compra', total_modificaciones: 12 },
        { recompensa_id: 2, recompensa_nombre: 'Descuento Black Friday', total_modificaciones: 8 },
        { recompensa_id: 3, recompensa_nombre: 'Envío Gratis Lima', total_modificaciones: 6 }
      ],
      actividad_por_fecha: [
        { fecha: '2024-01-15', total_acciones: 25 },
        { fecha: '2024-01-16', total_acciones: 18 },
        { fecha: '2024-01-17', total_acciones: 32 }
      ]
    };
  }

  // Métodos de filtrado
  aplicarFiltros(): void {
    this.currentPage = 0;
    this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.filtros = {
      buscar: '',
      accion: undefined,
      usuario_id: undefined,
      fecha_desde: '',
      fecha_hasta: '',
      page: 1,
      per_page: 10
    };
    this.aplicarFiltros();
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.cargarAuditoria();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cargarAuditoria();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cargarAuditoria();
    }
  }

  // Métodos auxiliares
  getAccionClass(accion: TipoAccionAuditoria): string {
    const classes: { [key in TipoAccionAuditoria]: string } = {
      'creacion': 'bg-success-50 text-success-600',
      'modificacion': 'bg-warning-50 text-warning-600',
      'activacion': 'bg-main-50 text-main-600',
      'pausa': 'bg-gray-50 text-gray-600',
      'reanudacion': 'bg-info-50 text-info-600',
      'eliminacion': 'bg-danger-50 text-danger-600',
      'duplicacion': 'bg-purple-50 text-purple-600',
      'configuracion_cambio': 'bg-secondary-50 text-secondary-600'
    };
    return classes[accion] || 'bg-gray-50 text-gray-600';
  }

  getAccionIcon(accion: TipoAccionAuditoria): string {
    const icons: { [key in TipoAccionAuditoria]: string } = {
      'creacion': 'fas fa-plus',
      'modificacion': 'fas fa-edit',
      'activacion': 'fas fa-play',
      'pausa': 'fas fa-pause',
      'reanudacion': 'fas fa-play',
      'eliminacion': 'fas fa-trash',
      'duplicacion': 'fas fa-copy',
      'configuracion_cambio': 'fas fa-cog'
    };
    return icons[accion] || 'fas fa-question';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getPeriodoTexto(): string {
    if (this.filtros.fecha_desde && this.filtros.fecha_hasta) {
      return `${this.formatearFecha(this.filtros.fecha_desde)} - ${this.formatearFecha(this.filtros.fecha_hasta)}`;
    }
    return 'Últimos 30 días';
  }

  // Métodos de exportación
  exportarAuditoria(): void {
    // TODO: Implementar exportación
    console.log('Exportar auditoría');
  }

  actualizarDatos(): void {
    this.cargarAuditoria();
    this.cargarResumen();
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
}
