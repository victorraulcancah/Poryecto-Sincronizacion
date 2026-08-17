import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { combineLatest, firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { CheckoutStepsComponent } from '../../component/checkout-steps/checkout-steps.component';
import { ModalDireccionComponent } from '../../component/modal-direccion/modal-direccion.component';
import { CartService, CartItem, CartSummary } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { UbigeoService, Departamento, Provincia, Distrito } from '../../services/ubigeo.service';
import { CotizacionesService, CrearCotizacionRequest } from '../../services/cotizaciones.service';
import { DireccionesService, Direccion } from '../../services/direcciones.service';
import { ReniecService } from '../../services/reniec.service';
import { ClienteService } from '../../services/cliente.service';
import { FormaEnvioService, FormaEnvio } from '../../services/forma-envio.service';
import { TipoPagoService, TipoPago } from '../../services/tipo-pago.service';
import { ClientePortalService, TitularCheckout } from '../../services/cliente-portal.service';
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
    ModalDireccionComponent,
    MonedaPipe
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutForm!: FormGroup;
  cartItems: CartItem[] = [];
  /** Titular del comprobante (cliente de 7Power si la cuenta está vinculada). */
  titular: TitularCheckout | null = null;
  cartSummary: CartSummary = {
    subtotal: 0,
    igv: 0,
    total: 0,
    cantidad_items: 0,
    porMoneda: []
  };

  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];

  buscandoDocumento = false;
  procesandoPedido = false;
  isLoggedIn = false;

  // ✅ Pasos del checkout: 2 = Entrega, 3 = Pago (1 = Carro, ya pasado)
  pasoActual: 2 | 3 = 2;
  // ✅ Solo se pide el celular manualmente si el perfil del cliente no tiene uno registrado
  mostrarCelularManual = true;
  // ✅ Modal para elegir entre las direcciones guardadas del cliente
  mostrarModalDirecciones = false;
  // ✅ Modal para crear/editar una dirección (con su propio botón "Guardar")
  mostrarModalNuevaDireccion = false;
  modoModalDireccion: 'create' | 'edit' = 'create';
  direccionEnEdicion: Direccion | null = null;
  // ✅ "Tu Orden" colapsado por defecto: cerrado muestra miniaturas, abierto el detalle línea por línea
  resumenPedidoExpandido = false;
  private readonly camposEntrega = [
    'cliente', 'direccion', 'departamento', 'provincia', 'distrito', 'formaEnvio', 'email'
  ];

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

  // ✅ Paso de Pago: selección de moneda + métodos de pago combinables (solo interfaz por ahora,
  // sin validar que la suma de los montos ingresados coincida con el total, y sin conversión de moneda)
  monedaPagoSeleccionada = 's';
  metodosPagoSeleccionados = new Set<number>();
  montosPorMetodo: { [clave: string]: number } = {};
  tipoComprobante: 'boleta' | 'factura' = 'boleta';
  // ✅ Tipo de cambio referencial (informativo, sin conversión automática de totales)
  // Se pisa con el TC comercial del ERP apenas responde; el 3.70 solo se ve si
  // esa consulta falla o si el ERP aún no tiene ningún valor registrado.
  tipoCambioReferencial = 3.70;
  /** Detalle del TC: se muestra como tooltip del botón de refrescar. */
  tipoCambioDetalle = '';
  cargandoTipoCambio = false;
  // ✅ El crédito es el método "Crédito autorizado" de la tabla tipo_pagos. Antes
  // el checkout agregaba además una card propia con id -1, así que un cliente
  // vinculado veía dos opciones de crédito; ahora solo existe la de la BD y se
  // reconoce por su código.
  readonly CODIGO_CREDITO = 'credito_autorizado';
  // Crédito disponible del cliente (si está vinculado al ERP 7Power); es el
  // tope del monto que puede poner en ese método.
  creditoDisponible = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private ubigeoService: UbigeoService,
    private cotizacionesService: CotizacionesService,
    private direccionesService: DireccionesService,
    private reniecService: ReniecService,
    private clienteService: ClienteService,
    private formaEnvioService: FormaEnvioService,
    private tipoPagoService: TipoPagoService,
    private clientePortalService: ClientePortalService,
    private ofertasService: OfertasService,
    private router: Router
  ) {
    this.initializeForm();
    // ✅ Aplica las validaciones correspondientes al tipo de comprobante por defecto (Boleta)
    this.seleccionarTipoComprobante(this.tipoComprobante);
  }

  ngOnInit(): void {
    this.loadCartData();
    this.checkAuthStatus();
    this.loadFormasEnvio();
    this.loadTiposPago();
    this.loadCuponAplicado();
    this.loadCotizacionEditando();
    this.loadUbigeoData().then(() => {
      this.loadDireccionesGuardadas();
    });
  }

  /**
   * Cotización que se está rehaciendo desde "Editar": vuelven las
   * observaciones que el cliente ya había escrito. El método de pago NO se
   * repone a propósito: el paso 2 arranca vacío para que se elija de nuevo.
   * La deja el listado de cotizaciones en sessionStorage.
   */
  private cotizacionEditando: {
    observaciones?: string;
  } | null = null;

  private loadCotizacionEditando(): void {
    const guardada = sessionStorage.getItem('cotizacion_editando');
    if (!guardada) return;

    try {
      this.cotizacionEditando = JSON.parse(guardada);
    } catch {
      this.cotizacionEditando = null;
      return;
    }

    this.checkoutForm.patchValue({
      observaciones: this.cotizacionEditando?.observaciones || '',
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
    // ✅ Campos ocultos (cliente, departamento, provincia, distrito, formaEnvio, email) ya no se
    // muestran ni edita el cliente en el checkout — se autocompletan desde su perfil/dirección
    // guardada, así que no llevan Validators.required: bloqueaban "Continuar" cuando ese
    // autocompletado fallaba (nombre de departamento sin match, forma de envío sin encontrar, etc.)
    // aunque el campo fuera invisible para el usuario.
    this.checkoutForm = this.fb.group({
      numeroDocumento: [''],
      cliente: [''],
      direccion: ['', [Validators.required]],
      celular: ['', [Validators.pattern('^[9][0-9]{8}$')]],
      departamento: [''],
      provincia: [{value: '', disabled: true}],
      distrito: [{value: '', disabled: true}],
      formaEnvio: [''],
      tipoPago: ['', [Validators.required]],
      email: [''],
      // ✅ RUC/Razón Social: solo obligatorios cuando el cliente elige "Factura"
      // (ver seleccionarTipoComprobante). Se guardan aparte del DNI, ya que un mismo
      // cliente puede pedir Boleta o Factura según lo necesite en cada compra.
      ruc: [''],
      razonSocial: [''],
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

        // ✅ Si la moneda seleccionada para pagar no es una de las que realmente
        // tiene el carrito, se autoselecciona la que sí corresponde — antes
        // siempre quedaba en Soles por defecto aunque el carrito fuera en dólares,
        // mostrando "seleccionado" un total de S/ 0.00.
        if (!this.monedasEnCarrito.includes(this.monedaPagoSeleccionada) && this.monedasEnCarrito.length > 0) {
          this.monedaPagoSeleccionada = this.monedasEnCarrito[0];
        }
      });

    this.cartService.cartSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.cartSummary = summary;
      });
  }

  /**
   * El carrito se vacía a propósito al generar la cotización; sin esta marca,
   * el aviso de "carrito vacío" saltaba encima del mensaje de éxito y mandaba
   * al cliente a /shop.
   */
  private cotizacionGenerada = false;

  private redirectIfCartIsEmpty(): void {
    if (
      typeof window === 'undefined' ||
      !this.cartLoaded ||
      this.cartItems.length > 0 ||
      this.cotizacionGenerada
    ) {
      return;
    }

    Swal.fire({
      title: 'Carrito vacío',
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
          // ✅ Estos datos ya se pidieron al registrarse; no se vuelven a
          // pedir en el checkout (solo se muestran/editan las direcciones).
          this.mostrarCelularManual = !user.telefono;
          this.checkoutForm.patchValue({
            cliente: user.nombre_completo || user.name,
            email: user.email,
            celular: user.telefono || '',
            numeroDocumento: user.numero_documento || '',
            // ✅ Si el cliente ya pidió Factura antes, se precarga su RUC/Razón Social guardados
            ruc: user.ruc || '',
            razonSocial: user.razon_social || ''
          });

          // El celular ya no se pide en el checkout: viene del perfil o de la
          // dirección elegida, así que no se valida acá.
          const celularControl = this.checkoutForm.get('celular');
          celularControl?.clearValidators();
          celularControl?.updateValueAndValidity();

          this.cargarCredito();
          this.cargarTitular();
          this.cargarTipoCambio();
        }
      });
  }

  /**
   * Titular del comprobante que se muestra en el paso de pago: si la cuenta
   * está vinculada a un cliente de 7Power, son los datos de ese cliente; si
   * no, los del usuario registrado.
   */
  /**
   * TC comercial del ERP (Bloomberg + margen), el mismo que aplica el vendedor
   * en Nueva Venta. Es informativo: no convierte los totales.
   */
  cargarTipoCambio(): void {
    this.cargandoTipoCambio = true;
    this.clientePortalService.getTipoCambio()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tc) => {
          this.cargandoTipoCambio = false;
          if (!tc?.disponible || !tc.valor_final) return;

          this.tipoCambioReferencial = tc.valor_final;
          // Mismo detalle que el tooltip del badge del ERP.
          const fuente = tc.fuente === 'bloomberg' ? 'Bloomberg' : (tc.fuente ?? '');
          this.tipoCambioDetalle =
            `${fuente} ${tc.valor_fuente} (${tc.fecha_fuente}) + margen S/ ${tc.margen}`;
        },
        // Si falla, se queda el valor por defecto en vez de dejarlo vacío.
        error: () => (this.cargandoTipoCambio = false),
      });
  }

  private cargarTitular(): void {
    this.clientePortalService.getTitular()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (titular) => (this.titular = titular),
        // Si la consulta falla se deja el bloque con los datos del formulario,
        // que ya vienen del usuario registrado.
        error: () => (this.titular = null),
      });
  }

  /**
   * Consulta el crédito disponible del cliente (si está vinculado al ERP). No
   * agrega ninguna card: el método de pago es "Crédito autorizado", que ya
   * viene de la BD. El monto solo sirve de tope.
   */
  private cargarCredito(): void {
    this.clientePortalService.getCredito()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.creditoDisponible = res.vinculado ? (res.credito_disponible || 0) : 0;
        },
        error: () => {
          // Sin crédito disponible si falla la consulta; no bloquea el checkout.
          this.creditoDisponible = 0;
        }
      });
  }

  // ------------------------------------------------ términos y privacidad

  /**
   * Texto legal que se muestra en el modal.
   *
   * Provisorio: la empresa todavía no entregó la redacción definitiva, y no
   * hay tabla ni endpoint donde guardarla. Cuando la entreguen, esto se
   * reemplaza por páginas propias como la de política de cookies.
   */
  private readonly TEXTOS_LEGALES: Record<'terminos' | 'privacidad', string[]> = {
    terminos: [
      'Al enviar esta cotización aceptas que los precios, el stock y los plazos de entrega quedan sujetos a confirmación por parte de nuestro equipo comercial.',
      'La cotización tiene una validez de 30 días calendario. Los precios incluyen IGV salvo que se indique lo contrario, y pueden variar si cambia el tipo de cambio en compras en dólares.',
      'La entrega se coordina una vez confirmado el pago. Los tiempos de despacho a provincia dependen del operador logístico.',
      'Para consultas sobre esta compra puedes escribirnos por los canales de atención publicados en la tienda.'
    ],
    privacidad: [
      'Los datos que registras en el checkout —nombre, documento, teléfono, correo y dirección— se usan únicamente para emitir tu comprobante, coordinar la entrega y darte soporte sobre tu compra.',
      'No compartimos tu información con terceros ajenos a la operación. Los datos de despacho se entregan al operador logístico solo para completar el envío.',
      'Puedes solicitar la corrección o eliminación de tus datos escribiéndonos por los canales de atención de la tienda.'
    ]
  };

  /** Qué texto legal está abierto, o null si el modal está cerrado. */
  modalLegal: 'terminos' | 'privacidad' | null = null;

  get textoLegal(): string[] {
    return this.modalLegal ? this.TEXTOS_LEGALES[this.modalLegal] : [];
  }

  abrirLegal(cual: 'terminos' | 'privacidad'): void {
    this.modalLegal = cual;
  }

  cerrarLegal(): void {
    this.modalLegal = null;
  }

  /** El método de pago a crédito, reconocido por su código en la BD. */
  esMetodoCredito(tipo: TipoPago): boolean {
    return (tipo?.codigo || '').toLowerCase() === this.CODIGO_CREDITO;
  }

  /**
   * Métodos de pago que se le muestran al cliente.
   *
   * El crédito solo aparece si el ERP le devolvió al menos 1 de crédito
   * disponible: con 0 o en negativo no tiene sentido ofrecerlo. Mientras la
   * consulta no responde tampoco se muestra, para no hacerlo aparecer y
   * desaparecer.
   */
  get tiposPagoVisibles(): TipoPago[] {
    return this.tiposPago.filter(
      tipo => !this.esMetodoCredito(tipo) || this.creditoDisponible >= 1
    );
  }

  // ------------------------------------------------------- cuadre de los pagos

  /** Total que hay que cubrir en una moneda. */
  totalAPagar(moneda: string): number {
    return this.redondear(this.getTotalFinalPorMoneda(moneda));
  }

  /**
   * Lo que falta por pagar en una moneda: positivo si falta, negativo si se
   * ingresó de más.
   */
  saldoPorPagar(moneda: string): number {
    return this.redondear(this.totalAPagar(moneda) - this.getTotalIngresadoPorMoneda(moneda));
  }

  /** Los montos ingresados cubren exactamente el total de cada moneda. */
  get pagosCuadran(): boolean {
    return this.monedasDisponibles.every(m => Math.abs(this.saldoPorPagar(m)) < 0.01);
  }

  /** Monedas donde todavía falta o sobra dinero, para el aviso del paso 3. */
  get monedasDescuadradas(): string[] {
    return this.monedasDisponibles.filter(m => Math.abs(this.saldoPorPagar(m)) >= 0.01);
  }

  /**
   * Máximo que se puede poner en un método: lo que falta por cubrir en su
   * moneda (y, si es crédito, sin pasar del cupo aprobado).
   */
  montoMaximoMetodo(tipo: TipoPago): number {
    const moneda = this.monedaPagoSeleccionada;
    const otros = this.getTotalIngresadoPorMoneda(moneda) - this.getMontoMetodo(tipo);
    let maximo = Math.max(0, this.redondear(this.totalAPagar(moneda) - otros));

    if (this.esMetodoCredito(tipo)) {
      maximo = Math.min(maximo, this.creditoDisponible);
    }
    return maximo;
  }

  /**
   * Monto del método tal como se muestra en el campo: con separador de miles
   * y vacío cuando es cero, para que se vea el placeholder.
   */
  montoFormateado(tipo: TipoPago): string {
    const monto = this.getMontoMetodo(tipo);

    return monto > 0 ? this.conSeparadorDeMiles(String(monto)) : '';
  }

  /**
   * Formatea lo que se escribe en el campo del monto.
   *
   * Se acepta solo números, se recortan los ceros a la izquierda y lo que pase
   * del tope, y se agregan las comas de miles mientras se escribe: 5200 se ve
   * como 5,200. La coma es solo separador visual; el modelo guarda el número.
   */
  corregirMonto(tipo: TipoPago, evento: Event): void {
    const input = evento.target as HTMLInputElement;

    if (!input.value) {
      this.onMontoMetodoChange(tipo, 0);
      return;
    }

    // Solo dígitos y un punto decimal; las comas del formato se descartan.
    const limpio = input.value.replace(/[^\d.]/g, '');
    const [enteraCruda, ...resto] = limpio.split('.');

    // El 0 no puede ser el primer dígito ("050" es 50).
    let entera = enteraCruda.replace(/^0+(?=\d)/, '');
    // Se escriben como mucho dos decimales.
    let decimales = resto.length ? resto.join('').slice(0, 2) : '';
    const escribiendoDecimal = limpio.includes('.');

    let monto = Number(`${entera || '0'}.${decimales || '0'}`);
    const tope = this.montoMaximoMetodo(tipo);

    if (monto > tope) {
      monto = tope;
      entera = String(Math.floor(tope));
      decimales = String(Math.round((tope - Math.floor(tope)) * 100)).padStart(2, '0');
      decimales = decimales === '00' ? '' : decimales;
    }

    input.value = this.conSeparadorDeMiles(entera)
      + (escribiendoDecimal || decimales ? `.${decimales}` : '');

    this.onMontoMetodoChange(tipo, monto);
  }

  /** "5200.5" → "5,200.5". Solo la parte entera lleva comas. */
  private conSeparadorDeMiles(valor: string): string {
    const [entera, decimales] = valor.split('.');
    const conComas = (entera || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return decimales ? `${conComas}.${decimales}` : conComas;
  }

  private redondear(valor: number): number {
    return Math.round((Number(valor) || 0) * 100) / 100;
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

  continuarAPago(): void {
    const entregaValida = this.camposEntrega.every(campo => {
      const control = this.checkoutForm.get(campo);
      control?.markAsTouched();
      return control?.valid;
    });

    if (!entregaValida) {
      Swal.fire({
        title: 'Faltan datos de entrega',
        text: 'Por favor completa todos los campos requeridos antes de continuar.',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    this.pasoActual = 3;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  volverAEntrega(): void {
    this.pasoActual = 2;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ✅ El cliente puede pedir Boleta (con su DNI) o Factura (con su RUC) según lo
  // necesite en cada compra — el RUC/Razón Social solo son obligatorios con Factura.
  seleccionarTipoComprobante(tipo: 'boleta' | 'factura'): void {
    this.tipoComprobante = tipo;

    const rucControl = this.checkoutForm.get('ruc');
    const razonSocialControl = this.checkoutForm.get('razonSocial');
    const numeroDocumentoControl = this.checkoutForm.get('numeroDocumento');

    if (tipo === 'factura') {
      rucControl?.setValidators([Validators.required, Validators.pattern('^[0-9]{11}$')]);
      razonSocialControl?.setValidators([Validators.required]);
      numeroDocumentoControl?.clearValidators();
    } else {
      rucControl?.clearValidators();
      razonSocialControl?.clearValidators();
      // El documento ya no se edita en el checkout: viene del perfil del
      // cliente. Si se dejara obligatorio con 8 dígitos, una cuenta registrada
      // con RUC quedaría bloqueada sin campo visible donde corregirlo.
      numeroDocumentoControl?.clearValidators();
    }

    rucControl?.updateValueAndValidity();
    razonSocialControl?.updateValueAndValidity();
    numeroDocumentoControl?.updateValueAndValidity();
  }

  /**
   * Guarda el RUC/Razón Social en el perfil al cotizar, para no volver a
   * pedirlos en la próxima compra. Va en silencio: es un efecto secundario del
   * pedido, no una acción del usuario, y un fallo acá no debe cortar el flujo.
   */
  guardarDatosFacturacion(): void {
    const ruc = this.checkoutForm.get('ruc')?.value;
    const razonSocial = this.checkoutForm.get('razonSocial')?.value;

    if (!ruc || !razonSocial) return;

    this.authService.actualizarFacturacion(ruc, razonSocial).subscribe({
      error: (error) => console.warn('No se pudo guardar el RUC/Razón Social', error)
    });
  }

  onFormaEnvioChange(): void {
    // ⚠️ Costo de envío deshabilitado temporalmente — siempre 0.
    this.costoEnvioCalculado = 0;
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
      const faltantes = this.getCamposFaltantes();
      Swal.fire({
        title: 'Formulario incompleto',
        html: faltantes.length
          ? `Por favor completa:<ul class="text-start mb-0">${faltantes.map(f => `<li>${f}</li>`).join('')}</ul>`
          : 'Por favor complete todos los campos requeridos',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // La suma de los métodos de pago tiene que dar exactamente el total de
    // cada moneda: el backend rechaza la cotización si no cuadra, así que se
    // avisa acá con el detalle en vez de dejar que falle al enviar.
    if (!this.pagosCuadran) {
      const detalle = this.monedasDescuadradas.map(m => {
        const saldo = this.saldoPorPagar(m);
        const simbolo = m === 'd' ? 'US$' : 'S/';
        const nombre = m === 'd' ? 'dólares' : 'soles';
        return saldo > 0
          ? `<li>Falta ${simbolo} ${this.formatPrice(saldo)} en ${nombre}</li>`
          : `<li>Sobra ${simbolo} ${this.formatPrice(-saldo)} en ${nombre}</li>`;
      });

      Swal.fire({
        title: 'Los montos no cuadran',
        html: `Los métodos de pago deben sumar exactamente el total de la compra:
               <ul class="text-start mb-0">${detalle.join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // ✅ Si eligió Factura, se guarda su RUC/Razón Social en su perfil para no
    // tener que volver a pedirlos en su próxima compra.
    if (this.tipoComprobante === 'factura') {
      this.guardarDatosFacturacion();
    }

    this.procesandoPedido = true;
    const formData = this.checkoutForm.value;
    const formaEnvioStr = formData.departamento === '15' ? 'delivery' : 'envio_provincia';

    // Desglose completo de métodos de pago combinados (incluye Crédito si se usó).
    //
    // Se recorren todas las monedas, no solo la seleccionada: los montos se
    // guardan por moneda y antes se enviaban únicamente los de la que estuviera
    // activa al pulsar el botón, así que en una compra mixta el backend recibía
    // la mitad del pago y rechazaba la cotización por descuadre.
    const metodosPago = this.monedasDisponibles.flatMap(moneda =>
      this.tiposPago
        .filter(tipo => !!tipo.id)
        .map(tipo => ({
          tipo: tipo.codigo,
          moneda,
          monto: this.montosPorMetodo[`${moneda}_${tipo.id}`] || 0
        }))
        .filter(m => m.monto > 0)
    );

    const cotizacionData: CrearCotizacionRequest = {
      // ✅ Excluye "guardados para después": no forman parte de este pedido.
      productos: this.cartItems
        .filter(item => !item.guardado_para_despues)
        .map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad
        })),
      cliente_nombre: formData.cliente,
      cliente_email: formData.email,
      direccion_envio: formData.direccion,
      // El paso de entrega ya no pide celular: el teléfono sale del titular
      // (el cliente de 7Power si la cuenta está vinculada, o la cuenta misma),
      // que es el que se muestra en "Datos del Titular".
      telefono_contacto: this.titular?.telefono || formData.celular || '',
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

    if (metodosPago.length > 0) {
      cotizacionData.metodos_pago = metodosPago;
    }

    this.cotizacionesService.crearCotizacionEcommerce(cotizacionData).subscribe({
      next: (response) => {
        this.procesandoPedido = false;

        if (response.status === 'success') {
          // Se marca antes de vaciar: al quedar el carrito en cero se dispara
          // redirectIfCartIsEmpty(), y acá el vaciado es intencional.
          this.cotizacionGenerada = true;
          // Ya se usó lo que venía de la cotización que se estaba editando.
          sessionStorage.removeItem('cotizacion_editando');

          // clearCart() devuelve un Observable frío: sin suscribirse la
          // petición nunca sale y el carrito del cliente quedaba con los
          // productos ya cotizados.
          this.cartService.clearCart().subscribe({
            error: (err) => console.error('No se pudo vaciar el carrito:', err),
          });

          // Una compra con soles y dólares genera una cotización por moneda,
          // porque cada una se gestiona y se factura por separado.
          const creadas = (response as any).cotizaciones || [];
          const varias = creadas.length > 1;

          const detalle = creadas.length
            ? creadas.map((c: any) => `
                <div class="d-flex justify-content-between border-bottom py-2">
                  <span>${c.codigo_cotizacion}</span>
                  <strong>${c.moneda === 'd' ? 'US$' : 'S/'} ${this.formatPrice(c.total)}</strong>
                </div>`).join('')
            : `<div class="d-flex justify-content-between border-bottom py-2">
                 <span>${response.codigo_cotizacion}</span>
                 <strong>${this.formatPrice(response.cotizacion?.total ?? 0)}</strong>
               </div>`;

          Swal.fire({
            title: varias ? '¡Cotizaciones creadas!' : '¡Cotización creada exitosamente!',
            html: `
              <div class="text-center">
                <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                <p class="text-muted">
                  ${varias
                    ? 'Tu compra tiene productos en soles y en dólares, así que se registró una cotización por cada moneda.'
                    : 'Tu cotización ha sido registrada exitosamente.'}
                </p>
                <div class="text-start mt-3">${detalle}</div>
                <p class="text-sm text-gray-600 mt-3">
                  Puedes ver ${varias ? 'su estado' : 'el estado de tu cotización'} en "Mi Cuenta"
                </p>
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
          text: error.error?.error || error.error?.message || 'Ocurrió un error al crear tu cotización. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  onSubmit(): void {
    this.pedirCotizacion();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.checkoutForm.controls).forEach(key => {
      const control = this.checkoutForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Nombres amigables de los campos inválidos, para decirle al cliente
   * exactamente qué le falta (el botón ya no se deshabilita en silencio).
   */
  private getCamposFaltantes(): string[] {
    const etiquetas: { [campo: string]: string } = {
      direccion: 'Dirección de envío',
      celular: this.checkoutForm.get('celular')?.errors?.['pattern']
        ? 'Celular (debe ser un número válido de 9 dígitos que empiece con 9)'
        : 'Celular',
      tipoPago: 'Selecciona al menos un método de pago',
      ruc: 'RUC (11 dígitos)',
      razonSocial: 'Razón Social',
      aceptaTerminos: 'Debes aceptar los términos y condiciones'
    };

    return Object.keys(this.checkoutForm.controls)
      .filter(campo => this.checkoutForm.get(campo)?.invalid && etiquetas[campo])
      .map(campo => etiquetas[campo]);
  }

  getItemSubtotal(item: CartItem): number {
    // ✅ Usa el precio con descuento cuando existe, igual que CartService.updateCartSummary
    // — si no, el total por moneda del checkout mostraba el precio original (sin descuento).
    const tieneDescuento = !!item.descuento_porcentaje && item.descuento_porcentaje > 0 && !!item.precio_con_descuento;
    const precioBase = tieneDescuento ? item.precio_con_descuento : item.precio;
    const precio = typeof precioBase === 'number' ? precioBase : parseFloat(String(precioBase || 0));
    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : parseInt(String(item.cantidad || 0));

    if (isNaN(precio) || isNaN(cantidad)) {
      return 0;
    }

    return precio * cantidad;
  }

  /**
   * Monedas de la venta, sin conversión: cada una se cobra y se cuadra por
   * separado. Solo las que realmente hay en el carrito — si la compra es toda
   * en soles, no tiene sentido ofrecer dólares en 0.
   */
  get monedasDisponibles(): string[] {
    const monedas = this.monedasEnCarrito;

    return monedas.length ? monedas : ['s'];
  }

  /** Si la venta incluye dólares; de eso depende mostrar el tipo de cambio. */
  get hayDolares(): boolean {
    return this.monedasDisponibles.includes('d');
  }

  // Monedas realmente presentes en el carrito (para el mensaje informativo).
  // Excluye los productos "guardados para después": no forman parte de la venta.
  get monedasEnCarrito(): string[] {
    const monedas = new Set(
      this.cartItems.filter(item => !item.guardado_para_despues).map(item => item.moneda || 's')
    );
    return Array.from(monedas);
  }

  getTotalPorMoneda(moneda: string): number {
    // ✅ Excluye "guardados para después": no forman parte de la venta ni de su total.
    return this.cartItems
      .filter(item => !item.guardado_para_despues && (item.moneda || 's') === moneda)
      .reduce((sum, item) => sum + this.getItemSubtotal(item), 0);
  }

  seleccionarMonedaPago(moneda: string): void {
    this.monedaPagoSeleccionada = moneda;
  }

  private claveMetodoPago(tipo: TipoPago): string {
    return `${this.monedaPagoSeleccionada}_${tipo.id}`;
  }

  esMetodoSeleccionado(tipo: TipoPago): boolean {
    return !!tipo.id && this.metodosPagoSeleccionados.has(tipo.id);
  }

  toggleMetodoPago(tipo: TipoPago): void {
    if (!tipo.id) return;

    if (this.metodosPagoSeleccionados.has(tipo.id)) {
      this.metodosPagoSeleccionados.delete(tipo.id);
    } else {
      this.metodosPagoSeleccionados.add(tipo.id);
    }

    // ✅ El selector de "Tipo de Pago" (oculto) se sincroniza automáticamente con el
    // primer método seleccionado, para no romper el flujo de envío del pedido existente.
    const primerSeleccionado = this.tiposPago.find(t => t.id && this.metodosPagoSeleccionados.has(t.id));
    this.checkoutForm.patchValue({ tipoPago: primerSeleccionado?.codigo || '' });
  }

  getMontoMetodo(tipo: TipoPago): number {
    return this.montosPorMetodo[this.claveMetodoPago(tipo)] || 0;
  }

  onMontoMetodoChange(tipo: TipoPago, valor: string | number): void {
    // No se puede ingresar más de lo que falta por cubrir en esa moneda, ni
    // más crédito del aprobado. El backend vuelve a validar el cuadre antes de
    // crear la cotización.
    const monto = Math.min(
      Math.max(0, this.redondear(Number(valor) || 0)),
      this.montoMaximoMetodo(tipo)
    );
    this.montosPorMetodo[this.claveMetodoPago(tipo)] = monto;

    // ✅ Ingresar un monto también selecciona la tarjeta del método (el input
    // detiene la propagación del click, así que escribir el monto sin haber
    // tocado la tarjeta antes no la marcaba como seleccionada).
    if (tipo.id) {
      if (monto > 0) {
        this.metodosPagoSeleccionados.add(tipo.id);
      } else {
        this.metodosPagoSeleccionados.delete(tipo.id);
      }

      const primerSeleccionado = this.tiposPago.find(t => t.id && this.metodosPagoSeleccionados.has(t.id));
      this.checkoutForm.patchValue({ tipoPago: primerSeleccionado?.codigo || '' });
    }
  }

  getTotalIngresadoPorMoneda(moneda: string): number {
    return Object.keys(this.montosPorMetodo)
      .filter(clave => clave.startsWith(`${moneda}_`))
      .reduce((sum, clave) => sum + (this.montosPorMetodo[clave] || 0), 0);
  }

  getTotalFinal(): number {
    const subtotal = Number(this.cartSummary.subtotal) || 0;
    const igv = Number(this.cartSummary.igv) || 0;
    const envio = Number(this.costoEnvioCalculado) || 0;
    const descuento = Number(this.descuentoCupon) || 0;

    return subtotal + igv - descuento + envio;
  }

  /**
   * Total a pagar de una moneda. El envío y el cupón se cobran en soles, así
   * que solo entran en ese bloque; los productos en dólares se muestran
   * aparte, sin convertir.
   */
  getTotalFinalPorMoneda(moneda: string): number {
    const productos = this.getTotalPorMoneda(moneda);
    if (moneda !== 's') return productos;

    const envio = Number(this.costoEnvioCalculado) || 0;
    const descuento = Number(this.descuentoCupon) || 0;
    return Math.max(0, productos + envio - descuento);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  /** Importe con separador de miles: 1500 se muestra como 1,500.00. */
  formatPrice(price: number | string | null | undefined): string {
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price || 0));

    if (isNaN(numPrice)) {
      return '0.00';
    }

    return numPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private loadDireccionesGuardadas(seleccionarMasReciente: boolean = false, idParaReseleccionar?: number): void {
    if (this.isLoggedIn) {
      this.direccionesService.obtenerDirecciones()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.direccionesGuardadas = response.direcciones || [];

              // ✅ Se editó una dirección: si era la que estaba activa, se refrescan sus
              // datos; si no, solo se actualiza la lista sin cambiar la selección del cliente.
              if (idParaReseleccionar) {
                const editada = this.direccionesGuardadas.find(d => d.id === idParaReseleccionar);
                if (editada && this.direccionSeleccionada?.id === idParaReseleccionar) {
                  this.seleccionarDireccion(editada);
                }
                return;
              }

              if (seleccionarMasReciente && this.direccionesGuardadas.length > 0) {
                // ✅ Recién agregada desde el modal de nueva dirección: seleccionar la última creada
                const masReciente = [...this.direccionesGuardadas].sort((a, b) =>
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                )[0];
                this.seleccionarDireccion(masReciente);
                return;
              }

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

  abrirModalDirecciones(): void {
    this.mostrarModalDirecciones = true;
  }

  cerrarModalDirecciones(): void {
    this.mostrarModalDirecciones = false;
  }

  abrirModalNuevaDireccion(): void {
    this.modoModalDireccion = 'create';
    this.direccionEnEdicion = null;
    this.mostrarModalDirecciones = false;
    this.mostrarModalNuevaDireccion = true;
  }

  abrirModalEditarDireccion(direccion: Direccion): void {
    this.modoModalDireccion = 'edit';
    this.direccionEnEdicion = direccion;
    this.mostrarModalDirecciones = false;
    this.mostrarModalNuevaDireccion = true;
  }

  cerrarModalNuevaDireccion(): void {
    this.mostrarModalNuevaDireccion = false;
  }

  onNuevaDireccionGuardada(): void {
    const idEditado = this.direccionEnEdicion?.id;
    this.mostrarModalNuevaDireccion = false;
    this.usarDireccionPersonalizada = false;
    this.modoModalDireccion = 'create';
    this.direccionEnEdicion = null;

    if (idEditado) {
      this.loadDireccionesGuardadas(false, idEditado);
    } else {
      this.loadDireccionesGuardadas(true);
    }
  }

  /**
   * Dirección registrada en 7Power, disponible solo si la cuenta está
   * vinculada y el cliente la tiene cargada allá.
   */
  get direccionErp(): string | null {
    return this.titular?.vinculado ? this.titular?.direccion || null : null;
  }

  /** Si la entrega va a la dirección del ERP en vez de la del e-commerce. */
  usandoDireccionErp = false;

  /**
   * Cambia la entrega a la dirección de 7Power, con su propio ubigeo: de ahí
   * salen la forma y el costo de envío.
   */
  usarDireccionErp(): void {
    if (!this.direccionErp) return;

    this.usandoDireccionErp = true;
    this.checkoutForm.patchValue({ direccion: this.direccionErp });

    this.aplicarUbigeoPorNombre(
      this.titular?.departamento,
      this.titular?.provincia,
      this.titular?.distrito
    );
  }

  /** Elige la dirección del ERP desde el modal y lo cierra. */
  seleccionarDireccionErp(): void {
    this.usarDireccionErp();
    this.cerrarModalDirecciones();
  }

  /** La dirección del ERP en un solo renglón, con su ubigeo. */
  get direccionErpEnUnaLinea(): string {
    return [
      this.direccionErp,
      this.titular?.distrito,
      this.titular?.provincia,
      this.titular?.departamento,
    ]
      .filter(Boolean)
      .join(', ');
  }

  /**
   * La dirección a la que se va a entregar, según lo elegido en el paso 1.
   * El resumen del paso de pago mostraba la del cliente de 7Power aunque se
   * hubiera elegido una dirección propia.
   */
  get direccionEntregaResumen(): string {
    if (this.usandoDireccionErp) return this.direccionErpEnUnaLinea;
    if (this.direccionSeleccionada)
      return this.direccionEnUnaLinea(this.direccionSeleccionada);

    return this.checkoutForm.get('direccion')?.value || '';
  }

  /** Una dirección guardada en un solo renglón, con su ubigeo. */
  direccionEnUnaLinea(direccion: Direccion): string {
    return [
      direccion.direccion_completa,
      direccion.ubigeo?.distrito_nombre,
      direccion.ubigeo?.provincia_nombre,
      direccion.ubigeo?.departamento_nombre,
    ]
      .filter(Boolean)
      .join(', ');
  }

  /** Vuelve a la dirección guardada en el e-commerce. */
  usarMiDireccion(): void {
    this.usandoDireccionErp = false;

    if (!this.direccionSeleccionada) return;

    this.checkoutForm.patchValue({
      direccion: this.direccionSeleccionada.direccion_completa
    });

    this.aplicarUbigeoPorNombre(
      this.direccionSeleccionada.ubigeo?.departamento_nombre,
      this.direccionSeleccionada.ubigeo?.provincia_nombre,
      this.direccionSeleccionada.ubigeo?.distrito_nombre
    );
  }

  /**
   * Selecciona departamento, provincia y distrito buscándolos por nombre.
   *
   * Los ids del ERP y los del catálogo del e-commerce no son los mismos, así
   * que el nombre es lo único que sirve para cruzarlos. Cada nivel depende del
   * anterior, de ahí el encadenado.
   */
  private aplicarUbigeoPorNombre(
    nombreDepartamento?: string | null,
    nombreProvincia?: string | null,
    nombreDistrito?: string | null
  ): void {
    if (!nombreDepartamento) return;

    const departamento = this.departamentos.find(d => d.nombre === nombreDepartamento);
    if (!departamento) return;

    this.checkoutForm.patchValue({ departamento: departamento.id });

    this.onDepartamentoChange().then(() => {
      const provincia = this.provincias.find(p => p.nombre === nombreProvincia);
      if (!provincia) return;

      this.checkoutForm.patchValue({ provincia: provincia.id });

      this.onProvinciaChange().then(() => {
        const distrito = this.distritos.find(d => d.nombre === nombreDistrito);
        if (!distrito) return;

        this.checkoutForm.patchValue({ distrito: distrito.id });
        this.onDistritoChange();
      });
    });
  }

  seleccionarDireccion(direccion: Direccion): void {
    this.direccionSeleccionada = direccion;
    this.usarDireccionPersonalizada = false;
    // Elegir una dirección propia descarta la del ERP.
    this.usandoDireccionErp = false;
    this.cerrarModalDirecciones();

    this.checkoutForm.patchValue({
      cliente: direccion.nombre_destinatario,
      direccion: direccion.direccion_completa,
      celular: direccion.telefono || ''
    });

    this.aplicarUbigeoPorNombre(
      direccion.ubigeo?.departamento_nombre,
      direccion.ubigeo?.provincia_nombre,
      direccion.ubigeo?.distrito_nombre
    );
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
      // ✅ El selector de "Forma de Envío" ya no se muestra al cliente, así que
      // siempre se autoselecciona la primera opción disponible para la zona.
      this.checkoutForm.patchValue({ formaEnvio: this.formasEnvioFiltradas[0].id });
      // ⚠️ Costo de envío deshabilitado temporalmente — siempre 0.
      this.costoEnvioCalculado = 0;
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
