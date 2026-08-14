// src/app/pages/shop/shop.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import {
  ProductosService,
  ProductoPublico,
  type CategoriaParaSidebar,
} from '../../services/productos.service';
import { CartService } from '../../services/cart.service';
import { CartNotificationService } from '../../services/cart-notification.service';
import { AlmacenService } from '../../services/almacen.service'; // ✅ NUEVO
import { MarcaProducto } from '../../types/almacen.types'; // ✅ NUEVO
import { SlugHelper } from '../../helpers/slug.helper'; // ✅ NUEVO
import { BannersService, Banner } from '../../services/banner.service'; // ✅ NUEVO
import { MonedaPipe } from '../../pipes/moneda.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-shop',
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    ShippingComponent,
    FormsModule,
    MonedaPipe,
  ],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
})
export class ShopComponent implements OnInit, OnDestroy {
  listview: 'list' | 'grid' = 'grid';

  productos: ProductoPublico[] = [];
  categorias: CategoriaParaSidebar[] = [];
  marcas: MarcaProducto[] = []; // ✅ NUEVO: Marcas desde el backend
  bannerSidebar: Banner | null = null; // ✅ NUEVO: Banner sidebar
  isLoading = false;
  searchTerm: string = '';

  // ------------------------------------------------------------ filtros
  /* El filtro permite marcar varias categorías y varias marcas a la vez; se
     envían al backend como listas separadas por coma (categoryIds/brandIds) y
     se reflejan en la URL igual (?categorias=1,2&marcas=3). */
  categoriasSeleccionadas: number[] = [];
  marcasSeleccionadas: number[] = [];

  /* Los conteos cruzados del sidebar (cuántos productos de esta marca hay en
     esta categoría) solo tienen sentido con UNA selección; con varias se
     muestran los totales. */
  get categoriaSeleccionada(): number | undefined {
    return this.categoriasSeleccionadas.length === 1
      ? this.categoriasSeleccionadas[0]
      : undefined;
  }

  get marcaSeleccionada(): number | undefined {
    return this.marcasSeleccionadas.length === 1
      ? this.marcasSeleccionadas[0]
      : undefined;
  }

  /** Cuántas opciones se ven antes de "Ver más". */
  readonly limiteOpciones = 5;
  busquedaMarca = '';
  busquedaCategoria = '';
  verTodasMarcas = false;
  verTodasCategorias = false;
  seccionesAbiertas: Record<'marca' | 'categoria' | 'precio', boolean> = {
    marca: true,
    categoria: true,
    precio: true,
  };

  /** Topes del deslizador de precio (los devuelve el backend). */
  precioTopeMin = 0;
  precioTopeMax = 0;

  private productosSub?: any;
  private categoriasSub?: any;
  private marcasSub?: any;
  // ✅ Descarta respuestas de cargarProductos() obsoletas (de un filtro ya reemplazado)
  private cargarProductosRequestId = 0;

  // ✅ FILTRO POR PRECIO
  minPrice?: number;
  maxPrice?: number;
  currentMinPrice?: number;
  currentMaxPrice?: number;

  // ✅ ORDENAMIENTO
  sortBy: string = 'price_asc';

  // pagination
  currentPage = 1;
  totalPages = 1;
  totalProductos = 0;

  // rating
  ratings = [
    { rating: 5, progress: 70, total: 124 },
    { rating: 4, progress: 50, total: 52 },
    { rating: 3, progress: 35, total: 12 },
    { rating: 2, progress: 20, total: 5 },
    { rating: 1, progress: 5, total: 2 },
  ];

  // color
  colors = [
    { id: 'color1', name: 'Black', count: 12, class: 'checked-black' },
    { id: 'color2', name: 'Blue', count: 12, class: 'checked-primary' },
    { id: 'color3', name: 'Gray', count: 12, class: 'checked-gray' },
    { id: 'color4', name: 'Green', count: 12, class: 'checked-success' },
    { id: 'color5', name: 'Red', count: 12, class: 'checked-danger' },
    { id: 'color6', name: 'White', count: 12, class: 'checked-white' },
    { id: 'color7', name: 'Purple', count: 12, class: 'checked-purple' },
  ];

  // ✅ ELIMINADO: Ya no usamos brands hardcodeado, ahora usamos marcas del backend

  constructor(
    private productosService: ProductosService,
    private cartService: CartService,
    private cartNotificationService: CartNotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private almacenService: AlmacenService, // ✅ NUEVO
    private bannersService: BannersService // ✅ NUEVO
  ) {}

  ngOnInit(): void {
    // Cargar categorías para el sidebar
    this.cargarCategorias();
    this.cargarMarcas(); // ✅ NUEVO: Cargar marcas desde el backend
    this.cargarBannerSidebar(); // ✅ NUEVO: Cargar banner del sidebar

    // ✅ NUEVO: Escuchar cambios en los parámetros de ruta (para slug de categoría y marca)
    this.route.params.subscribe(async (params) => {
      const categoriaSlug = params['categoriaSlug'];
      const marcaSlug = params['marcaSlug'];

      if (categoriaSlug) {
        // Si hay slug de categoría en la URL, buscar la categoría por slug
        await this.buscarCategoriaPorSlug(categoriaSlug);
      }

      if (marcaSlug) {
        // Si hay slug de marca en la URL, buscar la marca por slug
        await this.buscarMarcaPorSlug(marcaSlug);
      }
    });

    // Escuchar cambios en los query parameters (mantener compatibilidad)
    this.route.queryParams.subscribe((params) => {
      // Solo procesar query params si NO hay slugs en la ruta
      const hasSlugInRoute =
        this.route.snapshot.params['categoriaSlug'] ||
        this.route.snapshot.params['marcaSlug'];

      if (!hasSlugInRoute) {
        // `categorias`/`marcas` son listas (filtro múltiple); `categoria`/`marca`
        // en singular se mantienen por las URLs antiguas y los enlaces del menú.
        this.categoriasSeleccionadas = this.leerLista(
          params['categorias'] ?? params['categoria']
        );
        this.marcasSeleccionadas = this.leerLista(
          params['marcas'] ?? params['marca']
        );
      }

      this.searchTerm = params['search'] || '';
      this.currentPage = 1;
      this.recalcularFiltros();

      // Solo recargar si no hay slug en la ruta (evitar doble carga)
      if (!hasSlugInRoute) {
        this.cargarProductos();
      }
    });
  }

  /** '3' o '3,7' -> [3, 7]; cualquier otra cosa -> []. */
  private leerLista(valor: string | undefined): number[] {
    if (!valor) return [];
    return String(valor)
      .split(',')
      .map((v) => +v)
      .filter((v) => !isNaN(v) && v > 0);
  }

  // ✅ NUEVO: Buscar categoría por slug
  private async buscarCategoriaPorSlug(slug: string): Promise<void> {
    return new Promise((resolve) => {
      // Esperar a que las categorías se carguen
      const checkCategorias = () => {
        if (this.categorias.length > 0) {
          // Buscar la categoría por slug normalizado
          const categoria = this.categorias.find((cat) => {
            const catSlug = SlugHelper.getSlugFromCategoria({
              nombre: cat.nombre,
              slug: (cat as any).slug,
            });
            return catSlug === SlugHelper.normalizeSlug(slug);
          });

          if (categoria) {
            this.categoriasSeleccionadas = [categoria.id];
          } else {
            console.warn(`Categoría no encontrada para slug: ${slug}`);
            this.categoriasSeleccionadas = [];
          }

          // ✅ SOLUCIÓN: Cargar productos después de establecer la categoría
          this.cargarProductos();
          resolve();
        } else {
          // Reintentar después de 100ms
          setTimeout(checkCategorias, 100);
        }
      };
      checkCategorias();
    });
  }

  cargarCategorias(): void {
    if (this.categoriasSub) this.categoriasSub.unsubscribe();
    this.categoriasSub = this.productosService.obtenerCategoriasParaSidebar(this.marcaSeleccionada).subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        this.recalcularFiltros();
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      },
    });
  }

  cargarMarcas(): void {
    if (this.marcasSub) this.marcasSub.unsubscribe();
    this.marcasSub = this.almacenService.obtenerMarcasPublicas(this.categoriaSeleccionada).subscribe({
      next: (marcas) => {
        this.marcas = marcas;
        this.recalcularFiltros();
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
      },
    });
  }

  // ✅ NUEVO: Cargar banner del sidebar
  cargarBannerSidebar(): void {
    this.bannersService.obtenerBannerSidebarShop().subscribe({
      next: (banner) => {
        this.bannerSidebar = banner;
      },
      error: (error) => {
        console.error('Error al cargar banner sidebar:', error);
      },
    });
  }

  // Modifica el método existente cargarProductos():
  cargarProductos(): void {
    this.isLoading = true;
    // ✅ Evita mostrar productos de la categoría/filtro anterior mientras carga la nueva
    // (antes se quedaban visibles hasta que llegaba la respuesta, aunque ya no correspondían).
    this.productos = [];
    this.totalProductos = 0;
    const requestId = ++this.cargarProductosRequestId;

    if (this.productosSub) this.productosSub.unsubscribe();

    // ✅ Los conteos del sidebar se refrescan con el filtro cruzado (categoría <-> marca) actual
    this.cargarCategorias();
    this.cargarMarcas();

    const filtros: any = {
      categoryIds: this.categoriasSeleccionadas.join(','),
      brandIds: this.marcasSeleccionadas.join(','),
      page: this.currentPage,
      search: this.searchTerm,
      minPrice: this.currentMinPrice,
      maxPrice: this.currentMaxPrice,
      sortBy: this.sortBy,
    };
    Object.keys(filtros).forEach((key) => {
      if (
        filtros[key] === undefined ||
        filtros[key] === null ||
        filtros[key] === ''
      ) {
        delete filtros[key];
      }
    });

    const seccion = this.route.snapshot.queryParamMap.get('seccion');
    if (seccion) {
      filtros.seccion = +seccion;
    }

    this.productosSub = this.productosService.obtenerProductosPublicos(filtros).subscribe({
      next: (response) => {
        // ✅ Ignorar respuestas obsoletas (de un filtro/categoría ya reemplazado por uno más reciente)
        if (requestId !== this.cargarProductosRequestId) return;
        this.productos = response.productos;
        this.currentPage = response.pagination.current_page;
        this.totalPages = response.pagination.last_page;
        this.totalProductos = response.pagination.total;
        // Topes del deslizador de precio (vienen sin aplicar el rango elegido).
        if (response.precio_min != null) this.precioTopeMin = Math.floor(response.precio_min);
        if (response.precio_max != null) this.precioTopeMax = Math.ceil(response.precio_max);
        // Con un solo producto (o ninguno) los dos topes coinciden y el
        // deslizador quedaría trabado; se le da un recorrido mínimo.
        if (this.precioTopeMax <= this.precioTopeMin) {
          this.precioTopeMax = this.precioTopeMin + 1000;
        }
        this.isLoading = false;
      },
      error: (error) => {
        if (requestId !== this.cargarProductosRequestId) return;
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      },
    });
  }

  // ✅ Combinable con marca: navega por query params en vez de la ruta SEO
  // dedicada, así ambos filtros (categoría + marca) coexisten en la misma URL.
  seleccionarCategoria(categoriaId: number): void {
    this.categoriasSeleccionadas = this.alternar(this.categoriasSeleccionadas, categoriaId);
    this.currentPage = 1;
    this.navegarConFiltrosActuales();
  }

  // ✅ NUEVO: Buscar marca por slug
  private async buscarMarcaPorSlug(slug: string): Promise<void> {
    return new Promise((resolve) => {
      const checkMarcas = () => {
        if (this.marcas.length > 0) {
          const marca = this.marcas.find((m) => {
            const marcaSlug = SlugHelper.getSlugFromCategoria({
              nombre: m.nombre,
              slug: m.slug,
            });
            return marcaSlug === SlugHelper.normalizeSlug(slug);
          });

          if (marca) {
            this.marcasSeleccionadas = [marca.id];
          } else {
            console.warn(`Marca no encontrada para slug: ${slug}`);
            this.marcasSeleccionadas = [];
          }

          this.cargarProductos();
          resolve();
        } else {
          setTimeout(checkMarcas, 100);
        }
      };
      checkMarcas();
    });
  }

  // ✅ Combinable con categoría: navega por query params en vez de la ruta SEO dedicada,
  // así ambos filtros (categoría + marca) pueden coexistir en la misma URL.
  seleccionarMarca(marcaId: number): void {
    this.marcasSeleccionadas = this.alternar(this.marcasSeleccionadas, marcaId);
    this.currentPage = 1;
    this.navegarConFiltrosActuales();
  }

  /** Marca/desmarca un id de una lista de selección. */
  private alternar(lista: number[], id: number): number[] {
    return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  }

  private navegarConFiltrosActuales(): void {
    const queryParams: any = {};
    if (this.categoriasSeleccionadas.length)
      queryParams.categorias = this.categoriasSeleccionadas.join(',');
    if (this.marcasSeleccionadas.length)
      queryParams.marcas = this.marcasSeleccionadas.join(',');
    if (this.searchTerm) queryParams.search = this.searchTerm;
    this.router.navigate(['/shop'], { queryParams });
  }

  // ✅ NUEVO: Aplicar filtro por precio
  aplicarFiltroPrecio(): void {
    this.currentMinPrice = this.minPrice;
    this.currentMaxPrice = this.maxPrice;
    this.currentPage = 1;
    this.recalcularFiltros();
    this.cargarProductos();
  }

  // ✅ NUEVO: Limpiar filtro de precio
  limpiarFiltroPrecio(): void {
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.currentMinPrice = undefined;
    this.currentMaxPrice = undefined;
    this.recalcularFiltros();
    this.cargarProductos();
  }

  // ✅ NUEVO: Aplicar ordenamiento
  aplicarOrdenamiento(): void {
    this.currentPage = 1;
    this.cargarProductos();
  }

  limpiarFiltros(): void {
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.currentMinPrice = undefined;
    this.currentMaxPrice = undefined;
    this.busquedaMarca = '';
    this.busquedaCategoria = '';
    // ✅ MEJORADO: Navegar a shop sin parámetros ni slugs
    this.router.navigate(['/shop']);
  }

  // ------------------------------------------------- panel de filtros
  alternarSeccion(seccion: 'marca' | 'categoria' | 'precio'): void {
    this.seccionesAbiertas[seccion] = !this.seccionesAbiertas[seccion];
  }

  /* Las listas visibles y las fichas se calculan UNA vez cada vez que cambia
     algo (datos, selección o búsqueda) y se guardan en estas propiedades.
     Antes eran getters: Angular los ejecutaba en cada ciclo de detección de
     cambios y, como devolvían objetos nuevos, el *ngFor rehacía el DOM sin
     parar y el navegador se trababa al entrar al catálogo. */
  marcasVisibles: MarcaProducto[] = [];
  hayMasMarcas = false;
  categoriasVisibles: CategoriaParaSidebar[] = [];
  hayMasCategorias = false;
  hayFiltrosActivos = false;
  fichasFiltros: { etiqueta: string; tipo: 'marca' | 'categoria' | 'precio'; id?: number }[] = [];

  /** Recalcula lo que muestra el panel de filtros. */
  recalcularFiltros(): void {
    // --- Marcas visibles: buscador + tope de 5 (las marcadas se ven siempre)
    const marcasEncontradas = this.marcas.filter((m) =>
      this.coincide(m.nombre, this.busquedaMarca)
    );
    this.hayMasMarcas =
      !this.busquedaMarca && marcasEncontradas.length > this.limiteOpciones;

    if (this.verTodasMarcas || this.busquedaMarca) {
      this.marcasVisibles = marcasEncontradas;
    } else {
      const primeras = marcasEncontradas.slice(0, this.limiteOpciones);
      const marcadasFuera = marcasEncontradas.filter(
        (m) => this.marcasSeleccionadas.includes(m.id) && !primeras.includes(m)
      );
      this.marcasVisibles = [...primeras, ...marcadasFuera];
    }

    // --- Categorías visibles: igual que las marcas
    const categoriasEncontradas = this.categorias.filter((c) =>
      this.coincide(c.nombre, this.busquedaCategoria)
    );
    this.hayMasCategorias =
      !this.busquedaCategoria &&
      categoriasEncontradas.length > this.limiteOpciones;

    if (this.verTodasCategorias || this.busquedaCategoria) {
      this.categoriasVisibles = categoriasEncontradas;
    } else {
      const primeras = categoriasEncontradas.slice(0, this.limiteOpciones);
      const marcadasFuera = categoriasEncontradas.filter(
        (c) =>
          this.categoriasSeleccionadas.includes(c.id) && !primeras.includes(c)
      );
      this.categoriasVisibles = [...primeras, ...marcadasFuera];
    }

    // --- Fichas de los filtros puestos
    const fichas: typeof this.fichasFiltros = [];

    this.marcasSeleccionadas.forEach((id) => {
      const marca = this.marcas.find((m) => m.id === id);
      fichas.push({ etiqueta: marca?.nombre ?? `Marca ${id}`, tipo: 'marca', id });
    });

    this.categoriasSeleccionadas.forEach((id) => {
      const categoria = this.categorias.find((c) => c.id === id);
      fichas.push({
        etiqueta: categoria?.nombre ?? `Categoría ${id}`,
        tipo: 'categoria',
        id,
      });
    });

    if (this.currentMinPrice !== undefined || this.currentMaxPrice !== undefined) {
      const desde = this.currentMinPrice ?? this.precioTopeMin;
      const hasta = this.currentMaxPrice ?? this.precioTopeMax;
      fichas.push({ etiqueta: `S/ ${desde} - S/ ${hasta}`, tipo: 'precio' });
    }

    this.fichasFiltros = fichas;
    this.hayFiltrosActivos =
      this.categoriasSeleccionadas.length > 0 ||
      this.marcasSeleccionadas.length > 0 ||
      this.currentMinPrice !== undefined ||
      this.currentMaxPrice !== undefined;
  }

  /** "Ver más / Ver menos" de cada lista. */
  alternarVerTodas(lista: 'marca' | 'categoria'): void {
    if (lista === 'marca') this.verTodasMarcas = !this.verTodasMarcas;
    else this.verTodasCategorias = !this.verTodasCategorias;
    this.recalcularFiltros();
  }

  /** Comparación sin tildes ni mayúsculas, para que "amplificador" encuentre
   *  "Amplificación" igual que lo escriba el cliente. */
  private coincide(texto: string, busqueda: string): boolean {
    if (!busqueda) return true;
    const normalizar = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(new RegExp('[\u0300-\u036f]', 'g'), '');
    return normalizar(texto).includes(normalizar(busqueda));
  }

  quitarFicha(ficha: { tipo: 'marca' | 'categoria' | 'precio'; id?: number }): void {
    if (ficha.tipo === 'marca' && ficha.id) this.seleccionarMarca(ficha.id);
    else if (ficha.tipo === 'categoria' && ficha.id) this.seleccionarCategoria(ficha.id);
    else if (ficha.tipo === 'precio') this.limpiarFiltroPrecio();
  }

  /** El deslizador y las cajas de texto escriben lo mismo; se ordena el par
   *  para que el mínimo nunca quede por encima del máximo. */
  onPrecioSlider(): void {
    // Los <input> devuelven texto; sin convertir, la comparación de abajo
    // sería alfabética ('900' > '1000').
    if (this.minPrice !== undefined && this.minPrice !== null) this.minPrice = +this.minPrice;
    if (this.maxPrice !== undefined && this.maxPrice !== null) this.maxPrice = +this.maxPrice;
    if (
      this.minPrice !== undefined &&
      this.maxPrice !== undefined &&
      this.minPrice > this.maxPrice
    ) {
      const intercambio = this.minPrice;
      this.minPrice = this.maxPrice;
      this.maxPrice = intercambio;
    }
  }

  trackPorId = (_: number, item: { id: number }) => item.id;
  trackFicha = (_: number, ficha: { tipo: string; id?: number }) =>
    `${ficha.tipo}-${ficha.id ?? ''}`;

  togglelistview(): void {
    this.listview = this.listview === 'grid' ? 'list' : 'grid';
  }

  // ✅ MÉTODO MEJORADO PARA AGREGAR AL CARRITO
  addToCart(producto: ProductoPublico): void {
    if (producto.stock <= 0) {
      Swal.fire({
        title: 'Sin stock',
        text: 'Este producto no tiene stock disponible',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.cartService.addToCart(producto, 1).subscribe({
      next: () => {
        // Preparar imagen del producto
        let productImage =
          producto.imagen_principal ||
          'assets/images/thumbs/product-default.png';

        // Obtener productos sugeridos (primeros 3 productos diferentes al actual)
        const suggestedProducts = this.productos
          .filter((p) => p.id !== producto.id)
          .slice(0, 3);

        // Mostrar notificación llamativa estilo Coolbox
        this.cartNotificationService.showProductAddedNotification(
          producto.nombre,
          Number(producto.precio || 0),
          productImage,
          1,
          suggestedProducts,
          producto.moneda,
          producto.id
        );
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err.message || 'No se pudo agregar el producto al carrito',
          icon: 'error',
          confirmButtonColor: '#dc3545',
        });
      },
    });
  }

  // ✅ MÉTODO PARA MANEJAR ERRORES DE IMAGEN
  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;
    // Guarda anti-loop: si el placeholder también falla, no vuelve a disparar.
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/placeholder.svg';
  }

  ngOnDestroy(): void {
    this.productosSub?.unsubscribe();
    this.categoriasSub?.unsubscribe();
    this.marcasSub?.unsubscribe();
  }

  // Method to generate page numbers based on totalPages
  // ✅ Máximo de números de página visibles a la vez; con más páginas que esto,
  // se muestra una ventana deslizante centrada en la página actual (las flechas
  // la desplazan de a una), en vez de listar todas y que se corten en otra fila.
  private readonly maxPaginasVisibles = 13;

  getPages(): number[] {
    if (this.totalPages <= this.maxPaginasVisibles) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let inicio = this.currentPage - Math.floor(this.maxPaginasVisibles / 2);
    let fin = inicio + this.maxPaginasVisibles - 1;

    if (inicio < 1) {
      inicio = 1;
      fin = this.maxPaginasVisibles;
    }
    if (fin > this.totalPages) {
      fin = this.totalPages;
      inicio = this.totalPages - this.maxPaginasVisibles + 1;
    }

    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cargarProductos();
    }
  }
}
