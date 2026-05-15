// ecommerce-front\src\app\pages\arma-pc-publico\arma-pc-publico.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriasPublicasService, CategoriaPublica } from '../../services/categorias-publicas.service';
import { MarcaProducto, ProductoPublico } from '../../types/almacen.types';
import { ProductosService } from '../../services/productos.service';
import { CartService } from '../../services/cart.service';
import { CartNotificationService } from '../../services/cart-notification.service';
import { ArmaPcService } from '../../services/arma-pc.service';
import Swal from 'sweetalert2';

interface PasoArmaPc {
  id: number;
  nombre: string;
  nombre_paso: string;
  descripcion_paso?: string;
  es_requerido: boolean;
  orden: number;
  productos_count: number;
  imagen_url?: string;
  completado: boolean;
  accesible: boolean;
  producto_seleccionado?: ProductoPublico;
}

type ProductoPaso = ProductoPublico & {
  seleccionado: boolean;
  precioNumerico: number;
  precioFinal: number;
};

interface ProductoSeleccionado {
  categoria_id: number;
  categoria_nombre: string;
  producto: ProductoPaso;
  cantidad: number;
}

@Component({
  selector: 'app-arma-pc-publico',
  imports: [CommonModule],
  templateUrl: './arma-pc-publico.component.html',
  styleUrl: './arma-pc-publico.component.scss'
})
export class ArmaPcPublicoComponent implements OnInit {
  // ✅ NUEVAS PROPIEDADES PARA SISTEMA DE PASOS
  pasos: PasoArmaPc[] = [];
  pasoActual: number = 0;
  productosDelPasoActual: ProductoPaso[] = [];
  productosDelPasoLoading = false;
  productosSeleccionados: ProductoSeleccionado[] = [];
  totalCotizacion = 0;

  // Propiedades precalculadas (evitan llamadas a funciones en el template)
  progresoConfiguracion = { completados: 0, total: 0, porcentaje: 0 };
  puedeFinalizar = false;
  pasosRequeridosFaltantes = 0;

  constructor(
    private categoriasService: CategoriasPublicasService,
    private productosService: ProductosService,
    private cartService: CartService,
    private cartNotificationService: CartNotificationService,
    private armaPcService: ArmaPcService
  ) {}

  ngOnInit() {
    this.cargarPasosArmaPc();
  }

  // ✅ CORREGIDO: Cargar pasos configurados por el admin
  cargarPasosArmaPc(): void {
    this.categoriasService.obtenerCategoriasArmaPc().subscribe({
      next: (categorias: CategoriaPublica[]) => {
        this.pasos = categorias.map(categoria => ({
          id: categoria.id,
          nombre: categoria.nombre,
          nombre_paso: categoria.paso_info?.nombre_paso || `Paso ${categoria.paso_info?.orden || 1}`,
          descripcion_paso: categoria.paso_info?.descripcion_paso,
          es_requerido: categoria.paso_info?.es_requerido || true,
          orden: categoria.paso_info?.orden || 1,
          productos_count: categoria.productos_count || 0,
          imagen_url: categoria.imagen_url,
          completado: false,
          accesible: false,
          producto_seleccionado: undefined
        })).sort((a, b) => a.orden - b.orden);

        this.actualizarResumen();

        // Cargar productos del primer paso
        if (this.pasos.length > 0) {
          this.cargarProductosDelPaso(0);
        }
      },
      error: (error) => {
        console.error('Error al cargar pasos Arma PC:', error);
        this.pasos = [];
      },
    });
  }

  // ✅ NUEVO: Cargar productos del paso actual
  cargarProductosDelPaso(indicePaso: number): void {
    if (indicePaso < 0 || indicePaso >= this.pasos.length) return;
    
    this.pasoActual = indicePaso;
    this.productosDelPasoLoading = true;
    
    const paso = this.pasos[indicePaso];

    console.log(`🔍 Cargando productos para:`, {
      paso: indicePaso + 1,
      categoriaId: paso.id,
      categoriaNombre: paso.nombre,
      nombrePaso: paso.nombre_paso
    });

    // Filtrar por categoría específica del paso
    const filtros = {
      categoria: paso.id,
      page: 1
    };

    this.productosService.obtenerProductosPublicos(filtros).subscribe({
      next: (response) => {
        const seleccionadosIds = new Set(this.productosSeleccionados.map(s => s.producto.id));
        this.productosDelPasoActual = response.productos.map(p => {
          const precioNumerico = this.getPrecioNumerico(p.precio);
          const precioFinal = this.getPrecioNumerico(p.precio_oferta || p.precio);
          return { ...p, seleccionado: seleccionadosIds.has(p.id), precioNumerico, precioFinal };
        });
        this.productosDelPasoLoading = false;
        this.actualizarResumen();
        
        console.log(`✅ Productos cargados para "${paso.nombre_paso}":`, {
          totalProductos: this.productosDelPasoActual.length,
          categoriaId: paso.id,
          productos: this.productosDelPasoActual.map(p => ({
            id: p.id,
            nombre: p.nombre,
            categoria_id: p.categoria_id || 'No definido'
          }))
        });
      },
      error: (error) => {
        console.error(`❌ Error al cargar productos del paso "${paso.nombre_paso}":`, error);
        this.productosDelPasoLoading = false;
        this.productosDelPasoActual = [];
      },
    });
  }

  // ✅ NUEVO: Navegar a paso específico
  irAPaso(indicePaso: number): void {
    // Verificar si es un paso válido
    if (indicePaso < 0 || indicePaso >= this.pasos.length) return;
    
    // No permitir saltar a pasos futuros si hay pasos requeridos sin completar
    for (let i = 0; i < indicePaso; i++) {
      const paso = this.pasos[i];
      if (paso.es_requerido && !paso.completado) {
        Swal.fire({
          title: 'Paso requerido',
          text: `Debes completar el paso "${paso.nombre_paso}" antes de continuar`,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }
    }

    this.cargarProductosDelPaso(indicePaso);
  }

  // ✅ NUEVO: Ir al siguiente paso
  siguientePaso(): void {
    const pasoActualObj = this.pasos[this.pasoActual];
    
    // Verificar si el paso actual es requerido y no está completado
    if (pasoActualObj.es_requerido && !pasoActualObj.completado) {
      Swal.fire({
        title: 'Selecciona un producto',
        text: `El paso "${pasoActualObj.nombre_paso}" es requerido. Debes seleccionar un producto para continuar.`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Ir al siguiente paso si existe
    if (this.pasoActual < this.pasos.length - 1) {
      this.irAPaso(this.pasoActual + 1);
    }
  }

  // ✅ NUEVO: Ir al paso anterior
  pasoAnterior(): void {
    if (this.pasoActual > 0) {
      this.irAPaso(this.pasoActual - 1);
    }
  }

  // ✅ ACTUALIZADO: Seleccionar producto del paso actual
  toggleProductoArmado(producto: ProductoPaso, event: any): void {
    const isChecked = event.target.checked;
    const pasoActualObj = this.pasos[this.pasoActual];

    if (isChecked) {
      const existeIdx = this.productosSeleccionados.findIndex(
        p => p.categoria_id === pasoActualObj.id
      );
      const entrada = { categoria_id: pasoActualObj.id, categoria_nombre: pasoActualObj.nombre_paso, producto, cantidad: 1 };

      if (existeIdx !== -1) {
        // Deseleccionar el producto anterior del mismo paso
        const anteriorId = this.productosSeleccionados[existeIdx].producto.id;
        const anteriorEnLista = this.productosDelPasoActual.find(p => p.id === anteriorId);
        if (anteriorEnLista) anteriorEnLista.seleccionado = false;
        this.productosSeleccionados[existeIdx] = entrada;
      } else {
        this.productosSeleccionados.push(entrada);
      }

      producto.seleccionado = true;
      pasoActualObj.completado = true;
      pasoActualObj.producto_seleccionado = producto;
    } else {
      this.productosSeleccionados = this.productosSeleccionados.filter(
        p => p.producto.id !== producto.id
      );
      producto.seleccionado = false;
      pasoActualObj.completado = false;
      pasoActualObj.producto_seleccionado = undefined;
    }

    this.calcularTotalCotizacion();
  }

  // Verificar si producto está seleccionado
  isProductoSeleccionado(producto: ProductoPublico): boolean {
    return this.productosSeleccionados.some(p => p.producto.id === producto.id);
  }

  // Calcular total de cotización
  calcularTotalCotizacion(): void {
    this.totalCotizacion = this.productosSeleccionados.reduce((total, item) => {
      return total + (item.producto.precioFinal * item.cantidad);
    }, 0);
    this.actualizarResumen();
  }

  actualizarResumen(): void {
    const completados = this.pasos.filter(p => p.completado).length;
    const total = this.pasos.length;
    this.progresoConfiguracion = {
      completados,
      total,
      porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
    };
    this.pasosRequeridosFaltantes = this.pasos.filter(p => p.es_requerido && !p.completado).length;
    this.puedeFinalizar = this.pasos.filter(p => p.es_requerido).every(p => p.completado);
    this.pasos.forEach((paso, i) => {
      paso.accesible = i === 0 || this.pasos.slice(0, i).every(p => !p.es_requerido || p.completado);
    });
  }

  // Convertir precio a número para mostrar
  getPrecioNumerico(precio: string | number | undefined): number {
    if (precio === undefined || precio === null) return 0;
    return typeof precio === 'number' ? precio : parseFloat(precio.toString()) || 0;
  }

  // ✅ NUEVO: Obtener progreso de la configuración
  getProgresoConfiguracion(): { completados: number; total: number; porcentaje: number } {
    const completados = this.pasos.filter(p => p.completado).length;
    const total = this.pasos.length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;
    
    return { completados, total, porcentaje };
  }

  // ✅ NUEVO: Verificar si un paso puede ser accedido
  puedeAccederAPaso(indicePaso: number): boolean {
    // Primer paso siempre accesible
    if (indicePaso === 0) return true;
    
    // Verificar pasos requeridos anteriores
    for (let i = 0; i < indicePaso; i++) {
      const paso = this.pasos[i];
      if (paso.es_requerido && !paso.completado) {
        return false;
      }
    }
    
    return true;
  }

  // ✅ NUEVO: Verificar si se puede finalizar configuración  
  puedeFinalizarConfiguracion(): boolean {
    return this.pasos.filter(p => p.es_requerido).every(p => p.completado);
  }

  // ✅ NUEVO: Obtener cantidad de pasos requeridos faltantes
  getPasosRequeridosFaltantes(): number {
    return this.pasos.filter(p => p.es_requerido && !p.completado).length;
  }

  // Cambiar cantidad de producto seleccionado
  cambiarCantidadProducto(productoId: number, nuevaCantidad: number): void {
    const producto = this.productosSeleccionados.find(p => p.producto.id === productoId);
    if (producto && nuevaCantidad > 0) {
      producto.cantidad = nuevaCantidad;
      this.calcularTotalCotizacion();
    }
  }

  // Remover producto seleccionado
  removerProductoSeleccionado(productoId: number): void {
    this.productosSeleccionados = this.productosSeleccionados.filter(
      p => p.producto.id !== productoId
    );
    this.calcularTotalCotizacion();
  }

  // Agregar todos los productos al carrito
  agregarTodoAlCarrito(): void {
    if (this.productosSeleccionados.length === 0) {
      console.warn('No hay productos seleccionados');
      return;
    }

    let productosAgregados = 0;
    let totalProductos = this.productosSeleccionados.length;

    // Agregar cada producto al carrito
    this.productosSeleccionados.forEach((item, index) => {
      this.cartService.addToCart(item.producto, item.cantidad).subscribe({
        next: () => {
          productosAgregados++;

          // Si es el último producto agregado, mostrar notificación
          if (productosAgregados === totalProductos) {
            // Preparar imagen del primer producto como referencia
            let productImage = this.productosSeleccionados[0].producto.imagen_principal || 'assets/images/thumbs/product-default.png';

            // Mostrar notificación con resumen de configuración
            this.cartNotificationService.showProductAddedNotification(
              `Configuración PC (${productosAgregados} productos)`,
              this.totalCotizacion,
              productImage,
              productosAgregados,
              [] // Sin productos sugeridos en este caso
            );
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: `Error al agregar "${item.producto.nombre}": ${err.message || 'Error desconocido'}`,
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    });
  }

  // Descargar cotización como PDF
  descargarCotizacion(): void {
    if (this.productosSeleccionados.length === 0) {
      console.warn('No hay productos seleccionados para cotizar');
      return;
    }

    // Solicitar datos del cliente
    Swal.fire({
      title: 'Datos para la cotización',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label">Nombre completo</label>
            <input type="text" id="cliente" class="form-control" placeholder="Ingresa tu nombre completo" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Correo electrónico</label>
            <input type="email" id="email" class="form-control" placeholder="tu@email.com" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Teléfono (opcional)</label>
            <input type="tel" id="telefono" class="form-control" placeholder="999 999 999">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Generar cotización',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const cliente = (document.getElementById('cliente') as HTMLInputElement).value;
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const telefono = (document.getElementById('telefono') as HTMLInputElement).value;
        
        if (!cliente || !email) {
          Swal.showValidationMessage('Por favor completa los campos obligatorios');
          return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage('Por favor ingresa un email válido');
          return false;
        }
        
        return { cliente, email, telefono };
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.procesarDescargaCotizacion(result.value);
      }
    });
  }

  private procesarDescargaCotizacion(datosCliente: any): void {
    const datosCotizacion = {
      cliente: datosCliente.cliente,
      email: datosCliente.email,
      telefono: datosCliente.telefono || '',
      items: this.productosSeleccionados.map(item => ({
        producto_id: item.producto.id,
        nombre: item.producto.nombre,
        descripcion: item.producto.descripcion,
        precio: this.getPrecioNumerico(item.producto.precio_oferta || item.producto.precio),
        cantidad: item.cantidad,
        subtotal: this.getPrecioNumerico(item.producto.precio_oferta || item.producto.precio) * item.cantidad,
        imagen: item.producto.imagen_principal
      })),
      total: this.totalCotizacion,
      tipo: 'arma_pc'
    };

    // Llamar al servicio para generar PDF
    this.cartService.generarCotizacionPDF(datosCotizacion).subscribe({
      next: (response) => {
        // Crear blob y descargar
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cotizacion-arma-pc-${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡PDF Descargado!',
          text: 'Tu cotización se ha descargado correctamente',
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error generando PDF:', error);
        Swal.fire({
          title: 'Error al generar PDF',
          text: 'Ocurrió un error al generar tu cotización. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Error de imagen
  onImageError(event: any) {
    event.target.src = 'assets/images/default-product.png';
  }
}
