import { Component, EventEmitter, Output, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-filter.component.html',
  styleUrls: ['./product-filter.component.scss']
})
export class ProductFilterComponent {
  @Input() categories: any[] = []; // Categorías para reutilización
  @Input() marcas: any[] = []; // Marcas para reutilización
  @Output() filtersApplied = new EventEmitter<any>();

  // Filtros basados en BD: precio (min/max), categoryIds (array de IDs), brand (marca_id), sortBy
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedCategoryIds: number[] = [];
  selectedBrandId: number | null = null;
  sortBy: string = 'price_asc'; // Opciones: price_asc, price_desc, name_asc, popularity_desc

  applyFilters() {
    const filters = {
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      categoryIds: this.selectedCategoryIds.join(','),
      brand: this.selectedBrandId,
      sortBy: this.sortBy
    };
    this.filtersApplied.emit(filters);
  }

  toggleCategory(id: number) {
    const index = this.selectedCategoryIds.indexOf(id);
    if (index > -1) {
      this.selectedCategoryIds.splice(index, 1);
    } else {
      this.selectedCategoryIds.push(id);
    }
    this.applyFilters();
  }
}