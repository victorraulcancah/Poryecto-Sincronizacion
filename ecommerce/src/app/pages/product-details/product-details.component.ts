

// src\app\pages\product-details\product-details.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Pipe, PipeTransform } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink, ActivatedRoute, Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { SlickCarouselModule } from "ngx-slick-carousel"
import { BreadcrumbComponent } from "../../component/breadcrumb/breadcrumb.component"
import { ShippingComponent } from "../../component/shipping/shipping.component"
import { AlmacenService } from "../../services/almacen.service"
import { CartService } from "../../services/cart.service"
import { CartNotificationService } from "../../services/cart-notification.service"
import { FavoritosService } from "../../services/favoritos.service"
import { AuthService } from "../../services/auth.service"
import Swal from "sweetalert2"
import { environment } from "../../../environments/environment"
import { DomSanitizer, SafeHtml, SafeResourceUrl, Title } from "@angular/platform-browser"
import { SeoService } from "../../services/seo.service"

@Pipe({
  name: 'trustUrl',
  standalone: true
})
export class TrustUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

@Component({
  selector: "app-product-details",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SlickCarouselModule, BreadcrumbComponent, ShippingComponent, TrustUrlPipe],
  templateUrl: "./product-details.component.html",
  styleUrl: "./product-details.component.scss",
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('zoomImage', { static: false }) zoomImage!: ElementRef<HTMLImageElement>
  @ViewChild('imageContainer', { static: false }) imageContainer!: ElementRef<HTMLDivElement>

  producto: any = null
  detalles: any = null
  productosRelacionados: any[] = []
  isLoading = true
  error: string | null = null
  cantidad = 1
  imagenesProducto: string[] = []
  imagenPrincipal = ""
  isZoomActive = false
  isMobileZoom = false
  videosProducto: string[] = []
  contenidoPrincipal: { tipo: 'imagen' | 'video', url: string } = { tipo: 'imagen', url: '' }
  showVideoModal = false
  currentVideoUrl = ''
  private isMobileDevice = false
  especificacionesProcesadas: any[] = []
  caracteristicasProcesadas: any[] = []
  safeDescripcionDetallada: SafeHtml = ""
  environment = environment
  nombreEmpresa: string = 'MAGUS' // Valor por defecto
  logoEmpresa: string = '' // URL del logo
  esFavorito: boolean = false
  compartirMensaje: string = ''

  productThumbSlider = { slidesToShow: 1, slidesToScroll: 1, arrows: false, fade: true, asNavFor: ".product-details__images-slider" };
  productImageSlider = { slidesToShow: 4, slidesToScroll: 1, asNavFor: ".product-details__thumb-slider", dots: false, arrows: false, focusOnSelect: true, responsive: [{ breakpoint: 768, settings: { slidesToShow: 3 } }, { breakpoint: 576, settings: { slidesToShow: 2 } }] };
  arrivalSlider = { slidesToShow: 6, slidesToScroll: 1, autoplay: false, autoplaySpeed: 2000, speed: 1500, dots: false, pauseOnHover: true, arrows: true, draggable: true, infinite: true, nextArrow: "#new-arrival-next", prevArrow: "#new-arrival-prev", responsive: [{ breakpoint: 1599, settings: { slidesToShow: 6, arrows: false } }, { breakpoint: 1399, settings: { slidesToShow: 4, arrows: false } }, { breakpoint: 992, settings: { slidesToShow: 3, arrows: false } }, { breakpoint: 575, settings: { slidesToShow: 2, arrows: false } }, { breakpoint: 424, settings: { slidesToShow: 1, arrows: false } }] };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private almacenService: AlmacenService,
    private cartService: CartService,
    private cartNotificationService: CartNotificationService,
    private favoritosService: FavoritosService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private seoService: SeoService
  ) {
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  ngOnInit(): void {
    // Scroll to top when component loads
    window.scrollTo(0, 0);

    // Cargar información de la empresa
    this.cargarInfoEmpresa();

    // Suscribirse a cambios en favoritos
    this.favoritosService.favoritos$.subscribe(favoritos => {
      console.log('🔄 Favoritos actualizados:', favoritos);
      if (this.producto) {
        this.esFavorito = favoritos.includes(this.producto.id);
        console.log(`💖 Producto ${this.producto.id} es favorito:`, this.esFavorito);
      }
    });

    this.route.params.subscribe((params) => {
      const id = +params["id"]
      if (id && !isNaN(id)) {
        // Cargar favoritos primero si el usuario está logueado
        if (this.authService.isLoggedIn()) {
          this.favoritosService.cargarFavoritos().subscribe(() => {
            console.log('✅ Favoritos cargados, ahora cargando producto');
            this.cargarProducto(id);
          });
        } else {
          this.cargarProducto(id);
        }
      } else {
        this.error = "ID de producto inválido"
        this.isLoading = false
      }
    })
  }

  whatsappEmpresa: string = ''

  cargarInfoEmpresa(): void {
    this.almacenService.obtenerInfoEmpresa().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.nombreEmpresa = response.data.nombre_empresa || 'MAGUS';
          this.whatsappEmpresa = response.data.whatsapp || '';
          // Construir URL del logo usando environment
          if (response.data.logo) {
            const baseUrl = environment.apiUrl.replace('/api', '');
            this.logoEmpresa = `${baseUrl}/storage/${response.data.logo}`;
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar info de empresa:', error);
        // Mantener el valor por defecto
      }
    });
  }

  ordenarPorWhatsApp(): void {
    console.log('🔵 Iniciando ordenarPorWhatsApp');
    console.log('WhatsApp empresa:', this.whatsappEmpresa);
    
    // Primero intentar obtener asesores disponibles
    this.almacenService.obtenerAsesorDisponibles().subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta de asesores:', response);
        const asesores = response.asesores_disponibles || [];
        console.log('📋 Asesores encontrados:', asesores.length);
        
        // Filtrar asesores que tengan teléfono
        const asesoresConTelefono = asesores.filter((a: any) => a.telefono && a.telefono.trim() !== '');
        console.log('📞 Asesores con teléfono:', asesoresConTelefono.length);
        
        if (asesoresConTelefono.length > 0) {
          // Hay asesores disponibles con teléfono, usar el primero
          const asesor = asesoresConTelefono[0];
          console.log('👤 Usando asesor:', asesor);
          this.enviarWhatsApp(asesor.telefono, asesor.name);
        } else {
          // No hay asesores con teléfono, usar número de empresa
          console.log('⚠️ No hay asesores con teléfono, usando empresa');
          if (this.whatsappEmpresa) {
            this.enviarWhatsApp(this.whatsappEmpresa, this.nombreEmpresa);
          } else {
            console.log('❌ Tampoco hay WhatsApp de empresa');
            Swal.fire({
              icon: 'info',
              title: 'No disponible',
              text: 'No hay asesores disponibles en este momento. Por favor, intenta más tarde.'
            });
          }
        }
      },
      error: (error) => {
        console.error('❌ Error al obtener asesores:', error);
        // Error al obtener asesores, usar número de empresa como fallback
        if (this.whatsappEmpresa) {
          console.log('🔄 Fallback a empresa');
          this.enviarWhatsApp(this.whatsappEmpresa, this.nombreEmpresa);
        } else {
          console.log('❌ No hay fallback disponible');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo conectar con nuestros asesores. Por favor, intenta más tarde.'
          });
        }
      }
    });
  }

  private enviarWhatsApp(telefono: string | null, nombreAsesor: string): void {
    console.log('📱 Enviando WhatsApp a:', telefono, 'Asesor:', nombreAsesor);
    
    // Validar que haya teléfono
    if (!telefono) {
      console.error('❌ No hay teléfono disponible');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El asesor no tiene número de WhatsApp configurado'
      });
      return;
    }
    
    // Asegurar que getPrecioActual retorna un número
    const precioActual = Number(this.getPrecioActual()) || 0;
    const total = precioActual * this.cantidad;
    
    const mensaje = `Hola ${nombreAsesor}! Estoy interesado en el siguiente producto:\n\n` +
                   `*${this.producto.nombre}*\n\n` +
                   `Precio: S/ ${precioActual.toFixed(2)}\n` +
                   `Cantidad: ${this.cantidad}\n` +
                   `Total: S/ ${total.toFixed(2)}\n\n` +
                   `¿Podrías ayudarme con la compra?`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    let numeroLimpio = telefono.replace(/\D/g, '');
    
    console.log('🔢 Número original:', telefono);
    console.log('🔢 Número limpio:', numeroLimpio);
    
    // Agregar código de país si es necesario
    if (numeroLimpio.startsWith('9') && numeroLimpio.length === 9) {
      numeroLimpio = '51' + numeroLimpio;
      console.log('🌍 Agregado código de país:', numeroLimpio);
    }
    
    const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
    console.log('🔗 URL WhatsApp:', urlWhatsApp);
    window.open(urlWhatsApp, '_blank');
  }

  ngOnDestroy(): void {
    // ✅ NUEVO: Limpiar meta tags al salir del componente
    this.seoService.clearMetaTags();
    this.resetZoom()
  }

  cargarProducto(id: number): void {
    this.isLoading = true
    this.error = null
    this.almacenService.obtenerProductoPublico(id).subscribe({
      next: (response) => {
        try {
          this.producto = response.producto
          this.detalles = response.detalles
          this.productosRelacionados = response.productos_relacionados || []
          this.procesarDatosProducto()
          this.isLoading = false
        } catch (processingError) {
          this.error = "Error procesando los datos del producto"
          this.isLoading = false
        }
      },
      error: (error) => {
        this.error = "No se pudo cargar el producto"
        this.isLoading = false
        setTimeout(() => { this.router.navigate(["/"]) }, 3000)
      },
    })
  }

 private procesarDatosProducto(): void {
  try {
    this.configurarImagenes()
    this.procesarEspecificaciones()
    this.procesarCaracteristicas()
    const rawDescription = this.detalles?.descripcion_detallada || this.producto?.descripcion || ""
    this.safeDescripcionDetallada = this.sanitizer.bypassSecurityTrustHtml(rawDescription)

    // ✅ NUEVO: Configurar SEO completo para el producto
    if (this.producto) {
      this.configurarSEO();
    }

    // Verificar si el producto está en favoritos
    if (this.authService.isLoggedIn()) {
      this.esFavorito = this.favoritosService.esFavorito(this.producto.id);
      console.log(`🔍 Verificando favorito para producto ${this.producto.id}:`, this.esFavorito);
    }
  } catch (error) {
    console.error("Error en procesarDatosProducto:", error)
  }
}

  // ✅ NUEVO: Método para configurar SEO completo
  private configurarSEO(): void {
    const baseUrl = environment.apiUrl.replace('/api', '');
    const productUrl = `https://magus-ecommerce.com/product/${this.producto.id}/${this.generateSlug(this.producto.nombre)}`;
    const productImage = this.imagenPrincipal || `${baseUrl}/storage/productos/${this.producto.imagen}`;

    // Crear descripción optimizada para SEO
    const descripcionSEO = this.detalles?.descripcion_detallada
      ? this.stripHtml(this.detalles.descripcion_detallada).substring(0, 160)
      : `Compra ${this.producto.nombre} al mejor precio en MAGUS. Stock disponible. Envío rápido a todo el Perú.`;

    // Generar keywords desde el nombre del producto
    const keywords = this.generarKeywords();

    // Determinar disponibilidad
    const availability = this.producto.stock > 0 ? 'in stock' : 'out of stock';

    // ✅ 1. Configurar meta tags básicos
    this.seoService.updateMetaTags({
      title: `${this.producto.nombre} - S/ ${this.producto.precio_venta || this.producto.precio} | MAGUS`,
      description: descripcionSEO,
      keywords: keywords,
      image: productImage,
      url: productUrl,
      type: 'product',
      price: this.producto.precio_venta || this.producto.precio,
      currency: 'PEN',
      availability: availability,
      brand: this.producto.marca_nombre || 'MAGUS',
      sku: this.producto.codigo || this.producto.id.toString()
    });

    // ✅ 2. Agregar Schema.org JSON-LD para Google Rich Snippets
    this.seoService.addProductSchema({
      name: this.producto.nombre,
      description: descripcionSEO,
      image: productImage,
      sku: this.producto.codigo || this.producto.id.toString(),
      brand: this.producto.marca_nombre || 'MAGUS',
      price: this.producto.precio_venta || this.producto.precio,
      currency: 'PEN',
      availability: this.producto.stock > 0 ? 'InStock' : 'OutOfStock',
      rating: this.producto.rating || undefined,
      reviewCount: this.producto.total_reviews || undefined,
      url: productUrl
    });

    // ✅ 3. Agregar breadcrumb schema
    const breadcrumbs = [
      { name: 'Inicio', url: 'https://magus-ecommerce.com/' },
      { name: 'Productos', url: 'https://magus-ecommerce.com/shop' },
      { name: this.producto.categoria_nombre || 'Categoría', url: `https://magus-ecommerce.com/shop/categoria/${this.producto.categoria_id}` },
      { name: this.producto.nombre, url: productUrl }
    ];
    this.seoService.addBreadcrumbSchema(breadcrumbs);
  }

  // ✅ Helper: Generar slug para URL
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ✅ Helper: Limpiar HTML para meta description
  private stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // ✅ Helper: Generar keywords desde el nombre del producto
  private generarKeywords(): string {
    const keywords = [
      this.producto.nombre,
      this.producto.marca_nombre || '',
      this.producto.categoria_nombre || '',
      'MAGUS',
      'Perú',
      'comprar',
      'precio',
      'oferta'
    ];

    return keywords.filter(k => k).join(', ');
  }

  private configurarImagenes(): void {
    this.imagenesProducto = []
    const baseUrl = environment.apiUrl.replace("/api", "")
    if (this.producto?.imagen) {
      this.imagenesProducto.push(`${baseUrl}/storage/productos/${this.producto.imagen}`)
    }
    if (this.detalles?.imagenes) {
      try {
        let imagenesDetalles: string[] = []
        if (typeof this.detalles.imagenes === "string") {
          imagenesDetalles = JSON.parse(this.detalles.imagenes)
        } else if (Array.isArray(this.detalles.imagenes)) {
          imagenesDetalles = this.detalles.imagenes
        }
        if (Array.isArray(imagenesDetalles) && imagenesDetalles.length > 0) {
          const imagenesUrls = imagenesDetalles.map((img: string) => `${baseUrl}/storage/productos/detalles/${img}`)
          this.imagenesProducto = [...this.imagenesProducto, ...imagenesUrls]
        }
      } catch (parseError) {
        console.warn("Error parseando imágenes de detalles:", parseError)
      }
    }
    this.imagenPrincipal = this.imagenesProducto.length > 0 ? this.imagenesProducto[0] : ""

    // Procesar videos demostrativos
    this.cargarVideos()

    // Establecer contenido principal (imagen por defecto)
    if (this.imagenesProducto.length > 0) {
      this.contenidoPrincipal = { tipo: 'imagen', url: this.imagenesProducto[0] }
    } else if (this.videosProducto.length > 0) {
      this.contenidoPrincipal = { tipo: 'video', url: this.videosProducto[0] }
    }
  }

  private cargarVideos(): void {
    this.videosProducto = []
    if (this.detalles?.videos) {
      try {
        const videos = typeof this.detalles.videos === 'string'
          ? JSON.parse(this.detalles.videos)
          : this.detalles.videos

        if (Array.isArray(videos)) {
          this.videosProducto = videos.filter(video => video && video.trim() !== '')
        }
      } catch (parseError) {
        console.warn("Error parseando videos de detalles:", parseError)
      }
    }
  }

  getYouTubeEmbedUrl(url: string): string {
    // Extraer el ID del video de diferentes formatos de URL de YouTube
    const regexes = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const regex of regexes) {
      const match = url.match(regex);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    return url; // Si no coincide, devolver la URL original
  }

  getYouTubeThumbnail(url: string): string {
    const regexes = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const regex of regexes) {
      const match = url.match(regex);
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
    }

    return '';
  }

  cambiarImagenPrincipal(nuevaImagen: string): void {
    this.imagenPrincipal = nuevaImagen
    this.contenidoPrincipal = { tipo: 'imagen', url: nuevaImagen }
    this.resetZoom()
  }

  mostrarVideo(videoUrl: string): void {
    // Mostrar video en el cuadro principal
    this.contenidoPrincipal = { tipo: 'video', url: videoUrl }
    this.resetZoom()
  }

  mostrarVideoEnModal(videoUrl: string): void {
    // Mostrar video en modal interno
    this.currentVideoUrl = videoUrl // Guardamos la URL original, el embed se maneja en el template
    this.showVideoModal = true
  }

  cerrarVideoModal(): void {
    this.showVideoModal = false
    this.currentVideoUrl = ''
  }

  // Métodos de navegación para imágenes y videos
  siguienteContenido(): void {
    const todosLosContenidos = [...this.imagenesProducto, ...this.videosProducto]
    if (todosLosContenidos.length <= 1) return

    const indiceActual = this.obtenerIndiceContenidoActual()
    const siguienteIndice = (indiceActual + 1) % todosLosContenidos.length
    this.cambiarAContenido(siguienteIndice)
  }

  anteriorContenido(): void {
    const todosLosContenidos = [...this.imagenesProducto, ...this.videosProducto]
    if (todosLosContenidos.length <= 1) return

    const indiceActual = this.obtenerIndiceContenidoActual()
    const anteriorIndice = indiceActual === 0 ? todosLosContenidos.length - 1 : indiceActual - 1
    this.cambiarAContenido(anteriorIndice)
  }

  private obtenerIndiceContenidoActual(): number {
    const todosLosContenidos = [...this.imagenesProducto, ...this.videosProducto]
    return todosLosContenidos.findIndex(contenido => contenido === this.contenidoPrincipal.url)
  }

  private cambiarAContenido(indice: number): void {
    const todosLosContenidos = [...this.imagenesProducto, ...this.videosProducto]
    const contenido = todosLosContenidos[indice]

    if (this.imagenesProducto.includes(contenido)) {
      this.cambiarImagenPrincipal(contenido)
    } else if (this.videosProducto.includes(contenido)) {
      this.mostrarVideo(contenido)
    }
  }

  obtenerTotalContenidos(): number {
    return this.imagenesProducto.length + this.videosProducto.length
  }

  obtenerIndiceActual(): number {
    return this.obtenerIndiceContenidoActual() + 1
  }

  // Función universal para obtener URL de embed de diferentes plataformas
  getVideoEmbedUrl(url: string): string {
    // YouTube (incluye Shorts)
    const youtubeRegexes = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const regex of youtubeRegexes) {
      const match = url.match(regex);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    // Vimeo
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Para TikTok e Instagram, devolvemos la URL original
    // Nota: Estos formatos no se pueden embedear directamente
    return url;
  }

  onMouseEnterImage(event: MouseEvent): void { if (!this.isMobileDevice) { this.isZoomActive = true; this.updateZoomPosition(event); } }
  onMouseLeaveImage(event: MouseEvent): void { if (!this.isMobileDevice) { this.isZoomActive = false; this.resetZoom(); } }
  onMouseMoveImage(event: MouseEvent): void { if (!this.isMobileDevice && this.isZoomActive) { this.updateZoomPosition(event); } }
  toggleMobileZoom(): void { if (this.isMobileDevice) { this.isMobileZoom = !this.isMobileZoom; if (!this.isMobileZoom) { this.resetZoom(); } } }

  private updateZoomPosition(event: MouseEvent): void {
    if (!this.imageContainer || !this.zoomImage) return
    const containerRect = this.imageContainer.nativeElement.getBoundingClientRect()
    const percentX = ((event.clientX - containerRect.left) / containerRect.width) * 100
    const percentY = ((event.clientY - containerRect.top) / containerRect.height) * 100
    this.zoomImage.nativeElement.style.transformOrigin = `${Math.max(0, Math.min(100, percentX))}% ${Math.max(0, Math.min(100, percentY))}%`
  }

  private resetZoom(): void { if (this.zoomImage) { this.zoomImage.nativeElement.style.transformOrigin = 'center center' } }
  trackByImageUrl(index: number, imagen: string): string { return imagen; }

  private procesarEspecificaciones(): void {
    this.especificacionesProcesadas = [];
    try {
      if (!this.detalles?.especificaciones) return;
      let specs = (typeof this.detalles.especificaciones === "string") ? JSON.parse(this.detalles.especificaciones) : this.detalles.especificaciones;
      if (Array.isArray(specs)) { this.especificacionesProcesadas = specs.filter(s => s && s.nombre && s.valor); }
    } catch (error) { console.warn("Error procesando especificaciones:", error); }
  }

  private procesarCaracteristicas(): void {
    this.caracteristicasProcesadas = [];
    try {
      if (!this.detalles?.caracteristicas_tecnicas) return;
      let caracteristicas = (typeof this.detalles.caracteristicas_tecnicas === "string") ? JSON.parse(this.detalles.caracteristicas_tecnicas) : this.detalles.caracteristicas_tecnicas;
      if (Array.isArray(caracteristicas)) { this.caracteristicasProcesadas = caracteristicas.filter(c => c && c.caracteristica && c.detalle); }
    } catch (error) { console.warn("Error procesando características:", error); }
  }

  aumentarCantidad(): void { if (this.producto && this.cantidad < this.producto.stock) { this.cantidad++; } }
  disminuirCantidad(): void { if (this.cantidad > 1) { this.cantidad--; } }

  agregarAlCarrito(): void {
    if (!this.producto) return;
    if (this.producto.stock <= 0) {
      Swal.fire({ title: "Sin stock", text: "Este producto no tiene stock disponible", icon: "warning", confirmButtonColor: "#dc3545" });
      return;
    }
    if (this.cantidad > this.producto.stock) {
      Swal.fire({ title: "Stock insuficiente", text: `Solo hay ${this.producto.stock} unidades disponibles`, icon: "warning", confirmButtonColor: "#dc3545" });
      return;
    }

    this.cartService.addToCart(this.producto, this.cantidad).subscribe({
      next: () => {
        // Preparar imagen del producto
        let productImage = this.imagenPrincipal || 'assets/images/thumbs/product-default.png';

        // Usar productos relacionados como sugeridos
        const suggestedProducts = this.productosRelacionados.slice(0, 3);

        // Mostrar notificación llamativa estilo Coolbox
        this.cartNotificationService.showProductAddedNotification(
          this.producto.nombre,
          Number(this.producto.precio_venta || this.producto.precio || 0),
          productImage,
          this.cantidad,
          suggestedProducts
        );
      },
      error: (err) => {
        Swal.fire({ title: "Error", text: err.message || "No se pudo agregar el producto al carrito", icon: "error", confirmButtonColor: "#dc3545" });
      }
    });
  }

  comprarAhora(): void {
    this.agregarAlCarrito();
    setTimeout(() => { this.router.navigate(["/cart"]); }, 1000);
  }

  agregarProductoRelacionado(producto: any): void {
    if (producto.stock <= 0) {
      Swal.fire({ title: "Sin stock", text: "Este producto no tiene stock disponible", icon: "warning", confirmButtonColor: "#dc3545" });
      return;
    }
    this.cartService.addToCart(producto, 1).subscribe({
      next: () => {
        // Preparar imagen del producto
        let productImage = producto.imagen_url || producto.imagen || 'assets/images/thumbs/product-default.png';

        // Usar otros productos relacionados como sugeridos (excluyendo el que se acaba de agregar)
        const suggestedProducts = this.productosRelacionados
          .filter(p => p.id !== producto.id)
          .slice(0, 3);

        // Mostrar notificación llamativa estilo Coolbox
        this.cartNotificationService.showProductAddedNotification(
          producto.nombre,
          Number(producto.precio_venta || producto.precio || 0),
          productImage,
          1,
          suggestedProducts
        );
      },
      error: (err) => {
        Swal.fire({ title: "Error", text: err.message || "No se pudo agregar el producto al carrito", icon: "error", confirmButtonColor: "#dc3545" });
      }
    });
  }

  onImageError(event: any): void { event.target.style.display = "none"; }
  getPorcentajeDescuento(): number { if (!this.producto || !this.producto.precio_oferta) return 0; return Math.round(((this.producto.precio_venta - this.producto.precio_oferta) / this.producto.precio_venta) * 100); }
  getEstrellas(): number[] { return Array(5).fill(0).map((_, i) => (i < Math.floor(4.8) ? 1 : 0)); }
  getEspecificaciones(): any[] { return this.especificacionesProcesadas; }
  getCaracteristicasTecnicas(): any[] { return this.caracteristicasProcesadas; }
  getPrecioActual(): number { if (!this.producto) return 0; return this.producto.precio_oferta || this.producto.precio_venta; }
  getPrecioOriginal(): number { if (!this.producto) return 0; return this.producto.precio_venta; }
  tieneOferta(): boolean { return !!this.producto?.precio_oferta && this.producto.precio_oferta < this.producto.precio_venta; }
  getDescripcion(): string { return this.producto?.descripcion || this.detalles?.descripcion_detallada || "Descripción no disponible"; }
  getGarantia(): string { return this.detalles?.garantia || "La Ley de Protección al Consumidor no prevé la devolución de este producto de calidad adecuada."; }

  // ✅ NUEVO: Método para navegar a producto con recarga completa (estilo Amazon)
  navegarAProducto(producto: any, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    // Generar slug si no existe
    const slug = producto.slug || producto.nombre?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
    const url = `/product/${producto.id}/${slug}`;
    window.location.href = url;
  }

  // ============================================
  // FUNCIONALIDAD DE FAVORITOS
  // ============================================
  toggleFavorito(): void {
    // Verificar si el usuario está logueado
    if (!this.authService.isLoggedIn()) {
      Swal.fire({
        title: 'Inicia sesión',
        text: 'Debes iniciar sesión para agregar productos a favoritos',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/account']);
        }
      });
      return;
    }

    // Guardar el estado actual antes de hacer la petición
    const estadoAnterior = this.esFavorito;
    
    // Determinar la acción según el estado actual
    const accion = this.esFavorito 
      ? this.favoritosService.eliminarFavorito(this.producto.id)
      : this.favoritosService.agregarFavorito(this.producto.id);

    accion.subscribe({
      next: (response: any) => {
        // El servicio ya actualiza el BehaviorSubject, solo mostramos el mensaje
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
          }
        });

        Toast.fire({
          icon: 'success',
          title: estadoAnterior ? 'Eliminado de favoritos' : 'Agregado a favoritos'
        });
      },
      error: (error) => {
        console.error('Error al actualizar favorito:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el favorito'
        });
      }
    });
  }

  // ============================================
  // FUNCIONALIDAD DE COMPARTIR
  // ============================================
  async compartirProducto(): Promise<void> {
    const url = window.location.href;
    const titulo = this.producto.nombre;
    const texto = `Mira este producto: ${titulo} - S/ ${this.getPrecioActual()}`;

    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // En móvil, siempre intentar usar el share nativo
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: titulo,
          text: texto,
          url: url
        });
      } catch (error: any) {
        // Si el usuario cancela, no hacer nada
        if (error.name !== 'AbortError') {
          console.error('Error al compartir:', error);
          this.copiarEnlace(url);
        }
      }
      return;
    }

    // En PC, intentar usar share nativo si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: titulo,
          text: texto,
          url: url
        });
      } catch (error: any) {
        // Si falla o el usuario cancela, copiar al portapapeles
        if (error.name !== 'AbortError') {
          this.copiarEnlace(url);
        }
      }
    } else {
      // Si no hay share nativo, copiar al portapapeles
      this.copiarEnlace(url);
    }
  }

  private copiarEnlace(url: string): void {
    // Intentar copiar al portapapeles
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.mostrarMensajeCopiado();
      }).catch(() => {
        // Fallback para navegadores antiguos
        this.copiarEnlaceFallback(url);
      });
    } else {
      // Fallback para navegadores antiguos
      this.copiarEnlaceFallback(url);
    }
  }

  private copiarEnlaceFallback(url: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.mostrarMensajeCopiado();
    } catch (error) {
      console.error('Error al copiar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo copiar el enlace'
      });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  private mostrarMensajeCopiado(): void {
    this.compartirMensaje = 'Enlace copiado';
    
    // Ocultar el mensaje después de 2 segundos
    setTimeout(() => {
      this.compartirMensaje = '';
    }, 2000);
  }
}
