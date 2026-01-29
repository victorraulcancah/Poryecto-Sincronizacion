import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormaEnvioService, FormaEnvio } from '../../../services/forma-envio.service';
import { UbigeoService, Departamento, Provincia, Distrito } from '../../../services/ubigeo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-formas-envio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './formas-envio.component.html',
  styleUrl: './formas-envio.component.scss'
})
export class FormasEnvioComponent implements OnInit {
  formasEnvio: FormaEnvio[] = [];
  formaEnvioForm!: FormGroup;
  isEditMode = false;
  selectedId: number | null = null;
  isLoading = false;
  showModal = false;

  // Ubigeo data
  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];
  loadingProvincias = false;
  loadingDistritos = false;

  // Filtros
  filtroNivel: 'todos' | 'departamento' | 'provincia' | 'distrito' = 'todos';
  filtroDepartamento: string = '';

  // Paginación
  currentPage = 1;
  pageSize = 10;
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private formaEnvioService: FormaEnvioService,
    private ubigeoService: UbigeoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadFormasEnvio();
    this.loadDepartamentos();
  }

  initForm(): void {
    this.formaEnvioForm = this.fb.group({
      departamento_id: ['', [Validators.required]],
      provincia_id: [''],
      distrito_id: [''],
      costo: [0, [Validators.required, Validators.min(0)]],
      activo: [true]
    });

    // Deshabilitar provincia y distrito inicialmente
    this.formaEnvioForm.get('provincia_id')?.disable();
    this.formaEnvioForm.get('distrito_id')?.disable();

    // Listener para cargar provincias cuando cambia el departamento
    this.formaEnvioForm.get('departamento_id')?.valueChanges.subscribe(departamentoId => {
      if (departamentoId) {
        this.formaEnvioForm.get('provincia_id')?.enable();
        this.loadProvincias(departamentoId);
        this.formaEnvioForm.patchValue({ provincia_id: '', distrito_id: '' });
        this.distritos = [];
        this.formaEnvioForm.get('distrito_id')?.disable();
      } else {
        this.formaEnvioForm.get('provincia_id')?.disable();
        this.formaEnvioForm.get('distrito_id')?.disable();
        this.provincias = [];
        this.distritos = [];
      }
    });

    // Listener para cargar distritos cuando cambia la provincia
    this.formaEnvioForm.get('provincia_id')?.valueChanges.subscribe(provinciaId => {
      const departamentoId = this.formaEnvioForm.get('departamento_id')?.value;
      
      if (departamentoId && provinciaId && provinciaId !== '') {
        this.formaEnvioForm.get('distrito_id')?.enable();
        this.loadDistritos(departamentoId, provinciaId);
        this.formaEnvioForm.patchValue({ distrito_id: '' });
      } else {
        this.formaEnvioForm.get('distrito_id')?.disable();
        this.distritos = [];
      }
    });
  }

  loadDepartamentos(): void {
    this.ubigeoService.getDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
      }
    });
  }

  loadProvincias(departamentoId: string): void {
    this.loadingProvincias = true;
    this.ubigeoService.getProvincias(departamentoId).subscribe({
      next: (provincias) => {
        this.provincias = provincias;
        this.loadingProvincias = false;
      },
      error: (error) => {
        console.error('Error al cargar provincias:', error);
        this.loadingProvincias = false;
      }
    });
  }

  loadDistritos(departamentoId: string, provinciaId: string): void {
    this.loadingDistritos = true;
    
    if (!departamentoId || !provinciaId) {
      this.loadingDistritos = false;
      return;
    }
    
    this.ubigeoService.getDistritos(departamentoId, provinciaId).subscribe({
      next: (distritos) => {
        this.distritos = distritos;
        this.loadingDistritos = false;
      },
      error: (error) => {
        console.error('Error al cargar distritos:', error);
        this.loadingDistritos = false;
      }
    });
  }

  loadFormasEnvio(): void {
    this.isLoading = true;
    this.formaEnvioService.obtenerTodas().subscribe({
      next: (response) => {
        this.formasEnvio = response.formas_envio || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar formas de envío:', error);
        this.isLoading = false;
        Swal.fire('Error', 'No se pudieron cargar las formas de envío', 'error');
      }
    });
  }

  openModal(formaEnvio?: FormaEnvio): void {
    this.showModal = true;
    if (formaEnvio) {
      this.isEditMode = true;
      this.selectedId = formaEnvio.id!;
      
      // Habilitar y cargar provincias y distritos si existen
      if (formaEnvio.departamento_id) {
        this.formaEnvioForm.get('provincia_id')?.enable();
        this.loadProvincias(formaEnvio.departamento_id);
      }
      if (formaEnvio.departamento_id && formaEnvio.provincia_id) {
        this.formaEnvioForm.get('distrito_id')?.enable();
        this.loadDistritos(formaEnvio.departamento_id, formaEnvio.provincia_id);
      }
      
      this.formaEnvioForm.patchValue({
        departamento_id: formaEnvio.departamento_id,
        provincia_id: formaEnvio.provincia_id || '',
        distrito_id: formaEnvio.distrito_id || '',
        costo: formaEnvio.costo,
        activo: formaEnvio.activo
      });
    } else {
      this.isEditMode = false;
      this.selectedId = null;
      this.formaEnvioForm.reset({ 
        activo: true, 
        costo: 0
      });
      this.provincias = [];
      this.distritos = [];
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.formaEnvioForm.reset();
    this.provincias = [];
    this.distritos = [];
  }

  onSubmit(): void {
    if (this.formaEnvioForm.invalid) {
      Object.keys(this.formaEnvioForm.controls).forEach(key => {
        this.formaEnvioForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Obtener valores incluyendo los controles deshabilitados
    const formData = this.formaEnvioForm.getRawValue();
    
    // Convertir strings vacíos a null
    if (!formData.provincia_id) formData.provincia_id = null;
    if (!formData.distrito_id) formData.distrito_id = null;

    if (this.isEditMode && this.selectedId) {
      this.formaEnvioService.actualizar(this.selectedId, formData).subscribe({
        next: (response) => {
          Swal.fire('¡Éxito!', response.message, 'success');
          this.closeModal();
          this.loadFormasEnvio();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al actualizar', 'error');
        }
      });
    } else {
      this.formaEnvioService.crear(formData).subscribe({
        next: (response) => {
          Swal.fire('¡Éxito!', response.message, 'success');
          this.closeModal();
          this.loadFormasEnvio();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al crear', 'error');
        }
      });
    }
  }

  toggleEstado(id: number): void {
    this.formaEnvioService.toggleEstado(id).subscribe({
      next: (response) => {
        Swal.fire('¡Éxito!', response.message, 'success');
        this.loadFormasEnvio();
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'Error al cambiar estado', 'error');
      }
    });
  }

  eliminar(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.formaEnvioService.eliminar(id).subscribe({
          next: (response) => {
            Swal.fire('¡Eliminado!', response.message, 'success');
            this.loadFormasEnvio();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Error al eliminar', 'error');
          }
        });
      }
    });
  }

  // Getters para el template
  get formasEnvioActivas(): number {
    return this.formasEnvio.filter(f => f.activo).length;
  }

  get formasEnvioInactivas(): number {
    return this.formasEnvio.filter(f => !f.activo).length;
  }

  get formasEnvioFiltradas(): FormaEnvio[] {
    let filtradas = this.formasEnvio;

    // Filtrar por nivel
    if (this.filtroNivel !== 'todos') {
      filtradas = filtradas.filter(f => {
        if (this.filtroNivel === 'departamento') return !f.provincia_id && !f.distrito_id;
        if (this.filtroNivel === 'provincia') return f.provincia_id && !f.distrito_id;
        if (this.filtroNivel === 'distrito') return f.distrito_id;
        return true;
      });
    }

    // Filtrar por departamento
    if (this.filtroDepartamento) {
      filtradas = filtradas.filter(f => f.departamento_id === this.filtroDepartamento);
    }

    return filtradas;
  }

  getNivelCobertura(forma: FormaEnvio): string {
    if (forma.distrito_id) return 'Distrito';
    if (forma.provincia_id) return 'Provincia';
    return 'Departamento';
  }

  // Métodos de paginación
  get formasEnvioPaginadas(): FormaEnvio[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.formasEnvioFiltradas.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.formasEnvioFiltradas.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else if (this.currentPage >= totalPages - 2) {
        pages.push(1);
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      }
    }

    return pages;
  }
}
