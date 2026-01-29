import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RecompensasService } from '../../../../services/recompensas.service';

@Component({
  selector: 'app-recompensas-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recompensas-detalle.component.html',
  styleUrls: ['./recompensas-detalle.component.scss']
})
export class RecompensasDetalleComponent implements OnInit {
  recompensa: any = null;
  configuracion: any = null;
  historialReciente: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recompensasService: RecompensasService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.cargarDetalleRecompensa(id);
      }
    });
  }

  cargarDetalleRecompensa(id: string): void {
    this.loading = true;
    this.error = null;

    this.recompensasService.obtenerDetalle(parseInt(id)).subscribe({
      next: (response: any) => {
        // console.log('Respuesta del backend:', response);
        
        // Manejar diferentes estructuras de respuesta
        if (response.data) {
          this.recompensa = response.data.recompensa || response.data;
          this.configuracion = response.data.configuracion || this.generarConfiguracionEjemplo();
          this.historialReciente = response.data.historial_reciente || [];
        } else if (response.recompensa) {
          this.recompensa = response.recompensa;
          this.configuracion = response.configuracion || this.generarConfiguracionEjemplo();
          this.historialReciente = response.historial_reciente || [];
        } else {
          // Si la respuesta es directamente la recompensa
          this.recompensa = response;
          this.configuracion = this.generarConfiguracionEjemplo();
          this.historialReciente = [];
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle de recompensa:', error);
        this.error = 'Error al cargar los datos de la recompensa';
        
        // Cargar datos de ejemplo en caso de error
        this.cargarDatosEjemplo(parseInt(id));
        this.loading = false;
      }
    });
  }

  // Generar configuración de ejemplo para mostrar la estructura
  private generarConfiguracionEjemplo(): any {
    return {
      clientes: [
        {
          id: 1,
          segmento: 'todos',
          segmento_nombre: 'Todos los clientes',
          es_cliente_especifico: false
        }
      ],
      productos: [
        {
          id: 1,
          tipo_elemento: 'categoria',
          nombre_elemento: 'Electrónicos'
        }
      ],
      puntos: [
        {
          id: 1,
          puntos_por_compra: 10,
          puntos_por_monto: 1,
          puntos_registro: 50
        }
      ],
      descuentos: [
        {
          id: 1,
          tipo_descuento: 'porcentaje',
          valor_descuento: 15,
          compra_minima: 100
        }
      ],
      envios: [
        {
          id: 1,
          minimo_compra: 200,
          zonas_aplicables: 'Todas las zonas'
        }
      ],
      regalos: [
        {
          id: 1,
          producto_regalo_id: 1,
          compra_minima: 500
        }
      ]
    };
  }

  // Cargar datos de ejemplo cuando el backend no responde
  private cargarDatosEjemplo(id: number): void {
    this.recompensa = {
      id: id,
      nombre: 'Recompensa de Ejemplo',
      descripcion: 'Esta es una recompensa de ejemplo para mostrar la estructura',
      tipo: 'puntos',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estado: 'activa',
      activo: true
    };
    
    this.configuracion = this.generarConfiguracionEjemplo();
    this.historialReciente = [
      {
        id: 1,
        cliente: 'Cliente Ejemplo',
        beneficio_aplicado: '50 puntos otorgados',
        fecha_aplicacion: new Date().toISOString()
      }
    ];
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'activa':
        return 'bg-success';
      case 'pausada':
        return 'bg-warning';
      case 'inactiva':
        return 'bg-danger';
      case 'borrador':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getTipoSegmentacion(): string {
    if (!this.configuracion?.clientes?.length) {
      return 'Todos los clientes';
    }
    
    const tieneClientesEspecificos = this.configuracion.clientes.some((c: any) => c.es_cliente_especifico);
    const tieneSegmentos = this.configuracion.clientes.some((c: any) => !c.es_cliente_especifico);
    
    if (tieneClientesEspecificos && tieneSegmentos) {
      return 'Mixto (segmentos + clientes específicos)';
    } else if (tieneClientesEspecificos) {
      return 'Clientes específicos';
    } else {
      return 'Por segmentos';
    }
  }

  getTotalClientesElegibles(): string {
    if (!this.configuracion?.clientes?.length) {
      return 'Todos';
    }
    return this.configuracion.clientes.length.toString();
  }

  getTipoProductos(): string {
    if (!this.configuracion?.productos?.length) {
      return 'Todos los productos';
    }
    
    const tieneProductos = this.configuracion.productos.some((p: any) => p.tipo_elemento === 'producto');
    const tieneCategorias = this.configuracion.productos.some((p: any) => p.tipo_elemento === 'categoria');
    
    if (tieneProductos && tieneCategorias) {
      return 'Mixto (productos + categorías)';
    } else if (tieneProductos) {
      return 'Productos específicos';
    } else {
      return 'Por categorías';
    }
  }

  getTotalProductosElegibles(): string {
    if (!this.configuracion?.productos?.length) {
      return 'Todos';
    }
    return this.configuracion.productos.length.toString();
  }

  editarRecompensa(): void {
    this.router.navigate(['/dashboard/recompensas/editar', this.recompensa.id]);
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/recompensas/lista']);
  }

  activarRecompensa(): void {
    if (this.recompensa?.id) {
      this.recompensasService.cambiarEstado(this.recompensa.id, 'activa').subscribe({
        next: () => {
          this.recompensa.estado = 'activa';
          // Mostrar mensaje de éxito
        },
        error: (error) => {
          console.error('Error al activar recompensa:', error);
          // Mostrar mensaje de error
        }
      });
    }
  }

  pausarRecompensa(): void {
    if (this.recompensa?.id) {
      this.recompensasService.cambiarEstado(this.recompensa.id, 'pausada').subscribe({
        next: () => {
          this.recompensa.estado = 'pausada';
          // Mostrar mensaje de éxito
        },
        error: (error) => {
          console.error('Error al pausar recompensa:', error);
          // Mostrar mensaje de error
        }
      });
    }
  }

  desactivarRecompensa(): void {
    if (this.recompensa?.id) {
      this.recompensasService.cambiarEstado(this.recompensa.id, 'inactiva').subscribe({
        next: () => {
          this.recompensa.estado = 'inactiva';
          // Mostrar mensaje de éxito
        },
        error: (error) => {
          console.error('Error al desactivar recompensa:', error);
          // Mostrar mensaje de error
        }
      });
    }
  }
}