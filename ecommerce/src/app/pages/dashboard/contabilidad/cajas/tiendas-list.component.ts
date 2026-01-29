import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiendasService } from '../../../../services/tiendas.service';
import { TiendaFormModalComponent } from '../../../../components/tienda-form-modal/tienda-form-modal.component';
import { Tienda, CrearTiendaDto, ActualizarTiendaDto } from '../../../../models/tienda.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tiendas-list',
  standalone: true,
  imports: [CommonModule, TiendaFormModalComponent],
  templateUrl: './tiendas-list.component.html',
  styleUrls: ['./tiendas-list.component.scss']
})
export class TiendasListComponent implements OnInit {
  tiendas: Tienda[] = [];
  loading = false;
  procesando = false;
  
  mostrarModal = false;
  tiendaEditando: Tienda | null = null;
  
  constructor(private tiendasService: TiendasService) {}
  
  ngOnInit(): void {
    this.cargarTiendas();
  }
  
  cargarTiendas(): void {
    this.loading = true;
    this.tiendasService.listar().subscribe({
      next: (response: any) => {
        this.tiendas = Array.isArray(response) ? response : (response.data || response.tiendas || []);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar tiendas:', error);
        Swal.fire('Error', 'No se pudieron cargar las tiendas', 'error');
        this.loading = false;
      }
    });
  }
  
  abrirModalCrear(): void {
    this.tiendaEditando = null;
    this.mostrarModal = true;
  }
  
  abrirModalEditar(tienda: Tienda): void {
    this.tiendaEditando = tienda;
    this.mostrarModal = true;
  }
  
  guardarTienda(data: CrearTiendaDto): void {
    this.procesando = true;
    
    const request = this.tiendaEditando
      ? this.tiendasService.actualizar(this.tiendaEditando.id, data as ActualizarTiendaDto)
      : this.tiendasService.crear(data);
    
    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: `Tienda ${this.tiendaEditando ? 'actualizada' : 'creada'} correctamente`,
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModal = false;
        this.cargarTiendas();
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al guardar tienda:', error);
        const mensaje = error.error?.error || 'Error al guardar la tienda';
        Swal.fire('Error', mensaje, 'error');
        this.procesando = false;
      }
    });
  }
  
  eliminarTienda(tienda: Tienda): void {
    Swal.fire({
      title: '¿Eliminar tienda?',
      text: `¿Está seguro de eliminar "${tienda.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tiendasService.eliminar(tienda.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              text: 'Tienda eliminada correctamente',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarTiendas();
          },
          error: (error) => {
            console.error('Error al eliminar tienda:', error);
            const mensaje = error.error?.error || 'No se puede eliminar la tienda porque tiene cajas asociadas';
            Swal.fire('Error', mensaje, 'error');
          }
        });
      }
    });
  }
}
