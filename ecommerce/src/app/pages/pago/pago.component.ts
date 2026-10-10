import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { CheckoutStepsComponent } from '../../component/checkout-steps/checkout-steps.component';
import { ModalDireccionComponent } from '../../component/modal-direccion/modal-direccion.component';
import { MonedaPipe } from '../../pipes/moneda.pipe';
import { CartService, CartItem, CartSummary } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { DireccionesService, Direccion } from '../../services/direcciones.service';
import { UbigeoService, Departamento } from '../../services/ubigeo.service';
import {
  PagoEnLineaService,
  PagoEnLinea,
  PagarRequest,
  TOKEN_PRUEBA_APROBADO,
  TOKEN_PRUEBA_RECHAZADO,
} from '../../services/pago-en-linea.service';

/**
 * Compra por pasarela de pago: Carro → Entrega → Pago.
 *
 * Es independiente del checkout de cotizaciones/pedidos. Hoy la pasarela es de
 * prueba: el formulario de tarjeta solo acepta las tarjetas de prueba y el
 * número nunca sale del navegador (se manda un token). Cuando Culqi apruebe el
 * comercio, el token sale de Culqi.js en `obtenerToken()` y el resto no cambia.
 */
@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ShippingComponent,
    CheckoutStepsComponent,
    ModalDireccionComponent,
    MonedaPipe,
  ],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.scss',
})
export class PagoComponent implements OnInit, OnDestroy {
  /** Tarjetas de prueba que acepta el formulario. */
  readonly TARJETA_APROBADA = '4111111111111111';
  readonly TARJETA_RECHAZADA = '4000000000000002';
  readonly TERMINOS_URL = '/assets/legal/terminos-y-condiciones-de-compra.pdf';

  // 2 = Entrega, 3 = Pago (1 = Carro, ya pasado)
  pasoActual: 2 | 3 = 2;
  vista: 'formulario' | 'exito' | 'rechazado' = 'formulario';

  cartItems: CartItem[] = [];
  cartSummary: CartSummary = { subtotal: 0, igv: 0, total: 0, cantidad_items: 0, porMoneda: [] };
  cartLoaded = false;
  monedaPago = 's';

  entregaForm!: FormGroup;
  tarjetaForm!: FormGroup;

  departamentos: Departamento[] = [];
  direccionesGuardadas: Direccion[] = [];
  direccionSeleccionada: Direccion | null = null;
  mostrarModalDirecciones = false;
  mostrarModalNuevaDireccion = false;
  modoModalDireccion: 'create' | 'edit' = 'create';
  direccionEnEdicion: Direccion | null = null;

  cuponAplicado: any = null;
  modoPrueba = true;
  procesando = false;
  tarjetaIntentada = false;

  pago: PagoEnLinea | null = null;
  mensajeRechazo = '';

  /** Tras una compra aprobada el carrito queda vacío a propósito. */
  private compraTerminada = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private direccionesService: DireccionesService,
    private ubigeoService: UbigeoService,
    private pagoService: PagoEnLineaService,
    private router: Router
  ) {
    this.entregaForm = this.fb.group({
      cliente_nombre: ['', [Validators.required, Validators.minLength(3)]],
      cliente_email: ['', [Validators.required, Validators.email]],
      numero_documento: [''],
      telefono_contacto: ['', [Validators.required, Validators.pattern('^[0-9+ ]{7,15}$')]],
      observaciones: ['', [Validators.maxLength(500)]],
      aceptaTerminos: [false, [Validators.requiredTrue]],
    });

    this.tarjetaForm = this.fb.group({
      titular: ['', [Validators.required, Validators.minLength(3)]],
      numero: ['', [Validators.required]],
      vencimiento: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/[0-9]{2}$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
    });
  }

  // ---------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------

  ngOnInit(): void {
    combineLatest([this.cartService.cartItems$, this.cartService.cartLoaded$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([items, loaded]) => {
        this.cartItems = items || [];
        this.cartLoaded = loaded;

        // La moneda a pagar debe ser una que el carrito realmente tenga.
        const monedas = this.monedasEnCarrito;
        if (monedas.length > 0 && !monedas.includes(this.monedaPago)) {
          this.monedaPago = monedas[0];
        }

        this.salirSiElCarritoEstaVacio();
      });

    this.cartService.cartSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summary) => (this.cartSummary = summary));

    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (!user) return;
      // Datos que el cliente ya dio al registrarse: se precargan, y puede
      // corregirlos para esta compra.
      this.entregaForm.patchValue(
        {
          cliente_nombre: this.entregaForm.value.cliente_nombre || user.nombre_completo || user.name || '',
          cliente_email: this.entregaForm.value.cliente_email || user.email || '',
          telefono_contacto: this.entregaForm.value.telefono_contacto || user.telefono || '',
          numero_documento: this.entregaForm.value.numero_documento || user.numero_documento || '',
        },
        { emitEvent: false }
      );
    });

    this.ubigeoService.getDepartamentos().subscribe({
      next: (deps) => (this.departamentos = deps),
      error: () => (this.departamentos = []),
    });

    this.cargarDirecciones();
    this.cargarCupon();

    this.pagoService.obtenerConfiguracion().subscribe({
      next: (cfg) => (this.modoPrueba = cfg.modo_prueba !== false),
      // Si no responde se deja el aviso: mejor avisar de más que de menos.
      error: () => (this.modoPrueba = true),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------
  // Carrito
  // ---------------------------------------------------------------------

  get productosEnCarrito(): CartItem[] {
    return this.cartItems.filter((i) => !i.guardado_para_despues);
  }

  /** Monedas presentes en el carrito (soles primero). */
  get monedasEnCarrito(): string[] {
    return this.cartSummary.porMoneda.map((m) => m.moneda);
  }

  /** Productos que se van a pagar ahora: los de la moneda elegida. */
  get productosAPagar(): CartItem[] {
    return this.productosEnCarrito.filter((i) => this.monedaDe(i) === this.monedaPago);
  }

  get resumenMoneda() {
    return this.cartSummary.porMoneda.find((m) => m.moneda === this.monedaPago);
  }

  get subtotalAPagar(): number {
    return Number(this.resumenMoneda?.total) || 0;
  }

  /** Descuento del cupón guardado en el carrito: solo aplica a soles. */
  get descuentoCupon(): number {
    if (!this.cuponAplicado || this.monedaPago !== 's') return 0;
    const subtotal = this.subtotalAPagar;
    const valor = Number(this.cuponAplicado.valor_descuento) || 0;
    const descuento =
      this.cuponAplicado.tipo_descuento === 'porcentaje' ? subtotal * (valor / 100) : Math.min(valor, subtotal);
    return Math.min(Math.round(descuento * 100) / 100, subtotal);
  }

  get totalAPagar(): number {
    return Math.max(0, this.subtotalAPagar - this.descuentoCupon);
  }

  private monedaDe(item: CartItem): string {
    const m = (item.moneda || 's').toLowerCase().trim();
    return m === 'd' || m === 'usd' ? 'd' : 's';
  }

  private precioFinal(item: CartItem): number {
    if (item.descuento_porcentaje && item.descuento_porcentaje > 0 && item.precio_con_descuento) {
      return Number(item.precio_con_descuento);
    }
    return Number(item.precio) || 0;
  }

  subtotalDe(item: CartItem): number {
    return this.precioFinal(item) * (Number(item.cantidad) || 0);
  }

  private cargarCupon(): void {
    if (typeof window === 'undefined') return;
    try {
      const guardado = sessionStorage.getItem('cupon_aplicado');
      this.cuponAplicado = guardado ? JSON.parse(guardado) : null;
    } catch {
      this.cuponAplicado = null;
    }
  }

  private salirSiElCarritoEstaVacio(): void {
    if (
      typeof window === 'undefined' ||
      !this.cartLoaded ||
      this.compraTerminada ||
      this.productosEnCarrito.length > 0
    ) {
      return;
    }
    this.compraTerminada = true; // evita que el aviso salga dos veces
    Swal.fire({
      title: 'Carrito vacío',
      text: 'No tienes productos en tu carrito para pagar.',
      icon: 'warning',
      confirmButtonColor: '#dc3545',
    }).then(() => this.router.navigate(['/shop']));
  }

  // ---------------------------------------------------------------------
  // Paso 2: entrega (solo delivery)
  // ---------------------------------------------------------------------

  private cargarDirecciones(seleccionarMasReciente = false, idEditado?: number): void {
    this.direccionesService.obtenerDirecciones().pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp) => {
        if (resp.status !== 'success') return;
        this.direccionesGuardadas = resp.direcciones || [];

        if (idEditado && this.direccionSeleccionada?.id === idEditado) {
          const editada = this.direccionesGuardadas.find((d) => d.id === idEditado);
          if (editada) this.seleccionarDireccion(editada);
          return;
        }

        if (seleccionarMasReciente && this.direccionesGuardadas.length > 0) {
          const masReciente = [...this.direccionesGuardadas].sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0];
          this.seleccionarDireccion(masReciente);
          return;
        }

        if (!this.direccionSeleccionada) {
          const predeterminada = this.direccionesGuardadas.find((d) => d.predeterminada);
          if (predeterminada) this.seleccionarDireccion(predeterminada);
        }
      },
      error: () => (this.direccionesGuardadas = []),
    });
  }

  seleccionarDireccion(direccion: Direccion): void {
    this.direccionSeleccionada = direccion;
    this.mostrarModalDirecciones = false;

    // La dirección trae a quién entregar y su teléfono: se usan si el cliente
    // todavía no los había escrito distintos.
    if (direccion.telefono && !this.entregaForm.value.telefono_contacto) {
      this.entregaForm.patchValue({ telefono_contacto: direccion.telefono });
    }
  }

  direccionEnUnaLinea(d: Direccion): string {
    return [d.direccion_completa, d.ubigeo?.distrito_nombre, d.ubigeo?.provincia_nombre, d.ubigeo?.departamento_nombre]
      .filter(Boolean)
      .join(', ');
  }

  abrirModalDirecciones(): void {
    if (this.direccionesGuardadas.length === 0) {
      this.abrirModalNuevaDireccion();
      return;
    }
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
    this.modoModalDireccion = 'create';
    this.direccionEnEdicion = null;
    this.cargarDirecciones(!idEditado, idEditado);
  }

  campoInvalido(form: FormGroup, nombre: string): boolean {
    const c = form.get(nombre);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  continuarAPago(): void {
    this.entregaForm.markAllAsTouched();

    const faltantes: string[] = [];
    if (this.entregaForm.get('cliente_nombre')?.invalid) faltantes.push('el nombre');
    if (this.entregaForm.get('cliente_email')?.invalid) faltantes.push('un correo válido');
    if (this.entregaForm.get('telefono_contacto')?.invalid) faltantes.push('un teléfono de contacto');
    if (!this.direccionSeleccionada) faltantes.push('la dirección de entrega');
    if (this.entregaForm.get('aceptaTerminos')?.invalid) faltantes.push('aceptar los términos y condiciones');

    if (faltantes.length > 0) {
      Swal.fire({
        title: 'Faltan datos',
        text: 'Completa ' + faltantes.join(', ') + ' para continuar.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.pasoActual = 3;
    this.scrollArriba();
  }

  volverAEntrega(): void {
    this.pasoActual = 2;
    this.scrollArriba();
  }

  // ---------------------------------------------------------------------
  // Paso 3: pago con tarjeta (pasarela de prueba)
  // ---------------------------------------------------------------------

  /** "4111111111111111" → "4111 1111 1111 1111" mientras se escribe. */
  formatearNumero(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 16);
    const formateado = digitos.replace(/(.{4})/g, '$1 ').trim();
    this.tarjetaForm.get('numero')?.setValue(formateado, { emitEvent: false });
    input.value = formateado;
  }

  /** "1228" → "12/28" mientras se escribe. */
  formatearVencimiento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 4);
    const formateado = digitos.length > 2 ? digitos.slice(0, 2) + '/' + digitos.slice(2) : digitos;
    this.tarjetaForm.get('vencimiento')?.setValue(formateado, { emitEvent: false });
    input.value = formateado;
  }

  usarTarjetaPrueba(tipo: 'aprobada' | 'rechazada'): void {
    const numero = tipo === 'aprobada' ? this.TARJETA_APROBADA : this.TARJETA_RECHAZADA;
    this.tarjetaForm.patchValue({
      titular: (this.entregaForm.value.cliente_nombre || 'CLIENTE DE PRUEBA').toString().toUpperCase(),
      numero: numero.replace(/(.{4})/g, '$1 ').trim(),
      vencimiento: '12/30',
      cvv: '123',
    });
    this.tarjetaIntentada = false;
  }

  private numeroLimpio(): string {
    return String(this.tarjetaForm.value.numero || '').replace(/\D/g, '');
  }

  /** En modo prueba solo se admiten las tarjetas de prueba. */
  get numeroNoEsDePrueba(): boolean {
    const n = this.numeroLimpio();
    return n.length > 0 && n !== this.TARJETA_APROBADA && n !== this.TARJETA_RECHAZADA;
  }

  get marcaTarjeta(): string {
    const n = this.numeroLimpio();
    if (n.startsWith('4')) return 'Visa';
    if (n.startsWith('5')) return 'Mastercard';
    return 'Tarjeta';
  }

  /** El vencimiento escrito (MM/AA) es una fecha vigente. */
  get vencimientoValido(): boolean {
    const m = /^(\d{2})\/(\d{2})$/.exec(String(this.tarjetaForm.value.vencimiento || ''));
    if (!m) return false;
    const mes = Number(m[1]);
    const anio = 2000 + Number(m[2]);
    const hoy = new Date();
    return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
  }

  /**
   * Token de la tarjeta. Con la pasarela de prueba lo arma el navegador a
   * partir de la tarjeta de prueba; con Culqi lo entrega Culqi.js. El número
   * de la tarjeta nunca se envía al servidor.
   */
  private obtenerToken(): string {
    return this.numeroLimpio() === this.TARJETA_APROBADA ? TOKEN_PRUEBA_APROBADO : TOKEN_PRUEBA_RECHAZADO;
  }

  pagar(): void {
    this.tarjetaIntentada = true;
    this.tarjetaForm.markAllAsTouched();

    if (this.tarjetaForm.invalid || this.numeroNoEsDePrueba || !this.vencimientoValido) return;
    if (!this.direccionSeleccionada || this.procesando) return;

    const d = this.direccionSeleccionada;
    const e = this.entregaForm.value;
    const numero = this.numeroLimpio();

    const datos: PagarRequest = {
      cliente_nombre: String(e.cliente_nombre).trim(),
      cliente_email: String(e.cliente_email).trim(),
      numero_documento: e.numero_documento ? String(e.numero_documento).trim() : undefined,
      telefono_contacto: String(e.telefono_contacto).trim(),
      direccion_envio: d.direccion_completa,
      departamento_nombre: d.ubigeo?.departamento_nombre || '',
      provincia_nombre: d.ubigeo?.provincia_nombre || '',
      distrito_nombre: d.ubigeo?.distrito_nombre || '',
      observaciones: e.observaciones ? String(e.observaciones).trim() : undefined,
      moneda: this.monedasEnCarrito.length > 1 ? this.monedaPago : undefined,
      token: this.obtenerToken(),
      tarjeta_marca: this.marcaTarjeta,
      tarjeta_ultimos4: numero.slice(-4),
    };

    if (this.cuponAplicado?.codigo && this.monedaPago === 's') {
      (datos as any).cupon_codigo = this.cuponAplicado.codigo;
    }

    this.procesando = true;
    this.pagoService.pagar(datos).subscribe({
      next: (resp) => {
        this.procesando = false;
        this.pago = resp.pago;

        if (resp.aprobado) {
          this.compraTerminada = true;
          this.vista = 'exito';
          if (typeof window !== 'undefined') sessionStorage.removeItem('cupon_aplicado');
          // El servidor ya sacó lo pagado del carrito: se vuelve a leer.
          this.cartService.forceReloadCart();
        } else {
          this.mensajeRechazo = resp.mensaje || 'No se pudo procesar el pago.';
          this.vista = 'rechazado';
        }
        this.scrollArriba();
      },
      error: (err) => {
        this.procesando = false;
        Swal.fire({
          title: 'No se pudo completar el pago',
          text: err?.error?.message || 'Ocurrió un error al procesar el pago. Intenta nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc3545',
        });
      },
    });
  }

  intentarDeNuevo(): void {
    this.vista = 'formulario';
    this.pasoActual = 3;
    this.tarjetaForm.reset();
    this.tarjetaIntentada = false;
    this.scrollArriba();
  }

  seguirComprando(): void {
    this.router.navigate(['/shop']);
  }

  // ---------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------

  formatPrice(valor: number | string | null | undefined): string {
    return (Number(valor) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  nombreMoneda(moneda: string): string {
    return moneda === 'd' ? 'Dólares (US$)' : 'Soles (S/)';
  }

  ubicacionDePago(): string {
    if (!this.pago) return '';
    return [this.pago.distrito_nombre, this.pago.provincia_nombre, this.pago.departamento_nombre]
      .filter(Boolean)
      .join(', ');
  }

  onImageError(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  private scrollArriba(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
