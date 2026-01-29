import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  visible?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
  };
  template?: 'text' | 'badge' | 'avatar' | 'actions' | 'custom';
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableAction {
  icon: string;
  label: string;
  color: string;
  action: (item: any) => void;
  visible?: (item: any) => boolean;
}

export interface DataTableConfig {
  searchPlaceholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  showSelection?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() columns: DataTableColumn[] = [];
  @Input() actions: DataTableAction[] = [];
  @Input() config: DataTableConfig = {};
  @Input() loading = false;
  @Input() selected: any[] = [];

  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  // Internal state
  filteredData: any[] = [];
  paginatedData: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  // Default config
  defaultConfig: DataTableConfig = {
    searchPlaceholder: 'Buscar...',
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    showSelection: true,
    showSearch: true,
    showPagination: true,
    emptyMessage: 'No hay datos disponibles',
    loadingMessage: 'Cargando...'
  };

  ngOnInit(): void {
    this.applyConfig();
    this.updateData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['config']) {
      this.updateData();
    }
    if (changes['config']) {
      this.applyConfig();
    }
  }

  private applyConfig(): void {
    this.config = { ...this.defaultConfig, ...this.config };
    this.pageSize = this.config.pageSize || 10;
  }

  private updateData(): void {
    this.filterData();
    this.paginateData();
  }

  // ===== BÚSQUEDA =====
  onSearchChange(): void {
    this.currentPage = 1;
    this.filterData();
    this.paginateData();
  }

  private filterData(): void {
    if (!this.searchTerm.trim()) {
      this.filteredData = [...this.data];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredData = this.data.filter(item => {
      return this.columns
        .filter(col => col.searchable !== false)
        .some(col => {
          const value = this.getNestedValue(item, col.key);
          return value && value.toString().toLowerCase().includes(searchLower);
        });
    });
  }

  // ===== PAGINACIÓN =====
  private paginateData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.paginateData();
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.paginateData();
    this.pageSizeChange.emit(this.pageSize);
  }

  getStartRecord(): number {
    return this.filteredData.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(end, this.filteredData.length);
  }

  // ===== SELECCIÓN =====
  isSelected(item: any): boolean {
    return this.selected.some(s => this.getItemId(s) === this.getItemId(item));
  }

  toggleSelection(item: any, event: any): void {
    let newSelected = [...this.selected];

    if (event.target.checked) {
      if (!this.isSelected(item)) {
        newSelected.push(item);
      }
    } else {
      newSelected = newSelected.filter(s => this.getItemId(s) !== this.getItemId(item));
    }

    this.selectionChange.emit(newSelected);
  }

  isAllSelected(): boolean {
    return this.paginatedData.length > 0 &&
           this.paginatedData.every(item => this.isSelected(item));
  }

  toggleAllSelection(event: any): void {
    let newSelected = [...this.selected];

    if (event.target.checked) {
      this.paginatedData.forEach(item => {
        if (!this.isSelected(item)) {
          newSelected.push(item);
        }
      });
    } else {
      this.paginatedData.forEach(item => {
        newSelected = newSelected.filter(s => this.getItemId(s) !== this.getItemId(item));
      });
    }

    this.selectionChange.emit(newSelected);
  }

  getSelectionText(): string {
    const total = this.filteredData.length;
    const selectedCount = this.selected.length;
    return selectedCount > 0 ?
      `${selectedCount} de ${total} seleccionados` :
      `${total} registros`;
  }

  // ===== UTILIDADES =====
  private getItemId(item: any): any {
    // Buscar campos comunes de ID
    return item.id || item.id_cliente || item.id_usuario || item.codigo || JSON.stringify(item);
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  getCellValue(item: any, column: DataTableColumn): any {
    return this.getNestedValue(item, column.key);
  }

  getColumnClasses(column: DataTableColumn): string {
    let classes = 'px-16 py-16 align-middle';

    // Responsive visibility
    if (column.visible) {
      if (column.visible.mobile === false) classes += ' d-none d-md-table-cell';
      if (column.visible.tablet === false) classes += ' d-none d-lg-table-cell';
      if (column.visible.desktop === false) classes += ' d-none d-xl-table-cell';
    }

    // Alignment
    if (column.align === 'center') classes += ' text-center';
    if (column.align === 'right') classes += ' text-end';

    return classes;
  }

  executeAction(action: DataTableAction, item: any): void {
    action.action(item);
  }

  trackByIndex(index: number): number {
    return index;
  }
}