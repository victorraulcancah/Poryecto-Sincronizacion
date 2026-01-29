import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlujoCajaService } from '../../../../services/contabilidad/flujo-caja.service';
import { ProyeccionModalComponent } from '../../../../components/contabilidad/modals/proyeccion-modal.component';
import { Proyeccion, Comparativa, AlertasResponse } from '../../../../models/contabilidad/flujo-caja.model';

@Component({
  selector: 'app-flujo-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, ProyeccionModalComponent],
  templateUrl: './flujo-caja.component.html',
  styleUrls: ['./flujo-caja.component.scss']
})
export class FlujoCajaComponent implements OnInit {
  proyecciones: Proyeccion[] = [];
  comparativa: Comparativa | null = null;
  alertas: AlertasResponse | null = null;
  loading = false;
  Math = Math; // Para usar en el template
  
  filtros = {
    fecha_inicio: '',
    fecha_fin: '',
    tipo: '' as 'INGRESO' | 'EGRESO' | ''
  };

  vistaActual: 'proyecciones' | 'comparativa' | 'alertas' = 'proyecciones';
  showModal = false;
  proyeccionSeleccionada: Proyeccion | null = null;

  constructor(private flujoCajaService: FlujoCajaService) {}

  ngOnInit() {
    this.cargarProyecciones();
  }

  cargarProyecciones() {
    this.loading = true;
    const filtrosLimpios: any = {
      fecha_inicio: this.filtros.fecha_inicio || undefined,
      fecha_fin: this.filtros.fecha_fin || undefined
    };
    
    if (this.filtros.tipo) {
      filtrosLimpios.tipo = this.filtros.tipo;
    }
    
    this.flujoCajaService.listar(filtrosLimpios).subscribe({
      next: (data) => {
        this.proyecciones = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar proyecciones:', error);
        this.loading = false;
      }
    });
  }

  cargarComparativa() {
    this.loading = true;
    this.flujoCajaService.comparativa(this.filtros.fecha_inicio, this.filtros.fecha_fin).subscribe({
      next: (data: any) => {
        this.comparativa = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar comparativa:', error);
        this.loading = false;
      }
    });
  }

  cargarAlertas() {
    this.loading = true;
    this.flujoCajaService.alertas(this.filtros.fecha_inicio, this.filtros.fecha_fin).subscribe({
      next: (data: any) => {
        this.alertas = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar alertas:', error);
        this.loading = false;
      }
    });
  }

  cambiarVista(vista: 'proyecciones' | 'comparativa' | 'alertas') {
    this.vistaActual = vista;
    if (vista === 'comparativa') {
      this.cargarComparativa();
    } else if (vista === 'alertas') {
      this.cargarAlertas();
    }
  }

  aplicarFiltros() {
    const filtrosLimpios: any = {
      fecha_inicio: this.filtros.fecha_inicio,
      fecha_fin: this.filtros.fecha_fin
    };
    
    if (this.filtros.tipo) {
      filtrosLimpios.tipo = this.filtros.tipo;
    }
    
    if (this.vistaActual === 'proyecciones') {
      this.cargarProyecciones();
    } else if (this.vistaActual === 'comparativa') {
      this.cargarComparativa();
    } else {
      this.cargarAlertas();
    }
  }

  limpiarFiltros() {
    this.filtros = { fecha_inicio: '', fecha_fin: '', tipo: '' as 'INGRESO' | 'EGRESO' | '' };
    this.aplicarFiltros();
  }

  abrirModal(proyeccion?: Proyeccion) {
    this.proyeccionSeleccionada = proyeccion || null;
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.proyeccionSeleccionada = null;
  }

  guardarProyeccion(data: any) {
    if (this.proyeccionSeleccionada) {
      this.flujoCajaService.actualizar(this.proyeccionSeleccionada.id, data).subscribe({
        next: () => {
          this.cargarProyecciones();
          this.cerrarModal();
        },
        error: (error) => console.error('Error al actualizar:', error)
      });
    } else {
      this.flujoCajaService.crear(data).subscribe({
        next: () => {
          this.cargarProyecciones();
          this.cerrarModal();
        },
        error: (error) => console.error('Error al crear:', error)
      });
    }
  }

  eliminarProyeccion(id: number) {
    if (confirm('¿Está seguro de eliminar esta proyección?')) {
      this.flujoCajaService.eliminar(id).subscribe({
        next: () => this.cargarProyecciones(),
        error: (error) => console.error('Error al eliminar:', error)
      });
    }
  }

  registrarReal(proyeccion: Proyeccion) {
    const monto = prompt('Ingrese el monto real:');
    if (monto) {
      this.flujoCajaService.registrarReal(proyeccion.id, {
        monto_real: parseFloat(monto),
        observaciones: ''
      }).subscribe({
        next: () => this.cargarProyecciones(),
        error: (error) => console.error('Error al registrar monto real:', error)
      });
    }
  }

  getEstadoClass(estado: string): string {
    const classes: any = {
      'PROYECTADO': 'badge-warning',
      'REALIZADO': 'badge-success'
    };
    return classes[estado] || 'badge-secondary';
  }

  getTipoClass(tipo: string): string {
    return tipo === 'INGRESO' ? 'text-success' : 'text-danger';
  }
}
