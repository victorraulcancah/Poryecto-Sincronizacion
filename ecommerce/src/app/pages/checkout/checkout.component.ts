import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { combineLatest, firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { CheckoutStepsComponent } from '../../component/checkout-steps/checkout-steps.component';
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
import { MonedaPipe } from '../../pipes/moneda.pipe';
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
    ShippingComponent,
    CheckoutStepsComponent,
    MonedaPipe
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

  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];

  buscandoDocumento = false;
  procesandoPedido = false;
  isLoggedIn = false;

  direccionesGuardadas: Direccion[] = [];
  direccionSeleccionada: Direccion | null = null;
  usarDireccionPersonalizada = false;

  formasEnvio: FormaEnvio[] = [];
  formasEnvioFiltradas: FormaEnvio[] = [];
  mensajeSinEnvio = '';
  tiposPago: TipoPago[] = [];
  costoEnvioCalculado = 0;
  cartLoaded = false;

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
    this.loadCartData();
    this.checkAuthStatus();
    this.loadFormasEnvio();
    this.loadTiposPago();
    this.loadCuponAplicado();
    this.loadUbigeoData().then(() => {
      this.loadDireccionesGuardadas();
    });
  }

  private loadCuponAplicado(): void {
    const cuponData = sessionStorage.getItem('cupon_aplicado');
    if (cuponData) {
      try {
        this.cuponAplicado = JSON.parse(cuponData);
        this.descuentoCupon = this.cuponAplicado.descuento_calculado || 0;
      } catch (e) {
        this.cuponAplicado = null;
        this.descuentoCupon = 0;
      }
    }
  }

  getTotalConDescuento(): number {
    // Forzar Number para evitar concatenación cuando costo_envio viene como string del backend.
    return (Number(this.cartSummary.total) || 0)
         - (Number(this.descuentoCupon) || 0)
         + (Number(this.costoEnvioCalculado) || 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  private loadCartData(): void {
    combineLatest([
      this.cartService.cartItems$,
      this.cartService.cartLoaded$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([items, loaded]) => {
        this.cartItems = items;
        this.cartLoaded = loaded;
        this.redirectIfCartIsEmpty();
      });

    this.cartService.cartSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.cartSummary = summary;
      });
  }

  private redirectIfCartIsEmpty(): void {
    if (typeof window === 'undefined' || !this.cartLoaded || this.cartItems.length > 0) {
      return;
    }

    Swal.fire({
      title: 'Carrito vacÃ­o',
      text: 'No tienes productos en tu carrito para procesar la compra',
      icon: 'warning',
      confirmButtonColor: '#dc3545'
    }).then(() => {
      this.router.navigate(['/shop']);
    });
  }

  private loadFormasEnvio(): void {
    this.formaEnvioService.obtenerActivas().subscribe({
      next: (response) => {
        // Convertir ubigeos de 6 dígitos a 2 dígitos para que funcione el filtrado
        this.formasEnvio = (response.formas_envio || []).map(f => this.convertirFormaEnvioParaCheckout(f));
      },
      error: (error) => {
        console.error('Error cargando formas de envío:', error);
      }
    });
  }

  /**
   * Convierte ubigeo de 6 dígitos a 2 dígitos para el checkout
   * Ejemplo: "010000" -> "01", "150100" -> "15" (provincia solo para filtrado)
   */
  private convertirFormaEnvioParaCheckout(forma: FormaEnvio): FormaEnvio {
    if (!forma.departamento_id) return forma;
    
    const depto6 = forma.departamento_id;
    const depto2 = depto6.substring(0, 2);
    const prov2 = forma.provincia_id ? depto6.substring(2, 4) : null;
    const dist2 = forma.distrito_id ? depto6.substring(4, 6) : null;
    
    return {
      ...forma,
      departamento_id: depto2,
      provincia_id: prov2 !== '00' ? prov2 : null,
      distrito_id: dist2 !== '00' ? dist2 : null
    };
  }

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

  private checkAuthStatus(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isLoggedIn = !!user;
        if (user) {
          this.checkoutForm.patchValue({
            cliente: user.name,
            email: user.email
          });
        }
      });
  }

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

    this.clienteService.buscarPorDocumento(numeroDocumento).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          this.buscandoDocumento = false;
          const cliente = response.data[0];
          const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.trim();

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
          this.buscarEnReniec(numeroDocumento);
        }
      },
      error: (error) => {
        this.buscarEnReniec(numeroDocumento);
      }
    });
  }

  private buscarEnReniec(numeroDocumento: string): void {
    this.reniecService.buscarPorDni(numeroDocumento).subscribe({
      next: (response) => {
        this.buscandoDocumento = false;

        if (response.success !== false && (response.nombre || response.nombres || response.razonSocial)) {
          let nombreCompleto = '';

          if (numeroDocumento.length === 8) {
            if (response.nombres && response.apellidoPaterno && response.apellidoMaterno) {
              nombreCompleto = `${response.nombres} ${response.apellidoPaterno} ${response.apellidoMaterno}`;
            } else if (response.nombre) {
              nombreCompleto = response.nombre;
            }
          } else if (numeroDocumento.length === 11) {
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
        Swal.fire({
          title: 'Error al consultar',
          text: 'No se pudo verificar el documento en ninguna fuente. Intente nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  private mostrarErrorDocumento(): void {
    Swal.fire({
      title: 'Documento no encontrado',
      text: 'No se encontraron datos para este documento. Puede ingresar el nombre manualmente.',
      icon: 'warning',
      confirmButtonColor: '#ffc107'
    });
  }

  onFormaEnvioChange(): void {
    const formaEnvioId = this.checkoutForm.get('formaEnvio')?.value;
    const formaEnvioSeleccionada = this.formasEnvioFiltradas.find(f => f.id === Number(formaEnvioId));

    if (formaEnvioSeleccionada) {
      // Coerción explícita: el costo viene del backend como decimal (string) y
      // sin esto se concatena al sumar con otros precios.
      this.costoEnvioCalculado = Number(formaEnvioSeleccionada.costo) || 0;
    } else {
      this.costoEnvioCalculado = 0;
    }
  }

  pedirCotizacion(): void {
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
    const formaEnvioStr = formData.departamento === '15' ? 'delivery' : 'envio_provincia';

    const cotizacionData: CrearCotizacionRequest = {
      productos: this.cartItems.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      })),
      cliente_nombre: formData.cliente,
      cliente_email: formData.email,
      direccion_envio: formData.direccion,
      telefono_contacto: formData.celular,
      forma_envio: formaEnvioStr,
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

    this.cotizacionesService.crearCotizacionEcommerce(cotizacionData).subscribe({
      next: (response) => {
        this.procesandoPedido = false;

        if (response.status === 'success') {
          this.cartService.clearCart();

          Swal.fire({
            title: '¡Cotización creada exitosamente!',
            html: `
              <div class="text-center">
                <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                <h5>Cotización ${response.codigo_cotizacion}</h5>
                <p class="text-muted">Tu cotización ha sido registrada exitosamente.</p>
                <p><strong>Total: ${(response.cotizacion?.moneda || this.cartItems[0]?.moneda || 's') === 'd' ? 'US$' : 'S/'} ${this.formatPrice(response.cotizacion?.total ?? this.getTotalFinal())}</strong></p>
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
        Swal.fire({
          title: 'Error al crear cotización',
          text: error.error?.message || 'Ocurrió un error al crear tu cotización. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  private crearCompraDirecta(): void {
    this.procesandoPedido = true;
    const formData = this.checkoutForm.value;
    const formaEnvioStr = formData.departamento === '15' ? 'delivery' : 'envio_provincia';

    const departamentoNombre = this.departamentos.find(d => d.id === formData.departamento)?.nombre || '';
    const provinciaNombre = this.provincias.find(p => p.id === formData.provincia)?.nombre || '';
    const distritoNombre = this.distritos.find(d => d.id === formData.distrito)?.nombre || '';

    const compraData: any = {
      productos: this.cartItems.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      })),
      cliente_nombre: formData.cliente,
      cliente_email: formData.email,
      direccion_envio: formData.direccion,
      telefono_contacto: formData.celular,
      forma_envio: formaEnvioStr,
      metodo_pago: formData.tipoPago,
      costo_envio: this.costoEnvioCalculado,
      numero_documento: formData.numeroDocumento,
      ubicacion_completa: `${distritoNombre}, ${provinciaNombre}, ${departamentoNombre}`,
      observaciones: formData.observaciones || ''
    };

    if (this.cuponAplicado) {
      compraData.cupon_id = this.cuponAplicado.id;
      compraData.descuento_cupon = this.descuentoCupon;
    }

    this.comprasService.crearCompra(compraData).subscribe({
      next: (response) => {
        this.procesandoPedido = false;

        if (response.status === 'success') {
          if (this.cuponAplicado) {
            this.ofertasService.registrarUsoCupon(
              this.cuponAplicado.id,
              this.descuentoCupon,
              this.cartSummary.total,
              response.compra?.id || undefined
            ).subscribe({
              next: () => {
                sessionStorage.removeItem('cupon_aplicado');
              },
              error: () => {}
            });
          }

          this.cartService.clearCart();

          const totalFinal = this.getTotalConDescuento();

          Swal.fire({
            title: '¡Compra creada exitosamente!',
            html: `
              <div class="text-center">
                <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                <h5>Compra ${response.codigo_compra}</h5>
                <p class="text-muted">Tu compra ha sido registrada exitosamente.</p>
                ${this.cuponAplicado ? `<p class="text-success">Descuento aplicado: -${(this.cartItems[0]?.moneda || 's') === 'd' ? 'US$' : 'S/'} ${this.formatPrice(this.descuentoCupon)}</p>` : ''}
                <p><strong>Total: ${(this.cartItems[0]?.moneda || 's') === 'd' ? 'US$' : 'S/'} ${this.formatPrice(totalFinal)}</strong></p>
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
        Swal.fire({
          title: 'Error al crear compra',
          text: error.error?.message || 'Ocurrió un error al crear tu compra. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  pagarConTarjeta(): void {
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

    this.crearCompraDirecta();
  }

  onSubmit(): void {
    this.pagarConTarjeta();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.checkoutForm.controls).forEach(key => {
      const control = this.checkoutForm.get(key);
      control?.markAsTouched();
    });
  }

  getItemSubtotal(item: CartItem): number {
    const precio = typeof item.precio === 'number' ? item.precio : parseFloat(String(item.precio || 0));
    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : parseInt(String(item.cantidad || 0));

    if (isNaN(precio) || isNaN(cantidad)) {
      return 0;
    }

    return precio * cantidad;
  }

  getTotalFinal(): number {
    const subtotal = Number(this.cartSummary.subtotal) || 0;
    const igv = Number(this.cartSummary.igv) || 0;
    const envio = Number(this.costoEnvioCalculado) || 0;
    const descuento = Number(this.descuentoCupon) || 0;

    return subtotal + igv - descuento + envio;
  }

  formatPrice(price: number | string | null | undefined): string {
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price || 0));

    if (isNaN(numPrice)) {
      return '0.00';
    }

    return numPrice.toFixed(2);
  }

  private loadDireccionesGuardadas(): void {
    if (this.isLoggedIn) {
      this.direccionesService.obtenerDirecciones()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.direccionesGuardadas = response.direcciones || [];

              const direccionPredeterminada = this.direccionesGuardadas.find(d => d.predeterminada);
              if (direccionPredeterminada && !this.usarDireccionPersonalizada) {
                this.seleccionarDireccion(direccionPredeterminada);
              }
            }
          },
          error: () => {}
        });
    }
  }

  seleccionarDireccion(direccion: Direccion): void {
    this.direccionSeleccionada = direccion;
    this.usarDireccionPersonalizada = false;

    this.checkoutForm.patchValue({
      cliente: direccion.nombre_destinatario,
      direccion: direccion.direccion_completa,
      celular: direccion.telefono || ''
    });

    if (direccion.ubigeo) {
      const departamento = this.departamentos.find(d => d.nombre === direccion.ubigeo?.departamento_nombre);
      if (departamento) {
        this.checkoutForm.patchValue({ departamento: departamento.id });
        this.onDepartamentoChange().then(() => {
          const provincia = this.provincias.find(p => p.nombre === direccion.ubigeo?.provincia_nombre);
          if (provincia) {
            this.checkoutForm.patchValue({ provincia: provincia.id });
            this.onProvinciaChange().then(() => {
              const distrito = this.distritos.find(d => d.nombre === direccion.ubigeo?.distrito_nombre);
              if (distrito) {
                this.checkoutForm.patchValue({ distrito: distrito.id });
                this.onDistritoChange();
              }
            });
          }
        });
      }
    }
  }

  onCambiarTipoDireccion(): void {
    if (this.usarDireccionPersonalizada) {
      this.direccionSeleccionada = null;
      this.checkoutForm.patchValue({
        direccion: '',
        departamento: '',
        provincia: '',
        distrito: ''
      });
      this.provincias = [];
      this.distritos = [];
    } else {
      const direccionPredeterminada = this.direccionesGuardadas.find(d => d.predeterminada);
      if (direccionPredeterminada) {
        this.seleccionarDireccion(direccionPredeterminada);
      }
    }
  }

  async onDepartamentoChange(): Promise<void> {
    const departamentoId = this.checkoutForm.get('departamento')?.value;

    if (departamentoId) {
      try {
        const provincias = await firstValueFrom(this.ubigeoService.getProvincias(departamentoId));
        this.provincias = provincias || [];
        this.checkoutForm.patchValue({
          provincia: '',
          distrito: ''
        });
        this.distritos = [];

        this.checkoutForm.get('provincia')?.enable();

        this.filtrarFormasEnvio(departamentoId, null, null);

      } catch (error) {
        console.error('Error cargando provincias:', error);
      }
    } else {
      this.provincias = [];
      this.distritos = [];
      this.formasEnvioFiltradas = [];
      this.mensajeSinEnvio = '';

      this.checkoutForm.get('provincia')?.disable();
      this.checkoutForm.get('distrito')?.disable();
    }
  }

  async onProvinciaChange(): Promise<void> {
    const departamentoId = this.checkoutForm.get('departamento')?.value;
    const provinciaId = this.checkoutForm.get('provincia')?.value;

    if (departamentoId && provinciaId) {
      try {
        const distritos = await firstValueFrom(this.ubigeoService.getDistritos(departamentoId, provinciaId));
        this.distritos = distritos || [];
        this.checkoutForm.patchValue({
          distrito: ''
        });

        this.checkoutForm.get('distrito')?.enable();

        this.filtrarFormasEnvio(departamentoId, provinciaId, null);

      } catch (error) {
        console.error('Error cargando distritos:', error);
      }
    } else {
      this.distritos = [];

      this.checkoutForm.get('distrito')?.disable();

      if (departamentoId) {
        this.filtrarFormasEnvio(departamentoId, null, null);
      }
    }
  }

  private filtrarFormasEnvio(departamentoId: string, provinciaId: string | null, distritoId: string | null): void {
    const formasDelDepartamento = this.formasEnvio.filter(f => f.departamento_id === departamentoId);

    let formasFiltradas = formasDelDepartamento.filter(f =>
      f.distrito_id && distritoId && f.distrito_id === distritoId
    );

    if (formasFiltradas.length === 0 && provinciaId) {
      formasFiltradas = formasDelDepartamento.filter(f =>
        f.provincia_id && f.provincia_id === provinciaId && !f.distrito_id
      );
    }

    if (formasFiltradas.length === 0) {
      formasFiltradas = formasDelDepartamento.filter(f => !f.provincia_id);
    }

    this.formasEnvioFiltradas = formasFiltradas;

    if (this.formasEnvioFiltradas.length === 0) {
      const deptoNombre = this.departamentos.find(d => d.id === departamentoId)?.nombre || 'este departamento';
      this.mensajeSinEnvio = `No hay formas de envío configuradas para ${deptoNombre}`;
      this.costoEnvioCalculado = 0;
    } else {
      this.mensajeSinEnvio = '';
      if (this.formasEnvioFiltradas.length === 1) {
        this.checkoutForm.patchValue({ formaEnvio: this.formasEnvioFiltradas[0].id });
        this.costoEnvioCalculado = Number(this.formasEnvioFiltradas[0].costo) || 0;
      } else {
        this.checkoutForm.patchValue({ formaEnvio: '' });
        this.costoEnvioCalculado = 0;
      }
    }
  }

  onDistritoChange(): void {
    const departamentoId = this.checkoutForm.get('departamento')?.value;
    const provinciaId = this.checkoutForm.get('provincia')?.value;
    const distritoId = this.checkoutForm.get('distrito')?.value;

    if (departamentoId) {
      this.filtrarFormasEnvio(departamentoId, provinciaId || null, distritoId || null);
    }
  }
}
