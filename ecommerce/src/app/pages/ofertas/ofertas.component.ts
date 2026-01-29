// src/app/pages/ofertas/ofertas.component.ts
import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink, Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { BreadcrumbComponent } from "../../component/breadcrumb/breadcrumb.component"
import { ShippingComponent } from "../../component/shipping/shipping.component"
import { ProductosService, ProductoPublico, type CategoriaParaSidebar } from "../../services/productos.service"
import { BannerOfertaService, ProductoBannerOferta } from "../../services/banner-oferta.service"
import { CartService } from "../../services/cart.service"
import { CartNotificationService } from '../../services/cart-notification.service'
import { AlmacenService } from '../../services/almacen.service'
import { MarcaProducto } from '../../types/almacen.types'
import Swal from 'sweetalert2'

@Component({
  selector: "app-ofertas",
  imports: [CommonModule, RouterLink, BreadcrumbComponent, ShippingComponent, FormsModule],
  templateUrl: "./ofertas.component.html",
  styleUrl: "./ofertas.component.scss",
})
export class OfertasComponent implements OnInit {
  listview: "list" | "grid" = "grid"

  productos: ProductoBannerOferta[] = []
  productosFiltrados: ProductoBannerOferta[] = []
  categorias: CategoriaParaSidebar[] = []
  marcas: MarcaProducto[] = []
  categoriasDisponibles: { id: number; nombre: string; count: number }[] = []
  marcasDisponibles: { id: number; nombre: string; count: number }[] = []
  isLoading = false
  categoriaSeleccionada?: number
  marcaSeleccionada?: number

  // ✅ FILTRO POR PRECIO
  minPrice: number = 0
  maxPrice: number = 10000
  currentMinPrice: number = 0
  currentMaxPrice: number = 10000

  // ✅ NUEVO: Ordenamiento
  sortBy: string = 'price_desc' // Por defecto: Precio descendente

  // pagination
  currentPage = 1
  itemsPerPage = 12
  totalPages = 1
  totalProductos = 0

  constructor(
    private productosService: ProductosService,
    private bannerOfertaService: BannerOfertaService,
    private cartService: CartService,
    private cartNotificationService: CartNotificationService,
    private router: Router,
    private almacenService: AlmacenService,
  ) {}

  ngOnInit(): void {
    // ✅ SCROLL AL INICIO AL CARGAR LA PÁGINA
    window.scrollTo({ top: 0, behavior: 'auto' })
    
    this.cargarCategorias()
    this.cargarMarcas()
    this.cargarProductosEnOferta()
  }

  /**
   * Cargar productos en oferta desde bannerOfertaActivo
   */
  cargarProductosEnOferta(): void {
    this.isLoading = true

    this.bannerOfertaService.getBannerActivo().subscribe({
      next: (banner) => {
        if (banner && banner.productos) {
          this.productos = banner.productos
          this.totalProductos = this.productos.length
          this.extraerCategoriasDisponibles()
          this.extraerMarcasDisponibles()
          this.aplicarFiltros()
        } else {
          this.productos = []
          this.productosFiltrados = []
          this.categoriasDisponibles = []
          this.marcasDisponibles = []
          this.totalProductos = 0
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error('Error al cargar productos en oferta:', error)
        this.productos = []
        this.productosFiltrados = []
        this.categoriasDisponibles = []
        this.marcasDisponibles = []
        this.totalProductos = 0
        this.isLoading = false
      }
    })
  }

  /**
   * Extraer categorías únicas de los productos en oferta
   */
  private extraerCategoriasDisponibles(): void {
    const categoriasMap = new Map<number, { id: number; nombre: string; count: number }>()

    this.productos.forEach(producto => {
      if (producto.categoria_id && producto.categoria_nombre) {
        if (categoriasMap.has(producto.categoria_id)) {
          const cat = categoriasMap.get(producto.categoria_id)!
          cat.count++
        } else {
          categoriasMap.set(producto.categoria_id, {
            id: producto.categoria_id,
            nombre: producto.categoria_nombre,
            count: 1
          })
        }
      }
    })

    this.categoriasDisponibles = Array.from(categoriasMap.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  /**
   * Extraer marcas únicas de los productos en oferta
   */
  private extraerMarcasDisponibles(): void {
    const marcasMap = new Map<number, { id: number; nombre: string; count: number }>()

    this.productos.forEach(producto => {
      if (producto.marca_id && producto.marca_nombre) {
        if (marcasMap.has(producto.marca_id)) {
          const marca = marcasMap.get(producto.marca_id)!
          marca.count++
        } else {
          marcasMap.set(producto.marca_id, {
            id: producto.marca_id,
            nombre: producto.marca_nombre,
            count: 1
          })
        }
      }
    })

    this.marcasDisponibles = Array.from(marcasMap.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  /**
   * Aplicar filtros locales (categoría, marca, precio)
   */
  aplicarFiltros(): void {
    let filtrados = [...this.productos]

    // Filtro por categoría
    if (this.categoriaSeleccionada) {
      filtrados = filtrados.filter(p => p.categoria_id === this.categoriaSeleccionada)
    }

    // Filtro por marca
    if (this.marcaSeleccionada) {
      filtrados = filtrados.filter(p => p.marca_id === this.marcaSeleccionada)
    }

    // Filtro por precio
    if (this.currentMinPrice > 0 || this.currentMaxPrice < 10000) {
      filtrados = filtrados.filter(p =>
        p.precio_con_descuento >= this.currentMinPrice &&
        p.precio_con_descuento <= this.currentMaxPrice
      )
    }

    // ✅ NUEVO: Aplicar ordenamiento
    filtrados = this.ordenarProductos(filtrados)

    this.productosFiltrados = filtrados
    this.totalProductos = filtrados.length
    this.totalPages = Math.ceil(this.totalProductos / this.itemsPerPage)
    this.currentPage = 1
  }

  // ✅ NUEVO: Método para ordenar productos
  ordenarProductos(productos: ProductoBannerOferta[]): ProductoBannerOferta[] {
    switch (this.sortBy) {
      case 'price_asc':
        return productos.sort((a, b) => a.precio_con_descuento - b.precio_con_descuento)
      case 'price_desc':
        return productos.sort((a, b) => b.precio_con_descuento - a.precio_con_descuento)
      case 'name_asc':
        return productos.sort((a, b) => a.nombre.localeCompare(b.nombre))
      case 'popularity_desc':
        // Ordenar por descuento (mayor descuento = más popular)
        return productos.sort((a, b) => b.descuento_porcentaje - a.descuento_porcentaje)
      default:
        return productos
    }
  }

  // ✅ NUEVO: Método para aplicar ordenamiento
  aplicarOrdenamiento(): void {
    this.aplicarFiltros()
  }

  /**
   * Obtener productos de la página actual
   */
  getProductosPaginados(): ProductoBannerOferta[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return this.productosFiltrados.slice(startIndex, endIndex)
  }

  cargarCategorias(): void {
    this.productosService.obtenerCategoriasParaSidebar().subscribe({
      next: (categorias) => {
        this.categorias = categorias
      },
      error: (error) => {
        console.error("Error al cargar categorías:", error)
      },
    })
  }

  cargarMarcas(): void {
    this.almacenService.obtenerMarcasPublicas().subscribe({
      next: (marcas) => {
        this.marcas = marcas
      },
      error: (error) => {
        console.error("Error al cargar marcas:", error)
      },
    })
  }

  seleccionarCategoria(categoriaId: number): void {
    this.categoriaSeleccionada = categoriaId
    this.aplicarFiltros()
  }

  seleccionarMarca(marcaId: number): void {
    this.marcaSeleccionada = marcaId
    this.aplicarFiltros()
  }

  aplicarFiltroPrecio(): void {
    this.currentMinPrice = this.minPrice
    this.currentMaxPrice = this.maxPrice
    this.aplicarFiltros()
  }

  limpiarFiltroPrecio(): void {
    this.minPrice = 0
    this.maxPrice = 10000
    this.currentMinPrice = 0
    this.currentMaxPrice = 10000
    this.aplicarFiltros()
  }

  limpiarFiltroCategoria(): void {
    this.categoriaSeleccionada = undefined
    this.aplicarFiltros()
  }

  limpiarFiltroMarca(): void {
    this.marcaSeleccionada = undefined
    this.aplicarFiltros()
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = undefined
    this.marcaSeleccionada = undefined
    this.minPrice = 0
    this.maxPrice = 10000
    this.currentMinPrice = 0
    this.currentMaxPrice = 10000
    this.aplicarFiltros()
  }

  togglelistview(): void {
    this.listview = this.listview === "grid" ? "list" : "grid"
  }

  addToCart(producto: ProductoBannerOferta): void {
    if (producto.stock <= 0) {
      Swal.fire({
        title: 'Sin stock',
        text: 'Este producto no tiene stock disponible',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      })
      return
    }

    // Convertir ProductoBannerOferta a ProductoPublico para compatibilidad con el carrito
    const productoParaCarrito: any = {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      precio_oferta: producto.precio_con_descuento,
      imagen_principal: producto.imagen_principal,
      stock: producto.stock,
      slug: producto.slug
    }

    this.cartService.addToCart(productoParaCarrito, 1).subscribe({
      next: () => {
        let productImage = producto.imagen_principal || 'assets/images/thumbs/product-default.png'

        // Obtener productos sugeridos
        const suggestedProducts = this.productosFiltrados
          .filter(p => p.id !== producto.id)
          .slice(0, 3)
          .map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            precio_oferta: p.precio_con_descuento,
            imagen_principal: p.imagen_principal,
            stock: p.stock,
            slug: p.slug
          }))

        this.cartNotificationService.showProductAddedNotification(
          producto.nombre,
          Number(producto.precio_con_descuento || 0),
          productImage,
          1,
          suggestedProducts as any
        )
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err.message || 'No se pudo agregar el producto al carrito',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        })
      }
    })
  }

  onImageError(event: any): void {
    event.target.src = "/placeholder.svg?height=200&width=200&text=Imagen+no+disponible"
  }

  getPages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1)
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
