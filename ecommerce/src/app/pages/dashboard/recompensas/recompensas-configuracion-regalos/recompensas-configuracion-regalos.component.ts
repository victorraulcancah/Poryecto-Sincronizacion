import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecompensasService } from '../../../../services/recompensas.service';

export interface ProductoRegalo {
  id: number;
  nombre: string;
  codigo_producto: string;
  precio_venta: number;
  stock: number;
  imagen_principal?: string;
  categoria?: {
    id: number;
    nombre: string;
  };
}

export interface ConfiguracionRegalo {
  id?: number;
  producto_id: number;
  cantidad: number;
  minimo_compra: number;
  stock_disponible: number;
  producto: ProductoRegalo;
}

export interface ConfiguracionRegalosData {
  minimo_compra: number;
  regalos: ConfiguracionRegalo[];
  limite_regalos_por_cliente: number;
  validar_stock: boolean;
}

@Component({
  selector: 'app-recompensas-configuracion-regalos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recompensas-configuracion-regalos.component.html',
  styleUrls: ['./recompensas-configuracion-regalos.component.scss']
})
export class RecompensasConfiguracionRegalosComponent implements OnInit {
  @Input() recompensaId?: number;
  @Input() configuracionInicial?: ConfiguracionRegalosData;
  @Output() configuracionChange = new EventEmitter<ConfiguracionRegalosData>();

  private recompensasService = inject(RecompensasService);
  private fb = inject(FormBuilder);

  configuracionForm: FormGroup;
  loading = false;
  error: string | null = null;

  // Datos para búsqueda de productos
  productosDisponibles: ProductoRegalo[] = [];
  terminoBusqueda = '';
  cargandoProductos = false;

  // Regalos configurados
  regalosConfigurados: ConfiguracionRegalo[] = [];

  // Formulario para agregar regalo
  regaloForm: FormGroup;

  // Estadísticas
  estadisticas = {
    total_regalos: 0,
    valor_total_regalos: 0,
    stock_total_disponible: 0,
    productos_sin_stock: 0
  };

  // Simulación
  simulacion = {
    cantidad_clientes: 1,
    regalos_otorgados: 0,
    stock_restante: 0,
    calculando: false
  };

  constructor() {
    this.configuracionForm = this.fb.group({
      minimo_compra: [0, [Validators.required, Validators.min(0)]],
      limite_regalos_por_cliente: [1, [Validators.required, Validators.min(1)]],
      validar_stock: [true]
    });

    this.regaloForm = this.fb.group({
      producto_id: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      minimo_compra: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.configuracionInicial) {
      this.configuracionForm.patchValue(this.configuracionInicial);
      this.regalosConfigurados = this.configuracionInicial.regalos || [];
    }

    // Cargar configuración existente si hay recompensaId
    if (this.recompensaId) {
      this.cargarConfiguracion();
    }

    // Cargar productos iniciales
    this.cargarProductos();

    // Escuchar cambios en el formulario
    this.configuracionForm.valueChanges.subscribe(() => {
      this.emitirConfiguracion();
    });
  }

  cargarConfiguracion(): void {
    if (!this.recompensaId) return;

    this.loading = true;
    this.error = null;

    this.recompensasService.obtenerConfiguracionRegalos(this.recompensaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configuracionForm.patchValue(response.data);
          this.regalosConfigurados = response.data.regalos || [];
          this.actualizarEstadisticas();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración de regalos:', error);
        this.error = 'Error al cargar la configuración';
        this.loading = false;
      }
    });
  }

  cargarProductos(): void {
    this.cargandoProductos = true;

    this.recompensasService.buscarProductosRegalos({
      buscar: this.terminoBusqueda,
      solo_activos: true,
      con_stock: true,
      limite: 20
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.productosDisponibles = response.data;
        }
        this.cargandoProductos = false;
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.cargandoProductos = false;
      }
    });
  }

  buscarProductos(): void {
    this.cargarProductos();
  }

  agregarRegalo(): void {
    if (this.regaloForm.invalid) return;

    const formValue = this.regaloForm.value;
    const producto = this.productosDisponibles.find(p => p.id === formValue.producto_id);

    if (!producto) return;

    // Verificar si el producto ya está configurado
    if (this.regalosConfigurados.find(r => r.producto_id === producto.id)) {
      this.error = 'Este producto ya está configurado como regalo';
      return;
    }

    const nuevoRegalo: ConfiguracionRegalo = {
      producto_id: producto.id,
      cantidad: formValue.cantidad,
      minimo_compra: formValue.minimo_compra,
      stock_disponible: producto.stock,
      producto: producto
    };

    this.regalosConfigurados.push(nuevoRegalo);
    this.actualizarEstadisticas();
    this.emitirConfiguracion();

    // Limpiar formulario
    this.regaloForm.reset({
      cantidad: 1,
      minimo_compra: 0
    });
  }

  removerRegalo(index: number): void {
    this.regalosConfigurados.splice(index, 1);
    this.actualizarEstadisticas();
    this.emitirConfiguracion();
  }

  actualizarRegalo(index: number, campo: string, valor: any): void {
    this.regalosConfigurados[index][campo as keyof ConfiguracionRegalo] = valor;
    this.actualizarEstadisticas();
    this.emitirConfiguracion();
  }

  verificarDisponibilidad(regalo: ConfiguracionRegalo): void {
    if (!this.recompensaId) return;

    this.recompensasService.verificarDisponibilidadRegalo(this.recompensaId, regalo.id!).subscribe({
      next: (response) => {
        if (response.success) {
          regalo.stock_disponible = response.data.stock_disponible;
          this.actualizarEstadisticas();
        }
      },
      error: (error) => {
        console.error('Error verificando disponibilidad:', error);
      }
    });
  }

  simularOtorgamiento(): void {
    if (this.simulacion.cantidad_clientes <= 0) return;

    this.simulacion.calculando = true;

    const datosSimulacion = {
      cantidad_clientes: this.simulacion.cantidad_clientes,
      regalos_configurados: this.regalosConfigurados
    };

    this.recompensasService.simularRegalos(this.recompensaId!, datosSimulacion).subscribe({
      next: (response) => {
        if (response.success) {
          this.simulacion.regalos_otorgados = response.data.regalos_otorgados;
          this.simulacion.stock_restante = response.data.stock_restante;
        }
        this.simulacion.calculando = false;
      },
      error: (error) => {
        console.error('Error simulando regalos:', error);
        this.simulacion.calculando = false;
        // Calcular manualmente como fallback
        this.calcularSimulacionManual();
      }
    });
  }

  calcularSimulacionManual(): void {
    const clientes = this.simulacion.cantidad_clientes;
    let regalosOtorgados = 0;
    let stockRestante = 0;

    this.regalosConfigurados.forEach(regalo => {
      const maxRegalos = Math.floor(regalo.stock_disponible / regalo.cantidad);
      const regalosParaClientes = Math.min(clientes, maxRegalos);
      regalosOtorgados += regalosParaClientes;
      stockRestante += regalo.stock_disponible - (regalosParaClientes * regalo.cantidad);
    });

    this.simulacion.regalos_otorgados = regalosOtorgados;
    this.simulacion.stock_restante = stockRestante;
  }

  guardarConfiguracion(): void {
    if (this.configuracionForm.invalid || !this.recompensaId) return;

    this.loading = true;
    this.error = null;

    const configuracion = {
      ...this.configuracionForm.value,
      regalos: this.regalosConfigurados
    };

    this.recompensasService.crearConfiguracionRegalos(this.recompensaId, configuracion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Configuración de regalos guardada:', response.data);
          this.emitirConfiguracion();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error guardando configuración de regalos:', error);
        this.error = 'Error al guardar la configuración';
        this.loading = false;
      }
    });
  }

  private actualizarEstadisticas(): void {
    this.estadisticas.total_regalos = this.regalosConfigurados.length;
    this.estadisticas.valor_total_regalos = this.regalosConfigurados.reduce((total, regalo) => {
      return total + (regalo.producto.precio_venta * regalo.cantidad);
    }, 0);
    this.estadisticas.stock_total_disponible = this.regalosConfigurados.reduce((total, regalo) => {
      return total + regalo.stock_disponible;
    }, 0);
    this.estadisticas.productos_sin_stock = this.regalosConfigurados.filter(r => r.stock_disponible === 0).length;
  }

  private emitirConfiguracion(): void {
    if (this.configuracionForm.valid) {
      const configuracion = {
        ...this.configuracionForm.value,
        regalos: this.regalosConfigurados
      };
      this.configuracionChange.emit(configuracion);
    }
  }

  getProductoSeleccionado(): ProductoRegalo | null {
    const productoId = this.regaloForm.get('producto_id')?.value;
    return this.productosDisponibles.find(p => p.id === productoId) || null;
  }

  getStockDisponible(): number {
    const producto = this.getProductoSeleccionado();
    return producto ? producto.stock : 0;
  }

  getCantidadMaxima(): number {
    const stock = this.getStockDisponible();
    const cantidad = this.regaloForm.get('cantidad')?.value || 1;
    return Math.floor(stock / cantidad);
  }

  getRegalosConfiguradosCount(): number {
    return this.regalosConfigurados.length;
  }

  getValorTotalRegalos(): number {
    return this.estadisticas.valor_total_regalos;
  }
}
