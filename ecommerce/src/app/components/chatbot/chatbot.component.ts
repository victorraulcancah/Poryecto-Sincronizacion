//src\app\components\chatbot\chatbot.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CategoriasPublicasService, CategoriaPublica } from '../../services/categorias-publicas.service';
import { AlmacenService } from '../../services/almacen.service';
import { MarcaProducto, ProductoPublico, ProductosPublicosResponse } from '../../types/almacen.types';
import { OfertasService, ProductoOferta } from '../../services/ofertas.service';
import { Subject, takeUntil } from 'rxjs';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  options?: ChatOption[];
  products?: ProductoPublico[];
  categories?: CategoriaPublica[];
  brands?: MarcaProducto[];
  offers?: ProductoOferta[];
}

interface ChatOption {
  id: string;
  text: string;
  action: string;
  data?: any;
  emoji?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessagesRef!: ElementRef;
  @ViewChild('messageInput') messageInputRef!: ElementRef;

  isOpen = false;
  isMinimized = false;
  messages: ChatMessage[] = [];
  currentMessage = '';
  isTyping = false;
  whatsappNumber = '51993321920';
  
  // ✅ DATOS DINÁMICOS
  categorias: CategoriaPublica[] = [];
  marcas: MarcaProducto[] = [];
  productosEnOferta: ProductoOferta[] = [];
  isLoadingData = false;
  private isBrowser: boolean;
  private destroy$ = new Subject<void>();

  // ✅ NUEVAS FUNCIONALIDADES INTERACTIVAS
  showQuickSuggestions = false;
  quickSuggestions: string[] = [
    'Hola', 'Ofertas', 'Categorías', 'Marcas', 'Ayuda'
  ];

  // ✅ RESPUESTAS DINÁMICAS DEL BOT MEJORADAS
  private botResponses = {
    greeting: {
      text: '¡Hola! 👋 Soy tu asistente virtual de compras.\n\n¿En qué puedo ayudarte hoy? Puedo mostrarte productos, ofertas, categorías y mucho más.',
      options: [
        { id: 'categories', text: '📂 Ver categorías', action: 'showCategories', emoji: '📂' },
        { id: 'brands', text: '🏷️ Ver marcas', action: 'showBrands', emoji: '🏷️' },
        { id: 'offers', text: '🔥 Ofertas especiales', action: 'showOffers', emoji: '🔥' },
        { id: 'search', text: '🔍 Buscar productos', action: 'searchProducts', emoji: '🔍' },
        { id: 'popular', text: '⭐ Productos populares', action: 'showPopular', emoji: '⭐' },
        { id: 'support', text: '💬 Hablar con soporte', action: 'contactSupport', emoji: '💬' }
      ] as ChatOption[]
    },
    categories: {
      text: '📂 **Nuestras categorías disponibles:**\n\nHaz clic en cualquier categoría para ver sus productos:',
      options: [] as ChatOption[]
    },
    brands: {
      text: '🏷️ **Marcas disponibles:**\n\nSelecciona una marca para explorar sus productos:',
      options: [] as ChatOption[]
    },
    offers: {
      text: '🔥 **¡Ofertas especiales de hoy!**\n\nProductos con descuentos increíbles que no puedes perderte:',
      options: [
        { id: 'whatsapp_offers', text: '📱 Ver todas las ofertas', action: 'whatsappOffers', emoji: '📱' },
        { id: 'flash_sales', text: '⚡ Flash Sales', action: 'showFlashSales', emoji: '⚡' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    search: {
      text: '🔍 **Búsqueda de productos**\n\n¿Qué producto estás buscando? Escribe el nombre y te ayudo a encontrarlo.\n\n💡 *Tip: Puedes buscar por nombre, categoría o marca*',
      options: [
        { id: 'search_categories', text: '📂 Buscar por categoría', action: 'showCategories', emoji: '📂' },
        { id: 'search_brands', text: '🏷️ Buscar por marca', action: 'showBrands', emoji: '🏷️' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    support: {
      text: '💬 **Soporte al cliente**\n\nTe conectaré con nuestro equipo de soporte humano a través de WhatsApp para una atención personalizada.',
      options: [
        { id: 'whatsapp_support', text: '📱 Contactar por WhatsApp', action: 'whatsappSupport', emoji: '📱' },
        { id: 'faq', text: '❓ Preguntas frecuentes', action: 'showFAQ', emoji: '❓' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    categoryProducts: {
      text: '✨ **Productos encontrados en esta categoría:**',
      options: [
        { id: 'whatsapp_category', text: '📱 Ver catálogo completo', action: 'whatsappCategory', emoji: '📱' },
        { id: 'filter_price', text: '💰 Filtrar por precio', action: 'filterByPrice', emoji: '💰' },
        { id: 'back', text: '⬅️ Volver a categorías', action: 'showCategories', emoji: '⬅️' }
      ] as ChatOption[]
    },
    brandProducts: {
      text: '✨ **Productos de esta marca:**',
      options: [
        { id: 'whatsapp_brand', text: '📱 Ver catálogo completo', action: 'whatsappBrand', emoji: '📱' },
        { id: 'brand_offers', text: '🔥 Ofertas de la marca', action: 'showBrandOffers', emoji: '🔥' },
        { id: 'back', text: '⬅️ Volver a marcas', action: 'showBrands', emoji: '⬅️' }
      ] as ChatOption[]
    },
    noResults: {
      text: '😔 **No encontré productos con ese término**\n\n¿Te gustaría intentar con otra búsqueda o hablar con nuestro equipo?',
      options: [
        { id: 'search_again', text: '🔍 Buscar de nuevo', action: 'searchProducts', emoji: '🔍' },
        { id: 'show_popular', text: '⭐ Ver productos populares', action: 'showPopular', emoji: '⭐' },
        { id: 'whatsapp_help', text: '📱 Ayuda por WhatsApp', action: 'whatsappHelp', emoji: '📱' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    productDetails: {
      text: '📦 **Detalles del producto:**',
      options: [
        { id: 'add_to_cart', text: '🛒 Consultar disponibilidad', action: 'consultProduct', emoji: '🛒' },
        { id: 'similar_products', text: '🔍 Productos similares', action: 'showSimilar', emoji: '🔍' },
        { id: 'whatsapp_product', text: '📱 Preguntar por WhatsApp', action: 'whatsappProduct', emoji: '📱' },
        { id: 'back', text: '⬅️ Seguir navegando', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    faq: {
      text: '❓ **Preguntas frecuentes:**\n\n• ¿Cómo puedo hacer un pedido?\n• ¿Cuáles son los métodos de pago?\n• ¿Hacen delivery?\n• ¿Tienen garantía los productos?',
      options: [
        { id: 'whatsapp_faq', text: '📱 Más información por WhatsApp', action: 'whatsappFAQ', emoji: '📱' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    },
    default: {
      text: '🤔 **No entendí tu consulta**\n\n¿Te gustaría hablar directamente con nuestro equipo por WhatsApp o explorar nuestros productos?',
      options: [
        { id: 'whatsapp_help', text: '📱 Ayuda por WhatsApp', action: 'whatsappHelp', emoji: '📱' },
        { id: 'show_categories', text: '📂 Ver categorías', action: 'showCategories', emoji: '📂' },
        { id: 'show_offers', text: '🔥 Ver ofertas', action: 'showOffers', emoji: '🔥' },
        { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    }
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private categoriasService: CategoriasPublicasService,
    private almacenService: AlmacenService,
    private ofertasService: OfertasService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.cargarDatosIniciales();
    
    // Mostrar mensaje de bienvenida después de un delay
    setTimeout(() => {
      this.addBotMessage(this.botResponses.greeting);
    }, 1000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ MÉTODO PARA MANEJAR ERRORES DE IMÁGENES
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/150x150?text=Sin+Imagen';
    }
  }

  // ✅ TRACKING FUNCTIONS PARA MEJOR PERFORMANCE
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  trackByProductId(index: number, product: ProductoPublico): number {
    return product.id;
  }

  trackByOfferId(index: number, offer: ProductoOferta): number {
    return offer.id;
  }

  trackByCategoryId(index: number, category: CategoriaPublica): number {
    return category.id;
  }

  trackByBrandId(index: number, brand: MarcaProducto): number {
    return brand.id;
  }

  trackByOptionId(index: number, option: ChatOption): string {
    return option.id;
  }

  // ✅ CARGAR DATOS DINÁMICOS
  private cargarDatosIniciales() {
    this.isLoadingData = true;
    
    // Cargar categorías
    this.categoriasService.obtenerCategoriasPublicas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categorias) => {
          this.categorias = categorias;
          this.actualizarOpcionesCategorias();
          // console.log('Categorías cargadas:', categorias.length);
        },
        error: (error) => console.error('Error al cargar categorías:', error)
      });

    // Cargar marcas
    this.almacenService.obtenerMarcasPublicas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (marcas) => {
          this.marcas = marcas;
          this.actualizarOpcionesMarcas();
          // console.log('Marcas cargadas:', marcas.length);
        },
        error: (error) => console.error('Error al cargar marcas:', error)
      });

    // Cargar productos en oferta
    this.ofertasService.obtenerProductosEnOferta()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.productosEnOferta = productos;
          this.isLoadingData = false;
          // console.log('Ofertas cargadas:', productos.length);
        },
        error: (error) => {
          console.error('Error al cargar ofertas:', error);
          this.isLoadingData = false;
        }
      });
  }

  // ✅ ACTUALIZAR OPCIONES DINÁMICAS
  private actualizarOpcionesCategorias() {
    this.botResponses.categories.options = [
      ...this.categorias.slice(0, 8).map(cat => ({
        id: `cat_${cat.id}`,
        text: `${this.getCategoryEmoji(cat.nombre)} ${cat.nombre}`,
        action: 'showCategoryProducts',
        data: cat,
        emoji: this.getCategoryEmoji(cat.nombre)
      })),
      { id: 'whatsapp_categories', text: '📱 Ver todas las categorías', action: 'whatsappCategories', emoji: '📱' },
      { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
    ];
  }

  private actualizarOpcionesMarcas() {
    this.botResponses.brands.options = [
      ...this.marcas.slice(0, 8).map(marca => ({
        id: `brand_${marca.id}`,
        text: `🏷️ ${marca.nombre}`,
        action: 'showBrandProducts',
        data: marca,
        emoji: '🏷️'
      })),
      { id: 'whatsapp_brands', text: '📱 Ver todas las marcas', action: 'whatsappBrands', emoji: '📱' },
      { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
    ];
  }

  // ✅ EMOJIS DINÁMICOS BASADOS EN TUS CATEGORÍAS REALES
  private getCategoryEmoji(nombre: string): string {
    const nombreLower = nombre.toLowerCase();
    
    // Basado en tus categorías reales de la API
    if (nombreLower.includes('carne')) return '🥩';
    if (nombreLower.includes('fruta')) return '🍎';
    if (nombreLower.includes('vegetal') || nombreLower.includes('verdura')) return '🥬';
    if (nombreLower.includes('computadora') || nombreLower.includes('asus') || nombreLower.includes('hardware')) return '💻';
    if (nombreLower.includes('gaseosa') || nombreLower.includes('bebida')) return '🥤';
    if (nombreLower.includes('pescado')) return '🐟';
    if (nombreLower.includes('leche') || nombreLower.includes('derivado')) return '🥛';
    if (nombreLower.includes('postre')) return '🍰';
    if (nombreLower.includes('enlatado')) return '🥫';
    if (nombreLower.includes('hello') || nombreLower.includes('helllo')) return '👋';
    
    return '📦';
  }

  // ✅ FUNCIONES DE INTERACCIÓN MEJORADAS
  toggleChat() {
    this.isOpen = !this.isOpen;
    this.isMinimized = false;
    if (this.isOpen) {
      setTimeout(() => {
        this.focusInput();
      }, 300);
    }
  }

  minimizeChat() {
    this.isMinimized = true;
  }

  maximizeChat() {
    this.isMinimized = false;
    setTimeout(() => {
      this.focusInput();
    }, 100);
  }

  closeChat() {
    this.isOpen = false;
    this.isMinimized = false;
  }

  private focusInput() {
    if (this.messageInputRef && this.isBrowser) {
      this.messageInputRef.nativeElement.focus();
    }
  }

  // ✅ NUEVAS FUNCIONES INTERACTIVAS
  onInputChange() {
    this.showQuickSuggestions = this.currentMessage.length === 0;
  }

  selectQuickSuggestion(suggestion: string) {
    this.currentMessage = suggestion;
    this.showQuickSuggestions = false;
    this.sendMessage();
  }

  selectProduct(product: ProductoPublico) {
    this.addUserMessage(`Ver detalles de: ${product.nombre}`);
    this.showProductDetails(product);
  }

  selectOffer(offer: ProductoOferta) {
    this.addUserMessage(`Ver oferta: ${offer.nombre}`);
    this.showOfferDetails(offer);
  }

  selectCategory(category: CategoriaPublica) {
    this.addUserMessage(`Ver productos de: ${category.nombre}`);
    this.showCategoryProducts(category);
  }

  selectBrand(brand: MarcaProducto) {
    this.addUserMessage(`Ver productos de: ${brand.nombre}`);
    this.showBrandProducts(brand);
  }

  sendMessage() {
    if (!this.currentMessage.trim() || this.isTyping) return;

    this.showQuickSuggestions = false;
    
    // Agregar mensaje del usuario
    this.addUserMessage(this.currentMessage);
    
    // Procesar respuesta del bot
    this.processUserMessage(this.currentMessage);
    
    this.currentMessage = '';
  }

  selectOption(option: ChatOption) {
    // Agregar la opción seleccionada como mensaje del usuario
    this.addUserMessage(option.text);
    
    // Procesar la acción
    this.processAction(option.action, option.data);
  }

  private addUserMessage(text: string) {
    const message: ChatMessage = {
      id: this.generateId(),
      text,
      isUser: true,
      timestamp: new Date()
    };
    this.messages.push(message);
    this.scrollToBottom();
  }

  private addBotMessage(response: any, extraData?: any) {
    this.isTyping = true;
    
    setTimeout(() => {
      const message: ChatMessage = {
        id: this.generateId(),
        text: response.text,
        isUser: false,
        timestamp: new Date(),
        options: response.options || [],
        ...extraData
      };
      this.messages.push(message);
      this.isTyping = false;
      this.scrollToBottom();
    }, Math.random() * 1000 + 800); // Tiempo variable más realista
  }

  // ✅ PROCESAMIENTO MEJORADO DE MENSAJES CON MÁS INTELIGENCIA
  private processUserMessage(message: string) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Saludos
    if (this.matchesKeywords(lowerMessage, ['hola', 'buenos', 'buenas', 'hi', 'hello', 'hey'])) {
      this.addBotMessage(this.botResponses.greeting);
      return;
    }
    
    // Categorías
    if (this.matchesKeywords(lowerMessage, ['categoria', 'categoría', 'categorias', 'categorías', 'tipos', 'secciones'])) {
      this.addBotMessage(this.botResponses.categories);
      return;
    }
    
    // Marcas
    if (this.matchesKeywords(lowerMessage, ['marca', 'marcas', 'fabricante', 'brand'])) {
      this.addBotMessage(this.botResponses.brands);
      return;
    }
    
    // Ofertas
    if (this.matchesKeywords(lowerMessage, ['oferta', 'ofertas', 'descuento', 'descuentos', 'promoción', 'promociones', 'rebaja', 'barato'])) {
      this.showOffers();
      return;
    }
    
    // Búsqueda
    if (this.matchesKeywords(lowerMessage, ['buscar', 'busco', 'producto', 'productos', 'encontrar', 'search'])) {
      this.addBotMessage(this.botResponses.search);
      return;
    }
    
    // Ayuda/Soporte
    if (this.matchesKeywords(lowerMessage, ['ayuda', 'soporte', 'problema', 'help', 'support', 'contacto'])) {
      this.addBotMessage(this.botResponses.support);
      return;
    }
    
    // Preguntas frecuentes
    if (this.matchesKeywords(lowerMessage, ['faq', 'preguntas', 'frecuentes', 'info', 'información'])) {
      this.addBotMessage(this.botResponses.faq);
      return;
    }
    
    // Búsqueda específica por nombre de categoría o marca
    const categoriaEncontrada = this.categorias.find(cat => 
      lowerMessage.includes(cat.nombre.toLowerCase())
    );
    
    if (categoriaEncontrada) {
      this.addUserMessage(`Buscar en categoría: ${categoriaEncontrada.nombre}`);
      this.showCategoryProducts(categoriaEncontrada);
      return;
    }
    
    const marcaEncontrada = this.marcas.find(marca => 
      lowerMessage.includes(marca.nombre.toLowerCase())
    );
    
    if (marcaEncontrada) {
      this.addUserMessage(`Buscar productos de: ${marcaEncontrada.nombre}`);
      this.showBrandProducts(marcaEncontrada);
      return;
    }
    
    // Búsqueda general de productos
    this.buscarProductos(message);
  }

  private matchesKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword));
  }

  // ✅ BÚSQUEDA DINÁMICA DE PRODUCTOS MEJORADA
  private buscarProductos(termino: string) {
    this.isTyping = true;
    
    this.almacenService.obtenerProductosPublicos({ search: termino })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductosPublicosResponse) => {
          this.isTyping = false;
          
          if (response.productos && response.productos.length > 0) {
            const productos = response.productos.slice(0, 4); // Mostrar hasta 4 productos
            this.addBotMessage({
              text: `🔍 **Encontré ${response.productos.length} productos con "${termino}":**\n\nHaz clic en cualquier producto para ver más detalles:`,
              options: [
                { id: 'whatsapp_search', text: '📱 Ver todos los resultados', action: 'whatsappSearch', data: termino, emoji: '📱' },
                { id: 'refine_search', text: '🎯 Refinar búsqueda', action: 'refineSearch', data: termino, emoji: '🎯' },
                { id: 'search_again', text: '🔍 Buscar de nuevo', action: 'searchProducts', emoji: '🔍' },
                { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
              ] as ChatOption[]
            }, { products: productos });
          } else {
            this.addBotMessage(this.botResponses.noResults);
          }
        },
        error: (error) => {
          this.isTyping = false;
          console.error('Error en búsqueda:', error);
          this.addBotMessage(this.botResponses.noResults);
        }
      });
  }

  // ✅ NUEVOS MÉTODOS PARA MOSTRAR DETALLES
  private showProductDetails(product: ProductoPublico) {
    const detalles = `📦 **${product.nombre}**\n\n` +
      `💰 **Precio:** S/ ${product.precio}\n` +
      `📂 **Categoría:** ${product.categoria}\n` +
      `📦 **Stock:** ${product.stock} disponibles\n` +
      `⭐ **Rating:** ${product.rating}/5 (${product.reviews_count} reseñas)\n` +
      `🛒 **Vendidos:** ${product.sold_count} unidades\n\n` +
      `${product.descripcion || 'Producto de alta calidad disponible en nuestra tienda.'}`;

    this.addBotMessage({
      text: detalles,
      options: this.botResponses.productDetails.options
    }, { products: [product] });
  }

  private showOfferDetails(offer: ProductoOferta) {
    const ahorro = (parseFloat(offer.precio_original.toString()) - parseFloat(offer.precio_oferta.toString())).toFixed(2);
    const detalles = `🔥 **${offer.nombre}** ${offer.es_flash_sale ? '⚡' : ''}\n\n` +
      `💰 **Precio normal:** S/ ${offer.precio_original}\n` +
      `🔥 **Precio oferta:** S/ ${offer.precio_oferta}\n` +
      `💸 **Ahorras:** S/ ${ahorro} (${offer.descuento_porcentaje}%)\n` +
      `📦 **Stock oferta:** ${(offer.stock_oferta || 0) - offer.vendidos_oferta} disponibles\n\n` +
      `${offer.es_flash_sale ? '⚡ **¡FLASH SALE!** Oferta por tiempo limitado.' : '🔥 Oferta especial disponible.'}`;

    this.addBotMessage({
      text: detalles,
      options: [
        { id: 'whatsapp_offer', text: '📱 Consultar oferta', action: 'whatsappOffer', data: offer, emoji: '📱' },
        { id: 'similar_offers', text: '🔥 Ofertas similares', action: 'showSimilarOffers', data: offer, emoji: '🔥' },
        { id: 'back', text: '⬅️ Ver más ofertas', action: 'showOffers', emoji: '⬅️' }
      ] as ChatOption[]
    }, { offers: [offer] });
  }

  // ✅ PROCESAMIENTO DE ACCIONES DINÁMICAS AMPLIADO
  private processAction(action: string, data?: any) {
    switch (action) {
      case 'greeting':
        this.addBotMessage(this.botResponses.greeting);
        break;
      case 'showCategories':
        this.addBotMessage(this.botResponses.categories);
        break;
      case 'showBrands':
        this.addBotMessage(this.botResponses.brands);
        break;
      case 'showOffers':
        this.showOffers();
        break;
      case 'searchProducts':
        this.addBotMessage(this.botResponses.search);
        break;
      case 'contactSupport':
        this.addBotMessage(this.botResponses.support);
        break;
      case 'showFAQ':
        this.addBotMessage(this.botResponses.faq);
        break;
      case 'showCategoryProducts':
        this.showCategoryProducts(data);
        break;
      case 'showBrandProducts':
        this.showBrandProducts(data);
        break;
      case 'showPopular':
        this.showPopularProducts();
        break;
      case 'refineSearch':
        this.refineSearch(data);
        break;
      
      // Acciones de WhatsApp
      case 'whatsappSupport':
        this.openWhatsApp('Hola! Necesito ayuda con mi compra. ¿Pueden asistirme?');
        break;
      case 'whatsappOffers':
        this.openWhatsApp('Hola! Me interesan las ofertas especiales de hoy. ¿Pueden mostrarme el catálogo completo?');
        break;
      case 'whatsappCategories':
        this.openWhatsApp('Hola! Me gustaría ver todas las categorías de productos disponibles.');
        break;
      case 'whatsappBrands':
        this.openWhatsApp('Hola! Me gustaría ver todas las marcas disponibles.');
        break;
      case 'whatsappCategory':
        this.openWhatsApp(`Hola! Me interesa ver el catálogo completo de ${data?.nombre || 'productos'}. ¿Pueden ayudarme?`);
        break;
      case 'whatsappBrand':
        this.openWhatsApp(`Hola! Me interesan los productos de la marca ${data?.nombre || 'seleccionada'}. ¿Pueden mostrarme el catálogo?`);
        break;
      case 'whatsappSearch':
        this.openWhatsApp(`Hola! Estoy buscando productos relacionados con "${data}". ¿Pueden ayudarme?`);
        break;
      case 'whatsappProduct':
        this.openWhatsApp(`Hola! Me interesa este producto: ${data?.nombre || 'producto seleccionado'}. ¿Pueden darme más información?`);
        break;
      case 'whatsappOffer':
        this.openWhatsApp(`Hola! Me interesa esta oferta: ${data?.nombre || 'oferta especial'}. ¿Está disponible?`);
        break;
      case 'whatsappFAQ':
        this.openWhatsApp('Hola! Tengo algunas preguntas sobre sus productos y servicios.');
        break;
      case 'whatsappHelp':
        this.openWhatsApp('Hola! Necesito ayuda con una consulta específica.');
        break;
      
      default:
        this.addBotMessage(this.botResponses.default);
        break;
    }
  }

  // ✅ MOSTRAR OFERTAS DINÁMICAS MEJORADO
  private showOffers() {
    if (this.productosEnOferta.length > 0) {
      const ofertas = this.productosEnOferta.slice(0, 4);
      this.addBotMessage(this.botResponses.offers, { offers: ofertas });
    } else {
      this.addBotMessage({
        text: '😔 **No hay ofertas especiales disponibles en este momento**\n\nPero tenemos productos increíbles esperándote. ¿Te gustaría explorar nuestras categorías?',
        options: [
          { id: 'categories', text: '📂 Ver categorías', action: 'showCategories', emoji: '📂' },
          { id: 'popular', text: '⭐ Productos populares', action: 'showPopular', emoji: '⭐' },
          { id: 'whatsapp_offers', text: '📱 Consultar ofertas por WhatsApp', action: 'whatsappOffers', emoji: '📱' },
          { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
        ] as ChatOption[]
      });
    }
  }

  // ✅ MOSTRAR PRODUCTOS POR CATEGORÍA MEJORADO
  private showCategoryProducts(categoria: CategoriaPublica) {
    this.isTyping = true;
    
    this.almacenService.obtenerProductosPublicos({ categoria: categoria.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductosPublicosResponse) => {
          this.isTyping = false;
          
          if (response.productos && response.productos.length > 0) {
            const productos = response.productos.slice(0, 4);
            this.addBotMessage({
              text: `${this.getCategoryEmoji(categoria.nombre)} **${categoria.nombre}**\n\n${categoria.descripcion || ''}\n\nEncontré ${response.productos.length} productos en esta categoría:`,
              options: [
                { id: 'whatsapp_category', text: '📱 Ver catálogo completo', action: 'whatsappCategory', data: categoria, emoji: '📱' },
                { id: 'filter_price', text: '💰 Filtrar por precio', action: 'filterByPrice', data: categoria, emoji: '💰' },
                { id: 'back', text: '⬅️ Volver a categorías', action: 'showCategories', emoji: '⬅️' }
              ] as ChatOption[]
            }, { products: productos, categories: [categoria] });
          } else {
            this.addBotMessage({
              text: `😔 **No hay productos disponibles en "${categoria.nombre}"**\n\n¿Te gustaría explorar otras categorías o hablar con nuestro equipo?`,
              options: [
                { id: 'other_categories', text: '📂 Otras categorías', action: 'showCategories', emoji: '📂' },
                { id: 'whatsapp_help', text: '📱 Consultar por WhatsApp', action: 'whatsappHelp', emoji: '📱' },
                { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
              ] as ChatOption[]
            });
          }
        },
        error: (error) => {
          this.isTyping = false;
          console.error('Error al cargar productos de categoría:', error);
          this.addBotMessage(this.botResponses.default);
        }
      });
  }

  // ✅ MOSTRAR PRODUCTOS POR MARCA MEJORADO
  private showBrandProducts(marca: MarcaProducto) {
    this.isTyping = true;
    
    this.almacenService.obtenerProductosPublicos({ marca: marca.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductosPublicosResponse) => {
          this.isTyping = false;
          
          if (response.productos && response.productos.length > 0) {
            const productos = response.productos.slice(0, 4);
            this.addBotMessage({
              text: `🏷️ **${marca.nombre}**\n\n${marca.descripcion || ''}\n\nEncontré ${response.productos.length} productos de esta marca:`,
              options: [
                { id: 'whatsapp_brand', text: '📱 Ver catálogo completo', action: 'whatsappBrand', data: marca, emoji: '📱' },
                { id: 'brand_offers', text: '🔥 Ofertas de la marca', action: 'showBrandOffers', data: marca, emoji: '🔥' },
                { id: 'back', text: '⬅️ Volver a marcas', action: 'showBrands', emoji: '⬅️' }
              ] as ChatOption[]
            }, { products: productos, brands: [marca] });
          } else {
            this.addBotMessage({
              text: `😔 **No hay productos disponibles de "${marca.nombre}"**\n\n¿Te gustaría explorar otras marcas o categorías?`,
              options: [
                { id: 'other_brands', text: '🏷️ Otras marcas', action: 'showBrands', emoji: '🏷️' },
                { id: 'categories', text: '📂 Ver categorías', action: 'showCategories', emoji: '📂' },
                { id: 'whatsapp_help', text: '📱 Consultar por WhatsApp', action: 'whatsappHelp', emoji: '📱' },
                { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
              ] as ChatOption[]
            });
          }
        },
        error: (error) => {
          this.isTyping = false;
          console.error('Error al cargar productos de marca:', error);
          this.addBotMessage(this.botResponses.default);
        }
      });
  }

  // ✅ NUEVOS MÉTODOS PARA FUNCIONALIDADES ADICIONALES
  private showPopularProducts() {
    this.isTyping = true;
    
    this.almacenService.obtenerProductosPublicos({ page: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductosPublicosResponse) => {
          this.isTyping = false;
          
          if (response.productos && response.productos.length > 0) {
            // Ordenar por rating y ventas
            const productosPopulares = response.productos
              .sort((a, b) => (b.rating * b.sold_count) - (a.rating * a.sold_count))
              .slice(0, 4);
              
            this.addBotMessage({
              text: '⭐ **Productos más populares:**\n\nEstos son nuestros productos mejor valorados y más vendidos:',
              options: [
                { id: 'whatsapp_popular', text: '📱 Ver más populares', action: 'whatsappPopular', emoji: '📱' },
                { id: 'categories', text: '📂 Explorar categorías', action: 'showCategories', emoji: '📂' },
                { id: 'back', text: '⬅️ Volver al menú', action: 'greeting', emoji: '⬅️' }
              ] as ChatOption[]
            }, { products: productosPopulares });
          } else {
            this.addBotMessage(this.botResponses.default);
          }
        },
        error: (error) => {
          this.isTyping = false;
          console.error('Error al cargar productos populares:', error);
          this.addBotMessage(this.botResponses.default);
        }
      });
  }

  private refineSearch(termino: string) {
    this.addBotMessage({
      text: `🎯 **Refinar búsqueda para "${termino}"**\n\n¿En qué categoría te gustaría buscar?`,
      options: [
        ...this.categorias.slice(0, 6).map(cat => ({
          id: `refine_cat_${cat.id}`,
          text: `${this.getCategoryEmoji(cat.nombre)} ${cat.nombre}`,
          action: 'searchInCategory',
          data: { termino, categoria: cat },
          emoji: this.getCategoryEmoji(cat.nombre)
        })),
        { id: 'search_all', text: '🔍 Buscar en todo', action: 'searchProducts', emoji: '🔍' },
        { id: 'back', text: '⬅️ Volver', action: 'greeting', emoji: '⬅️' }
      ] as ChatOption[]
    });
  }

  openWhatsApp(message: string) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${this.whatsappNumber}&text=${encodedMessage}`;
    if (this.isBrowser) {
      window.open(whatsappUrl, '_blank');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.isBrowser && this.chatMessagesRef) {
        const element = this.chatMessagesRef.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}