import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { AlmacenService, type VitrinaMarcasConfig } from '../../services/almacen.service';
import { MarcaProducto } from '../../types/almacen.types';
import { SlugHelper } from '../../helpers/slug.helper';

/**
 * Página pública "Marcas": muestra los logos de las marcas con las que
 * trabaja la tienda. Cada logo lleva al catálogo filtrado por esa marca.
 */
@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, ShippingComponent],
  templateUrl: './marcas.component.html',
  styleUrl: './marcas.component.scss',
})
export class MarcasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  marcas: MarcaProducto[] = [];
  isLoading = false;

  /** Cómo se presenta la vitrina; lo decide el administrador en Marcas → Vitrina. */
  config: VitrinaMarcasConfig = { carrusel: false, velocidad: 30, por_fila: 6, filas: 0 };

  /**
   * Filas del carrusel, cada una con su lista ya duplicada.
   *
   * Se calcula una sola vez al cargar, no en un getter: un getter devolvería
   * arreglos nuevos en cada ciclo de detección de cambios, el *ngFor volvería a
   * crear las tiras y la animación se reiniciaría sin parar.
   */
  filasCarrusel: MarcaProducto[][] = [];

  /**
   * Reparte las marcas en tantas filas como pida la configuración y duplica
   * cada una.
   *
   * Lo de duplicar es lo que hace invisible el bucle: la tira se desplaza justo
   * la mitad de su ancho, así que al terminar la segunda copia queda donde
   * arrancó la primera.
   */
  private armarFilasCarrusel(): void {
    const filas = Math.max(1, this.config.filas || 1);
    const porFila = Math.ceil(this.marcas.length / filas);

    this.filasCarrusel = [];

    for (let i = 0; i < this.marcas.length; i += porFila) {
      const fila = this.marcas.slice(i, i + porFila);
      this.filasCarrusel.push([...fila, ...fila]);
    }
  }

  /** Duración de una vuelta completa, para la animación CSS. */
  get duracionCarrusel(): string {
    return `${this.config.velocidad}s`;
  }

  /** Ancho de cada logo en la cuadrícula, según los que se pidan por fila. */
  get anchoColumna(): string {
    const porFila = Math.max(1, this.config.por_fila);
    return `repeat(${porFila}, minmax(0, 1fr))`;
  }

  constructor(private almacenService: AlmacenService, private router: Router) {}

  ngOnInit(): void {
    this.cargarMarcas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarMarcas(): void {
    this.isLoading = true;
    this.almacenService
      .obtenerVitrinaPublica()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          this.config = respuesta.config;

          // Sin logo no hay nada que mostrar en la vitrina.
          let marcas = respuesta.marcas.filter((m) => !!m.imagen_url);

          // En cuadrícula, `filas` es un tope de cuántas mostrar. En carrusel es
          // en cuántas tiras se reparten, así que ahí no se recorta nada.
          if (!this.config.carrusel && this.config.filas > 0) {
            marcas = marcas.slice(0, this.config.filas * Math.max(1, this.config.por_fila));
          }

          this.marcas = marcas;
          if (this.config.carrusel) this.armarFilasCarrusel();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar las marcas:', error);
          this.isLoading = false;
        },
      });
  }

  /** Lleva al catálogo filtrado por la marca. */
  irAMarca(marca: MarcaProducto): void {
    const slug = SlugHelper.getSlugFromCategoria({
      nombre: marca.nombre,
      slug: marca.slug,
    });
    this.router.navigate(['/shop/marca', slug]);
  }

  /** Si el logo no carga, se esconde la tarjeta en vez de romper la grilla. */
  onImagenError(event: Event, marca: MarcaProducto): void {
    (event.target as HTMLImageElement).style.display = 'none';
    this.marcas = this.marcas.filter((m) => m.id !== marca.id);
  }

  trackPorId = (_: number, marca: MarcaProducto) => marca.id;
}
