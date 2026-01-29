import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Caja, Tienda, CrearCajaDto } from '../../../models/contabilidad/caja.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-caja-form-modal',
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
    .form-label {
      font-weight: 500;
      margin-bottom: var(--size-8);
      color: hsl(var(--neutral-700));
    }
    .form-control:focus, .form-select:focus {
      border-color: hsl(var(--main-600));
      box-shadow: 0 0 0 0.25rem hsla(var(--main-600), 0.25);
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" 
         [style.display]="visible ? 'block' : 'none'" 
         tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              {{ caja ? 'Editar Caja' : 'Nueva Caja' }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">
                Nombre <span class="text-danger">*</span>
              </label>
              <div class="position-relative">
                <i class="ph ph-cash-register position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  style="padding-left: 40px;"
                  [(ngModel)]="formData.nombre"
                  placeholder="Ej: Caja Principal"
                  maxlength="100">
              </div>
              <small class="text-muted">El código se generará automáticamente</small>
            </div>
            
            <div class="mb-3">
              <label class="form-label">
                Tienda <span class="text-danger">*</span>
              </label>
              <div class="position-relative">
                <i class="ph ph-storefront position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); z-index: 10;"></i>
                <select class="form-select" style="padding-left: 40px;" [(ngModel)]="formData.tienda_id" required>
                  <option [value]="''">Seleccione una tienda</option>
                  <option *ngFor="let tienda of tiendas" [value]="tienda.id">
                    {{ tienda.nombre }}
                  </option>
                </select>
              </div>
              <small class="text-muted" *ngIf="tiendas.length === 0">
                No hay tiendas disponibles. Por favor, cree una tienda primero.
              </small>
              <small class="text-muted" *ngIf="tiendas.length > 0">
                {{ tiendas.length }} tienda(s) disponible(s)
              </small>
            </div>
            
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                [(ngModel)]="formData.activo"
                id="checkActivo">
              <label class="form-check-label" for="checkActivo">
                <i class="ph ph-check-circle me-1"></i>
                Caja activa
              </label>
              <div class="form-text">La caja estará disponible para operaciones</div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="guardar()" [disabled]="procesando || !formData.nombre.trim() || !formData.tienda_id || formData.tienda_id === ''">
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
export class CajaFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() caja: Caja | null = null;
  @Input() tiendas: Tienda[] = [];
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onGuardar = new EventEmitter<CrearCajaDto>();

  formData: any = {
    nombre: '',
    tienda_id: '',
    activo: true
  };

  ngOnChanges() {
    if (this.caja) {
      this.formData = {
        nombre: this.caja.nombre,
        tienda_id: this.caja.tienda_id?.toString() || '',
        activo: this.caja.activo
      };
    } else {
      this.formData = {
        nombre: '',
        tienda_id: '',
        activo: true
      };
    }

    // Log para depuración
    console.log('📋 Tiendas disponibles:', this.tiendas);
    console.log('📝 FormData:', this.formData);
  }

  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  guardar() {
    // Validar campos
    if (!this.formData.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor ingrese el nombre de la caja'
      });
      return;
    }

    if (!this.formData.tienda_id || this.formData.tienda_id === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor seleccione una tienda'
      });
      return;
    }

    // Preparar el DTO según la especificación
    const dataToSend: CrearCajaDto = {
      nombre: this.formData.nombre.trim(),
      tienda_id: Number(this.formData.tienda_id),
      activo: this.formData.activo
    };

    console.log('📤 Enviando datos de caja:', dataToSend);
    this.onGuardar.emit(dataToSend);
  }
}
