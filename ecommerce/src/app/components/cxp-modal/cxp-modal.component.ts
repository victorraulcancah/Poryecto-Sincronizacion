import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { CuentasPorPagarService } from '../../services/contabilidad/cuentas-por-pagar.service';
import { ProveedoresService } from '../../services/contabilidad/proveedores.service';

interface CxPForm {
  proveedor_id: number | null;
  numero_documento: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  moneda: string;
  descripcion: string;
  observaciones: string;
}

@Component({
  selector: 'app-cxp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModalComponent],
  template: `
    <app-base-modal
      [isOpen]="isOpen"
      [title]="cxpId ? 'Editar Cuenta por Pagar' : 'Nueva Cuenta por Pagar'"
      icon="ph ph-credit-card"
      size="lg"
      headerClass="bg-danger text-white"
      [loading]="loading"
      [confirmDisabled]="!isFormValid()"
      confirmText="Guardar"
      (onClose)="close()"
      (onConfirm)="submit()">
      
      <div class="row g-3">
        <!-- Proveedor -->
        <div class="col-12">
          <label class="form-label">Proveedor *</label>
          <select class="form-select" [(ngModel)]="form.proveedor_id" required>
            <option [value]="null">Seleccione un proveedor</option>
            <option *ngFor="let p of proveedores" [value]="p.id">
              {{ p.razon_social }} - {{ p.numero_documento }}
            </option>
          </select>
        </div>

        <!-- Tipo y Número de Documento -->
        <div class="col-md-4">
          <label class="form-label">Tipo Documento *</label>
          <select class="form-select" [(ngModel)]="form.tipo_documento">
            <option value="FACTURA">Factura</option>
            <option value="BOLETA">Boleta</option>
            <option value="RECIBO">Recibo</option>
            <option value="NOTA_DEBITO">Nota de Débito</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div class="col-md-8">
          <label class="form-label">Número Documento *</label>
          <input type="text" class="form-control" [(ngModel)]="form.numero_documento" 
                 placeholder="Ej: F001-00123" required>
        </div>

        <!-- Fechas -->
        <div class="col-md-6">
          <label class="form-label">Fecha Emisión *</label>
          <input type="date" class="form-control" [(ngModel)]="form.fecha_emision" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Fecha Vencimiento *</label>
          <input type="date" class="form-control" [(ngModel)]="form.fecha_vencimiento" required>
        </div>

        <!-- Monto y Moneda -->
        <div class="col-md-8">
          <label class="form-label">Monto Total *</label>
          <input type="number" class="form-control" [(ngModel)]="form.monto_total" 
                 step="0.01" min="0" placeholder="0.00" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Moneda *</label>
          <select class="form-select" [(ngModel)]="form.moneda">
            <option value="PEN">PEN - Soles</option>
            <option value="USD">USD - Dólares</option>
          </select>
        </div>

        <!-- Descripción -->
        <div class="col-12">
          <label class="form-label">Descripción *</label>
          <input type="text" class="form-control" [(ngModel)]="form.descripcion" 
                 placeholder="Descripción de la cuenta por pagar" required>
        </div>

        <!-- Observaciones -->
        <div class="col-12">
          <label class="form-label">Observaciones</label>
          <textarea class="form-control" rows="3" [(ngModel)]="form.observaciones"
                    placeholder="Observaciones adicionales (opcional)"></textarea>
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
export class CxPModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() cxpId?: number;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<any>();

  loading = false;
  error = '';
  success = '';
  proveedores: any[] = [];

  form: CxPForm = {
    proveedor_id: null,
    numero_documento: '',
    tipo_documento: 'FACTURA',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    monto_total: 0,
    moneda: 'PEN',
    descripcion: '',
    observaciones: ''
  };

  constructor(
    private cxpService: CuentasPorPagarService,
    private proveedoresService: ProveedoresService
  ) {}

  ngOnInit(): void {
    this.cargarProveedores();
    if (this.cxpId) {
      this.cargarCxP();
    }
    // Calcular fecha de vencimiento por defecto (30 días)
    const fechaVenc = new Date();
    fechaVenc.setDate(fechaVenc.getDate() + 30);
    this.form.fecha_vencimiento = fechaVenc.toISOString().split('T')[0];
  }

  cargarProveedores(): void {
    this.proveedoresService.getProveedores({ activo: true }).subscribe({
      next: (res) => {
        this.proveedores = res.data || [];
      },
      error: (err) => {
        console.error('Error al cargar proveedores:', err);
      }
    });
  }

  cargarCxP(): void {
    if (!this.cxpId) return;
    
    this.loading = true;
    this.cxpService.getCuenta(this.cxpId).subscribe({
      next: (res) => {
        const cxp = res.data;
        this.form = {
          proveedor_id: cxp.proveedor_id,
          numero_documento: cxp.numero_documento,
          tipo_documento: cxp.tipo_documento,
          fecha_emision: cxp.fecha_emision,
          fecha_vencimiento: cxp.fecha_vencimiento,
          monto_total: cxp.monto_total,
          moneda: cxp.moneda,
          descripcion: cxp.descripcion,
          observaciones: cxp.observaciones || ''
        };
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar cuenta por pagar';
        this.loading = false;
      }
    });
  }

  isFormValid(): boolean {
    return this.form.proveedor_id !== null &&
           this.form.numero_documento !== '' &&
           this.form.fecha_emision !== '' &&
           this.form.fecha_vencimiento !== '' &&
           this.form.monto_total > 0 &&
           this.form.descripcion !== '';
  }

  submit(): void {
    if (!this.isFormValid()) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    // Validar que proveedor_id no sea null
    if (this.form.proveedor_id === null) {
      this.error = 'Debe seleccionar un proveedor';
      this.loading = false;
      return;
    }

    const formData = {
      ...this.form,
      proveedor_id: this.form.proveedor_id
    };

    const request = this.cxpId
      ? this.cxpService.actualizar(this.cxpId, formData)
      : this.cxpService.crear(formData);

    request.subscribe({
      next: (res) => {
        this.success = this.cxpId 
          ? 'Cuenta por pagar actualizada exitosamente'
          : 'Cuenta por pagar creada exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.onSuccess.emit(res.data);
          this.close();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar cuenta por pagar';
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
