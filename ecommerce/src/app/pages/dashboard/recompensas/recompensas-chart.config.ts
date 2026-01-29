

export const CHART_COLORS = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  purple: '#6f42c1',
  light: '#f8f9fa',
  dark: '#343a40'
};

export const CHART_GRADIENTS = {
  primary: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
  success: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
  warning: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
  danger: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
  info: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
  purple: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)'
};

// ===== CONFIGURACIÓN BASE DE OPCIONES =====

export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#fff',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      intersect: false,
      mode: 'index',
      font: {
        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        size: 11
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        },
        color: '#6c757d'
      }
    },
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        },
        color: '#6c757d'
      }
    }
  },
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6
    },
    line: {
      tension: 0.4
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
};

// ===== CONFIGURACIONES ESPECÍFICAS POR TIPO DE GRÁFICO =====

// Gráfico de líneas
export const LINE_CHART_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    legend: {
      ...BASE_CHART_OPTIONS.plugins?.legend,
      position: 'top'
    }
  },
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      ...BASE_CHART_OPTIONS.scales?.y,
      beginAtZero: true
    }
  }
};

// Gráfico de barras
export const BAR_CHART_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    legend: {
      ...BASE_CHART_OPTIONS.plugins?.legend,
      position: 'top'
    }
  },
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      ...BASE_CHART_OPTIONS.scales?.y,
      beginAtZero: true
    }
  }
};

// Gráfico circular (doughnut)
export const DOUGHNUT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#fff',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      font: {
        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        size: 11
      }
    }
  },
  cutout: '60%',
  elements: {
    arc: {
      borderWidth: 2,
      borderColor: '#fff'
    }
  }
};

// Gráfico de área
export const AREA_CHART_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    legend: {
      ...BASE_CHART_OPTIONS.plugins?.legend,
      position: 'top'
    }
  },
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      ...BASE_CHART_OPTIONS.scales?.y,
      beginAtZero: true
    }
  }
};

// ===== DATASETS PREDEFINIDOS =====

export const createLineDataset = (label: string, data: number[], color: string = CHART_COLORS.primary) => ({
  label,
  data,
  borderColor: color,
  backgroundColor: color + '20', // 20% opacity
  tension: 0.4,
  fill: true,
  pointBackgroundColor: color,
  pointBorderColor: '#fff',
  pointBorderWidth: 2,
  pointRadius: 4,
  pointHoverRadius: 6
});

export const createBarDataset = (label: string, data: number[], color: string = CHART_COLORS.primary) => ({
  label,
  data,
  backgroundColor: color + '80', // 80% opacity
  borderColor: color,
  borderWidth: 1,
  borderRadius: 4,
  borderSkipped: false
});

export const createDoughnutDataset = (data: number[], colors: string[] = Object.values(CHART_COLORS)) => ({
  data,
  backgroundColor: colors,
  borderColor: '#fff',
  borderWidth: 2,
  hoverBorderWidth: 3
});

// ===== CONFIGURACIONES ESPECÍFICAS PARA RECOMPENSAS =====

// Gráfico de evolución temporal
export const EVOLUCION_TEMPORAL_CONFIG = {
  type: 'line',
  data: {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      createLineDataset('Aplicaciones', [120, 150, 180, 200, 220, 250], CHART_COLORS.primary),
      createLineDataset('Conversiones', [80, 100, 120, 140, 160, 180], CHART_COLORS.success)
    ]
  },
  options: LINE_CHART_OPTIONS
};

// Gráfico de distribución por tipo
export const DISTRIBUCION_TIPO_CONFIG = {
  type: 'doughnut',
  data: {
    labels: ['Puntos', 'Descuentos', 'Envío Gratis', 'Regalos'],
    datasets: [
      createDoughnutDataset([35, 25, 20, 20], [CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.info, CHART_COLORS.purple])
    ]
  },
  options: DOUGHNUT_CHART_OPTIONS
};

// Gráfico de conversión por segmento
export const CONVERSION_SEGMENTO_CONFIG = {
  type: 'bar',
  data: {
    labels: ['Nuevos', 'Regulares', 'VIP', 'Premium'],
    datasets: [
      createBarDataset('Tasa de Conversión (%)', [15, 25, 35, 45], CHART_COLORS.primary)
    ]
  },
  options: BAR_CHART_OPTIONS
};

// Gráfico de tendencia de valores
export const TENDENCIA_VALORES_CONFIG = {
  type: 'line',
  data: {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      createLineDataset('Valor Total (S/)', [15000, 18000, 22000, 25000, 28000, 32000], CHART_COLORS.danger),
      createLineDataset('ROI (%)', [120, 135, 150, 165, 180, 200], CHART_COLORS.warning)
    ]
  },
  options: {
    ...LINE_CHART_OPTIONS,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            size: 11
          },
          color: '#6c757d'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            size: 11
          },
          color: '#6c757d'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            size: 11
          },
          color: '#6c757d'
        }
      }
    }
  }
};

// ===== UTILIDADES PARA CREAR GRÁFICOS DINÁMICOS =====

export const createChartConfig = (
  type: 'line' | 'bar' | 'doughnut' | 'pie',
  labels: string[],
  datasets: any[],
  options?: any
) => {
  const baseOptions = type === 'doughnut' || type === 'pie' ? DOUGHNUT_CHART_OPTIONS : BASE_CHART_OPTIONS;
  
  return {
    type,
    data: {
      labels,
      datasets
    },
    options: options || baseOptions
  };
};

export const updateChartData = (chart: any, newData: any) => {
  if (chart) {
    chart.data = newData;
    chart.update();
  }
};

export const formatChartValue = (value: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('es-PE').format(value);
  }
};

// ===== CONFIGURACIÓN DE ANIMACIONES =====

export const CHART_ANIMATIONS = {
  duration: 1000,
  easing: 'easeInOutQuart' as const,
  delay: (context: any) => context.dataIndex * 100
};

export const ANIMATED_CHART_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  animation: {
    duration: CHART_ANIMATIONS.duration,
    easing: CHART_ANIMATIONS.easing,
    delay: CHART_ANIMATIONS.delay
  }
};

// ===== CONFIGURACIÓN DE RESPONSIVE =====

export const RESPONSIVE_CHART_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    legend: {
      ...BASE_CHART_OPTIONS.plugins?.legend,
      labels: {
        ...BASE_CHART_OPTIONS.plugins?.legend?.labels,
        boxWidth: 12,
        padding: 10
      }
    }
  }
};
