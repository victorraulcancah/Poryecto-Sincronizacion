import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CartItem, CartService } from '../../services/cart.service';
import { MonedaPipe } from '../../pipes/moneda.pipe';

@Component({
  selector: 'app-cart-notification',
  standalone: true,
  imports: [CommonModule, RouterLink, MonedaPipe],
  templateUrl: './cart-notification.component.html',
  styleUrl: './cart-notification.component.scss'
})
export class CartNotificationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() productName: string = '';
  @Input() productPrice: number = 0;
  @Input() productImage: string = '';
  @Input() productMoneda: string = 's';
  @Input() quantity: number = 1;
  @Input() productId?: number;
  @Input() showSuggestions: boolean = true;
  @Input() suggestedProducts: any[] = [];
  @Input() autoCloseDelay: number = 8000; // 8 segundos

  @Output() onClose = new EventEmitter<void>();
  @Output() onViewCart = new EventEmitter<void>();
  @Output() onSuggestedProductSelect = new EventEmitter<any>();

  /** Línea del carrito del producto recién agregado. */
  item: CartItem | null = null;
  /** Cantidad que se ve en el contador; puede ir por delante del carrito. */
  cantidad: number = 1;
  actualizando = false;
  errorStock = '';

  private autoCloseTimer?: number;
  private items: CartItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.cantidad = this.quantity;

    // El contador trabaja sobre el carrito real: así el máximo es el stock y
    // el cambio se ve reflejado en el resto de la página.
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.items = items || [];
        this.item = this.ubicarItem(this.items);
        if (this.item && !this.actualizando) {
          this.cantidad = this.item.cantidad;
        }
      });

    if (this.isVisible && this.autoCloseDelay > 0) {
      this.startAutoCloseTimer();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cada vez que se agrega otro producto el modal se reusa: hay que volver a
    // apuntar a la línea nueva y reiniciar el cierre automático.
    if (changes['productId'] || changes['productName'] || changes['quantity']) {
      this.errorStock = '';
      this.item = this.ubicarItem(this.items);
      // La cantidad que se muestra es la que quedó en el carrito, que puede
      // ser mayor a la recién agregada si el producto ya estaba.
      this.cantidad = this.item?.cantidad ?? this.quantity;
    }

    if (changes['isVisible'] && this.isVisible && this.autoCloseDelay > 0) {
      this.startAutoCloseTimer();
    }
  }

  ngOnDestroy() {
    this.clearAutoCloseTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Tope del contador: el stock de la línea, o lo que ya se agregó. */
  get maximo(): number {
    return this.item?.stock_disponible ?? this.cantidad;
  }

  cambiarCantidad(delta: number): void {
    this.fijarCantidad(this.cantidad + delta);
  }

  /**
   * Mientras se escribe: se recortan los ceros a la izquierda y lo que pase del
   * stock, pero todavía no se toca el carrito.
   */
  escribirCantidad(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const escrito = parseInt(input.value, 10);

    // Campo vacío: se deja borrar sin corregir nada todavía.
    if (isNaN(escrito)) return;

    const valor = Math.min(Math.max(escrito, 1), this.maximo);
    input.value = String(valor);
    this.cantidad = valor;
  }

  /** Al salir del campo (o con Enter) recién se guarda en el carrito. */
  confirmarCantidad(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const escrito = parseInt(input.value, 10);
    const valor = isNaN(escrito) ? 1 : Math.min(Math.max(escrito, 1), this.maximo);

    input.value = String(valor);
    this.fijarCantidad(valor);
  }

  private fijarCantidad(nueva: number): void {
    if (
      nueva < 1 ||
      nueva > this.maximo ||
      nueva === this.item?.cantidad ||
      !this.item ||
      this.actualizando
    ) {
      // Se vuelve a lo que hay en el carrito para no dejar el campo mintiendo.
      this.cantidad = this.item?.cantidad ?? this.cantidad;
      return;
    }

    this.errorStock = '';
    this.cantidad = nueva;
    this.actualizando = true;
    // Mientras se actualiza no se cierra solo: el usuario está interactuando.
    this.clearAutoCloseTimer();

    this.cartService.updateQuantity(this.item, nueva)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actualizando = false;
        },
        error: () => {
          // Si el backend rechaza el cambio se vuelve a la cantidad real.
          this.cantidad = this.item?.cantidad ?? this.cantidad;
          this.errorStock = 'No se pudo actualizar la cantidad.';
          this.actualizando = false;
        }
      });
  }

  private ubicarItem(items: CartItem[]): CartItem | null {
    if (!items?.length) return null;

    // Por id cuando el llamador lo pasó; si no, por nombre (los llamadores
    // viejos solo mandan los datos visibles).
    return (
      items.find(i => this.productId != null && i.producto_id === this.productId) ||
      items.find(i => i.nombre === this.productName) ||
      null
    );
  }

  private startAutoCloseTimer() {
    this.clearAutoCloseTimer();
    this.autoCloseTimer = window.setTimeout(() => {
      this.closeNotification();
    }, this.autoCloseDelay);
  }

  private clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      window.clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  onOverlayClick() {
    this.closeNotification();
  }

  closeNotification() {
    this.clearAutoCloseTimer();
    this.onClose.emit();
  }

  goToCart() {
    this.clearAutoCloseTimer();
    this.onViewCart.emit();
  }

  onSuggestedProductClick(product: any) {
    this.onSuggestedProductSelect.emit(product);
  }

  /**
   * Precio del sugerido: cada pantalla arma esos objetos con un campo distinto
   * (`precio`, `precio_venta`, `precio_con_descuento`), y cuando no coincidía
   * se veía el símbolo de la moneda solo, sin importe.
   */
  precioSugerido(product: any): number | null {
    const precio = Number(
      product?.precio_con_descuento || product?.precio || product?.precio_venta || 0
    );

    return precio > 0 ? precio : null;
  }

  /**
   * Imagen rota: se oculta y listo.
   *
   * Antes se apuntaba a `product-default.png`, que no existe en el proyecto:
   * el reemplazo también fallaba, volvía a disparar este handler y el modal
   * quedaba parpadeando en bucle.
   */
  onImageError(event: any) {
    const img = event.target as HTMLImageElement;
    img.style.visibility = 'hidden';
  }
}
