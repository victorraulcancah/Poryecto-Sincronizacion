import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { AlmacenService } from '../../services/almacen.service';
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
      .obtenerMarcasPublicas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (marcas) => {
          // Sin logo no hay nada que mostrar en la grilla de marcas.
          this.marcas = marcas.filter((m) => !!m.imagen_url);
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
