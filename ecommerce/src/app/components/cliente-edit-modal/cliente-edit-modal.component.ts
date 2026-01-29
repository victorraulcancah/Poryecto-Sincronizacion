import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1" 
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; 
             width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; 
             justify-content: center !important; background-color: rgba(0,0,0,0.6) !important; z-index: 99999 !important; 
             padding: 20px !important; margin: 0 !important;" 
      (click)="cerrar.emit()">
      <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()" 
        style="margin: 0 auto !important; max-width: 800px; width: 100%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ph ph-user me-2"></i>
              {{ cliente?.id_cliente ? 'Editar Cliente' : 'Nuevo Cliente' }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>
          
          <form [formGroup]="formulario" (ngSubmit)="guardar()">
            <div class="modal-body">
              <div class="row">
                <!-- Tipo de Documento -->
                <div class="col-md-4 mb-3">
                  <label class="form-label">Tipo Documento <span class="text-danger">*</span></label>
                  <select class="form-select" formControlName="tipo_documento">
                    <option value="0">Sin Documento</option>
                    <option value="1">DNI</option>
                    <option value="6">RUC</option>
                    <option value="4">Carnet Ext.</option>
                    <option value="7">Pasaporte</option>
                  </select>
                </div>

                <!-- Número de Documento -->
                <div class="col-md-8 mb-3">
                  <label class="form-label">Número Documento</label>
                  <input type="text" class="form-control" formControlName="numero_documento" placeholder="Número de documento">
                </div>

                <!-- Nombre Completo o Razón Social -->
                <div class="col-12 mb-3">
                  <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" formControlName="nombre" placeholder="Nombre completo o razón social">
                  <div *ngIf="formulario.get('nombre')?.invalid && formulario.get('nombre')?.touched" class="text-danger small">
                    El nombre es requerido
                  </div>
                </div>

                <!-- Dirección -->
                <div class="col-12 mb-3">
                  <label class="form-label">Dirección</label>
                  <input type="text" class="form-control" formControlName="direccion" placeholder="Dirección fiscal o domicilio">
                </div>

                <!-- Email -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Correo Electrónico</label>
                  <input type="email" class="form-control" formControlName="email" placeholder="correo@ejemplo.com">
                  <div *ngIf="formulario.get('email')?.invalid && formulario.get('email')?.touched" class="text-danger small">
                    <div *ngIf="formulario.get('email')?.errors?.['email']">Ingrese un email válido</div>
                  </div>
                </div>

                <!-- Teléfono -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Teléfono</label>
                  <input type="tel" class="form-control" formControlName="telefono" placeholder="987654321">
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cerrar.emit()" [disabled]="guardando">
                <i class="ph ph-x me-1"></i>
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="formulario.invalid || guardando">
                <i *ngIf="!guardando" class="ph ph-check me-1"></i>
                <span *ngIf="guardando" class="spinner-border spinner-border-sm me-2"></span>
                {{ guardando ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})

export class ClienteEditModalComponent implements OnInit {
  @Input() cliente: Cliente | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() clienteActualizado = new EventEmitter<Cliente>();

  formulario!: FormGroup;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService
  ) {}
    ngOnInit(): void {
      this.inicializarFormulario();
    }

    private inicializarFormulario(): void {
      // Obtener nombre completo desde diferentes fuentes
      const nombreCompleto = (this.cliente as any)?.nombre || 
                            `${this.cliente?.nombres || ''} ${this.cliente?.apellidos || ''}`.trim();
      
      // Obtener dirección desde diferentes fuentes
      const direccion = (this.cliente as any)?.direccion || 
                       this.cliente?.direccion_principal?.direccion_completa || 
                       '';

      this.formulario = this.fb.group({
        tipo_documento: [(this.cliente as any)?.tipo_documento || this.cliente?.tipo_documento_id || '1'],
        numero_documento: [this.cliente?.numero_documento || ''],
        nombre: [nombreCompleto, Validators.required],
        direccion: [direccion],
        email: [this.cliente?.email || '', [Validators.email]],
        telefono: [this.cliente?.telefono || '']
      });
    }

    guardar(): void {
    if (this.formulario.invalid) return;

    this.guardando = true;
    const datosFormulario = this.formulario.value;

    // Si es un cliente nuevo (sin ID), emitir directamente los datos
    if (!this.cliente || !this.cliente.id_cliente) {
      this.guardando = false;
      this.clienteActualizado.emit(datosFormulario);
      return;
    }

    // Si es un cliente existente, actualizar en el servidor
    this.clienteService.updateCliente(this.cliente.id_cliente, datosFormulario)
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response.status === 'success') {
            this.clienteActualizado.emit({
              ...this.cliente,
              ...datosFormulario
            });
          }
        },
        error: (error) => {
          console.error('Error al actualizar cliente:', error);
          this.guardando = false;
        }
      });
  }

  // ============================================
  // ATAJOS DE TECLADO
  // ============================================
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.cerrar.emit();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    
    event.preventDefault();
    if (!this.formulario.invalid && !this.guardando) {
      this.guardar();
    }
  }

  @HostListener('document:keydown.control.s', ['$event'])
  onCtrlS(event: KeyboardEvent): void {
    event.preventDefault();
    if (!this.formulario.invalid && !this.guardando) {
      this.guardar();
    }
  }

}
