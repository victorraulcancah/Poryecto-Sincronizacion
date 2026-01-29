import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrearProyeccionDto } from '../../../models/contabilidad/flujo-caja.model';

@Component({
  selector: 'app-proyeccion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .modal-header-custom {
      background: hsl(var(--main-600));
      color: white;
      padding: 1.5rem;
    }
    .modal-header-custom .btn-close {
      filter: brightness(0) invert(1);
    }
    .tipo-toggle {
      display: flex;
      gap: var(--size-8);
      margin-bottom: var(--size-16);
    }
    .tipo-btn {
      flex: 1;
      padding: var(--size-12);
      border: 2px solid hsl(var(--neutral-300));
      border-radius: var(--radius-lg);
      background: white;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }
    .tipo-btn.active.ingreso {
      background: hsl(var(--success-50));
      border-color: hsl(var(--success-600));
      color: hsl(var(--success-600));
    }
    .tipo-btn.active.egreso {
      background: hsl(var(--danger-50));
      border-color: hsl(var(--danger-600));
      color: hsl(var(--danger-600));
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" [style.display]="visible ? 'block' : 'none'">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              Nueva Proyección
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          <div class="modal-body">
            <div class="tipo-toggle">
              <button type="button" class="tipo-btn ingreso" [class.active]="formData.tipo === 'INGRESO'"
                (click)="formData.tipo = 'INGRESO'">Ingreso</button>
              <button type="button" class="tipo-btn egreso" [class.active]="formData.tipo === 'EGRESO'"
                (click)="formData.tipo = 'EGRESO'">Egreso</button>
            </div>
            <div class="mb-3">
              <label class="form-label">Fecha <span class="text-danger">*</span></label>
              <input type="date" class="form-control" [(ngModel)]="formData.fecha">
            </div>
            <div class="mb-3">
              <label class="form-label">Categoría <span class="text-danger">*</span></label>
              <select class="form-select" [(ngModel)]="formData.categoria">
                <option value="">Seleccione...</option>
                <ng-container *ngIf="formData.tipo === 'INGRESO'">
                  <option value="VENTAS">Ventas</option>
                  <option value="COBROS">Cobros</option>
                  <option value="PRESTAMOS">Préstamos</option>
                  <option value="OTROS_INGRESOS">Otros Ingresos</option>
                </ng-container>
                <ng-container *ngIf="formData.tipo === 'EGRESO'">
                  <option value="COMPRAS">Compras</option>
                  <option value="PAGOS_PROVEEDORES">Pagos a Proveedores</option>
                  <option value="SUELDOS">Sueldos</option>
                  <option value="SERVICIOS">Servicios</option>
                  <option value="IMPUESTOS">Impuestos</option>
                  <option value="PRESTAMOS_PAGO">Pago de Préstamos</option>
                  <option value="OTROS_EGRESOS">Otros Egresos</option>
                </ng-container>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Concepto <span class="text-danger">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="formData.concepto"
                placeholder="Ej: Ventas proyectadas enero">
            </div>
            <div class="mb-3">
              <label class="form-label">Monto Proyectado <span class="text-danger">*</span></label>
              <div class="input-group">
                <span class="input-group-text">S/</span>
                <input type="number" class="form-control" [(ngModel)]="formData.monto_proyectado" placeholder="0.00"
                  step="0.01" min="0">
              </div>
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" [(ngModel)]="formData.recurrente" id="checkRecurrente">
              <label class="form-check-label" for="checkRecurrente">Proyección recurrente</label>
            </div>
            <div class="mb-3">
              <label class="form-label">Observaciones</label>
              <textarea class="form-control" rows="3" [(ngModel)]="formData.observaciones"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()" [disabled]="procesando || !esValido()">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="visible" class="modal-backdrop fade show"></div>
  `
})
export class ProyeccionModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() proyeccion: any = null; // Para edición
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onGuardar = new EventEmitter<CrearProyeccionDto>();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CrearProyeccionDto>();

  formData: CrearProyeccionDto = {
    fecha: '',
    tipo: 'INGRESO',
    categoria: '',
    concepto: '',
    monto_proyectado: 0,
    recurrente: false,
    observaciones: ''
  };

  ngOnChanges() {
    if (this.visible) {
      if (this.proyeccion) {
        // Modo edición
        this.formData = {
          fecha: this.proyeccion.fecha,
          tipo: this.proyeccion.tipo,
          categoria: this.proyeccion.categoria,
          concepto: this.proyeccion.concepto,
          monto_proyectado: this.proyeccion.monto_proyectado,
          recurrente: this.proyeccion.recurrente || false,
          observaciones: this.proyeccion.observaciones || ''
        };
      } else if (!this.formData.fecha) {
        // Modo creación
        this.formData.fecha = new Date().toISOString().split('T')[0];
      }
    }
  }

  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.close.emit();
    this.resetForm();
  }

  guardar() {
    if (!this.esValido()) return;
    this.onGuardar.emit(this.formData);
    this.save.emit(this.formData);
  }

  esValido(): boolean {
    return this.formData.fecha !== '' && this.formData.categoria !== '' &&
      this.formData.concepto.trim() !== '' && this.formData.monto_proyectado > 0;
  }

  resetForm() {
    this.formData = {
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'INGRESO',
      categoria: '',
      concepto: '',
      monto_proyectado: 0,
      recurrente: false,
      observaciones: ''
    };
  }
}
