import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { CartService, CartItem, CartSummary } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { UbigeoService, Departamento, Provincia, Distrito } from '../../services/ubigeo.service';
import { CotizacionesService, CrearCotizacionRequest } from '../../services/cotizaciones.service';
import { ComprasService, CrearCompraRequest } from '../../services/compras.service';
import { DireccionesService, Direccion } from '../../services/direcciones.service';
import { ReniecService } from '../../services/reniec.service';
import { ClienteService } from '../../services/cliente.service';
import { FormaEnvioService, FormaEnvio } from '../../services/forma-envio.service';
import { TipoPagoService, TipoPago } from '../../services/tipo-pago.service';
import { OfertasService } from '../../services/ofertas.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    BreadcrumbComponent,
    ShippingComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutForm!: FormGroup;
  cartItems: CartItem[] = [];
  cartSummary: CartSummary = {
    subtotal: 0,
    igv: 0,
    total: 0,
    cantidad_items: 0
  };

  // Ubigeo data
  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];

  // Estados del componente
  buscandoDocumento = false;
  procesandoPedido = false;
  isLoggedIn = false;

  // Direcciones guardadas
  direccionesGuardadas: Direccion[] = [];
  direccionSeleccionada: Direccion | null = null;
  usarDireccionPersonalizada = false;

  // ✅ Formas de envío y tipos de pago dinámicos
  formasEnvio: FormaEnvio[] = [];
  tiposPago: TipoPago[] = [];
  costoEnvioCalculado = 0;

  // ✅ Cupón aplicado
  cuponAplicado: any = null;
  descuentoCupon = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private ubigeoService: UbigeoService,
    private cotizacionesService: CotizacionesService,
    private comprasService: ComprasService,
    private direccionesService: DireccionesService,
    private reniecService: ReniecService,
    private clienteService: ClienteService,
    private formaEnvioService: FormaEnvioService,
    private tipoPagoService: TipoPagoService,
    private ofertasService: OfertasService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.checkCartItems();
    this.loadCartData();
    this.checkAuthStatus();
    this.loadFormasEnvio(); // ✅ Cargar formas de envío
    this.loadTiposPago(); // ✅ Cargar tipos de pago
    this.loadCuponAplicado(); // ✅ Cargar cupón aplicado desde el carrito
    // Cargar ubigeo primero, luego direcciones
    this.loadUbigeoData().then(() => {
      this.loadDireccionesGuardadas();
    });
  }

  // ✅ Cargar cupón aplicado desde sessionStorage
  private loadCuponAplicado(): void {
    const cuponData = sessionStorage.getItem('cupon_aplicado');
    if (cuponData) {
      try {
        this.cuponAplicado = JSON.parse(cuponData);
        this.descuentoCupon = this.cuponAplicado.descuento_calculado || 0;
        console.log('Cupón cargado:', this.cuponAplicado);
      } catch (e) {
        console.error('Error al parsear cupón:', e);
        this.cuponAplicado = null;
        this.descuentoCupon = 0;
      }
    }
  }

  // ✅ Calcular total con descuento
  getTotalConDescuento(): number {
    return (this.cartSummary.total || 0) - this.descuentoCupon + this.costoEnvioCalculado;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicializar formulario
  private initializeForm(): void {
    this.checkoutForm = this.fb.group({
      numeroDocumento: [''],
      cliente: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      celular: ['', [Validators.required, Validators.pattern('^[9][0-9]{8}$')]],
      departamento: ['', [Validators.required]],
      provincia: [{value: '', disabled: true}, [Validators.required]],
      distrito: [{value: '', disabled: true}, [Validators.required]],
      formaEnvio: ['', [Validators.required]],
      tipoPago: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      aceptaTerminos: [false, [Validators.requiredTrue]],
      observaciones: ['']
    });
  }

  // Verificar si hay items en el carrito
  private checkCartItems(): void {
    if (typeof window !== 'undefined' && this.cartService.isEmpty()) {
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          title: 'Carrito vacío',
          text: 'No tienes productos en tu carrito para procesar la compra',
          icon: 'warning',
          confirmButtonColor: '#dc3545'
        }).then(() => {
          this.router.navigate(['/shop']);
        });
      });
    }
  }

  // Cargar datos del carrito
  private loadCartData(): void {
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        if (items.length === 0) {
          this.router.navigate(['/shop']);
        }
      });

    this.cartService.cartSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.cartSummary = summary;
      });
  }

  // ✅ Cargar formas de envío desde el backend
  private loadFormasEnvio(): void {
    this.formaEnvioService.obtenerActivas().subscribe({
      next: (response) => {
        this.formasEnvio = response.formas_envio || [];
      },
      error: (error) => {
        console.error('Error cargando formas de envío:', error);
      }
    });
  }

  // ✅ Cargar tipos de pago desde el backend
  private loadTiposPago(): void {
    this.tipoPagoService.obtenerActivos().subscribe({
      next: (response) => {
        this.tiposPago = response.tipos_pago;
      },
      error: (error) => {
        console.error('Error cargando tipos de pago:', error);
      }
    });
  }

  // Cargar datos de ubigeo
  private loadUbigeoData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ubigeoService.getDepartamentos().subscribe({
        next: (departamentos) => {
          this.departamentos = departamentos;
          resolve();
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
          reject(error);
        }
      });
    });
  }

  // Verificar estado de autenticación
  private checkAuthStatus(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isLoggedIn = !!user;
        if (user) {
          // Pre-llenar datos del usuario logueado
          this.checkoutForm.patchValue({
            cliente: user.name,
            email: user.email
          });
        }
      });
  }

// Buscar datos por documento - Primero en sistema, luego en RENIEC
buscarDocumento(): void {
  const numeroDocumento = this.checkoutForm.get('numeroDocumento')?.value;
  
  if (!numeroDocumento || numeroDocumento.length < 8) {
    Swal.fire({
      title: 'Número inválido',
      text: 'Ingrese un número de documento válido (DNI: 8 dígitos, RUC: 11 dígitos)',
      icon: 'warning',
      confirmButtonColor: '#dc3545'
    });
    return;
  }

  // Validar longitud según tipo de documento
  if (numeroDocumento.length !== 8 && numeroDocumento.length !== 11) {
    Swal.fire({
      title: 'Número inválido',
      text: 'Ingrese un DNI de 8 dígitos o un RUC de 11 dígitos',
      icon: 'warning',
      confirmButtonColor: '#dc3545'
    });
    return;
  }

  this.buscandoDocumento = true;

  // PASO 1: Buscar primero en el sistema de clientes
  this.clienteService.buscarPorDocumento(numeroDocumento).subscribe({
    next: (response) => {
      console.log('Respuesta del sistema:', response);

      // Si se encontró en el sistema
      if (response.success && response.data && response.data.length > 0) {
        this.buscandoDocumento = false;
        const cliente = response.data[0];
        const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.trim();

        // Autocompletar formulario con datos del sistema
        this.checkoutForm.patchValue({
          cliente: nombreCompleto,
          email: cliente.email || '',
          celular: cliente.telefono || '',
          direccion: cliente.direccion || ''
        });

        Swal.fire({
          title: 'Cliente encontrado',
          text: `Se encontró: ${nombreCompleto}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // PASO 2: Si no se encontró en el sistema, buscar en RENIEC
        console.log('No encontrado en sistema, buscando en RENIEC...');
        this.buscarEnReniec(numeroDocumento);
      }
    },
    error: (error) => {
      console.error('Error buscando en sistema, intentando RENIEC:', error);
      // Si hay error en el sistema, intentar con RENIEC
      this.buscarEnReniec(numeroDocumento);
    }
  });
}

// Método auxiliar para buscar en RENIEC
private buscarEnReniec(numeroDocumento: string): void {
  this.reniecService.buscarPorDni(numeroDocumento).subscribe({
    next: (response) => {
      this.buscandoDocumento = false;
      console.log('Respuesta de RENIEC:', response);

      if (response.success !== false && (response.nombre || response.nombres || response.razonSocial)) {
        let nombreCompleto = '';

        // Para DNI (8 dígitos)
        if (numeroDocumento.length === 8) {
          if (response.nombres && response.apellidoPaterno && response.apellidoMaterno) {
            nombreCompleto = `${response.nombres} ${response.apellidoPaterno} ${response.apellidoMaterno}`;
          } else if (response.nombre) {
            nombreCompleto = response.nombre;
          }
        } 
        // Para RUC (11 dígitos)
        else if (numeroDocumento.length === 11) {
          nombreCompleto = response.razonSocial || response.nombre || '';
        }

        if (nombreCompleto) {
          this.checkoutForm.patchValue({
            cliente: nombreCompleto
          });

          Swal.fire({
            title: 'Datos encontrados en RENIEC',
            text: `Se encontró: ${nombreCompleto}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          this.mostrarErrorDocumento();
        }
      } else {
        this.mostrarErrorDocumento();
      }
    },
    error: (error) => {
      this.buscandoDocumento = false;
      console.error('Error consultando RENIEC:', error);
      
      Swal.fire({
        title: 'Error al consultar',
        text: 'No se pudo verificar el documento en ninguna fuente. Intente nuevamente.',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    }
  });
}

// Método auxiliar para mostrar error cuando no se encuentran datos
private mostrarErrorDocumento(): void {
  Swal.fire({
    title: 'Documento no encontrado',
    text: 'No se encontraron datos para este documento. Puede ingresar el nombre manualmente.',
    icon: 'warning',
    confirmButtonColor: '#ffc107'
  });
}



  // Cambio en distrito
  onDistritoChange(): void {
    // Método vacío - se mantiene por compatibilidad
  }


  // ✅ Cambio en forma de envío - Ahora dinámico
  onFormaEnvioChange(): void {
    const formaEnvioId = this.checkoutForm.get('formaEnvio')?.value;
    const formaEnvioSeleccionada = this.formasEnvio.find(f => f.id === Number(formaEnvioId));

    if (formaEnvioSeleccionada) {
      this.costoEnvioCalculado = formaEnvioSeleccionada.costo;
    } else {
      this.costoEnvioCalculado = 0;
    }
  }

  // Pedir cotización
  pedirCotizacion(): void {
    // Verificar si el usuario está autenticado
    if (!this.isLoggedIn) {
      Swal.fire({
        title: 'Inicio de sesión requerido',
        text: 'Debe iniciar sesión para crear una cotización',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/account'], { queryParams: { returnUrl: '/checkout' } });
        }
      });
      return;
    }

    if (!this.checkoutForm.valid) {
      this.markFormGroupTouched();
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    this.procesandoPedido = true;
    const formData = this.checkoutForm.value;

    // Preparar datos para la cotización
    const cotizacionData: CrearCotizacionRequest = {
      productos: this.cartItems.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      })),
      cliente_nombre: formData.cliente,
      cliente_email: formData.email,
      direccion_envio: formData.direccion,
      telefono_contacto: formData.celular,
      forma_envio: formData.formaEnvio,
      observaciones: formData.observaciones || '',
      metodo_pago_preferido: formData.tipoPago,
      costo_envio: this.costoEnvioCalculado,
      numero_documento: formData.numeroDocumento,
      departamento_id: formData.departamento,
      provincia_id: formData.provincia,
      distrito_id: formData.distrito,
      departamento_nombre: this.departamentos.find(d => d.id === formData.departamento)?.nombre || '',
      provincia_nombre: this.provincias.find(p => p.id === formData.provincia)?.nombre || '',
      distrito_nombre: this.distritos.find(d => d.id === formData.distrito)?.nombre || '',
      ubicacion_completa: `${this.distritos.find(d => d.id === formData.distrito)?.nombre || ''}, ${this.provincias.find(p => p.id === formData.provincia)?.nombre || ''}, ${this.departamentos.find(d => d.id === formData.departamento)?.nombre || ''}`
    };

    // Crear cotización en el backend
    this.cotizacionesService.crearCotizacionEcommerce(cotizacionData).subscribe({
      next: (response) => {
        this.procesandoPedido = false;

        if (response.status === 'success') {
          // Limpiar carrito
          this.cartService.clearCart();

          Swal.fire({
            title: '¡Cotización creada exitosamente!',
            html: `
              <div class="text-center">
                <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                <h5>Cotización ${response.codigo_cotizacion}</h5>
                <p class="text-muted">Tu cotización ha sido registrada exitosamente.</p>
                <p><strong>Total: S/ ${this.formatPrice(this.getTotalFinal())}</strong></p>
                <p class="text-sm text-gray-600">Puedes ver el estado de tu cotización en "Mi Cuenta"</p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#198754',
            confirmButtonText: 'Ver mis cotizaciones'
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/my-account']);
            } else {
              this.router.navigate(['/shop']);
            }
          });
        }
      },
      error: (error) => {
        this.procesandoPedido = false;
        console.error('Error creando cotización:', error);
        Swal.fire({
          title: 'Error al crear cotización',
          text: error.error?.message || 'Ocurrió un error al crear tu cotización. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Método para crear compra directa (nuevo método usando ComprasService)
  private crearCompraDirecta(): void {
    this.procesandoPedido = true;
    const formData = this.checkoutForm.value;

    // Obtener nombres de ubigeo
    const departamentoNombre = this.departamentos.find(d => d.id === formData.departamento)?.nombre || '';
    const provinciaNombre = this.provincias.find(p => p.id === formData.provincia)?.nombre || '';
    const distritoNombre = this.distritos.find(d => d.id === formData.distrito)?.nombre || '';

    // Preparar datos para la compra
    const compraData: any = {
      productos: this.cartItems.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      })),
      cliente_nombre: formData.cliente,
      cliente_email: formData.email,
      direccion_envio: formData.direccion,
      telefono_contacto: formData.celular,
      forma_envio: formData.formaEnvio,
      metodo_pago: formData.tipoPago,
      costo_envio: this.costoEnvioCalculado,
      numero_documento: formData.numeroDocumento,
      ubicacion_completa: `${distritoNombre}, ${provinciaNombre}, ${departamentoNombre}`,
      observaciones: formData.observaciones || ''
    };

    // ✅ Agregar cupón si está aplicado
    if (this.cuponAplicado) {
      compraData.cupon_id = this.cuponAplicado.id;
      compraData.descuento_cupon = this.descuentoCupon;
    }

    // Crear compra en el backend
    this.comprasService.crearCompra(compraData).subscribe({
      next: (response) => {
        this.procesandoPedido = false;

        if (response.status === 'success') {
          // ✅ Registrar uso del cupón si se aplicó
          if (this.cuponAplicado) {
            this.ofertasService.registrarUsoCupon(
              this.cuponAplicado.id,
              this.descuentoCupon,
              this.cartSummary.total,
              response.compra?.id || undefined
            ).subscribe({
              next: () => {
                console.log('Uso de cupón registrado exitosamente');
              },
              error: (error) => {
                console.error('Error al registrar uso de cupón:', error);
              }
            });

            // Limpiar cupón del sessionStorage
            sessionStorage.removeItem('cupon_aplicado');
          }

          // Limpiar carrito
          this.cartService.clearCart();

          const totalFinal = this.getTotalConDescuento();

          Swal.fire({
            title: '¡Compra creada exitosamente!',
            html: `
              <div class="text-center">
                <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                <h5>Compra ${response.codigo_compra}</h5>
                <p class="text-muted">Tu compra ha sido registrada exitosamente.</p>
                ${this.cuponAplicado ? `<p class="text-success">Descuento aplicado: -S/ ${this.formatPrice(this.descuentoCupon)}</p>` : ''}
                <p><strong>Total: S/ ${this.formatPrice(totalFinal)}</strong></p>
                <p class="text-sm text-gray-600">Puedes ver el estado de tu compra en "Mi Cuenta"</p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#198754',
            confirmButtonText: 'Ver mis compras'
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/my-account/compras']);
            } else {
              this.router.navigate(['/shop']);
            }
          });
        }
      },
      error: (error) => {
        this.procesandoPedido = false;
        console.error('Error al crear compra:', error);
        Swal.fire({
          title: 'Error al crear compra',
          text: error.error?.message || 'Ocurrió un error al crear tu compra. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Pagar con tarjeta (crea compra directa)
  pagarConTarjeta(): void {
    // Verificar si el usuario está autenticado
    if (!this.isLoggedIn) {
      Swal.fire({
        title: 'Inicio de sesión requerido',
        text: 'Debe iniciar sesión para proceder con el pago',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/account'], { queryParams: { returnUrl: '/checkout' } });
        }
      });
      return;
    }

    if (!this.checkoutForm.valid) {
      this.markFormGroupTouched();
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Crear compra directa para pago con tarjeta
    this.crearCompraDirecta();
  }

  // Submit del formulario
  onSubmit(): void {
    this.pagarConTarjeta();
  }

  // Marcar formulario como touched
  private markFormGroupTouched(): void {
    Object.keys(this.checkoutForm.controls).forEach(key => {
      const control = this.checkoutForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helpers
  getItemSubtotal(item: CartItem): number {
    const precio = typeof item.precio === 'number' ? item.precio : parseFloat(String(item.precio || 0));
    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : parseInt(String(item.cantidad || 0));
    
    if (isNaN(precio) || isNaN(cantidad)) {
      return 0;
    }
    
    return precio * cantidad;
  }

  getTotalFinal(): number {
    const subtotal = typeof this.cartSummary.subtotal === 'number' ? this.cartSummary.subtotal : 0;
    const envio = this.costoEnvioCalculado;
    const descuento = this.descuentoCupon || 0;

    return subtotal - descuento + envio;
  }

  formatPrice(price: number | string | null | undefined): string {
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price || 0));

    if (isNaN(numPrice)) {
      return '0.00';
    }

    return numPrice.toFixed(2);
  }

  // ==========================================
  // MÉTODOS PARA DIRECCIONES GUARDADAS
  // ==========================================

  // Cargar direcciones guardadas del usuario
  private loadDireccionesGuardadas(): void {
    if (this.isLoggedIn) {
      this.direccionesService.obtenerDirecciones()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.direccionesGuardadas = response.direcciones || [];

              // Seleccionar automáticamente la dirección predeterminada
              const direccionPredeterminada = this.direccionesGuardadas.find(d => d.predeterminada);
              if (direccionPredeterminada && !this.usarDireccionPersonalizada) {
                this.seleccionarDireccion(direccionPredeterminada);
              }
            }
          },
          error: (error) => {
            console.error('Error al cargar direcciones:', error);
          }
        });
    }
  }

  // Seleccionar una dirección guardada
  seleccionarDireccion(direccion: Direccion): void {
    this.direccionSeleccionada = direccion;
    this.usarDireccionPersonalizada = false;

    // Autocompletar el formulario con los datos de la dirección
    this.checkoutForm.patchValue({
      nombreCliente: direccion.nombre_destinatario,
      direccion: direccion.direccion_completa,
      celular: direccion.telefono || ''
    });

    // Si la dirección tiene ubigeo, autocompletar departamento, provincia, distrito
    if (direccion.ubigeo) {
      console.log('Seleccionando dirección con ubigeo:', direccion.ubigeo);
      console.log('Departamentos disponibles:', this.departamentos.length);

      const departamento = this.departamentos.find(d => d.nombre === direccion.ubigeo?.departamento_nombre);
      if (departamento) {
        console.log('Departamento encontrado:', departamento);
        this.checkoutForm.patchValue({ departamento: departamento.id });
        this.onDepartamentoChange().then(() => {
          const provincia = this.provincias.find(p => p.nombre === direccion.ubigeo?.provincia_nombre);
          if (provincia) {
            console.log('Provincia encontrada:', provincia);
            this.checkoutForm.patchValue({ provincia: provincia.id });
            this.onProvinciaChange().then(() => {
              const distrito = this.distritos.find(d => d.nombre === direccion.ubigeo?.distrito_nombre);
              if (distrito) {
                console.log('Distrito encontrado:', distrito);
                this.checkoutForm.patchValue({ distrito: distrito.id });
                this.onDistritoChange();
              }
            });
          } else {
            console.log('Provincia no encontrada:', direccion.ubigeo?.provincia_nombre, 'en', this.provincias);
          }
        });
      } else {
        console.log('Departamento no encontrado:', direccion.ubigeo?.departamento_nombre, 'en', this.departamentos);
      }
    }
  }

  // Cambiar tipo de dirección (guardada vs personalizada)
  onCambiarTipoDireccion(): void {
    if (this.usarDireccionPersonalizada) {
      this.direccionSeleccionada = null;
      // Limpiar campos relacionados con dirección
      this.checkoutForm.patchValue({
        direccion: '',
        departamento: '',
        provincia: '',
        distrito: ''
      });
      this.provincias = [];
      this.distritos = [];
    } else {
      // Si hay una dirección predeterminada, seleccionarla
      const direccionPredeterminada = this.direccionesGuardadas.find(d => d.predeterminada);
      if (direccionPredeterminada) {
        this.seleccionarDireccion(direccionPredeterminada);
      }
    }
  }

  // Modificar métodos de ubicación para que retornen Promise
  async onDepartamentoChange(): Promise<void> {
    const departamentoId = this.checkoutForm.get('departamento')?.value;

    if (departamentoId) {
      try {
        const provincias = await this.ubigeoService.getProvincias(departamentoId).toPromise();
        this.provincias = provincias || [];
        this.checkoutForm.patchValue({
          provincia: '',
          distrito: ''
        });
        this.distritos = [];

        // Habilitar provincia
        this.checkoutForm.get('provincia')?.enable();
      } catch (error) {
        console.error('Error cargando provincias:', error);
      }
    } else {
      this.provincias = [];
      this.distritos = [];

      // Deshabilitar provincia y distrito
      this.checkoutForm.get('provincia')?.disable();
      this.checkoutForm.get('distrito')?.disable();
    }
  }

  async onProvinciaChange(): Promise<void> {
    const departamentoId = this.checkoutForm.get('departamento')?.value;
    const provinciaId = this.checkoutForm.get('provincia')?.value;

    if (departamentoId && provinciaId) {
      try {
        const distritos = await this.ubigeoService.getDistritos(departamentoId, provinciaId).toPromise();
        this.distritos = distritos || [];
        this.checkoutForm.patchValue({
          distrito: ''
        });

        // Habilitar distrito
        this.checkoutForm.get('distrito')?.enable();
      } catch (error) {
        console.error('Error cargando distritos:', error);
      }
    } else {
      this.distritos = [];

      // Deshabilitar distrito
      this.checkoutForm.get('distrito')?.disable();
    }
  }
}