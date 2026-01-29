import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query
} from '@angular/animations';

import { ProductosService, EstadisticasProductos, ProductoStockCritico } from '../../services/productos.service';
import { EstadisticasGenerales } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { DashboardService, ProductoDelMes, CategoriaVendida, PedidosPorDia, VentasMensuales } from '../../services/dashboard.service';


interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  totalProducts: number;
  totalReports: number;
}

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  customer: string;
  price: number;
  seller: string;
  date: Date;
  status: 'Pendiente' | 'Nuevo' | 'Sin stock' | 'Delivery';
  isPaid: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('slideInUp', [
      transition(':enter', [
        style({ transform: 'translateY(30px)', opacity: 0 }),
        animate('0.5s ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.6s ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  trackByOrderId(index: number, item: any): any {
      return item.orderId; // o la propiedad única que identifique cada item
    }

    stats: DashboardStats = {
    totalOrders: 1250,
    totalCustomers: 890,
    totalRevenue: 45300,
    totalProducts: 0, // Ahora vendrá del backend
    totalReports: 25
  };

  // Stock crítico - ahora vendrá del backend
  criticalStock: ProductoStockCritico[] = [];
  

  recentOrders: OrderItem[] = [
    {
      id: 'ORD-001',
      productName: 'iPhone 15 Pro Max',
      productImage: '/api/placeholder/60/60',
      customer: 'Juan Pérez',
      price: 1299,
      seller: 'TechStore',
      date: new Date('2024-01-15'),
      status: 'Delivery',
      isPaid: true
    },
    {
      id: 'ORD-002',
      productName: 'Samsung Galaxy S24',
      productImage: '/api/placeholder/60/60',
      customer: 'María González',
      price: 899,
      seller: 'MobileWorld',
      date: new Date('2024-01-14'),
      status: 'Pendiente',
      isPaid: false
    },
    {
      id: 'ORD-003',
      productName: 'MacBook Air M3',
      productImage: '/api/placeholder/60/60',
      customer: 'Carlos Rivera',
      price: 1199,
      seller: 'AppleStore',
      date: new Date('2024-01-13'),
      status: 'Nuevo',
      isPaid: true
    },
    {
      id: 'ORD-004',
      productName: 'AirPods Pro 2',
      productImage: '/api/placeholder/60/60',
      customer: 'Ana Martínez',
      price: 249,
      seller: 'AudioTech',
      date: new Date('2024-01-12'),
      status: 'Sin stock',
      isPaid: false
    },
    {
      id: 'ORD-005',
      productName: 'iPad Pro 12.9"',
      productImage: '/api/placeholder/60/60',
      customer: 'Luis Rodríguez',
      price: 1099,
      seller: 'TabletZone',
      date: new Date('2024-01-11'),
      status: 'Delivery',
      isPaid: true
    },
    {
      id: 'ORD-006',
      productName: 'PlayStation 5',
      productImage: '/api/placeholder/60/60',
      customer: 'Sofia López',
      price: 499,
      seller: 'GameStore',
      date: new Date('2024-01-10'),
      status: 'Nuevo',
      isPaid: true
    }
  ];

  
// ✅ NUEVO: Producto más vendido del mes (dinámico)
topProduct: ProductoDelMes | null = null;
isLoadingTopProduct = false;

// ✅ NUEVO: Datos para gráfico de categorías (dinámico)
categoryData: CategoriaVendida[] = [];
isLoadingCategoryData = false;

// Contador animado de ganancias
monthlyEarnings = 0;
targetEarnings = 23450;

// Datos para gráfico de barras (pedidos por día)
weeklyOrders = [
  { day: 'Lun', orders: 45 },
  { day: 'Mar', orders: 62 },
  { day: 'Mié', orders: 38 },
  { day: 'Jue', orders: 71 },
  { day: 'Vie', orders: 55 },
  { day: 'Sáb', orders: 29 },
  { day: 'Dom', orders: 18 }
];

// Datos para gráfico de ventas mensuales
salesData = [
  { month: 'Ene', sales: 4500 },
  { month: 'Feb', sales: 5200 },
  { month: 'Mar', sales: 4800 },
  { month: 'Abr', sales: 6100 },
  { month: 'May', sales: 5900 },
  { month: 'Jun', sales: 7200 }
];

// Eventos del calendario
calendarEvents = [
  { day: 15, event: 'Promoción Black Friday' },
  { day: 22, event: 'Restock productos' },
  { day: 28, event: 'Reunión proveedores' }
];

  // Propiedades para manejo de errores
  showAccessDenied = false;

  constructor(
    private productosService: ProductosService,
    private clienteService: ClienteService,
    private dashboardService: DashboardService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Verificar si hay error de acceso denegado
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'access_denied') {
        this.showAccessDenied = true;
        // Limpiar el parámetro de la URL después de 5 segundos
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
          this.showAccessDenied = false;
        }, 5000);
      }
    });

    
    // ✅ CARGAR TODAS LAS ESTADÍSTICAS DE FORMA UNIFICADA
    this.cargarEstadisticasDashboard();
    this.cargarProductosStockCritico();
    
    // ✅ CARGAR DATOS DINÁMICOS ADICIONALES
    this.cargarProductoDelMes();
    this.cargarCategoriasVendidas();
    
    // Iniciar animación de ganancias después de cargar datos
    setTimeout(() => this.animateEarnings(), 500);
  }

  getStatusClass(status: string): string {
    const statusClasses: {[key: string]: string} = {
      'Pendiente': 'bg-warning',
      'Nuevo': 'bg-primary',
      'Sin stock': 'bg-danger',
      'Delivery': 'bg-success'
    };
    return statusClasses[status] || 'bg-secondary';
  }



  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  
// AGREGAR estas nuevas funciones después de formatDate()

animateEarnings(): void {
  const duration = 2000; // 2 segundos
  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    this.monthlyEarnings = Math.floor(this.targetEarnings * progress);
    
    if (progress < 1) {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(animate);
      } else {
        // Puedes utilizar setTimeout como alternativa
        setTimeout(animate, 16); // 16ms es aproximadamente el tiempo entre frames para 60fps
      }
    }
  };
  animate();
}

getMaxOrders(): number {
  return Math.max(...this.weeklyOrders.map(d => d.orders));
}

getMaxSales(): number {
  return Math.max(...this.salesData.map(d => d.sales));
}

private cargarEstadisticasProductos(): void {
    this.productosService.obtenerEstadisticasProductos().subscribe({
      next: (estadisticas: EstadisticasProductos) => {
        this.stats.totalProducts = estadisticas.total_productos;
      },
      error: (error) => {
        console.error('Error al cargar estadísticas de productos:', error);
      }
    });
  }

  private cargarProductosStockCritico(): void {
    this.productosService.obtenerProductosStockCritico().subscribe({
      next: (productos: ProductoStockCritico[]) => {
        this.criticalStock = productos;
      },
      error: (error) => {
        console.error('Error al cargar productos con stock crítico:', error);
      }
    });
  }

  
  // ✅ NUEVO: Cargar estadísticas unificadas del dashboard
  private cargarEstadisticasDashboard(): void {
    this.dashboardService.obtenerEstadisticasDashboard().subscribe({
      next: (estadisticas) => {
        this.stats.totalOrders = estadisticas.total_pedidos;
        this.stats.totalCustomers = estadisticas.total_clientes;
        this.stats.totalRevenue = estadisticas.total_ingresos;
        this.stats.totalProducts = estadisticas.total_productos;
        this.targetEarnings = estadisticas.ganancias_mes_actual;
        
        // Si viene el producto del mes en las estadísticas generales, usarlo
        if (estadisticas.producto_del_mes) {
          this.topProduct = estadisticas.producto_del_mes;
          this.isLoadingTopProduct = false;
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas del dashboard:', error);
        // Mantener valores por defecto en caso de error
        this.cargarEstadisticasProductos();
        this.cargarEstadisticasClientes();
      }
    });
  }

  // ✅ MANTENER COMO FALLBACK
  private cargarEstadisticasClientes(): void {
    this.clienteService.getEstadisticas().subscribe({
      next: (response) => {
        this.stats.totalCustomers = response.data.total_clientes;
      },
      error: (error) => {
        console.error('Error al cargar estadísticas de clientes:', error);
        this.stats.totalCustomers = 890;
      }
    });
  }

  // ✅ NUEVO: Cargar producto del mes dinámicamente
  private cargarProductoDelMes(): void {
    this.isLoadingTopProduct = true;
    
    this.dashboardService.obtenerProductoDelMes().subscribe({
      next: (producto) => {
        this.topProduct = producto;
        this.isLoadingTopProduct = false;
      },
      error: (error) => {
        console.error('Error al cargar producto del mes:', error);
        this.isLoadingTopProduct = false;
        
        // ✅ Fallback: mantener datos estáticos si no hay endpoint
        this.topProduct = {
          id: 0,
          nombre: 'iPhone 15 Pro Max',
          imagen_principal: '/api/placeholder/120/120',
          ventas_cantidad: 156,
          ventas_total: 202644,
          crecimiento_porcentaje: 23.5,
          periodo: {
            mes: new Date().getMonth() + 1,
            anio: new Date().getFullYear(),
            nombre_mes: this.dashboardService.obtenerNombreMes(new Date().getMonth() + 1)
          }
        };
      }
    });
  }

  // ✅ NUEVO: Cargar categorías más vendidas dinámicamente
  private cargarCategoriasVendidas(): void {
    this.isLoadingCategoryData = true;
    
    this.dashboardService.obtenerCategoriasVendidas(4).subscribe({
      next: (categorias) => {
        this.categoryData = categorias;
        this.isLoadingCategoryData = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías vendidas:', error);
        this.isLoadingCategoryData = false;
        
        // ✅ Fallback: mantener datos estáticos si no hay endpoint
        this.categoryData = [
          { id: 1, nombre: 'Electrónicos', porcentaje: 45, color: '#007bff', ventas_total: 45000 },
          { id: 2, nombre: 'Moda', porcentaje: 30, color: '#28a745', ventas_total: 30000 },
          { id: 3, nombre: 'Hogar', porcentaje: 15, color: '#ffc107', ventas_total: 15000 },
          { id: 4, nombre: 'Otros', porcentaje: 10, color: '#dc3545', ventas_total: 10000 }
        ];
      }
    });
  }

  // ✅ MÉTODO AUXILIAR PARA FORMATEAR MONEDA (ACTUALIZADO)
  formatCurrency(amount: number): string {
    return this.dashboardService.formatearMoneda(amount);
  }

  // ✅ NUEVO: Manejar errores de imagen
  onImageError(event: any): void {
    event.target.src = '/placeholder.svg?height=120&width=120&text=Imagen+no+disponible';
  }

}
