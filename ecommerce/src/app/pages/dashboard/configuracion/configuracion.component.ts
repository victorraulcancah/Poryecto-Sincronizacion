import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MenuService, Menu } from '../../../services/menu.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  menus: Menu[] = [];
  menusParaPadre: Menu[] = []; // Para el dropdown de menú padre
  menuForm!: FormGroup;
  isEditMode = false;
  selectedId: number | null = null;
  isLoading = false;
  showModal = false;
  tipoActual: 'header' | 'footer' | 'sidebar' = 'header';

  constructor(
    private fb: FormBuilder,
    private menuService: MenuService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadMenus();
    this.loadMenusParaSelect();
  }

  initForm(): void {
    this.menuForm = this.fb.group({
      nombre: ['', [Validators.required]],
      url: ['', [Validators.required]],
      orden: [0, [Validators.required, Validators.min(0)]],
      padre_id: [null],
      tipo: ['header', [Validators.required]],
      target: ['_self', [Validators.required]],
      visible: [true]
    });
  }

  loadMenus(): void {
    this.isLoading = true;
    this.menuService.obtenerTodos(this.tipoActual).subscribe({
      next: (response) => {
        this.menus = response.menus || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar menús:', error);
        this.isLoading = false;
        Swal.fire('Error', 'No se pudieron cargar los menús', 'error');
      }
    });
  }

  loadMenusParaSelect(): void {
    this.menuService.menusParaSelect(this.tipoActual).subscribe({
      next: (response) => {
        this.menusParaPadre = response.menus || [];
      },
      error: (error) => {
        console.error('Error al cargar menús para select:', error);
      }
    });
  }

  openModal(menu?: Menu): void {
    this.showModal = true;
    if (menu) {
      this.isEditMode = true;
      this.selectedId = menu.id!;
      this.menuForm.patchValue({
        nombre: menu.nombre,
        url: menu.url,
        orden: menu.orden,
        padre_id: menu.padre_id,
        tipo: menu.tipo,
        target: menu.target,
        visible: menu.visible
      });
    } else {
      this.isEditMode = false;
      this.selectedId = null;
      this.menuForm.reset({
        orden: this.getNextOrden(),
        tipo: this.tipoActual,
        target: '_self',
        visible: true
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.menuForm.reset();
  }

  onSubmit(): void {
    if (this.menuForm.invalid) {
      Object.keys(this.menuForm.controls).forEach(key => {
        this.menuForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.menuForm.value;

    if (this.isEditMode && this.selectedId) {
      this.menuService.actualizar(this.selectedId, formData).subscribe({
        next: (response) => {
          Swal.fire('Exito!', response.message || 'Menú actualizado', 'success');
          this.closeModal();
          this.loadMenus();
          this.loadMenusParaSelect();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al actualizar', 'error');
        }
      });
    } else {
      this.menuService.crear(formData).subscribe({
        next: (response) => {
          Swal.fire('Exito!', response.message || 'Menú creado', 'success');
          this.closeModal();
          this.loadMenus();
          this.loadMenusParaSelect();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al crear', 'error');
        }
      });
    }
  }

  toggleVisibilidad(id: number): void {
    this.menuService.toggleVisibilidad(id).subscribe({
      next: (response) => {
        Swal.fire('Exito!', response.message || 'Estado cambiado', 'success');
        this.loadMenus();
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
        this.menuService.eliminar(id).subscribe({
          next: (response) => {
            Swal.fire('¡Eliminado!', response.message || 'Menú eliminado', 'success');
            this.loadMenus();
            this.loadMenusParaSelect();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Error al eliminar', 'error');
          }
        });
      }
    });
  }

  cambiarTipo(tipo: 'header' | 'footer' | 'sidebar'): void {
    this.tipoActual = tipo;
    this.loadMenus();
    this.loadMenusParaSelect();
  }

  getNextOrden(): number {
    if (this.menus.length === 0) return 1;
    const maxOrden = Math.max(...this.menus.map(m => m.orden));
    return maxOrden + 1;
  }

  // Getters para el template
  get menusVisibles(): number {
    return this.menus.filter(m => m.visible).length;
  }

  get menusOcultos(): number {
    return this.menus.filter(m => !m.visible).length;
  }

  get menusPrincipales(): number {
    return this.menus.filter(m => !m.padre_id).length;
  }

  get submenus(): number {
    return this.menus.filter(m => m.padre_id).length;
  }
}
