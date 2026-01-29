import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ph ph-pencil me-2"></i>
              Editar Cliente
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>
          
          <form [formGroup]="formulario" (ngSubmit)="guardar()">
            <div class="modal-body">
              <div class="row">
                <!-- Nombres -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Nombres <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" formControlName="nombres" placeholder="Nombres del cliente">
                  <div *ngIf="formulario.get('nombres')?.invalid && formulario.get('nombres')?.touched" class="text-danger small">
                    Los nombres son requeridos
                  </div>
                </div>

                <!-- Apellidos -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Apellidos <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" formControlName="apellidos" placeholder="Apellidos del cliente">
                  <div *ngIf="formulario.get('apellidos')?.invalid && formulario.get('apellidos')?.touched" class="text-danger small">
                    Los apellidos son requeridos
                  </div>
                </div>

                <!-- Email -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Correo Electrónico <span class="text-danger">*</span></label>
                  <input type="email" class="form-control" formControlName="email" placeholder="correo@ejemplo.com">
                  <div *ngIf="formulario.get('email')?.invalid && formulario.get('email')?.touched" class="text-danger small">
                    <div *ngIf="formulario.get('email')?.errors?.['required']">El email es requerido</div>
                    <div *ngIf="formulario.get('email')?.errors?.['email']">Ingrese un email válido</div>
                  </div>
                </div>

                <!-- Teléfono -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Teléfono</label>
                  <input type="tel" class="form-control" formControlName="telefono" placeholder="987654321">
                </div>

                <!-- Fecha de Nacimiento -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Fecha de Nacimiento</label>
                  <input type="date" class="form-control" formControlName="fecha_nacimiento">
                </div>

                <!-- Género -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Género</label>
                  <select class="form-select" formControlName="genero">
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <!-- Estado -->
                <div class="col-12 mb-3">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" formControlName="estado" id="estado">
                    <label class="form-check-label" for="estado">
                      Cliente activo
                    </label>
                  </div>
                </div>

                <!-- Información adicional (solo lectura) -->
                <div class="col-12">
                  <div class="row">
                    <div class="col-md-4">
                      <strong>Documento:</strong><br>
                      <span class="text-muted">{{ cliente?.tipo_documento?.nombre }} {{ cliente?.numero_documento }}</span>
                    </div>
                    <div class="col-md-4">
                      <strong>Tipo de Login:</strong><br>
                      <span class="badge" [class]="getTipoLoginClass(cliente?.tipo_login || '')">
                        {{ getTipoLoginText(cliente?.tipo_login || '') }}
                      </span>
                    </div>
                    <div class="col-md-4">
                      <strong>Fecha de Registro:</strong><br>
                      <span class="text-muted">{{ formatDate(cliente?.fecha_registro || '') }}</span>
                    </div>
                  </div>
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
                {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
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
      this.formulario = this.fb.group({
        nombres: [this.cliente?.nombres || '', Validators.required],
        apellidos: [this.cliente?.apellidos || '', Validators.required],
        email: [this.cliente?.email || '', [Validators.required, Validators.email]],
        telefono: [this.cliente?.telefono || ''],
        fecha_nacimiento: [this.cliente?.fecha_nacimiento || ''],
        genero: [this.cliente?.genero || ''],
        estado: [this.cliente?.estado ?? true]
      });
    }

    guardar(): void {
    if (this.formulario.invalid || !this.cliente) return;

    this.guardando = true;
    const datosActualizados = {
      ...this.cliente,
      ...this.formulario.value
    };

    this.clienteService.updateCliente(this.cliente.id_cliente, this.formulario.value)
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.clienteActualizado.emit(datosActualizados);
          }
          this.guardando = false;
        },
        error: (error) => {
          console.error('Error al actualizar cliente:', error);
          this.guardando = false;
        }
      });
  }

  getTipoLoginClass(tipo: string): string {
    const classes = {
      'manual': 'bg-primary',
      'google': 'bg-danger',
      'facebook': 'bg-info'
    };
    return classes[tipo as keyof typeof classes] || 'bg-secondary';
  }

  getTipoLoginText(tipo: string): string {
    const texts = {
      'manual': 'Manual',
      'google': 'Google',
      'facebook': 'Facebook'
    };
    return texts[tipo as keyof typeof texts] || tipo;
  }

  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

}
