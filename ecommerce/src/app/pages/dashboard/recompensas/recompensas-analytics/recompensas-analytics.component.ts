import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, inject, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { RecompensasService } from '../../../../services/recompensas.service';
import { RecompensaAnalytics } from '../../../../models/recompensa-analytics.model';
import { TipoRecompensa } from '../../../../models/recompensa.model';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-recompensas-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './recompensas-analytics.component.html',
  styleUrls: ['./recompensas-analytics.component.scss']
})
export class RecompensasAnalyticsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('exportModal', { static: true }) exportModal!: TemplateRef<any>;
  @ViewChild('filterModal', { static: true }) filterModal!: TemplateRef<any>;
  
  // ViewChild para los gráficos
  @ViewChild('rendimientoChart', { static: false }) rendimientoChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distribucionChart', { static: false }) distribucionChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tendenciasChart', { static: false }) tendenciasChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('comparativaChart', { static: false }) comparativaChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distribucionTipoChart', { static: false }) distribucionTipoChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('actividadSemanalChart', { static: false }) actividadSemanalChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  // Instancias de gráficos
  private charts: { [key: string]: any } = {};

  // Datos de analytics
  analytics: RecompensaAnalytics | null = null;
  loading = false;
  loadingCharts = false;
  periodoSeleccionado = 'Últimos 30 días';
  
  // Control de tabs
  activeTab = 'resumen';
  analisisSubTab = 'recompensas';
  reportesSubTab = 'segmentos';

  // Datos falsos para mostrar
  topRecompensas = [
    { id: 1, nombre: 'Descuento Black Friday', tipo: 'descuento', aplicaciones: 1250, conversion_rate: 85 },
    { id: 2, nombre: 'Puntos por Compra', tipo: 'puntos', aplicaciones: 980, conversion_rate: 72 },
    { id: 3, nombre: 'Envío Gratis Lima', tipo: 'envio_gratis', aplicaciones: 750, conversion_rate: 68 },
    { id: 4, nombre: 'Regalo de Bienvenida', tipo: 'regalo', aplicaciones: 420, conversion_rate: 45 },
    { id: 5, nombre: 'Descuento VIP 15%', tipo: 'descuento', aplicaciones: 380, conversion_rate: 92 },
    { id: 6, nombre: 'Puntos Doble Fin de Semana', tipo: 'puntos', aplicaciones: 650, conversion_rate: 78 },
    { id: 7, nombre: 'Descuento Primera Compra', tipo: 'descuento', aplicaciones: 920, conversion_rate: 82 },
    { id: 8, nombre: 'Regalo Cumpleaños', tipo: 'regalo', aplicaciones: 340, conversion_rate: 88 }
  ];

  clientesActivos = [
    { id: 1, nombre: 'María González', email: 'maria.gonzalez@email.com', total_recompensas: 15, valor_beneficios: 450 },
    { id: 2, nombre: 'Carlos López', email: 'carlos.lopez@email.com', total_recompensas: 12, valor_beneficios: 380 },
    { id: 3, nombre: 'Ana Rodríguez', email: 'ana.rodriguez@email.com', total_recompensas: 10, valor_beneficios: 320 },
    { id: 4, nombre: 'Luis Martínez', email: 'luis.martinez@email.com', total_recompensas: 8, valor_beneficios: 280 },
    { id: 5, nombre: 'Sofia Herrera', email: 'sofia.herrera@email.com', total_recompensas: 7, valor_beneficios: 250 },
    { id: 6, nombre: 'Pedro Vargas', email: 'pedro.vargas@email.com', total_recompensas: 11, valor_beneficios: 420 },
    { id: 7, nombre: 'Laura Sánchez', email: 'laura.sanchez@email.com', total_recompensas: 9, valor_beneficios: 310 },
    { id: 8, nombre: 'Diego Torres', email: 'diego.torres@email.com', total_recompensas: 13, valor_beneficios: 520 }
  ];

  productosAnalisis = [
    { producto: 'Laptop Gaming MSI', categoria: 'Electrónicos', metricas: { veces_recompensado: 45, valor_total_recompensado: 12500, conversion_rate: 78 } },
    { producto: 'iPhone 15 Pro', categoria: 'Electrónicos', metricas: { veces_recompensado: 38, valor_total_recompensado: 9800, conversion_rate: 65 } },
    { producto: 'Auriculares Sony WH-1000XM5', categoria: 'Accesorios', metricas: { veces_recompensado: 52, valor_total_recompensado: 3200, conversion_rate: 82 } },
    { producto: 'iPad Air', categoria: 'Electrónicos', metricas: { veces_recompensado: 28, valor_total_recompensado: 7500, conversion_rate: 58 } },
    { producto: 'Mouse Logitech MX Master', categoria: 'Accesorios', metricas: { veces_recompensado: 41, valor_total_recompensado: 1800, conversion_rate: 71 } },
    { producto: 'Monitor LG UltraWide', categoria: 'Electrónicos', metricas: { veces_recompensado: 35, valor_total_recompensado: 8900, conversion_rate: 73 } },
    { producto: 'Teclado Mecánico Keychron', categoria: 'Accesorios', metricas: { veces_recompensado: 48, valor_total_recompensado: 2400, conversion_rate: 69 } },
    { producto: 'Webcam Logitech Brio', categoria: 'Accesorios', metricas: { veces_recompensado: 32, valor_total_recompensado: 1600, conversion_rate: 62 } }
  ];

  segmentosAnalisis = [
    { segmento: 'Clientes Nuevos', metricas: { total_clientes: 1250, aplicaciones: 850, conversion_rate: 68 } },
    { segmento: 'Clientes Recurrentes', metricas: { total_clientes: 980, aplicaciones: 1200, conversion_rate: 85 } },
    { segmento: 'Clientes VIP', metricas: { total_clientes: 150, aplicaciones: 320, conversion_rate: 92 } },
    { segmento: 'Clientes Inactivos', metricas: { total_clientes: 2100, aplicaciones: 180, conversion_rate: 12 } }
  ];

  alertas = [
    { titulo: 'Recompensa Próxima a Vencer', mensaje: 'La recompensa "Descuento Black Friday" expira en 3 días' },
    { titulo: 'Baja Conversión Detectada', mensaje: 'La recompensa "Regalo de Bienvenida" tiene una tasa de conversión del 45%' },
    { titulo: 'Stock Bajo', mensaje: 'La recompensa "Regalo Cumpleaños" tiene stock limitado (15 unidades)' }
  ];

  recomendaciones = [
    { titulo: 'Optimizar Horarios de Envío', descripcion: 'Las recompensas tienen mayor impacto entre 2-4 PM. Considera programar tus campañas en este horario.' },
    { titulo: 'Segmentación VIP', descripcion: 'Los clientes VIP responden 40% mejor a descuentos exclusivos. Crea recompensas específicas para este segmento.' },
    { titulo: 'Aumentar Puntos', descripcion: 'Las recompensas de puntos tienen alta retención. Considera duplicar los puntos en compras grandes.' }
  ];

  resumenEjecutivo = {
    total_recompensas: 24,
    clientes_beneficiados: 4850,
    valor_total: 125000,
    tasa_conversion: 78
  };

  // Datos para gráficos del tab Resumen
  datosRendimiento = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [{
      label: 'Aplicaciones',
      data: [120, 190, 300, 500, 200, 300],
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4
    }, {
      label: 'Conversiones',
      data: [80, 120, 200, 350, 150, 250],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };

  datosDistribucion = {
    labels: ['Descuentos', 'Puntos', 'Envío Gratis', 'Regalos'],
    datasets: [{
      data: [45, 25, 20, 10],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
      borderWidth: 0
    }]
  };

  // Datos para gráficos del tab Análisis Detallado
  datosTendencias = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [{
      label: 'Uso Diario',
      data: [65, 59, 80, 81, 56, 55, 40],
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4
    }]
  };

  datosComparativa = {
    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
    datasets: [{
      label: 'Este Año',
      data: [1200, 1900, 3000, 5000, 2000, 3000],
      backgroundColor: '#10B981'
    }, {
      label: 'Año Anterior',
      data: [1000, 1500, 2500, 4000, 1800, 2500],
      backgroundColor: '#6B7280'
    }]
  };

  // Datos para gráficos del tab Reportes
  datosDistribucionTipo = {
    labels: ['Descuentos', 'Puntos', 'Envío Gratis', 'Regalos', 'Otros'],
    datasets: [{
      data: [40, 30, 15, 10, 5],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
      borderWidth: 0
    }]
  };

  datosActividadSemanal = {
    labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    datasets: [{
      label: 'Actividad',
      data: [85, 92, 78, 95, 88, 65, 45],
      backgroundColor: '#3B82F6',
      borderColor: '#1D4ED8',
      borderWidth: 2
    }]
  };

  // Datos adicionales para métricas (solo los que están en endpoints reales)
  metricasAdicionales = {
    top_categorias: [
      { categoria: 'Electrónicos', aplicaciones: 1250, conversion_rate: 82 },
      { categoria: 'Ropa', aplicaciones: 980, conversion_rate: 75 },
      { categoria: 'Hogar', aplicaciones: 750, conversion_rate: 68 },
      { categoria: 'Deportes', aplicaciones: 420, conversion_rate: 58 },
      { categoria: 'Libros', aplicaciones: 380, conversion_rate: 45 }
    ]
  };

  // Datos para alertas y notificaciones
  notificaciones = [
    { tipo: 'success', titulo: 'Nueva Recompensa Creada', mensaje: 'La recompensa "Descuento Verano" ha sido activada exitosamente', fecha: '2024-01-15' },
    { tipo: 'warning', titulo: 'Recompensa Próxima a Vencer', mensaje: 'La recompensa "Black Friday" expira en 2 días', fecha: '2024-01-14' },
    { tipo: 'info', titulo: 'Meta Alcanzada', mensaje: 'Se ha alcanzado el 100% de la meta mensual de conversiones', fecha: '2024-01-13' }
  ];

  // Datos para comparativas (se cargarán desde el endpoint)
  comparativas: any = {
    periodo_actual: {
      aplicaciones: 4210,
      clientes: 1348,
      valor_beneficios: 85640
    },
    periodo_anterior: {
      aplicaciones: 3920,
      clientes: 1256,
      valor_beneficios: 79800
    },
    comparativa: {
      aplicaciones: {
        porcentaje_cambio: 7.4,
        tendencia: 'creciente'
      },
      clientes: {
        porcentaje_cambio: 7.3,
        tendencia: 'creciente'
      },
      valor_beneficios: {
        porcentaje_cambio: 7.3,
        tendencia: 'creciente'
      }
    }
  };

  // Filtros
  filtros = {
    fecha_desde: '',
    fecha_hasta: '',
    tipo_recompensa: '',
    segmento: '',
    producto: ''
  };

  // Opciones para filtros
  tiposRecompensa: TipoRecompensa[] = ['puntos', 'descuento', 'envio_gratis', 'regalo'];
  segmentos: string[] = ['todos', 'nuevos', 'recurrentes', 'vip'];
  productos: string[] = ['todos', 'electronica', 'hogar', 'deportes'];

  // Configuración de gráficos
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  private recompensasService = inject(RecompensasService);

  constructor() {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngAfterViewInit(): void {
    // Registrar componentes de Chart.js
    Chart.register(...registerables);
    
    // Crear gráficos después de un pequeño delay para asegurar que los ViewChild estén disponibles
    setTimeout(() => {
      this.crearGraficos();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  private crearGraficos(): void {
    this.destroyCharts(); // Limpiar gráficos existentes

    // Crear gráfico de rendimiento
    if (this.rendimientoChart) {
      this.charts['rendimiento'] = new Chart(this.rendimientoChart.nativeElement, {
        type: 'line',
        data: this.datosRendimiento,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Crear gráfico de distribución
    if (this.distribucionChart) {
      this.charts['distribucion'] = new Chart(this.distribucionChart.nativeElement, {
        type: 'doughnut',
        data: this.datosDistribucion,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    }

    // Crear gráfico de tendencias
    if (this.tendenciasChart) {
      this.charts['tendencias'] = new Chart(this.tendenciasChart.nativeElement, {
        type: 'line',
        data: this.datosTendencias,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Crear gráfico de comparativa
    if (this.comparativaChart) {
      this.charts['comparativa'] = new Chart(this.comparativaChart.nativeElement, {
        type: 'bar',
        data: this.datosComparativa,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Crear gráfico de distribución por tipo
    if (this.distribucionTipoChart) {
      this.charts['distribucionTipo'] = new Chart(this.distribucionTipoChart.nativeElement, {
        type: 'pie',
        data: this.datosDistribucionTipo,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    }

    // Crear gráfico de actividad semanal
    if (this.actividadSemanalChart) {
      this.charts['actividadSemanal'] = new Chart(this.actividadSemanalChart.nativeElement, {
        type: 'bar',
        data: this.datosActividadSemanal,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }
  }

  private destroyCharts(): void {
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  private loadAnalytics(): void {
    this.loading = true;
    
    // Cargar analytics reales desde el backend
    this.recompensasService.obtenerAnalytics(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.analytics = response.data;
            this.loading = false;
            this.updateCharts();
            // Cargar comparativas
            this.loadComparativas();
          } else {
            console.error('Error al cargar analytics:', response.message);
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error al cargar analytics:', error);
          this.loading = false;
          // En caso de error, usar datos falsos como fallback
          this.analytics = this.getFakeAnalytics();
        }
      });
  }

  private loadComparativas(): void {
    // Calcular fechas para comparativa (mes actual vs mes anterior)
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(1); // Primer día del mes actual
    
    const mesAnteriorFin = new Date(fechaInicio);
    mesAnteriorFin.setDate(0); // Último día del mes anterior
    const mesAnteriorInicio = new Date(mesAnteriorFin);
    mesAnteriorInicio.setDate(1); // Primer día del mes anterior
    
    const periodoActualInicio = fechaInicio.toISOString().split('T')[0];
    const periodoActualFin = fechaFin.toISOString().split('T')[0];
    const periodoAnteriorInicio = mesAnteriorInicio.toISOString().split('T')[0];
    const periodoAnteriorFin = mesAnteriorFin.toISOString().split('T')[0];
    
    this.recompensasService.obtenerComparativa(
      periodoActualInicio, 
      periodoActualFin, 
      periodoAnteriorInicio, 
      periodoAnteriorFin
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.success) {
          this.comparativas = response.data;
        } else {
          console.error('Error al cargar comparativas:', response.message);
        }
      },
      error: (error) => {
        console.error('Error al cargar comparativas:', error);
      }
    });
  }

  private initializeCharts(): void {
    // Inicializar gráficos después de que se cargue el DOM
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }

  private createCharts(): void {
    this.createEvolucionTemporalChart();
    this.createDistribucionTipoChart();
    this.createConversionSegmentoChart();
    this.createTendenciaValoresChart();
  }

  private createEvolucionTemporalChart(): void {
    const ctx = document.getElementById('evolucionTemporalChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data: any = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Aplicaciones',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Conversiones',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    this.charts['evolucionTemporal'] = new (window as any).Chart(ctx, {
      type: 'line',
      data,
      options: this.chartOptions
    });
  }

  private createDistribucionTipoChart(): void {
    const ctx = document.getElementById('distribucionTipoChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data: any = {
      labels: ['Puntos', 'Descuentos', 'Envío Gratis', 'Regalos'],
      datasets: [
        {
          data: [0, 0, 0, 0],
          backgroundColor: [
            '#ffc107',
            '#28a745',
            '#17a2b8',
            '#6f42c1'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };

    this.charts['distribucionTipo'] = new (window as any).Chart(ctx, {
      type: 'doughnut',
      data,
      options: {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
        }
      }
    });
  }

  private createConversionSegmentoChart(): void {
    const ctx = document.getElementById('conversionSegmentoChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data: any = {
      labels: ['Nuevos', 'Regulares', 'VIP', 'Premium'],
      datasets: [
        {
          label: 'Tasa de Conversión (%)',
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(255, 193, 7, 0.8)',
            'rgba(40, 167, 69, 0.8)',
            'rgba(23, 162, 184, 0.8)',
            'rgba(111, 66, 193, 0.8)'
          ],
          borderColor: [
            '#ffc107',
            '#28a745',
            '#17a2b8',
            '#6f42c1'
          ],
          borderWidth: 2
        }
      ]
    };

    this.charts['conversionSegmento'] = new (window as any).Chart(ctx, {
      type: 'bar',
      data,
      options: this.chartOptions
    });
  }

  private createTendenciaValoresChart(): void {
    const ctx = document.getElementById('tendenciaValoresChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data: any = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Valor Total (S/)',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'ROI (%)',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#fd7e14',
          backgroundColor: 'rgba(253, 126, 20, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    };

    this.charts['tendenciaValores'] = new (window as any).Chart(ctx, {
      type: 'line',
      data,
      options: {
        ...this.chartOptions,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: {
              drawOnChartArea: false,
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      }
    });
  }

  private updateCharts(): void {
    // Actualizar datos de los gráficos con los datos reales
    if (this.analytics) {
      // Actualizar gráfico de evolución temporal
      if (this.charts['evolucionTemporal']) {
        const evolucionData = this.analytics.dashboard.graficos_principales.evolucion_temporal;
        this.charts['evolucionTemporal'].data.labels = evolucionData.map(d => d.label);
        this.charts['evolucionTemporal'].data.datasets[0].data = evolucionData.map(d => d.y);
        this.charts['evolucionTemporal'].update();
      }

      // Actualizar gráfico de distribución por tipo
      if (this.charts['distribucionTipo']) {
        const distribucionData = this.analytics.dashboard.graficos_principales.distribucion_por_tipo;
        this.charts['distribucionTipo'].data.labels = distribucionData.map(d => d.label);
        this.charts['distribucionTipo'].data.datasets[0].data = distribucionData.map(d => d.y);
        this.charts['distribucionTipo'].update();
      }

      // Actualizar gráfico de conversión por segmento
      if (this.charts['conversionSegmento']) {
        const conversionData = this.analytics.dashboard.graficos_principales.conversion_por_segmento;
        this.charts['conversionSegmento'].data.labels = conversionData.map(d => d.label);
        this.charts['conversionSegmento'].data.datasets[0].data = conversionData.map(d => d.y);
        this.charts['conversionSegmento'].update();
      }

      // Actualizar gráfico de tendencia de valores
      if (this.charts['tendenciaValores']) {
        const tendenciaData = this.analytics.dashboard.graficos_principales.tendencia_valores;
        this.charts['tendenciaValores'].data.labels = tendenciaData.map(d => d.label);
        this.charts['tendenciaValores'].data.datasets[0].data = tendenciaData.map(d => d.y);
        this.charts['tendenciaValores'].update();
      }
    }
  }

  // Métodos para filtros
  aplicarFiltros(): void {
    this.loadAnalytics();
  }

  limpiarFiltros(): void {
    this.filtros = {
      fecha_desde: '',
      fecha_hasta: '',
      tipo_recompensa: '',
      segmento: '',
      producto: ''
    };
    this.aplicarFiltros();
  }

  // Métodos para exportación
  exportarExcel(): void {
    this.showSuccess('Exportando datos a Excel...');
  }

  exportarPDF(): void {
    this.showSuccess('Exportando datos a PDF...');
  }

  exportarCSV(): void {
    this.showSuccess('Exportando datos a CSV...');
  }

  // Métodos para modales
  openExportModal(): void {
    // Implementar con sistema de modales
  }

  openFilterModal(): void {
    // Implementar con sistema de modales
  }

  // Métodos auxiliares
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  }

  formatearPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-PE').format(valor);
  }

  getTendenciaClass(tendencia: string): string {
    const classes: { [key: string]: string } = {
      'creciente': 'text-success',
      'decreciente': 'text-danger',
      'estable': 'text-warning'
    };
    return classes[tendencia] || 'text-muted';
  }

  getTendenciaIcon(tendencia: string): string {
    const icons: { [key: string]: string } = {
      'creciente': 'fas fa-arrow-up',
      'decreciente': 'fas fa-arrow-down',
      'estable': 'fas fa-minus'
    };
    return icons[tendencia] || 'fas fa-question';
  }

  private showError(message: string): void {
    console.error(message);
    // Implementar sistema de notificaciones
  }

  private showSuccess(message: string): void {
    console.log(message);
    // Implementar sistema de notificaciones
  }

  // ====== MOCK DATA PARA DEMO ======
  private getFakeAnalytics(): RecompensaAnalytics {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const evol = meses.slice(0, 8).map((m, i) => ({ x: m, y: Math.round(150 + Math.sin(i/2)*40 + i*10), label: m }));
    const conv = ['Nuevos','Regulares','VIP','Premium'].map((s, i) => ({ x: s, y: [8.5, 12.3, 18.9, 15.1][i], label: s }));
    const dist = [
      { tipo: 'puntos', tipo_nombre: 'Puntos', cantidad: 350, porcentaje: 35, valor_total: 24000, conversion_rate: 10.2 },
      { tipo: 'descuento', tipo_nombre: 'Descuentos', cantidad: 420, porcentaje: 42, valor_total: 43000, conversion_rate: 14.1 },
      { tipo: 'envio_gratis', tipo_nombre: 'Envío Gratis', cantidad: 120, porcentaje: 12, valor_total: 9000, conversion_rate: 8.3 },
      { tipo: 'regalo', tipo_nombre: 'Regalos', cantidad: 110, porcentaje: 11, valor_total: 9600, conversion_rate: 9.5 }
    ];
    const distGraph = [
      { x: 'Puntos', y: 35 },
      { x: 'Descuentos', y: 42 },
      { x: 'Envío Gratis', y: 12 },
      { x: 'Regalos', y: 11 }
    ];
    const trend = meses.slice(0, 8).map((m, i) => ({ x: m, y: Math.round(20000 + i*3500 + (i%3)*1200), label: m }));

    const base = this.getEmptyAnalytics();
    const fake: RecompensaAnalytics = {
      dashboard: {
        resumen_general: {
          total_recompensas_activas: 12,
          total_recompensas_este_mes: 5,
          total_clientes_beneficiados: 1348,
          valor_total_beneficios: 85640,
          conversion_rate_promedio: 12.7,
          crecimiento_mensual: 7.4
        },
        metricas_principales: {
          recompensas_por_tipo: dist,
          top_recompensas: [
            { id: 1, nombre: 'Bienvenida 10%', tipo: 'descuento', aplicaciones: 420, clientes_beneficiados: 330, valor_beneficios: 18560, conversion_rate: 18.4, efectividad: 92 },
            { id: 2, nombre: 'Puntos Doble', tipo: 'puntos', aplicaciones: 360, clientes_beneficiados: 290, valor_beneficios: 15340, conversion_rate: 14.2, efectividad: 86 },
            { id: 3, nombre: 'Envío Gratis Finde', tipo: 'envio_gratis', aplicaciones: 210, clientes_beneficiados: 180, valor_beneficios: 9600, conversion_rate: 9.8, efectividad: 74 }
          ],
          clientes_mas_activos: [
            { id: 101, nombre: 'Juan Pérez', email: 'juan@example.com', total_recompensas: 18, valor_beneficios: 540, ultima_actividad: '2025-09-28', segmento: 'VIP' },
            { id: 102, nombre: 'María García', email: 'maria@example.com', total_recompensas: 15, valor_beneficios: 420, ultima_actividad: '2025-09-26', segmento: 'Recurrentes' },
            { id: 103, nombre: 'Carlos Díaz', email: 'carlos@example.com', total_recompensas: 12, valor_beneficios: 380, ultima_actividad: '2025-09-25', segmento: 'Recurrentes' }
          ],
          productos_mas_recompensados: [
            { id: 501, nombre: 'Mouse Inalámbrico', codigo: 'MS-100', veces_recompensado: 140, valor_total_recompensado: 3500, categoria: 'Accesorios' },
            { id: 502, nombre: 'Teclado Mecánico', codigo: 'KB-200', veces_recompensado: 120, valor_total_recompensado: 4800, categoria: 'Accesorios' }
          ],
          zonas_mas_activas: [
            { codigo: 'LIM', nombre: 'Lima', total_aplicaciones: 2200, valor_beneficios: 42000, porcentaje_participacion: 46 },
            { codigo: 'ARE', nombre: 'Arequipa', total_aplicaciones: 680, valor_beneficios: 12800, porcentaje_participacion: 14 }
          ]
        },
        graficos_principales: {
          evolucion_temporal: evol,
          distribucion_por_tipo: distGraph,
          conversion_por_segmento: conv,
          tendencia_valores: trend
        },
        alertas: [
          { id: 'a1', tipo: 'info', titulo: 'Tendencia positiva', mensaje: 'La conversión subió 2.1% vs mes anterior', fecha: new Date().toISOString(), accion_requerida: false },
          { id: 'a2', tipo: 'warning', titulo: 'Segmento Premium bajo', mensaje: 'Baja participación en segmento Premium', fecha: new Date().toISOString(), accion_requerida: false }
        ],
        recomendaciones: [
          { id: 'r1', categoria: 'optimizacion', titulo: 'Probar A/B en CTA', descripcion: 'Testear variantes del texto del botón del descuento', impacto_estimado: 'medio', facilidad_implementacion: 'alta', accion_sugerida: 'Crear experimento A/B' },
          { id: 'r2', categoria: 'nuevas_campanas', titulo: 'Visibilidad Envío Gratis', descripcion: 'Resaltar campaña de envío gratis en home', impacto_estimado: 'alto', facilidad_implementacion: 'media', accion_sugerida: 'Añadir banner promocional' }
        ]
      },
      rendimiento: {
        metricas_rendimiento: {
          conversion_rate: 13.8,
          valor_promedio_beneficio: 42.5,
          tiempo_promedio_aplicacion: 2.4,
          tasa_abandono: 5.2,
          retorno_inversion: 165,
          costo_por_adquisicion: 7.8
        },
        analisis_efectividad: {
          recompensas_mas_efectivas: [
            { id: 1, nombre: 'Bienvenida 10%', tipo: 'descuento', efectividad: 92, conversion_rate: 18.4, valor_beneficios: 18560, razones_exito: ['Fácil de entender','Alta visibilidad'] },
            { id: 2, nombre: 'Puntos Doble', tipo: 'puntos', efectividad: 86, conversion_rate: 14.2, valor_beneficios: 15340, razones_exito: ['Recompensa acumulativa','Clientes fieles'] }
          ],
          recompensas_menos_efectivas: [
            { id: 3, nombre: 'Regalo Misterioso', tipo: 'regalo', efectividad: 61, conversion_rate: 8.1, valor_beneficios: 6240, razones_exito: ['Segmentación amplia'] }
          ],
          factores_exito: [
            { factor: 'Mensaje claro', impacto: 0.8, descripcion: 'CTA directo incrementa la conversión', recomendaciones: ['Usar verbos de acción','Mantener corto el texto'] },
            { factor: 'Segmentación', impacto: 0.7, descripcion: 'Segmentos VIP responden mejor a puntos', recomendaciones: ['Ofrecer multiplicadores a VIP'] }
          ],
          areas_mejora: [
            { area: 'Timing de envío', problema: 'Baja apertura en mañanas', impacto: 0.6, solucion_sugerida: 'Enviar 6-9pm', prioridad: 'media' }
          ]
        },
        comparacion_periodos: {
          periodo_actual: {
            fecha_inicio: '2025-09-01',
            fecha_fin: '2025-09-30',
            total_recompensas: 12,
            total_aplicaciones: 4210,
            conversion_rate: 12.7,
            valor_beneficios: 85640
          },
          periodo_anterior: {
            fecha_inicio: '2025-08-01',
            fecha_fin: '2025-08-31',
            total_recompensas: 11,
            total_aplicaciones: 3920,
            conversion_rate: 11.5,
            valor_beneficios: 80210
          },
          cambios: [
            { metrica: 'aplicaciones', valor_actual: 4210, valor_anterior: 3920, cambio_absoluto: 290, cambio_porcentual: 7.4, tendencia: 'creciente' },
            { metrica: 'conversion_rate', valor_actual: 12.7, valor_anterior: 11.5, cambio_absoluto: 1.2, cambio_porcentual: 10.4, tendencia: 'creciente' }
          ]
        },
        insights: [
          { id: 'i1', tipo: 'oportunidad', titulo: 'Alta respuesta a descuentos', descripcion: 'Los descuentos superan al resto en 7 pts.', datos_soporte: {}, accion_recomendada: 'Incrementar presupuesto en descuentos', urgencia: 'media' }
        ]
      },
      tendencias: {
        tendencias_temporales: [
          { metrica: 'aplicaciones', periodo: 'mensual', datos: evol, tendencia: 'creciente', fuerza_tendencia: 0.78, significancia: 0.9 }
        ],
        patrones_estacionales: [
          { patron: 'fin_de_semana', descripcion: 'Mayor uso sábados', frecuencia: 'semanal', impacto: 0.6, recomendaciones: ['Focalizar campañas viernes-sábado'] }
        ],
        proyecciones: {
          proyeccion_conversion: { metrica: 'conversion', valores_historicos: evol, valores_proyectados: evol.map(p=>({ ...p, y: Math.round((p.y as number)*1.05) })), confianza: 0.82, intervalo_confianza: { inferior: evol.map(p=>({ ...p, y: (p.y as number)*0.98 })), superior: evol.map(p=>({ ...p, y: (p.y as number)*1.12 })) } },
          proyeccion_valores: { metrica: 'valor', valores_historicos: trend, valores_proyectados: trend.map(p=>({ ...p, y: Math.round((p.y as number)*1.08) })), confianza: 0.79, intervalo_confianza: { inferior: trend.map(p=>({ ...p, y: (p.y as number)*0.95 })), superior: trend.map(p=>({ ...p, y: (p.y as number)*1.15 })) } },
          proyeccion_clientes: { metrica: 'clientes', valores_historicos: evol, valores_proyectados: evol.map(p=>({ ...p, y: (p.y as number)*1.03 })), confianza: 0.77, intervalo_confianza: { inferior: evol.map(p=>({ ...p, y: (p.y as number)*0.96 })), superior: evol.map(p=>({ ...p, y: (p.y as number)*1.1 })) } },
          escenarios: [
            { nombre: 'conservador', descripcion: 'Crecimiento leve', probabilidad: 0.4, valores_proyectados: trend.map(p=>({ ...p, y: (p.y as number)*1.03 })), factores_clave: ['estacionalidad'] },
            { nombre: 'optimista', descripcion: 'Campañas exitosas', probabilidad: 0.35, valores_proyectados: trend.map(p=>({ ...p, y: (p.y as number)*1.15 })), factores_clave: ['segmentación','promos'] }
          ]
        },
        ciclos_vida: [
          { fase: 'lanzamiento', duracion_promedio: 15, caracteristicas: ['alto interés inicial'], metricas_tipicas: {}, recomendaciones: ['reforzar awareness'] },
          { fase: 'madurez', duracion_promedio: 45, caracteristicas: ['rendimiento estable'], metricas_tipicas: {}, recomendaciones: ['optimizaciones menores'] }
        ]
      },
      comparativa: {
        comparacion_tipos: [
          { tipo: 'descuento', tipo_nombre: 'Descuentos', metricas: { aplicaciones: 2100, conversion_rate: 15.2, valor_beneficios: 43000, costo_implementacion: 9000, roi: 378 }, ranking: 1, fortalezas: ['rápida adopción'], debilidades: ['sensibilidad a margen'] },
          { tipo: 'puntos', tipo_nombre: 'Puntos', metricas: { aplicaciones: 1600, conversion_rate: 12.1, valor_beneficios: 24000, costo_implementacion: 6000, roi: 300 }, ranking: 2, fortalezas: ['fidelización'], debilidades: ['resultado más lento'] }
        ],
        comparacion_segmentos: [
          { segmento: 'Nuevos', metricas: { clientes: 520, aplicaciones: 980, conversion_rate: 9.2, valor_promedio_beneficio: 25, frecuencia_uso: 1.3 }, ranking: 3, caracteristicas: ['sensible a descuentos'] },
          { segmento: 'VIP', metricas: { clientes: 120, aplicaciones: 480, conversion_rate: 19.1, valor_promedio_beneficio: 68, frecuencia_uso: 2.1 }, ranking: 1, caracteristicas: ['alto ticket'] }
        ],
        comparacion_productos: [
          { producto: 'Laptop A', categoria: 'Electrónica', metricas: { veces_recompensado: 120, valor_total_recompensado: 22000, conversion_rate: 13.4, popularidad: 78 }, ranking: 1, tendencia: 'creciente' },
          { producto: 'Silla Gamer', categoria: 'Hogar', metricas: { veces_recompensado: 80, valor_total_recompensado: 9600, conversion_rate: 10.2, popularidad: 66 }, ranking: 2, tendencia: 'estable' }
        ],
        benchmarking: {
          metricas_industria: { conversion_rate_promedio: 11.2, valor_beneficio_promedio: 38, frecuencia_uso_promedio: 1.6 },
          posicion_actual: { conversion_rate: 12.7, valor_beneficio: 42.5, frecuencia_uso: 1.8 },
          gaps: [ { metrica: 'conversion_rate', gap_actual: 1.5, gap_objetivo: 2.3, accion_requerida: 'Optimizar mensajes' } ]
        }
      },
      segmentos: {
        analisis_segmentos: [
          { segmento: 'Nuevos', caracteristicas: ['precio'], metricas: { total_clientes: 800, clientes_activos: 520, aplicaciones: 980, conversion_rate: 9.2, valor_beneficios: 20000, frecuencia_uso: 1.3 }, comportamiento: { patrones_compra: ['fin de semana'], preferencias_recompensas: ['descuento'], horarios_actividad: ['19-22h'], canales_preferidos: ['web'] }, potencial: { crecimiento_estimado: 0.12, oportunidades_expansion: ['email onboarding'], riesgos: ['deserción'] } },
          { segmento: 'VIP', caracteristicas: ['alta lealtad'], metricas: { total_clientes: 150, clientes_activos: 120, aplicaciones: 480, conversion_rate: 19.1, valor_beneficios: 32000, frecuencia_uso: 2.1 }, comportamiento: { patrones_compra: ['tickets altos'], preferencias_recompensas: ['puntos','regalos'], horarios_actividad: ['18-21h'], canales_preferidos: ['app'] }, potencial: { crecimiento_estimado: 0.08, oportunidades_expansion: ['club VIP'], riesgos: ['canibalización de margen'] } }
        ],
        segmentacion_efectiva: { segmentos_mas_efectivos: ['VIP','Recurrentes'], segmentos_menos_efectivos: ['Nuevos'], factores_diferenciacion: ['ticket','frecuencia'], recomendaciones_optimizacion: ['incentivos escalonados'] },
        oportunidades_segmentacion: [ { oportunidad: 'Bundle gaming', descripcion: 'Armar combos con envío gratis', segmento_objetivo: 'Recurrentes', potencial_impacto: 0.6, facilidad_implementacion: 'media', accion_sugerida: 'Crear campaña bundle' } ]
      },
      productos: {
        analisis_productos: [ { producto: 'Laptop A', categoria: 'Electrónica', metricas: { veces_recompensado: 120, valor_total_recompensado: 22000, conversion_rate: 13.4, popularidad: 78, rentabilidad: 0.22 }, comportamiento: { estacionalidad: ['back to school'], tendencias: ['alto interés'], correlaciones: ['accesorios'] }, potencial: { crecimiento_estimado: 0.15, oportunidades_expansion: ['packs'], limitaciones: ['stock'] } } ],
        categorias_mas_efectivas: [ { categoria: 'Electrónica', efectividad: 81, metricas: { productos_incluidos: 35, aplicaciones: 1600, conversion_rate: 13.2, valor_beneficios: 42000 }, fortalezas: ['ticket'], areas_mejora: ['logística'] } ],
        oportunidades_productos: [ { oportunidad: 'Accesorios 2x1', descripcion: 'Impulsar ventas cruzadas', productos_afectados: ['Mouse','Teclados'], potencial_impacto: 0.5, facilidad_implementacion: 'alta', accion_sugerida: 'Crear cupones 2x1' } ]
      }
    };

    return fake;
  }

  private getEmptyAnalytics(): RecompensaAnalytics {
    return {
      dashboard: {
        resumen_general: {
          total_recompensas_activas: 0,
          total_recompensas_este_mes: 0,
          total_clientes_beneficiados: 0,
          valor_total_beneficios: 0,
          conversion_rate_promedio: 0,
          crecimiento_mensual: 0
        },
        metricas_principales: {
          recompensas_por_tipo: [],
          top_recompensas: [],
          clientes_mas_activos: [],
          productos_mas_recompensados: [],
          zonas_mas_activas: []
        },
        graficos_principales: {
          evolucion_temporal: [],
          distribucion_por_tipo: [],
          conversion_por_segmento: [],
          tendencia_valores: []
        },
        alertas: [],
        recomendaciones: []
      },
      rendimiento: {
        metricas_rendimiento: {
          conversion_rate: 0,
          valor_promedio_beneficio: 0,
          tiempo_promedio_aplicacion: 0,
          tasa_abandono: 0,
          retorno_inversion: 0,
          costo_por_adquisicion: 0
        },
        analisis_efectividad: {
          recompensas_mas_efectivas: [],
          recompensas_menos_efectivas: [],
          factores_exito: [],
          areas_mejora: []
        },
        comparacion_periodos: {
          periodo_actual: {
            fecha_inicio: '',
            fecha_fin: '',
            total_recompensas: 0,
            total_aplicaciones: 0,
            conversion_rate: 0,
            valor_beneficios: 0
          },
          periodo_anterior: {
            fecha_inicio: '',
            fecha_fin: '',
            total_recompensas: 0,
            total_aplicaciones: 0,
            conversion_rate: 0,
            valor_beneficios: 0
          },
          cambios: []
        },
        insights: []
      },
      tendencias: {
        tendencias_temporales: [],
        patrones_estacionales: [],
        proyecciones: {
          proyeccion_conversion: {
            metrica: '',
            valores_historicos: [],
            valores_proyectados: [],
            confianza: 0,
            intervalo_confianza: { inferior: [], superior: [] }
          },
          proyeccion_valores: {
            metrica: '',
            valores_historicos: [],
            valores_proyectados: [],
            confianza: 0,
            intervalo_confianza: { inferior: [], superior: [] }
          },
          proyeccion_clientes: {
            metrica: '',
            valores_historicos: [],
            valores_proyectados: [],
            confianza: 0,
            intervalo_confianza: { inferior: [], superior: [] }
          },
          escenarios: []
        },
        ciclos_vida: []
      },
      comparativa: {
        comparacion_tipos: [],
        comparacion_segmentos: [],
        comparacion_productos: [],
        benchmarking: {
          metricas_industria: {
            conversion_rate_promedio: 0,
            valor_beneficio_promedio: 0,
            frecuencia_uso_promedio: 0
          },
          posicion_actual: {
            conversion_rate: 0,
            valor_beneficio: 0,
            frecuencia_uso: 0
          },
          gaps: []
        }
      },
      segmentos: {
        analisis_segmentos: [],
        segmentacion_efectiva: {
          segmentos_mas_efectivos: [],
          segmentos_menos_efectivos: [],
          factores_diferenciacion: [],
          recomendaciones_optimizacion: []
        },
        oportunidades_segmentacion: []
      },
      productos: {
        analisis_productos: [],
        categorias_mas_efectivas: [],
        oportunidades_productos: []
      }
    };
  }

  // Métodos faltantes para el template
  cambiarTab(tab: string): void {
    this.activeTab = tab;
    console.log('Cambiando a tab:', tab);
    
    // Recrear gráficos cuando se cambie de tab para asegurar que se muestren correctamente
    setTimeout(() => {
      this.crearGraficos();
    }, 100);
  }

  cambiarPeriodo(periodo: string): void {
    console.log('Cambiando período a:', periodo);
    this.periodoSeleccionado = periodo;
    
    // Actualizar filtros según el período seleccionado
    const fechaFin = new Date();
    const fechaInicio = new Date();
    
    switch (periodo) {
      case '7_dias':
        fechaInicio.setDate(fechaFin.getDate() - 7);
        break;
      case '30_dias':
        fechaInicio.setDate(fechaFin.getDate() - 30);
        break;
      case '90_dias':
        fechaInicio.setDate(fechaFin.getDate() - 90);
        break;
      case 'este_mes':
        fechaInicio.setDate(1);
        break;
      case 'mes_anterior':
        fechaInicio.setMonth(fechaFin.getMonth() - 1, 1);
        fechaFin.setDate(0);
        break;
      case 'este_ano':
        fechaInicio.setMonth(0, 1);
        break;
    }
    
    this.filtros.fecha_desde = fechaInicio.toISOString().split('T')[0];
    this.filtros.fecha_hasta = fechaFin.toISOString().split('T')[0];
    
    // Recargar datos con el nuevo período
    this.loadAnalytics();
  }

  exportarReporte(): void {
    console.log('Exportando reporte...');
    // Implementar lógica de exportación
  }

  actualizarDatos(): void {
    console.log('Actualizando datos...');
    this.loadAnalytics();
  }

  cambiarAnalisisSubTab(subTab: string): void {
    this.analisisSubTab = subTab;
    console.log('Cambiando a sub-tab de análisis:', subTab);
  }

  cambiarReportesSubTab(subTab: string): void {
    this.reportesSubTab = subTab;
    console.log('Cambiando a sub-tab de reportes:', subTab);
  }
}