// src/app/pages/cart/cart.component.ts
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MonedaPipe } from '../../pipes/moneda.pipe';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { CartService, CartItem, CartSummary } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OfertasService } from '../../services/ofertas.service';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterLink, FormsModule, BreadcrumbComponent, ShippingComponent, MonedaPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartSummary: CartSummary = { subtotal: 0, igv: 0, total: 0, cantidad_items: 0 };
  codigoCupon = '';
  descuentoCupon = 0;
  cuponAplicado: any = null; // Guarda la info del cupón aplicado
  isUpdating = false;
  isLoggedIn = false;
  isValidatingCupon = false;
  menuAbiertoId: number | null = null;
  private destroy$ = new Subject<void>();

  @ViewChild('guardadosScroll') guardadosScroll?: ElementRef<HTMLDivElement>;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private ofertasService: OfertasService,
    private router: Router
  ) {}

  get productosEnCarrito(): CartItem[] {
    return this.cartItems.filter(item => !item.guardado_para_despues);
  }

  get productosGuardados(): CartItem[] {
    return this.cartItems.filter(item => item.guardado_para_despues);
  }

  ngOnInit(): void {
    this.cartService.cartItems$.pipe(takeUntil(this.destroy$)).subscribe(items => { 
      console.log('Items del carrito recibidos:', items);
      this.cartItems = items || []; 
    });
    this.cartService.cartSummary$.pipe(takeUntil(this.destroy$)).subscribe(summary => { 
      console.log('Resumen del carrito recibido:', summary);
      this.cartSummary = summary || { subtotal: 0, igv: 0, total: 0, cantidad_items: 0 }; 
    });
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => { 
      this.isLoggedIn = !!user;
      // Forzar recarga del carrito cuando cambia el estado de autenticación
      if (user) {
        console.log('Usuario autenticado, forzando recarga del carrito');
        this.cartService.forceReloadCart();
      }
    });
  }
  

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    if (!item || newQuantity < 1) {
      if (item) {
        this.removeProduct(item.id);
      }
      return;
    }
    this.isUpdating = true;
    this.cartService.updateQuantity(item, newQuantity).subscribe({
      error: (err) => {
        Swal.fire({ 
          title: 'Stock insuficiente', 
          text: `Solo hay ${item.stock_disponible || 0} unidades disponibles`, 
          icon: 'warning', 
          confirmButtonColor: '#dc3545' 
        });
        this.cartService.cartItems$.pipe(take(1)).subscribe((items: CartItem[]) => this.cartItems = items || []);
      },
      complete: () => this.isUpdating = false
    });
  }

  incrementQuantity(item: CartItem): void {
    if (item && item.cantidad !== undefined) {
      if ((item.cantidad + 1) > (item.stock_disponible || 0)) {
        Swal.fire({
          title: 'Stock insuficiente',
          text: `Solo hay ${item.stock_disponible || 0} unidades disponibles`,
          icon: 'warning',
          confirmButtonColor: '#dc3545'
        });
        return;
      }
      this.updateQuantity(item, item.cantidad + 1);
    }
  }
  
  decrementQuantity(item: CartItem): void { 
    if (item && item.cantidad !== undefined && item.cantidad > 1) {
      this.updateQuantity(item, item.cantidad - 1); 
    }
  }

  removeProduct(itemId: number): void {
    if (!itemId) return;

    const itemToRemove = this.cartItems.find(i => i.id === itemId);
    if (!itemToRemove) return;

    this.cerrarMenu();
    // ✅ Eliminación instantánea, sin modal de confirmación
    this.cartService.removeFromCart(itemToRemove).subscribe();
  }

  toggleMenu(itemId: number, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === itemId ? null : itemId;
  }

  cerrarMenu(): void {
    this.menuAbiertoId = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cerrarMenu();
  }

  guardarParaDespues(item: CartItem): void {
    this.cerrarMenu();
    this.cartService.saveForLater(item).subscribe({
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el producto para después.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  moverAlCarrito(item: CartItem): void {
    this.cartService.moveToCart(item).subscribe({
      error: (err) => {
        Swal.fire({
          title: 'No se pudo mover al carrito',
          text: err?.message || 'Verifica el stock disponible.',
          icon: 'warning',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  eliminarDeGuardados(item: CartItem): void {
    this.cartService.removeFromCart(item).subscribe();
  }

  scrollGuardados(direccion: number): void {
    const el = this.guardadosScroll?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direccion * 260, behavior: 'smooth' });
  }

  clearCart(): void {
    if (this.productosEnCarrito.length === 0) return;
    Swal.fire({
      title: '¿Vaciar carrito?',
      text: '¿Estás seguro de que quieres eliminar todos los productos del carrito?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.clearCart().subscribe(() => {
          Swal.fire({ 
            title: '¡Carrito vaciado!', 
            text: 'Todos los productos han sido eliminados.', 
            icon: 'success', 
            timer: 2000, 
            showConfirmButton: false 
          });
        });
      }
    });
  }

  aplicarCupon(): void {
    if (!this.codigoCupon.trim()) {
      Swal.fire({
        title: 'Código requerido',
        text: 'Por favor ingresa un código de cupón',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Evitar múltiples clics
    if (this.isValidatingCupon) return;

    this.isValidatingCupon = true;
    const total = this.cartSummary.total || 0;

    this.ofertasService.validarCupon(this.codigoCupon, total).subscribe({
      next: (response) => {
        this.isValidatingCupon = false;

        if (response.valido) {
          this.descuentoCupon = response.descuento;
          this.cuponAplicado = response.cupon;

          // Guardar cupón en sessionStorage para usarlo en el checkout
          sessionStorage.setItem('cupon_aplicado', JSON.stringify({
            ...response.cupon,
            descuento_calculado: response.descuento,
            total_original: this.cartSummary.total
          }));

          let mensajeDescuento = '';
          if (response.cupon.tipo_descuento === 'porcentaje') {
            mensajeDescuento = `${response.cupon.valor_descuento}% de descuento`;
          } else {
            mensajeDescuento = `S/ ${response.descuento.toFixed(2)} de descuento`;
          }

          Swal.fire({
            title: '¡Cupón aplicado!',
            text: mensajeDescuento,
            icon: 'success',
            confirmButtonColor: '#198754'
          });
        } else {
          this.descuentoCupon = 0;
          this.cuponAplicado = null;
          Swal.fire({
            title: 'Cupón no válido',
            text: response.mensaje || 'El código de cupón ingresado no es válido',
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      },
      error: (error) => {
        this.isValidatingCupon = false;
        this.descuentoCupon = 0;
        this.cuponAplicado = null;
        console.error('Error al validar cupón:', error);
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error al validar el cupón. Intenta nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  quitarCupon(): void {
    this.codigoCupon = '';
    this.descuentoCupon = 0;
    this.cuponAplicado = null;
    // Eliminar del sessionStorage
    sessionStorage.removeItem('cupon_aplicado');
    Swal.fire({
      title: 'Cupón removido',
      text: 'El cupón ha sido removido del carrito',
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  }

  proceedToCheckout(): void {
    if (this.productosEnCarrito.length === 0) {
      Swal.fire('Carrito vacío', 'Agrega productos al carrito antes de continuar', 'warning');
      return;
    }
    if (!this.isLoggedIn) {
      Swal.fire({ 
        title: 'Inicia sesión', 
        text: 'Debes iniciar sesión para continuar con la compra', 
        icon: 'info', 
        showCancelButton: true, 
        confirmButtonText: 'Iniciar sesión' 
      })
      .then(result => { 
        if (result.isConfirmed) { 
          this.router.navigate(['/account']); 
        } 
      });
      return;
    }
    this.router.navigate(['/checkout']);
  }

  continueShopping(): void { 
    this.router.navigate(['/shop']); 
  }
  
  getItemSubtotal(item: CartItem): number {
    if (!item) return 0;

    // Si tiene descuento, usar precio_con_descuento, sino usar precio normal
    let precioFinal = this.ensureNumber(item.precio);
    if (item.descuento_porcentaje && item.descuento_porcentaje > 0 && item.precio_con_descuento) {
      precioFinal = this.ensureNumber(item.precio_con_descuento);
    }

    const cantidad = this.ensureNumber(item.cantidad);
    return precioFinal * cantidad;
  }
  
  getTotalFinal(): number { 
    const total = this.ensureNumber(this.cartSummary.total);
    const descuento = this.ensureNumber(this.descuentoCupon);
    return total - descuento; 
  }
  
  formatPrice(price: number | undefined | null): string { 
    const safePrice = this.ensureNumber(price);
    return safePrice.toFixed(2); 
  }
  
  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return; // anti-loop
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  // Método para debuggear las imágenes
  debugImageUrl(item: CartItem): void {
    console.log('Item:', item);
    console.log('Imagen URL:', item.imagen_url);
    console.log('Nombre:', item.nombre);
    
    // Probar si la imagen se puede cargar
    if (item.imagen_url) {
      const img = new Image();
      img.onload = () => {
        console.log('✅ Imagen cargada exitosamente:', item.imagen_url);
      };
      img.onerror = () => {
        console.log('❌ Error al cargar imagen:', item.imagen_url);
      };
      img.src = item.imagen_url;
    } else {
      console.log('❌ No hay URL de imagen');
    }
  }

  // Método auxiliar para asegurar que un valor sea un número
  private ensureNumber(value: any): number {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return Number(value);
  }
}