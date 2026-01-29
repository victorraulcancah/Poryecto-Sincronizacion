import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ExportacionesService } from '../../services/contabilidad/exportaciones.service';
import { ProductosService } from '../../services/productos.service';
import Swal from 'sweetalert2';

type TipoExportacion = 'PLE_VENTAS' | 'PLE_COMPRAS' | 'VENTAS_TXT' | 'KARDEX_TXT';

interface ExportacionForm {
  tipo: TipoExportacion;
  periodo: string;
  mes: number;
  anio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  producto_id?: number;
  formato: 'txt' | 'excel';
}

@Component({
  selector: 'app-exportacion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModalComponent],
  template: `
    <app-base-modal
      [isOpen]="isOpen"
      [title]="'Exportar Datos'"
      icon="ph ph-download"
      size="md"
      headerClass="bg-info text-white"
      [loading]="loading"
      [confirmDisabled]="!isFormValid()"
      confirmText="Exportar"
      confirmIcon="ph ph-file-arrow-down"
      (onClose)="close()"
      (onConfirm)="submit()">
      
      <div class="row g-3">
        <!-- Tipo de Exportación -->
        <div class="col-12">
          <label class="form-label">Tipo de Exportación *</label>
          <select class="form-select" [(ngModel)]="form.tipo" (change)="onTipoChange()">
            <option value="PLE_VENTAS">PLE SUNAT - Registro de Ventas (14.1)</option>
            <option value="PLE_COMPRAS">PLE SUNAT - Registro de Compras (8.1)</option>
            <option value="VENTAS_TXT">Reporte de Ventas TXT</option>
            <option value="KARDEX_TXT">Kardex de Producto TXT</option>
          </select>
        </div>

        <!-- Información del formato -->
        <div class="col-12">
          <div class="alert alert-info">
            <i class="ph ph-info me-2"></i>
            <strong>{{ getTipoNombre() }}</strong><br>
            <small>{{ getTipoDescripcion() }}</small>
          </div>
        </div>

        <!-- Periodo (para PLE) -->
        <ng-container *ngIf="form.tipo === 'PLE_VENTAS' || form.tipo === 'PLE_COMPRAS'">
          <div class="col-md-6">
            <label class="form-label">Mes *</label>
            <select class="form-select" [(ngModel)]="form.mes">
              <option [value]="1">Enero</option>
              <option [value]="2">Febrero</option>
              <option [value]="3">Marzo</option>
              <option [value]="4">Abril</option>
              <option [value]="5">Mayo</option>
              <option [value]="6">Junio</option>
              <option [value]="7">Julio</option>
              <option [value]="8">Agosto</option>
              <option [value]="9">Septiembre</option>
              <option [value]="10">Octubre</option>
              <option [value]="11">Noviembre</option>
              <option [value]="12">Diciembre</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Año *</label>
            <input type="number" class="form-control" [(ngModel)]="form.anio" 
                   [min]="2020" [max]="currentYear" placeholder="2025">
          </div>
        </ng-container>

        <!-- Rango de fechas (para reportes) -->
        <ng-container *ngIf="form.tipo === 'VENTAS_TXT'">
          <div class="col-md-6">
            <label class="form-label">Fecha Inicio *</label>
            <input type="date" class="form-control" [(ngModel)]="form.fecha_inicio">
          </div>
          <div class="col-md-6">
            <label class="form-label">Fecha Fin *</label>
            <input type="date" class="form-control" [(ngModel)]="form.fecha_fin">
          </div>
        </ng-container>

        <!-- Producto (para Kardex) -->
        <ng-container *ngIf="form.tipo === 'KARDEX_TXT'">
          <div class="col-12">
            <label class="form-label">Producto *</label>
            <select class="form-select" [(ngModel)]="form.producto_id">
              <option [value]="null">Seleccione un producto</option>
              <option *ngFor="let p of productos" [value]="p.id">
                {{ p.codigo }} - {{ p.nombre }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Fecha Inicio</label>
            <input type="date" class="form-control" [(ngModel)]="form.fecha_inicio">
          </div>
          <div class="col-md-6">
            <label class="form-label">Fecha Fin</label>
            <input type="date" class="form-control" [(ngModel)]="form.fecha_fin">
          </div>
        </ng-container>

        <!-- Formato -->
        <div class="col-12">
          <label class="form-label">Formato de Salida *</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="formato" id="formato-txt" 
                   value="txt" [(ngModel)]="form.formato">
            <label class="btn btn-outline-primary" for="formato-txt">
              <i class="ph ph-file-text me-1"></i> TXT
            </label>
            <input type="radio" class="btn-check" name="formato" id="formato-excel" 
                   value="excel" [(ngModel)]="form.formato">
            <label class="btn btn-outline-success" for="formato-excel">
              <i class="ph ph-file-xls me-1"></i> Excel
            </label>
          </div>
        </div>
      </div>

      <!-- Mensajes -->
      <div *ngIf="error" class="alert alert-danger mt-3">
        <i class="ph ph-warning me-2"></i>{{ error }}
      </div>
      <div *ngIf="success" class="alert alert-success mt-3">
        <i class="ph ph-check-circle me-2"></i>{{ success }}
      </div>
    </app-base-modal>
  `
})
export class ExportacionModalComponent {
  @Input() isOpen = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<any>();

  loading = false;
  error = '';
  success = '';
  productos: any[] = [];
  currentYear = new Date().getFullYear();

  form: ExportacionForm = {
    tipo: 'PLE_VENTAS',
    periodo: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    formato: 'txt'
  };

  constructor(
    private exportacionesService: ExportacionesService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos = productos;
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  onTipoChange(): void {
    // Resetear campos específicos
    this.form.fecha_inicio = undefined;
    this.form.fecha_fin = undefined;
    this.form.producto_id = undefined;
  }

  getTipoNombre(): string {
    const nombres: Record<TipoExportacion, string> = {
      'PLE_VENTAS': 'Registro de Ventas - Formato 14.1',
      'PLE_COMPRAS': 'Registro de Compras - Formato 8.1',
      'VENTAS_TXT': 'Reporte de Ventas',
      'KARDEX_TXT': 'Kardex de Inventario'
    };
    return nombres[this.form.tipo];
  }

  getTipoDescripcion(): string {
    const descripciones: Record<TipoExportacion, string> = {
      'PLE_VENTAS': 'Exportación según normativa SUNAT con 41 campos. Nomenclatura: LERRRRRRRRRRRAAAAMM00140100001111.txt',
      'PLE_COMPRAS': 'Exportación según normativa SUNAT con 42 campos. Nomenclatura: LERRRRRRRRRRRAAAAMM00080100001111.txt',
      'VENTAS_TXT': 'Reporte detallado de ventas en formato TXT para análisis',
      'KARDEX_TXT': 'Movimientos de inventario con valorización por costo promedio ponderado'
    };
    return descripciones[this.form.tipo];
  }

  isFormValid(): boolean {
    if (this.form.tipo === 'PLE_VENTAS' || this.form.tipo === 'PLE_COMPRAS') {
      return this.form.mes > 0 && this.form.anio > 0;
    }
    if (this.form.tipo === 'VENTAS_TXT') {
      return !!this.form.fecha_inicio && !!this.form.fecha_fin;
    }
    if (this.form.tipo === 'KARDEX_TXT') {
      return !!this.form.producto_id;
    }
    return false;
  }

  submit(): void {
    if (!this.isFormValid()) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    switch (this.form.tipo) {
      case 'PLE_VENTAS':
        this.exportarPLEVentas();
        break;
      case 'PLE_COMPRAS':
        this.exportarPLECompras();
        break;
      case 'VENTAS_TXT':
        this.exportarVentasTxt();
        break;
      case 'KARDEX_TXT':
        this.exportarKardexTxt();
        break;
    }
  }

  private exportarPLEVentas(): void {
    const periodo = `${this.form.anio}${String(this.form.mes).padStart(2, '0')}`;
    const ruc = '20123456789'; // TODO: Obtener del contexto/empresa

    this.exportacionesService.exportarPLEVentas({ periodo, ruc }).subscribe({
      next: (blob) => {
        const filename = `LE${ruc}${periodo}000140100001111.txt`;
        this.exportacionesService.descargarArchivo(blob, filename);
        this.success = 'Exportación PLE Ventas generada exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.onSuccess.emit(this.form);
          this.close();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al exportar PLE Ventas';
        this.loading = false;
      }
    });
  }

  private exportarPLECompras(): void {
    const periodo = `${this.form.anio}${String(this.form.mes).padStart(2, '0')}`;
    const ruc = '20123456789'; // TODO: Obtener del contexto/empresa

    this.exportacionesService.exportarPLECompras({ periodo, ruc }).subscribe({
      next: (blob) => {
        const filename = `LE${ruc}${periodo}000080100001111.txt`;
        this.exportacionesService.descargarArchivo(blob, filename);
        this.success = 'Exportación PLE Compras generada exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.onSuccess.emit(this.form);
          this.close();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al exportar PLE Compras';
        this.loading = false;
      }
    });
  }

  private exportarVentasTxt(): void {
    const params = {
      fecha_inicio: this.form.fecha_inicio,
      fecha_fin: this.form.fecha_fin
    };

    this.exportacionesService.exportarVentasTxt(params).subscribe({
      next: (blob) => {
        const filename = `reporte-ventas-${params.fecha_inicio}-${params.fecha_fin}.txt`;
        this.exportacionesService.descargarArchivo(blob, filename);
        this.success = 'Reporte de Ventas generado exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.onSuccess.emit(this.form);
          this.close();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al exportar reporte de ventas';
        this.loading = false;
      }
    });
  }

  private exportarKardexTxt(): void {
    if (!this.form.producto_id) {
      this.error = 'Seleccione un producto';
      this.loading = false;
      return;
    }

    const params = {
      fecha_inicio: this.form.fecha_inicio,
      fecha_fin: this.form.fecha_fin
    };

    this.exportacionesService.exportarKardexTxt(this.form.producto_id, params).subscribe({
      next: (blob) => {
        const producto = this.productos.find(p => p.id === this.form.producto_id);
        const filename = `kardex-${producto?.codigo_producto || this.form.producto_id}.txt`;
        this.exportacionesService.descargarArchivo(blob, filename);
        this.success = 'Kardex generado exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.onSuccess.emit(this.form);
          this.close();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al exportar kardex';
        this.loading = false;
      }
    });
  }

  close(): void {
    this.error = '';
    this.success = '';
    this.onClose.emit();
  }
}
