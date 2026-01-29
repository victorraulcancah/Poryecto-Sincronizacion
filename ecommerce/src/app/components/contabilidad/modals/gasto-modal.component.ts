import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrarGastoDto, CategoriaGasto } from '../../../models/contabilidad/caja-chica.model';

@Component({
  selector: 'app-gasto-modal',
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
    .file-upload {
      border: 2px dashed hsl(var(--neutral-300));
      border-radius: var(--radius-lg);
      padding: var(--size-16);
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .file-upload:hover {
      border-color: hsl(var(--main-600));
      background: hsl(var(--neutral-50));
    }
    .file-upload.has-file {
      border-color: hsl(var(--success-600));
      background: hsl(var(--success-50));
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" 
         [style.display]="visible ? 'block' : 'none'">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              Registrar Gasto
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <div *ngIf="saldoDisponible !== undefined" class="alert alert-info mb-3">
              <strong>Saldo Disponible:</strong> S/ {{ saldoDisponible | number:'1.2-2' }}
            </div>
            
            <!-- Fecha -->
            <div class="mb-3">
              <label class="form-label">
                Fecha <span class="text-danger">*</span>
              </label>
              <input type="date" class="form-control" [(ngModel)]="formData.fecha">
            </div>
            
            <!-- Categoría -->
            <div class="mb-3">
              <label class="form-label">
                Categoría <span class="text-danger">*</span>
              </label>
              <select class="form-select" [(ngModel)]="formData.categoria">
                <option value="">Seleccione...</option>
                <option value="VIATICOS">Viáticos</option>
                <option value="UTILES_OFICINA">Útiles de Oficina</option>
                <option value="SERVICIOS">Servicios</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="TRANSPORTE">Transporte</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
            
            <!-- Monto -->
            <div class="mb-3">
              <label class="form-label">
                Monto <span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <span class="input-group-text">S/</span>
                <input 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="formData.monto"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  [max]="saldoDisponible">
              </div>
              <small *ngIf="formData.monto > saldoDisponible" class="text-danger">
                El monto excede el saldo disponible
              </small>
            </div>
            
            <!-- Descripción -->
            <div class="mb-3">
              <label class="form-label">
                Descripción <span class="text-danger">*</span>
              </label>
              <textarea 
                class="form-control" 
                rows="3"
                [(ngModel)]="formData.descripcion"
                placeholder="Detalle del gasto"></textarea>
            </div>
            
            <!-- Comprobante -->
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label">Tipo de Comprobante</label>
                <select class="form-select" [(ngModel)]="formData.comprobante_tipo">
                  <option value="">Sin comprobante</option>
                  <option value="BOLETA">Boleta</option>
                  <option value="FACTURA">Factura</option>
                  <option value="RECIBO">Recibo</option>
                  <option value="TICKET">Ticket</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Número</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="formData.comprobante_numero"
                  placeholder="Ej: B001-123">
              </div>
            </div>
            
            <!-- Proveedor -->
            <div class="mb-3">
              <label class="form-label">Proveedor</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="formData.proveedor"
                placeholder="Nombre del proveedor">
            </div>
            
            <!-- Archivo Adjunto -->
            <div class="mb-3">
              <label class="form-label">Archivo Adjunto</label>
              <div 
                class="file-upload"
                [class.has-file]="archivoSeleccionado"
                (click)="fileInput.click()">
                <p class="mb-0 mt-2">
                  {{ archivoSeleccionado ? archivoSeleccionado.name : 'Click para subir archivo' }}
                </p>
                <small class="text-muted">
                  {{ archivoSeleccionado ? 'Click para cambiar' : 'JPG, PNG, PDF (máx. 5MB)' }}
                </small>
              </div>
              <input 
                #fileInput
                type="file" 
                class="d-none"
                accept="image/*,application/pdf"
                (change)="onFileSelected($event)">
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="registrar()" 
                    [disabled]="procesando || !esValido()">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Registrando...' : 'Registrar Gasto' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div *ngIf="visible" class="modal-backdrop fade show"></div>
  `
})
export class GastoModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saldoDisponible = 0;
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onRegistrar = new EventEmitter<{ data: RegistrarGastoDto, archivo?: File }>();
  
  formData: RegistrarGastoDto = {
    fecha: '',
    monto: 0,
    categoria: 'OTROS',
    descripcion: '',
    comprobante_tipo: '',
    comprobante_numero: '',
    proveedor: ''
  };
  
  archivoSeleccionado: File | null = null;
  
  ngOnChanges() {
    if (this.visible) {
      this.formData.fecha = new Date().toISOString().split('T')[0];
    }
  }
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (5MB)
      if (file.size > 5242880) {
        alert('El archivo no debe superar 5MB');
        return;
      }
      this.archivoSeleccionado = file;
    }
  }
  
  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }
  
  registrar() {
    if (!this.esValido()) {
      return;
    }
    this.onRegistrar.emit({
      data: this.formData,
      archivo: this.archivoSeleccionado || undefined
    });
  }
  
  esValido(): boolean {
    return (
      this.formData.fecha !== '' &&
      this.formData.monto > 0 &&
      this.formData.monto <= this.saldoDisponible &&
      this.formData.descripcion.trim() !== ''
    );
  }
  
  resetForm() {
    this.formData = {
      fecha: new Date().toISOString().split('T')[0],
      monto: 0,
      categoria: 'OTROS',
      descripcion: '',
      comprobante_tipo: '',
      comprobante_numero: '',
      proveedor: ''
    };
    this.archivoSeleccionado = null;
  }
}
