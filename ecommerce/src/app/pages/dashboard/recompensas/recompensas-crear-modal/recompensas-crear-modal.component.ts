import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecompensasService } from '../../../../services/recompensas.service';
import { ProductosService } from '../../../../services/productos.service';
import { CategoriasService } from '../../../../services/categorias.service';
import { EstadoRecompensa } from '../../../../models/recompensa.model';

import { BaseModalComponent } from '../../../../components/base-modal/base-modal.component';

@Component({
  selector: 'app-recompensas-crear-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './recompensas-crear-modal.component.html',
  styleUrls: ['./recompensas-crear-modal.component.scss'],
  animations: []
})
export class RecompensasCrearModalComponent implements OnInit {
  @Input() mostrar = false;
  @Input() modoSoloLectura = false;
  @Input() modoEdicion = false;
  @Input() recompensaId?: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() recompensaCreada = new EventEmitter<any>();

  formulario: FormGroup;
  loading = false;
  error: string | null = null;
  slideDirection: 'forward' | 'backward' = 'forward';
  
  // Control del wizard
  pasoActual = 0;
  pasos = [
    'Información Básica',
    'Configuración',
    'Segmentación',
    'Productos',
    'Resumen'
  ];

  // Validación por paso
  validacionesPaso: { [key: number]: () => boolean } = {
    0: () => this.validarPaso1(),
    1: () => this.validarPaso2(),
    2: () => this.validarPaso3(),
    3: () => this.validarPaso4(),
    4: () => this.validarPaso5()
  };

  // Opciones
  tiposRecompensa: any[] = [];
  estadosRecompensa: any[] = [];

  // Fecha mínima (hoy)
  hoyStr: string;

  // Búsqueda y selección
  busquedaCliente = '';
  busquedaProducto = '';
  busquedaCategoria = '';
  
  clientesFiltrados: any[] = [];
  productosFiltrados: any[] = [];
  categoriasFiltradas: any[] = [];
  
  clientesSeleccionados: any[] = [];
  productosSeleccionados: any[] = [];
  categoriasSeleccionadas: any[] = [];
  segmentosSeleccionados: any[] = [];
  segmentosDisponibles: any[] = [];

  // Estados de carga
  cargandoProductos = false;
  cargandoCategorias = false;
  cargandoClientes = false;

  // Timers para debounce
  private searchProductosTimer: any;
  private searchCategoriasTimer: any;
  private searchClientesTimer: any;

  constructor(
    private fb: FormBuilder,
    private recompensasService: RecompensasService,
    private productosService: ProductosService,
    private categoriasService: CategoriasService
  ) {
    // Calcular fecha mínima
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    this.hoyStr = `${y}-${m}-${d}`;

    // Inicializar formulario
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      tipo: ['puntos', Validators.required],
      fecha_inicio: ['', [Validators.required, this.validarFechaNoPasada.bind(this)]],
      fecha_fin: ['', Validators.required],
      estado: ['activa'],

      // Configuración según tipo
      // Puntos
      puntos_por_compra: [0, [Validators.min(0)]],
      puntos_por_monto: [0, [Validators.min(0)]],
      puntos_registro: [0, [Validators.min(0)]],

      // Descuento
      tipo_descuento: ['porcentaje'],
      valor_descuento: [0, [Validators.min(0)]],
      compra_minima: [0, [Validators.min(0)]],

      // Envío gratis
      compra_minima_envio: [0, [Validators.min(0)]],
      zonas_envio: ['todas'],

      // Regalo
      producto_regalo: [''],
      compra_minima_regalo: [0, [Validators.min(0)]],

      // Segmentación
      tipo_segmentacion: ['todos', Validators.required],

      // Productos y categorías
      aplicar_a: ['todos'],
      productos_seleccionados: [[]],
      categorias_seleccionadas: [[]]
    });
  }

  ngOnInit(): void {
    this.cargarTiposYEstados();
    this.configurarEscuchaFechaInicio();
    this.cargarSegmentosDisponibles();
    
    // Si hay recompensaId, cargar los datos
    if (this.recompensaId) {
      this.cargarDatosRecompensa(this.recompensaId);
    }
    
    // Si está en modo solo lectura, deshabilitar todo el formulario
    if (this.modoSoloLectura) {
      this.formulario.disable();
    }
  }

  cargarDatosRecompensa(id: number): void {
    this.loading = true;
    
    this.recompensasService.obtenerDetalle(id).subscribe({
      next: (response: any) => {
        const detalle = response.data?.recompensa || response.data;
        const config = response.data?.configuracion || {};
        
        // Cargar datos básicos en el formulario
        this.formulario.patchValue({
          nombre: detalle.nombre,
          descripcion: detalle.descripcion,
          tipo: detalle.tipo,
          fecha_inicio: detalle.fecha_inicio?.split('T')[0],
          fecha_fin: detalle.fecha_fin?.split('T')[0],
          estado: detalle.estado,
          tipo_segmentacion: detalle.tipo_segmentacion || 'todos',
          aplicar_a: detalle.aplicar_a || 'todos'
        });
        
        // Cargar configuración específica
        this.cargarConfiguracionTipo(config, detalle.tipo);
        
        // Cargar segmentos y clientes
        this.cargarSegmentosYClientes(config);
        
        // Cargar productos y categorías
        this.cargarProductosYCategorias(config);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando detalle:', error);
        this.error = 'Error al cargar los datos de la recompensa';
        this.loading = false;
      }
    });
  }

  cargarConfiguracionTipo(config: any, tipo: string): void {
    if (tipo === 'descuento' && config.descuentos?.[0]) {
      const desc = config.descuentos[0];
      this.formulario.patchValue({
        tipo_descuento: desc.tipo_calculo,
        valor_descuento: desc.valor,
        compra_minima: desc.minimo_compra
      });
    } else if (tipo === 'puntos' && config.puntos?.[0]) {
      const pts = config.puntos[0];
      this.formulario.patchValue({
        puntos_por_compra: pts.puntos_por_compra,
        puntos_por_monto: pts.valor
      });
    }
  }

  cargarSegmentosYClientes(config: any): void {
    if (config.clientes) {
      this.segmentosSeleccionados = config.clientes
        .filter((c: any) => !c.es_cliente_especifico && c.segmento)
        .map((c: any) => ({ id: c.segmento, nombre: c.segmento_nombre || c.segmento }));
      
      this.clientesSeleccionados = config.clientes
        .filter((c: any) => c.es_cliente_especifico && c.cliente)
        .map((c: any) => c.cliente);
    }
  }

  cargarProductosYCategorias(config: any): void {
    if (config.productos) {
      this.productosSeleccionados = config.productos
        .filter((p: any) => p.tipo_elemento === 'producto' && p.producto)
        .map((p: any) => p.producto);
      
      this.categoriasSeleccionadas = config.productos
        .filter((p: any) => p.tipo_elemento === 'categoria' && p.categoria)
        .map((p: any) => p.categoria);
    }
  }

  cargarSegmentosDisponibles(): void {
    this.segmentosDisponibles = [
      { id: 'todos', nombre: 'Todos los clientes', descripcion: 'Todos los clientes activos del sistema' },
      { id: 'nuevos', nombre: 'Clientes nuevos (últimos 30 días)', descripcion: 'Clientes registrados en los últimos 30 días' },
      { id: 'recurrentes', nombre: 'Clientes recurrentes (más de 1 compra)', descripcion: 'Clientes con 30-365 días de antigüedad' },
      { id: 'vip', nombre: 'Clientes VIP (compras > S/1000)', descripcion: 'Clientes con más de 365 días, +5 pedidos, +$1000 gastado' }
    ];
  }

  cargarTiposYEstados(): void {
    this.recompensasService.obtenerTipos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tiposRecompensa = response.data.tipos || [
            { value: 'puntos', label: 'Sistema de Puntos' },
            { value: 'descuento', label: 'Descuentos' },
            { value: 'envio_gratis', label: 'Envío Gratuito' },
            { value: 'regalo', label: 'Productos de Regalo' }
          ];

          const estadosCrudos = (response.data.estados || []).map((e: any) => ({
            value: e.value,
            label: e.label
          }));
          this.estadosRecompensa = this.filtrarEstadosParaCreacion(estadosCrudos);

          // Establecer estado por defecto
          const estadoDefault = this.obtenerEstadoDefaultDesdeLista(this.estadosRecompensa);
          this.formulario.patchValue({ estado: estadoDefault }, { emitEvent: false });
        }
      },
      error: (error) => {
        console.error('Error cargando tipos:', error);
        this.tiposRecompensa = [
          { value: 'puntos', label: 'Sistema de Puntos' },
          { value: 'descuento', label: 'Descuentos' },
          { value: 'envio_gratis', label: 'Envío Gratuito' },
          { value: 'regalo', label: 'Productos de Regalo' }
        ];
        this.estadosRecompensa = [
          { value: 'activa', label: 'Activa' },
          { value: 'pausada', label: 'Pausada' }
        ];
      }
    });
  }

  configurarEscuchaFechaInicio(): void {
    this.formulario.get('fecha_inicio')?.valueChanges.subscribe(fechaInicio => {
      if (fechaInicio) {
        this.actualizarEstadosDisponibles(fechaInicio);
      }
    });
  }

  actualizarEstadosDisponibles(fechaInicio: string): void {
    this.recompensasService.obtenerEstadosDisponibles(fechaInicio).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const estadosCrudos = response.data.estados_disponibles.map((estado: any) => ({
            value: estado.value,
            label: estado.label
          }));
          this.estadosRecompensa = this.filtrarEstadosParaCreacion(estadosCrudos);

          const estadoActual = this.formulario.get('estado')?.value;
          const estadoValido = this.estadosRecompensa.find(e => e.value === estadoActual)?.value
            || this.obtenerEstadoDefaultDesdeLista(this.estadosRecompensa);
          this.formulario.patchValue({ estado: estadoValido }, { emitEvent: false });
        }
      },
      error: (error) => {
        console.error('Error obteniendo estados:', error);
      }
    });
  }

  private filtrarEstadosParaCreacion(estados: { value: string; label: string }[]): { value: string; label: string }[] {
    const fechaInicio = this.formulario.get('fecha_inicio')?.value;
    const hoy = new Date();
    const fecha = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
    const esFuturo = fecha ? fecha > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) : false;

    const baseSinProhibidos = estados.filter(e => e.value !== 'expirada' && e.value !== 'cancelada');
    const permitidos = esFuturo ? ['programada', 'pausada'] : ['activa', 'pausada'];
    let resultado = baseSinProhibidos.filter(e => permitidos.includes(e.value));

    if (!resultado.find(e => e.value === 'pausada')) {
      resultado.push({ value: 'pausada', label: 'Pausada' });
    }

    if (esFuturo) {
      resultado = resultado.map(e => e.value === 'programada' ? { ...e, label: 'Programada' } : e);
      resultado = resultado.filter(e => e.value !== 'activa');
    } else {
      if (!resultado.find(e => e.value === 'activa')) {
        resultado.push({ value: 'activa', label: 'Activa' });
      }
      resultado = resultado.filter(e => e.value !== 'programada');
    }

    return resultado;
  }

  private obtenerEstadoDefaultDesdeLista(estados: { value: string; label: string }[]): 'programada' | 'activa' | 'pausada' {
    if (estados.find(e => e.value === 'activa')) return 'activa';
    if (estados.find(e => e.value === 'programada')) return 'programada';
    return 'pausada';
  }

  // Métodos de navegación del wizard
  siguientePaso(): void {
    if (this.validacionesPaso[this.pasoActual]()) {
      if (this.pasoActual < this.pasos.length - 1) {
        this.slideDirection = 'forward';
        this.pasoActual++;
        this.scrollToTop();
      }
    }
  }

  anteriorPaso(): void {
    if (this.pasoActual > 0) {
      this.slideDirection = 'backward';
      this.pasoActual--;
      this.scrollToTop();
    }
  }

  scrollToTop(): void {
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
      modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  puedeIrAPaso(paso: number): boolean {
    // Siempre se puede ir a pasos anteriores
    if (paso < this.pasoActual) return true;
    // No se puede saltar a pasos futuros si no se han completado los anteriores
    for (let i = 0; i < paso; i++) {
      if (!this.validacionesPaso[i]()) return false;
    }
    return true;
  }

  irAPaso(paso: number): void {
    if (paso >= 0 && paso < this.pasos.length && this.puedeIrAPaso(paso)) {
      this.slideDirection = paso > this.pasoActual ? 'forward' : 'backward';
      this.pasoActual = paso;
      this.scrollToTop();
    }
  }

  // Métodos de validación por paso
  validarPaso1(): boolean {
    const nombre = this.formulario.get('nombre')?.value?.trim();
    const descripcion = this.formulario.get('descripcion')?.value?.trim();
    const tipo = this.formulario.get('tipo')?.value;
    const fechaInicio = this.formulario.get('fecha_inicio')?.value;
    const fechaFin = this.formulario.get('fecha_fin')?.value;

    return !!(nombre && descripcion && tipo && fechaInicio && fechaFin && 
             nombre.length >= 3 && descripcion.length >= 10);
  }

  validarPaso2(): boolean {
    const tipo = this.formulario.get('tipo')?.value;
    
    switch (tipo) {
      case 'puntos':
        const puntosPorCompra = this.formulario.get('puntos_por_compra')?.value;
        const puntosPorMonto = this.formulario.get('puntos_por_monto')?.value;
        return (puntosPorCompra >= 0 && puntosPorMonto >= 0) && (puntosPorCompra > 0 || puntosPorMonto > 0);
        
      case 'descuento':
        const valorDescuento = this.formulario.get('valor_descuento')?.value;
        return valorDescuento > 0;
        
      case 'envio_gratis':
        const compraMinima = this.formulario.get('compra_minima_envio')?.value;
        return compraMinima >= 0;
        
      case 'regalo':
        return true; // Los regalos se pueden configurar después
        
      default:
        return false;
    }
  }

  validarPaso3(): boolean {
    const tipoSegmentacion = this.formulario.get('tipo_segmentacion')?.value;
    return !!tipoSegmentacion;
  }

  validarPaso4(): boolean {
    // La selección de productos es opcional, siempre válido
    return true;
  }

  validarPaso5(): boolean {
    // El resumen siempre es válido si llegamos hasta aquí
    return this.validarPaso1() && this.validarPaso2() && this.validarPaso3();
  }

  getTituloPasoActual(): string {
    return this.pasos[this.pasoActual];
  }

  private validarFechaNoPasada(control: any) {
    const valor: string = control?.value;
    if (!valor) return null;
    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fecha = new Date(valor + 'T00:00:00');
    return fecha < hoySinHora ? { fechaPasada: true } : null;
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposRecompensa.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  getSegmentacionLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'todos': 'Todos los clientes',
      'nuevos': 'Solo clientes nuevos',
      'frecuentes': 'Clientes frecuentes',
      'vip': 'Clientes VIP'
    };
    return labels[tipo] || tipo;
  }

  get tipoSeleccionado(): string {
    return this.formulario.get('tipo')?.value || 'puntos';
  }

  cerrarModal(): void {
    this.formulario.reset({
      tipo: 'puntos',
      tipo_descuento: 'porcentaje',
      tipo_cobertura: 'nacional',
      tipo_segmentacion: 'todos'
    });
    this.error = null;
    this.cerrar.emit();
  }

  async crearRecompensa(): Promise<void> {
    if (this.formulario.invalid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const valores = this.formulario.value;

      // Preparar datos completos de la recompensa
      // IMPORTANTE: Siempre crear como 'pausada' primero para poder configurar todo
      // Luego activar en el PASO 5 si el usuario eligió 'activa'
      const estadoDeseado = valores.estado || 'activa';
      const datosRecompensa: any = {
        nombre: valores.nombre?.trim(),
        descripcion: valores.descripcion?.trim(),
        tipo: valores.tipo,
        fecha_inicio: valores.fecha_inicio,
        fecha_fin: valores.fecha_fin,
        estado: 'pausada', // Siempre crear pausada primero
        
        // Configuración según el tipo
        configuracion: this.prepararConfiguracion(valores),
        
        // Segmentación
        tipo_segmentacion: valores.tipo_segmentacion || 'todos',
        
        // Productos/categorías
        aplicar_a: valores.aplicar_a || 'todos'
      };

      console.log('Enviando datos:', datosRecompensa);

      // Crear la recompensa
      this.recompensasService.crear(datosRecompensa).subscribe({
        next: async (response) => {
          console.log('Respuesta del servidor:', response);
          
          if (response.success && response.data) {
            const recompensaId = (response.data as any).recompensa?.id || response.data.id;
            
            // Guardar segmentos, productos y configuración (PASOS 2-4)
            // Y activar si corresponde (PASO 5)
            await this.guardarDatosAdicionales(recompensaId, estadoDeseado);
            
            this.loading = false;
            this.recompensaCreada.emit(response.data);
            this.mostrarMensajeExito();
            this.cerrarModal();
          } else {
            throw new Error(response.message || 'Error al crear la recompensa');
          }
        },
        error: (error) => {
          console.error('Error del servidor:', error);
          this.loading = false;
          
          if (error.error?.message) {
            this.error = error.error.message;
          } else if (error.message) {
            this.error = error.message;
          } else {
            this.error = 'Error al crear la recompensa. Por favor intenta nuevamente.';
          }
        }
      });

    } catch (error: any) {
      console.error('Error preparando datos:', error);
      this.error = error.message || 'Error al procesar los datos';
      this.loading = false;
    }
  }

  private prepararConfiguracion(valores: any): any {
    const config: any = {};

    switch (valores.tipo) {
      case 'puntos':
        config.puntos_por_compra = valores.puntos_por_compra || 0;
        config.puntos_por_monto = valores.puntos_por_monto || 0;
        config.puntos_registro = valores.puntos_registro || 0;
        break;

      case 'descuento':
        config.tipo_descuento = valores.tipo_descuento || 'porcentaje';
        config.valor_descuento = valores.valor_descuento || 0;
        config.compra_minima = valores.compra_minima || 0;
        break;

      case 'envio_gratis':
        config.compra_minima_envio = valores.compra_minima_envio || 0;
        config.zonas_envio = valores.zonas_envio || 'todas';
        break;

      case 'regalo':
        config.producto_regalo = valores.producto_regalo || '';
        config.compra_minima_regalo = valores.compra_minima_regalo || 0;
        break;
    }

    return config;
  }

  private mostrarMensajeExito(): void {
    // Aquí podrías mostrar un toast o notificación de éxito
    console.log('Recompensa creada exitosamente');
  }

  private async guardarDatosAdicionales(recompensaId: number, estadoDeseado: string): Promise<void> {
    try {
      const valores = this.formulario.value;

      console.log(`ℹ️ Estado deseado por el usuario: ${estadoDeseado}`);

      // PASO 2: Asignar Segmentos de Clientes
      await this.ejecutarPaso2Segmentos(recompensaId);

      // PASO 3: Asignar Productos/Categorías
      await this.ejecutarPaso3Productos(recompensaId);

      // PASO 4: Configurar el Beneficio según tipo
      await this.ejecutarPaso4Configuracion(recompensaId, valores);

      // PASO 5: Activar la Recompensa (si el usuario eligió 'activa')
      // Como creamos la recompensa en estado 'pausada', ahora podemos activarla
      if (estadoDeseado === 'activa') {
        await this.ejecutarPaso5Activar(recompensaId);
      } else {
        console.log(`  ℹ️ Recompensa quedará en estado '${estadoDeseado}' (no se activa)`);
      }

      console.log('✅ Flujo completo de 5 pasos ejecutado correctamente');
    } catch (error) {
      console.error('❌ Error en el flujo de creación:', error);
      throw error; // Lanzar error para que se muestre al usuario
    }
  }

  // PASO 2: Asignar Segmentos de Clientes
  private async ejecutarPaso2Segmentos(recompensaId: number): Promise<void> {
    console.log('📋 PASO 2: Asignando segmentos...');
    
    // Opción A: Segmentos predefinidos (vip, nuevos, recurrentes)
    for (const segmento of this.segmentosSeleccionados) {
      const payload = {
        segmento: segmento.id,
        cliente_id: null
      };
      console.log('  👥 Enviando payload segmento:', payload);
      await this.recompensasService.asignarSegmento(recompensaId, payload).toPromise();
      console.log(`  ✓ Segmento asignado: ${segmento.nombre}`);
    }

    // Opción B: Clientes específicos
    for (const cliente of this.clientesSeleccionados) {
      const payload = {
        segmento: 'especifico',
        cliente_id: cliente.id
      };
      console.log('  👤 Enviando payload cliente específico:', payload);
      await this.recompensasService.asignarSegmento(recompensaId, payload).toPromise();
      console.log(`  ✓ Cliente específico asignado: ${cliente.nombre || cliente.id}`);
    }

    // Opción C: Si no hay selección, asignar "todos"
    if (this.segmentosSeleccionados.length === 0 && this.clientesSeleccionados.length === 0) {
      const payload = {
        segmento: 'todos',
        cliente_id: null
      };
      console.log('  👥 Enviando payload todos:', payload);
      await this.recompensasService.asignarSegmento(recompensaId, payload).toPromise();
      console.log('  ✓ Asignado a todos los clientes');
    }
  }

  // PASO 3: Asignar Productos/Categorías
  private async ejecutarPaso3Productos(recompensaId: number): Promise<void> {
    console.log('🛍️ PASO 3: Asignando productos/categorías...');
    
    // Opción A: Productos específicos
    for (const producto of this.productosSeleccionados) {
      const payload: any = {
        tipo: 'producto',
        producto_id: producto.id
        // NO incluir categoria_id
      };
      console.log('  📦 Enviando payload producto:', payload);
      await this.recompensasService.asignarProducto(recompensaId, payload).toPromise();
      console.log(`  ✓ Producto asignado: ${producto.nombre || producto.id}`);
    }

    // Opción B: Categorías completas
    for (const categoria of this.categoriasSeleccionadas) {
      const payload: any = {
        tipo: 'categoria',
        categoria_id: categoria.id
        // NO incluir producto_id
      };
      console.log('  📦 Enviando payload categoría:', payload);
      await this.recompensasService.asignarProducto(recompensaId, payload).toPromise();
      console.log(`  ✓ Categoría asignada: ${categoria.nombre || categoria.id}`);
    }

    // Opción C: Si no hay selección, no enviar nada (el backend asume "todos" por defecto)
    if (this.productosSeleccionados.length === 0 && this.categoriasSeleccionadas.length === 0) {
      console.log('  ℹ️ No se seleccionaron productos ni categorías - aplicará a todos por defecto');
    }
  }

  // PASO 4: Configurar el Beneficio
  private async ejecutarPaso4Configuracion(recompensaId: number, valores: any): Promise<void> {
    console.log('🎁 PASO 4: Configurando beneficio...');
    const tipo = valores.tipo;

    if (tipo === 'puntos') {
      // 4A: Configuración de puntos
      const payload = {
        tipo_calculo: 'porcentaje',
        puntos_por_compra: valores.puntos_por_compra || 0,
        compra_minima: valores.compra_minima || 0,
        maximo_puntos: valores.maximo_puntos || null,
        multiplicador_nivel: valores.multiplicador_nivel || 1.0,
        otorga_puntos_por_registro: valores.puntos_registro > 0
      };
      await this.recompensasService.crearConfiguracionPuntos(recompensaId, payload).toPromise();
      console.log('  ✓ Configuración de puntos creada');

    } else if (tipo === 'descuento') {
      // 4B: Configuración de descuentos
      const payload = {
        tipo_descuento: valores.tipo_descuento || 'porcentaje',
        valor_descuento: valores.valor_descuento || 0,
        compra_minima: valores.compra_minima || 0,
        descuento_maximo: valores.descuento_maximo || null
      };
      await this.recompensasService.crearConfiguracionDescuentos(recompensaId, payload).toPromise();
      console.log('  ✓ Configuración de descuentos creada');

    } else if (tipo === 'envio_gratis') {
      // 4C: Configuración de envío gratis
      const payload = {
        compra_minima: valores.compra_minima_envio || 0,
        zonas_aplicables: valores.zonas_envio === 'todas' ? [] : (valores.zonas_envio || []),
        aplica_todo_peru: valores.zonas_envio === 'todas'
      };
      await this.recompensasService.crearConfiguracionEnvios(recompensaId, payload).toPromise();
      console.log('  ✓ Configuración de envío gratis creada');

    } else if (tipo === 'regalo') {
      // 4D: Configuración de regalo
      const payload = {
        producto_id: valores.producto_regalo_id || null,
        cantidad: valores.cantidad_regalo || 1,
        compra_minima: valores.compra_minima_regalo || 0
      };
      await this.recompensasService.crearConfiguracionRegalos(recompensaId, payload).toPromise();
      console.log('  ✓ Configuración de regalo creada');
    }
  }

  // PASO 5: Activar la Recompensa
  private async ejecutarPaso5Activar(recompensaId: number): Promise<void> {
    console.log('🚀 PASO 5: Activando recompensa...');
    
    try {
      const response = await this.recompensasService.activar(recompensaId).toPromise();
      console.log('  ✓ Recompensa activada exitosamente');
      if (response && response.data) {
        console.log('  Validaciones:', {
          tiene_clientes: (response.data as any).tiene_clientes,
          tiene_productos: (response.data as any).tiene_productos,
          tiene_configuracion: (response.data as any).tiene_configuracion
        });
      }
    } catch (error: any) {
      console.error('  ❌ Error al activar:', error);
      // Si falla la activación, mostrar el error específico
      if (error.error?.message) {
        throw new Error(`No se pudo activar: ${error.error.message}`);
      }
      throw error;
    }
  }

  // Métodos de segmentación
  toggleSegmento(segmento: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.segmentosSeleccionados.findIndex(s => s.id === segmento.id);
    if (index > -1) {
      this.segmentosSeleccionados.splice(index, 1);
    } else {
      this.segmentosSeleccionados.push(segmento);
    }
  }

  isSegmentoSeleccionado(segmento: any): boolean {
    return this.segmentosSeleccionados.some(s => s.id === segmento.id);
  }

  removeSegmento(segmento: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.segmentosSeleccionados.findIndex(s => s.id === segmento.id);
    if (index > -1) {
      this.segmentosSeleccionados.splice(index, 1);
    }
  }

  buscarClientesEspecificos(): void {
    if (this.modoSoloLectura) return; // No permitir búsquedas en modo solo lectura
    
    // Limpiar timer anterior
    if (this.searchClientesTimer) {
      clearTimeout(this.searchClientesTimer);
    }

    if (!this.busquedaCliente || this.busquedaCliente.length < 2) {
      this.clientesFiltrados = [];
      return;
    }
    
    // Debounce de 500ms
    this.searchClientesTimer = setTimeout(() => {
      this.cargandoClientes = true;
      this.recompensasService.buscarClientes({ 
        buscar: this.busquedaCliente, 
        limite: 10 
      }).subscribe({
        next: (response) => {
          console.log('Respuesta buscar clientes:', response);
          
          // Manejar diferentes formatos de respuesta
          if (response.success && response.data) {
            // Si data es un array
            if (Array.isArray(response.data)) {
              this.clientesFiltrados = response.data;
            }
            // Si data tiene una propiedad clientes
            else if ((response.data as any).clientes && Array.isArray((response.data as any).clientes)) {
              this.clientesFiltrados = (response.data as any).clientes;
            }
            // Si data es un objeto con los clientes directamente
            else {
              this.clientesFiltrados = [response.data];
            }
          } else {
            this.clientesFiltrados = [];
          }
          
          console.log('Clientes filtrados:', this.clientesFiltrados);
          this.cargandoClientes = false;
        },
        error: (error) => {
          console.error('Error buscando clientes:', error);
          this.clientesFiltrados = [];
          this.cargandoClientes = false;
        }
      });
    }, 500);
  }

  agregarClienteEspecifico(cliente: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    if (!this.clientesSeleccionados.some(c => c.id === cliente.id)) {
      this.clientesSeleccionados.push(cliente);
      this.busquedaCliente = '';
      this.clientesFiltrados = [];
    }
  }

  removeCliente(cliente: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.clientesSeleccionados.findIndex(c => c.id === cliente.id);
    if (index > -1) {
      this.clientesSeleccionados.splice(index, 1);
    }
  }

  // Métodos de productos
  onAplicarATipoChange(): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const tipo = this.formulario.get('aplicar_a')?.value;
    if (tipo === 'todos') {
      this.productosSeleccionados = [];
      this.categoriasSeleccionadas = [];
    }
  }

  buscarProductosAPI(): void {
    if (this.modoSoloLectura) return; // No permitir búsquedas en modo solo lectura
    
    // Limpiar timer anterior
    if (this.searchProductosTimer) {
      clearTimeout(this.searchProductosTimer);
    }

    if (!this.busquedaProducto || this.busquedaProducto.length < 2) {
      this.productosFiltrados = [];
      return;
    }
    
    // Debounce de 300ms
    this.searchProductosTimer = setTimeout(() => {
      this.cargandoProductos = true;
      
      // Usar ProductosService directamente
      this.productosService.obtenerProductos().subscribe({
        next: (productos) => {
          // Filtrar localmente por el término de búsqueda
          const termino = this.busquedaProducto.toLowerCase();
          this.productosFiltrados = (productos || []).filter((p: any) => 
            p.nombre?.toLowerCase().includes(termino) ||
            p.codigo?.toLowerCase().includes(termino) ||
            p.descripcion?.toLowerCase().includes(termino)
          ).slice(0, 20);
          
          this.cargandoProductos = false;
        },
        error: (error) => {
          console.error('Error buscando productos:', error);
          this.productosFiltrados = [];
          this.cargandoProductos = false;
        }
      });
    }, 300);
  }

  toggleProducto(producto: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.productosSeleccionados.findIndex(p => p.id === producto.id);
    if (index > -1) {
      this.productosSeleccionados.splice(index, 1);
    } else {
      this.productosSeleccionados.push(producto);
    }
  }

  isProductoSeleccionado(producto: any): boolean {
    return this.productosSeleccionados.some(p => p.id === producto.id);
  }

  removeProducto(producto: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.productosSeleccionados.findIndex(p => p.id === producto.id);
    if (index > -1) {
      this.productosSeleccionados.splice(index, 1);
    }
  }

  // Métodos de categorías
  buscarCategoriasAPI(): void {
    if (this.modoSoloLectura) return; // No permitir búsquedas en modo solo lectura
    
    // Limpiar timer anterior
    if (this.searchCategoriasTimer) {
      clearTimeout(this.searchCategoriasTimer);
    }

    if (!this.busquedaCategoria || this.busquedaCategoria.length < 2) {
      this.categoriasFiltradas = [];
      return;
    }
    
    // Debounce de 300ms
    this.searchCategoriasTimer = setTimeout(() => {
      this.cargandoCategorias = true;
      
      // Usar CategoriasService directamente
      this.categoriasService.obtenerCategorias().subscribe({
        next: (categorias) => {
          // Filtrar localmente por el término de búsqueda
          const termino = this.busquedaCategoria.toLowerCase();
          this.categoriasFiltradas = (categorias || []).filter((c: any) => 
            c.nombre?.toLowerCase().includes(termino) ||
            c.descripcion?.toLowerCase().includes(termino)
          ).slice(0, 20);
          
          this.cargandoCategorias = false;
        },
        error: (error) => {
          console.error('Error buscando categorías:', error);
          this.categoriasFiltradas = [];
          this.cargandoCategorias = false;
        }
      });
    }, 300);
  }

  toggleCategoria(categoria: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.categoriasSeleccionadas.findIndex(c => c.id === categoria.id);
    if (index > -1) {
      this.categoriasSeleccionadas.splice(index, 1);
    } else {
      this.categoriasSeleccionadas.push(categoria);
    }
  }

  isCategoriaSeleccionada(categoria: any): boolean {
    return this.categoriasSeleccionadas.some(c => c.id === categoria.id);
  }

  removeCategoria(categoria: any): void {
    if (this.modoSoloLectura) return; // No permitir cambios en modo solo lectura
    
    const index = this.categoriasSeleccionadas.findIndex(c => c.id === categoria.id);
    if (index > -1) {
      this.categoriasSeleccionadas.splice(index, 1);
    }
  }

  private async asignarSegmentacion(recompensaId: number, tipoSegmentacion: string): Promise<void> {
    try {
      const payload = { segmento: tipoSegmentacion || 'todos' };
      await this.recompensasService.asignarSegmento(recompensaId, payload).toPromise();
      console.log('Segmentación asignada:', payload);
    } catch (error) {
      console.warn('Error asignando segmentación:', error);
      // No fallar por esto
    }
  }

  private async asignarProductosOCategorias(recompensaId: number, valores: any): Promise<void> {
    try {
      // Si hay productos seleccionados
      if (valores.productos_seleccionados && valores.productos_seleccionados.length > 0) {
        for (const productoId of valores.productos_seleccionados) {
          const payload: any = {
            tipo: 'producto',
            producto_id: productoId
            // NO incluir categoria_id
          };
          await this.recompensasService.asignarProducto(recompensaId, payload).toPromise();
          console.log('Producto asignado:', productoId);
        }
      }

      // Si hay categorías seleccionadas
      if (valores.categorias_seleccionadas && valores.categorias_seleccionadas.length > 0) {
        for (const categoriaId of valores.categorias_seleccionadas) {
          const payload: any = {
            tipo: 'categoria',
            categoria_id: categoriaId
            // NO incluir producto_id
          };
          await this.recompensasService.asignarProducto(recompensaId, payload).toPromise();
          console.log('Categoría asignada:', categoriaId);
        }
      }

      // Si no se especificó nada, asignar a "todos" (todas las categorías)
      if ((!valores.productos_seleccionados || valores.productos_seleccionados.length === 0) &&
          (!valores.categorias_seleccionadas || valores.categorias_seleccionadas.length === 0)) {
        console.log('No se especificaron productos ni categorías - aplicará a todos');
      }
    } catch (error) {
      console.warn('Error asignando productos/categorías:', error);
      // No fallar por esto
    }
  }

  private async crearConfiguracionSegunTipo(recompensaId: number, valores: any): Promise<void> {
    const tipo = valores.tipo;

    try {
      if (tipo === 'puntos') {
        const payload = {
          puntos_por_compra: valores.puntos_por_compra || 0,
          puntos_por_monto: valores.puntos_por_monto || 0,
          puntos_registro: valores.puntos_registro || 0,
          valor_por_punto: 0,
          multiplicador_puntos: 1
        };
        await this.recompensasService.crearConfiguracionPuntos(recompensaId, payload).toPromise();
        console.log('Configuración de puntos creada:', payload);

      } else if (tipo === 'descuento') {
        const payload = {
          tipo_descuento: valores.tipo_descuento || 'porcentaje',
          valor_descuento: valores.valor_descuento || 0,
          compra_minima: valores.compra_minima || 0
        };
        await this.recompensasService.crearConfiguracionDescuentos(recompensaId, payload).toPromise();
        console.log('Configuración de descuentos creada:', payload);

      } else if (tipo === 'envio_gratis') {
        const payload = {
          compra_minima: valores.minimo_compra_envio || 0,
          tipo_cobertura: valores.tipo_cobertura || 'nacional'
        };
        await this.recompensasService.crearConfiguracionEnvios(recompensaId, payload).toPromise();
        console.log('Configuración de envíos creada:', payload);

      } else if (tipo === 'regalo') {
        const payload = {
          producto_id: valores.producto_regalo_id || null,
          cantidad: valores.cantidad_regalo || 1,
          descripcion_regalo: valores.descripcion_regalo || ''
        };
        await this.recompensasService.crearConfiguracionRegalos(recompensaId, payload).toPromise();
        console.log('Configuración de regalos creada:', payload);
      }
    } catch (error) {
      console.warn('Error creando configuración:', error);
      // No fallar por esto
    }
  }
}
