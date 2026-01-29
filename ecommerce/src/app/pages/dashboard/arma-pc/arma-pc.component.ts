// src/app/pages/dashboard/arma-pc/arma-pc.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { CategoriasPublicasService } from '../../../services/categorias-publicas.service';
import { ArmaPcService } from '../../../services/arma-pc.service';
import Swal from 'sweetalert2';

export interface CategoriaArmaPC {
  id: number;
  nombre: string;
  img?: string;
  imagen_url?: string;
  productos_count?: number;
  orden: number;
  activo: boolean;
  nombre_paso?: string;
  descripcion_paso?: string;
  es_requerido?: boolean;
  compatibles?: number[]; // IDs de categorías compatibles
}

@Component({
  selector: 'app-arma-pc',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './arma-pc.component.html',
  styleUrls: ['./arma-pc.component.scss']
})
export class ArmaPcComponent implements OnInit {
  loading = false;
  guardando = false;
  
  categoriasDisponibles: any[] = [];
  categoriasArmaPc: CategoriaArmaPC[] = [];
  
  // ✅ NUEVAS PROPIEDADES PARA GESTIÓN AVANZADA
  mostrarPanelCompatibilidades = false;
  categoriaSeleccionadaParaCompatibilidades: CategoriaArmaPC | null = null;
  
  private todasLasCategorias: any[] = [];

  constructor(
    private categoriasService: CategoriasPublicasService,
    private armaPcService: ArmaPcService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.loading = true;
    try {
      // Cargar todas las categorías
      await this.cargarTodasLasCategorias();
      
      // Cargar configuración actual
      await this.cargarConfiguracionActual();
      
      // ✅ NUEVO: Cargar compatibilidades
      await this.cargarCompatibilidades();
      
      // Actualizar categorías disponibles
      this.actualizarCategoriasDisponibles();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los datos. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      this.loading = false;
    }
  }

  private async cargarTodasLasCategorias() {
    try {
      this.todasLasCategorias = await this.categoriasService.obtenerCategoriasPublicas().toPromise() || [];
      console.log('Categorías cargadas:', this.todasLasCategorias);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.todasLasCategorias = [];
    }
  }

  private async cargarConfiguracionActual() {
    try {
      const configuracion = await this.armaPcService.obtenerConfiguracion().toPromise();
      this.categoriasArmaPc = configuracion?.categorias || [];
      console.log('Configuración actual:', this.categoriasArmaPc);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      this.categoriasArmaPc = [];
    }
  }

  private actualizarCategoriasDisponibles() {
    const idsSeleccionados = this.categoriasArmaPc.map(cat => cat.id);
    this.categoriasDisponibles = this.todasLasCategorias.filter(
      categoria => !idsSeleccionados.includes(categoria.id)
    );
  }

  agregarCategoria(categoria: any) {
    // Verificar si ya está agregada
    if (this.categoriasArmaPc.some(cat => cat.id === categoria.id)) {
      return;
    }

    // Agregar a la lista de Arma PC
    const nuevaCategoria: CategoriaArmaPC = {
      id: categoria.id,
      nombre: categoria.nombre,
      img: categoria.img,
      imagen_url: categoria.imagen_url,
      productos_count: categoria.productos_count,
      orden: this.categoriasArmaPc.length + 1,
      activo: true,
      nombre_paso: `Paso ${this.categoriasArmaPc.length + 1}`,
      descripcion_paso: 'Selecciona un componente de esta categoría',
      es_requerido: true,
      compatibles: []
    };

    this.categoriasArmaPc.push(nuevaCategoria);
    
    // Actualizar categorías disponibles
    this.actualizarCategoriasDisponibles();

    // Mostrar mensaje de éxito
    Swal.fire({
      title: 'Agregada',
      text: `${categoria.nombre} se agregó a Arma tu PC`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  removerCategoria(index: number) {
    const categoria = this.categoriasArmaPc[index];
    
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Quieres remover "${categoria.nombre}" de Arma tu PC?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, remover',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Remover de la lista
        this.categoriasArmaPc.splice(index, 1);
        
        // Reordenar números
        this.categoriasArmaPc.forEach((cat, i) => {
          cat.orden = i + 1;
        });

        // Actualizar categorías disponibles
        this.actualizarCategoriasDisponibles();

        Swal.fire({
          title: 'Removida',
          text: `${categoria.nombre} fue removida de Arma tu PC`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    });
  }

  onDrop(event: CdkDragDrop<CategoriaArmaPC[]>) {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.categoriasArmaPc, event.previousIndex, event.currentIndex);
      
      // Actualizar orden
      this.categoriasArmaPc.forEach((categoria, index) => {
        categoria.orden = index + 1;
      });

      Swal.fire({
        title: 'Orden actualizado',
        text: 'El orden de las categorías se ha actualizado',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  async guardarConfiguracion() {
    if (this.categoriasArmaPc.length === 0) {
      Swal.fire({
        title: 'Sin categorías',
        text: 'Debes seleccionar al menos una categoría para Arma tu PC',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.guardando = true;
    try {
      await this.armaPcService.guardarConfiguracion(this.categoriasArmaPc).toPromise();
      
      Swal.fire({
        title: '¡Configuración guardada!',
        text: 'Los cambios se han guardado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar la configuración. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      this.guardando = false;
    }
  }

  resetearConfiguracion() {
    if (this.categoriasArmaPc.length === 0) {
      return;
    }

    Swal.fire({
      title: '¿Resetear configuración?',
      text: 'Esto eliminará todas las categorías seleccionadas de Arma tu PC',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoriasArmaPc = [];
        this.actualizarCategoriasDisponibles();
        
        Swal.fire({
          title: 'Configuración reseteada',
          text: 'Todas las categorías han sido removidas',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    });
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/default-category.png';
  }

  // ====================================
  // ✅ NUEVOS MÉTODOS PARA GESTIÓN AVANZADA
  // ====================================

  /**
   * Abrir panel de configuración avanzada para una categoría
   */
  abrirConfiguracionAvanzada(categoria: CategoriaArmaPC) {
    this.categoriaSeleccionadaParaCompatibilidades = { ...categoria };
    this.mostrarPanelCompatibilidades = true;
  }

  /**
   * Cerrar panel de compatibilidades
   */
  cerrarPanelCompatibilidades() {
    this.mostrarPanelCompatibilidades = false;
    this.categoriaSeleccionadaParaCompatibilidades = null;
  }

  /**
   * Actualizar nombre del paso
   */
  actualizarNombrePaso(categoria: CategoriaArmaPC, nuevoNombre: string) {
    const index = this.categoriasArmaPc.findIndex(c => c.id === categoria.id);
    if (index !== -1) {
      this.categoriasArmaPc[index].nombre_paso = nuevoNombre;
    }
  }

  /**
   * Actualizar descripción del paso
   */
  actualizarDescripcionPaso(categoria: CategoriaArmaPC, nuevaDescripcion: string) {
    const index = this.categoriasArmaPc.findIndex(c => c.id === categoria.id);
    if (index !== -1) {
      this.categoriasArmaPc[index].descripcion_paso = nuevaDescripcion;
    }
  }

  /**
   * Toggle requerido del paso
   */
  toggleRequerido(categoria: CategoriaArmaPC) {
    const index = this.categoriasArmaPc.findIndex(c => c.id === categoria.id);
    if (index !== -1) {
      this.categoriasArmaPc[index].es_requerido = !this.categoriasArmaPc[index].es_requerido;
    }
  }

  /**
   * Toggle compatibilidad entre categorías
   */
  toggleCompatibilidad(categoriaPrincipal: CategoriaArmaPC, categoriaCompatible: any) {
    if (!categoriaPrincipal.compatibles) {
      categoriaPrincipal.compatibles = [];
    }

    const index = categoriaPrincipal.compatibles.indexOf(categoriaCompatible.id);
    if (index > -1) {
      // Remover compatibilidad
      categoriaPrincipal.compatibles.splice(index, 1);
    } else {
      // Agregar compatibilidad
      categoriaPrincipal.compatibles.push(categoriaCompatible.id);
    }
  }

  /**
   * Verificar si dos categorías son compatibles
   */
  sonCompatibles(categoriaPrincipal: CategoriaArmaPC, categoriaId: number): boolean {
    return categoriaPrincipal.compatibles?.includes(categoriaId) || false;
  }

  /**
   * Guardar configuración avanzada (con pasos y compatibilidades)
   */
  async guardarConfiguracionAvanzada() {
    if (this.categoriasArmaPc.length === 0) {
      Swal.fire({
        title: 'Sin categorías',
        text: 'Debes seleccionar al menos una categoría para Arma tu PC',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.guardando = true;
    try {
      // Primero guardamos la configuración básica con información de pasos
      await this.armaPcService.guardarConfiguracion(this.categoriasArmaPc).toPromise();
      
      // Luego guardamos las compatibilidades para cada categoría
      for (const categoria of this.categoriasArmaPc) {
        if (categoria.compatibles && categoria.compatibles.length > 0) {
          await this.armaPcService.gestionarCompatibilidades(categoria.id, categoria.compatibles).toPromise();
        }
      }
      
      Swal.fire({
        title: '¡Configuración guardada!',
        text: 'Los cambios se han guardado correctamente, incluyendo pasos y compatibilidades',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Error al guardar configuración avanzada:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar la configuración. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      this.guardando = false;
    }
  }

  /**
   * Cargar compatibilidades existentes
   */
  private async cargarCompatibilidades() {
    try {
      const response = await this.armaPcService.obtenerCompatibilidades().toPromise();
      if (response.success) {
        // Mapear compatibilidades a nuestras categorías
        response.compatibilidades.forEach((comp: any) => {
          const categoria = this.categoriasArmaPc.find(c => c.id === comp.id);
          if (categoria) {
            categoria.compatibles = comp.compatibles.map((c: any) => c.id);
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar compatibilidades:', error);
    }
  }
}