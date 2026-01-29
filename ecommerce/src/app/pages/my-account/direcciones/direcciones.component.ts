import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DireccionesService, Direccion } from '../../../services/direcciones.service';
import { UbigeoService, Departamento, Provincia, Distrito } from '../../../services/ubigeo.service';
import { ModalDireccionComponent } from '../../../component/modal-direccion/modal-direccion.component';

@Component({
  selector: 'app-direcciones',
  standalone: true,
  imports: [CommonModule, ModalDireccionComponent],
  templateUrl: './direcciones.component.html',
  styleUrl: './direcciones.component.scss'
})
export class DireccionesComponent implements OnInit, OnDestroy {
  direcciones: Direccion[] = [];
  isLoadingDirecciones = false;
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  direccionEditando: Direccion | null = null;

  // Datos para ubigeo
  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private direccionesService: DireccionesService,
    private ubigeoService: UbigeoService
  ) {}

  ngOnInit(): void {
    this.cargarDirecciones();
    this.cargarDepartamentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDirecciones(): void {
    this.isLoadingDirecciones = true;
    this.direccionesService.obtenerDirecciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.direcciones = response.direcciones;
          this.isLoadingDirecciones = false;
        },
        error: (error: any) => {
          console.error('Error cargando direcciones:', error);
          this.isLoadingDirecciones = false;
        }
      });
  }

  private cargarDepartamentos(): void {
    this.ubigeoService.getDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
      }
    });
  }

  abrirModal(mode: 'create' | 'edit', direccion?: Direccion): void {
    this.modalMode = mode;
    this.direccionEditando = direccion || null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.direccionEditando = null;
  }

  onDireccionGuardada(): void {
    this.cerrarModal();
    this.cargarDirecciones();
  }

  establecerPredeterminada(direccion: Direccion): void {
    this.direccionesService.establecerPredeterminada(direccion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarDirecciones();
        },
        error: (error) => {
          console.error('Error estableciendo dirección predeterminada:', error);
        }
      });
  }

  eliminarDireccion(direccion: Direccion): void {
    if (confirm(`¿Estás seguro de eliminar la dirección: ${direccion.direccion_completa}?`)) {
      this.direccionesService.eliminarDireccion(direccion.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarDirecciones();
          },
          error: (error: any) => {
            console.error('Error eliminando dirección:', error);
          }
        });
    }
  }
}