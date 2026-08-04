import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { ClienteService } from '../../services/cliente.service';
import { TiposPrecioService, TipoPrecio } from '../../services/tipos-precio.service';
import { UbigeoService, Departamento, Provincia, Distrito } from '../../services/ubigeo.service';
import { Cliente } from '../../models/cliente.model';
import { environment } from '../../../environments/environment';

type Tab = 'informacion' | 'direccion' | 'avanzado';

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
        style="margin: 0 auto !important; max-width: 800px; width: 100%; height: 620px;">
        <div class="modal-content" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">

          <!-- ===================== PASO 1: BUSCAR CLIENTE EN NOVIK ===================== -->
          <ng-container *ngIf="mostrandoBusqueda && pasoVinculacion === 'busqueda'">
            <div class="modal-header" style="flex-shrink:0;">
              <h5 class="modal-title">
                <span class="badge rounded-circle me-2" style="background:#dc3545; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; font-size:15px;">1</span>
                Buscar cliente en Novik
              </h5>
              <button type="button" class="btn-close" (click)="cerrarBusqueda()"></button>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; min-height:0;">
              <p class="text-muted mb-3" style="flex-shrink:0;">Busca por RUC, razón social o código de cliente</p>

              <div class="input-group mb-3" style="max-width: 100%; flex-shrink:0;">
                <span class="input-group-text"><i class="ph ph-magnifying-glass"></i></span>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Buscar por RUC, razón social o código..."
                  [(ngModel)]="busquedaQuery"
                  [ngModelOptions]="{standalone: true}"
                  (ngModelChange)="onBusquedaChange($event)"
                >
              </div>

              <div *ngIf="buscandoErp" class="text-center py-3" style="flex-shrink:0;">
                <span class="spinner-border spinner-border-sm"></span>
              </div>

              <div style="flex:1; overflow-y:auto; min-height:0;" (scroll)="onScrollResultados($event)">
                <div class="text-muted small mb-2">Resultados encontrados</div>

                <div *ngIf="!buscandoErp && resultadosBusqueda.length === 0" class="text-muted small py-3">
                  No se encontraron clientes en Novik con ese criterio.
                </div>

                <div *ngFor="let r of resultadosBusqueda" class="d-flex align-items-center justify-content-between border rounded-8 p-2 mb-2">
                  <div class="d-flex align-items-center gap-8">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style="width: 36px; height: 36px; background: rgba(111,66,193,0.12); flex-shrink:0;">
                      <i class="ph ph-buildings" style="color:#6f42c1;"></i>
                    </span>
                    <div>
                      <div class="fw-semibold">{{ r.nombre }}</div>
                      <div class="text-muted small">RUC: {{ r.dni_ruc }}</div>
                      <div class="text-muted small">Código: {{ r.codigo }}</div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm" (click)="seleccionarClienteErp(r)">
                    Seleccionar
                  </button>
                </div>

                <div *ngIf="cargandoMas" class="text-center py-2">
                  <span class="spinner-border spinner-border-sm"></span>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="flex-shrink:0;">
              <button type="button" class="btn btn-secondary" (click)="cerrarBusqueda()">
                Cancelar
              </button>
            </div>
          </ng-container>

          <!-- ===================== PASO 2: CONFIRMAR VINCULACIÓN ===================== -->
          <ng-container *ngIf="mostrandoBusqueda && pasoVinculacion === 'confirmar' && clienteErpSeleccionado">
            <div class="modal-header" style="flex-shrink:0;">
              <h5 class="modal-title">
                <span class="badge rounded-circle me-2" style="background:#dc3545; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; font-size:15px;">2</span>
                Verificar los datos antes de vincular
              </h5>
              <button type="button" class="btn-close" (click)="cerrarBusqueda()"></button>
            </div>
            <div class="modal-body" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; justify-content:center;">
              <div class="row g-3">
                <div class="col-6">
                  <div class="border rounded-12 p-4 h-100">
                    <div class="text-muted mb-3" style="font-size:15px; font-weight:600;">Usuario registrado</div>
                    <div class="d-flex align-items-center gap-12 mb-3">
                      <span class="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold"
                        style="width: 52px; height: 52px; background: rgba(111,66,193,0.15); color:#6f42c1; flex-shrink:0; font-size:18px;">
                        {{ inicialesUsuario() }}
                      </span>
                      <div class="fw-semibold" style="font-size:17px;">{{ formulario.get('nombre')?.value }}</div>
                    </div>
                    <div class="text-muted mb-1">DNI: {{ formulario.get('numero_documento')?.value || '-' }}</div>
                    <div class="text-muted mb-1">{{ formulario.get('email')?.value || '-' }}</div>
                    <div class="text-muted">{{ formulario.get('telefono')?.value || '-' }}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded-12 p-4 h-100">
                    <div class="text-muted mb-3" style="font-size:15px; font-weight:600;">Cliente en Novik</div>
                    <div class="d-flex align-items-center gap-12 mb-3">
                      <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                        style="width: 52px; height: 52px; background: rgba(111,66,193,0.15); flex-shrink:0;">
                        <i class="ph ph-buildings" style="color:#6f42c1; font-size:22px;"></i>
                      </span>
                      <div class="fw-semibold" style="font-size:17px;">{{ clienteErpSeleccionado.nombre }}</div>
                    </div>
                    <div class="text-muted mb-1">RUC: {{ clienteErpSeleccionado.dni_ruc }}</div>
                    <div class="text-muted">Código: {{ clienteErpSeleccionado.codigo }}</div>
                  </div>
                </div>
              </div>

              <div class="alert alert-info d-flex align-items-start gap-8 mt-4 mb-0" style="font-size:15px;">
                <i class="ph ph-info mt-1"></i>
                <div>Al vincular, este usuario podrá acceder a todos los beneficios y datos asociados a este cliente.</div>
              </div>

              <div *ngIf="mostrarCampoPassword" class="mt-4">
                <label class="form-label">Ingresa tu contraseña de administrador para confirmar</label>
                <input
                  type="password"
                  name="password_vinculacion_admin"
                  autocomplete="new-password"
                  class="form-control form-control-lg"
                  [(ngModel)]="passwordVinculacion"
                  [ngModelOptions]="{standalone: true}"
                  placeholder="Contraseña"
                  (keydown.enter)="ejecutarVinculacion()"
                >
              </div>

              <div *ngIf="errorVinculacion" class="alert alert-danger d-flex align-items-start gap-8 mt-3 mb-0" style="font-size:15px;">
                <i class="ph ph-warning-circle mt-1"></i>
                <div>{{ errorVinculacion }}</div>
              </div>
            </div>
            <div class="modal-footer" style="flex-shrink:0;">
              <button type="button" class="btn btn-secondary" (click)="cerrarBusqueda()" [disabled]="vinculando">
                Cancelar
              </button>
              <button *ngIf="!mostrarCampoPassword" type="button" class="btn btn-danger" (click)="pedirPassword()">
                Confirmar vinculación
              </button>
              <button *ngIf="mostrarCampoPassword" type="button" class="btn btn-danger" (click)="ejecutarVinculacion()" [disabled]="vinculando || !passwordVinculacion">
                <span *ngIf="vinculando" class="spinner-border spinner-border-sm me-2"></span>
                {{ vinculando ? 'Vinculando...' : 'Vincular' }}
              </button>
            </div>
          </ng-container>

          <!-- ===================== PASO 3: VINCULACIÓN EXITOSA ===================== -->
          <ng-container *ngIf="mostrandoBusqueda && pasoVinculacion === 'exito' && clienteErpSeleccionado">
            <div class="modal-body text-center" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
                style="width: 100px; height: 100px; background: rgba(25,135,84,0.12);">
                <i class="ph ph-check-circle" style="font-size: 56px; color:#198754;"></i>
              </div>
              <h4 class="fw-bold mb-4">¡Vinculación realizada!</h4>
              <p class="text-muted mb-2" style="font-size:17px;">
                {{ formulario.get('nombre')?.value }} ahora está vinculada a
              </p>
              <p class="fw-bold mb-3" style="font-size:19px;">{{ clienteErpSeleccionado.nombre }}</p>
              <p class="text-muted mb-4" style="font-size:16px;">Código: {{ clienteErpSeleccionado.codigo }}</p>
              <p class="text-muted small mb-0">El usuario queda vinculado correctamente.</p>
            </div>
            <div class="modal-footer" style="flex-shrink:0;">
              <button type="button" class="btn btn-danger w-100" (click)="finalizarVinculacion()">
                Listo
              </button>
            </div>
          </ng-container>

          <!-- ===================== FORMULARIO DE EDICIÓN ===================== -->
          <ng-container *ngIf="!mostrandoBusqueda">
          <div class="modal-header" style="flex-shrink:0;">
            <h5 class="modal-title">
              <i class="ph ph-user me-2"></i>
              {{ cliente?.id_cliente ? 'Editar Cliente' : 'Nuevo Cliente' }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>

          <!-- Pestañas -->
          <ul class="nav nav-tabs px-3 pt-2" style="flex-shrink:0;">
            <li class="nav-item">
              <button type="button" class="nav-link" [class.active]="tab === 'informacion'" (click)="tab = 'informacion'">
                Información
              </button>
            </li>
            <li class="nav-item">
              <button type="button" class="nav-link" [class.active]="tab === 'direccion'" (click)="tab = 'direccion'">
                Dirección
              </button>
            </li>
            <li class="nav-item">
              <button type="button" class="nav-link" [class.active]="tab === 'avanzado'" (click)="tab = 'avanzado'">
                Avanzado
              </button>
            </li>
          </ul>

          <form [formGroup]="formulario" (ngSubmit)="guardar()" style="flex:1; display:flex; flex-direction:column; overflow:hidden; min-height:0;">
            <div class="modal-body" style="flex:1; overflow-y:auto;">

              <!-- ===================== TAB: INFORMACIÓN ===================== -->
              <div class="row" *ngIf="tab === 'informacion'">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Tipo Documento <span class="text-danger">*</span></label>
                  <select class="form-select" formControlName="tipo_documento_id">
                    <option [ngValue]="null">Sin Documento</option>
                    <option value="1">DNI</option>
                    <option value="6">RUC</option>
                    <option value="4">Carnet Ext.</option>
                    <option value="7">Pasaporte</option>
                  </select>
                </div>

                <div class="col-md-8 mb-3">
                  <label class="form-label">Número Documento</label>
                  <input type="text" class="form-control" formControlName="numero_documento" placeholder="Número de documento">
                </div>

                <div class="col-12 mb-3 d-flex align-items-center gap-16">
                  <div class="flex-grow-1">
                    <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" formControlName="nombre" placeholder="Nombre completo o razón social">
                    <div *ngIf="formulario.get('nombre')?.invalid && formulario.get('nombre')?.touched" class="text-danger small">
                      El nombre es requerido
                    </div>
                  </div>
                  <div class="form-check form-switch mt-32">
                    <input class="form-check-input" type="checkbox" role="switch" id="estadoSwitch" formControlName="estado">
                    <label class="form-check-label" for="estadoSwitch">Estado</label>
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label">Correo Electrónico</label>
                  <input type="email" class="form-control" formControlName="email" placeholder="correo@ejemplo.com" readonly>
                  <div *ngIf="formulario.get('email')?.invalid && formulario.get('email')?.touched" class="text-danger small">
                    <div *ngIf="formulario.get('email')?.errors?.['email']">Ingrese un email válido</div>
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label">Teléfono</label>
                  <input type="tel" class="form-control" formControlName="telefono" placeholder="987654321">
                </div>
              </div>

              <!-- ===================== TAB: DIRECCIÓN ===================== -->
              <div *ngIf="tab === 'direccion'" formArrayName="direcciones">
                <div *ngFor="let dirGroup of direcciones.controls; let i = index" [formGroupName]="i"
                  class="border rounded-12 p-3 mb-3">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="fw-semibold">Dirección {{ i + 1 }}</div>
                    <div class="d-flex align-items-center gap-12">
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" role="switch"
                          [id]="'predeterminada' + i" formControlName="predeterminada"
                          (change)="onPredeterminadaChange(i)">
                        <label class="form-check-label small" [for]="'predeterminada' + i">Predeterminada</label>
                      </div>
                      <i class="ph ph-trash text-danger" style="cursor:pointer;" (click)="eliminarDireccion(i)"></i>
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Departamento</label>
                      <select class="form-select" formControlName="departamento_id" (change)="onDepartamentoChangeDireccion(i)">
                        <option [ngValue]="null">Selecciona el Departamento</option>
                        <option *ngFor="let d of departamentos" [ngValue]="d.id">{{ d.nombre }}</option>
                      </select>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Provincia</label>
                      <select class="form-select" formControlName="provincia_id" (change)="onProvinciaChangeDireccion(i)"
                        [disabled]="!dirGroup.get('departamento_id')?.value">
                        <option [ngValue]="null">Selecciona la Provincia</option>
                        <option *ngFor="let p of (provinciasPorDireccion[i] || [])" [ngValue]="p.id">{{ p.nombre }}</option>
                      </select>
                    </div>

                    <div class="col-md-6 mb-3">
                      <label class="form-label">Distrito</label>
                      <select class="form-select" formControlName="distrito_id" (change)="onDistritoChangeDireccion(i)"
                        [disabled]="!dirGroup.get('provincia_id')?.value">
                        <option [ngValue]="null">Selecciona el Distrito</option>
                        <option *ngFor="let d of (distritosPorDireccion[i] || [])" [ngValue]="d.id">{{ d.nombre }}</option>
                      </select>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Urbanización</label>
                      <input type="text" class="form-control" formControlName="urbanizacion" placeholder="Urbanización">
                    </div>

                    <div class="col-12 mb-3">
                      <label class="form-label">Calle y Número</label>
                      <input type="text" class="form-control" formControlName="calle_numero" placeholder="Calle y Número">
                    </div>

                    <div class="col-12 mb-1">
                      <label class="form-label">Indicaciones</label>
                      <textarea class="form-control" formControlName="indicaciones" rows="2" placeholder="Indicaciones para la dirección"></textarea>
                    </div>
                  </div>
                </div>

                <button type="button" class="btn btn-secondary w-100" (click)="agregarDireccion()">
                  <i class="ph ph-plus me-1"></i>
                  Agregar Dirección
                </button>
              </div>

              <!-- ===================== TAB: AVANZADO ===================== -->
              <div class="row" *ngIf="tab === 'avanzado'">
                <div class="col-12 mb-3">
                  <label class="form-label">Cliente Novik vinculado</label>

                  <div *ngIf="cargandoClienteVinculado" class="text-muted small">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Cargando datos del cliente en Novik...
                  </div>

                  <div *ngIf="!cargandoClienteVinculado && clienteErpVinculado"
                    class="border rounded-12 p-3 d-flex align-items-center gap-12">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style="width: 48px; height: 48px; background: rgba(111,66,193,0.12); flex-shrink:0;">
                      <i class="ph ph-buildings" style="color:#6f42c1; font-size:22px;"></i>
                    </span>
                    <div class="flex-grow-1">
                      <div class="fw-semibold" style="font-size:16px;">{{ clienteErpVinculado.nombre }}</div>
                      <div class="text-muted small">
                        {{ clienteErpVinculado.tipo === 'e' ? 'RUC' : 'DNI' }}: {{ clienteErpVinculado.dni_ruc }}
                        · Código: {{ clienteErpVinculado.codigo }}
                      </div>
                    </div>

                    <!-- Menú de 3 puntos: modificar / eliminar vinculación -->
                    <div class="position-relative" (click)="$event.stopPropagation()">
                      <button type="button" class="btn btn-light btn-sm rounded-circle"
                        style="width:32px; height:32px; padding:0;"
                        (click)="toggleMenuVinculacion($event)">
                        <i class="ph ph-dots-three-vertical"></i>
                      </button>

                      <div *ngIf="mostrarMenuVinculacion"
                        class="border rounded-8 bg-white shadow-sm position-absolute"
                        style="right:0; top:calc(100% + 4px); z-index:10; min-width:200px; overflow:hidden;">
                        <button type="button"
                          class="btn btn-light w-100 text-start rounded-0 py-2 px-3"
                          (click)="abrirBusqueda(); mostrarMenuVinculacion = false">
                          <i class="ph ph-pencil-simple me-2"></i>
                          Modificar vinculación
                        </button>
                        <button type="button"
                          class="btn btn-light w-100 text-start rounded-0 py-2 px-3 text-danger"
                          (click)="abrirEliminarVinculacion()">
                          <i class="ph ph-link-break me-2"></i>
                          Eliminar vinculación
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="!cargandoClienteVinculado && !clienteErpVinculado"
                    class="border rounded-12 p-3 d-flex align-items-center gap-12">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style="width: 48px; height: 48px; background: rgba(108,117,125,0.12); flex-shrink:0;">
                      <i class="ph ph-buildings" style="color:#6c757d; font-size:22px;"></i>
                    </span>
                    <div class="text-muted small">
                      Este cliente aún no está vinculado a ningún cliente de Novik.
                    </div>
                  </div>
                </div>

                <!-- Confirmar eliminación de vinculación (pide contraseña de admin) -->
                <div class="col-12 mb-3" *ngIf="mostrandoEliminarVinculacion">
                  <div class="alert alert-warning mb-0">
                    <div class="mb-2">
                      Ingresa tu contraseña de administrador para quitar la vinculación con
                      <strong>{{ clienteErpVinculado?.nombre }}</strong>.
                    </div>
                    <input
                      type="password"
                      name="password_eliminar_vinculacion"
                      autocomplete="new-password"
                      class="form-control mb-2"
                      [(ngModel)]="passwordEliminarVinculacion"
                      [ngModelOptions]="{standalone: true}"
                      placeholder="Contraseña"
                      (keydown.enter)="confirmarEliminarVinculacion()"
                    >
                    <div *ngIf="errorEliminarVinculacion" class="text-danger small mb-2">{{ errorEliminarVinculacion }}</div>
                    <div class="d-flex gap-8">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarEliminarVinculacion()" [disabled]="eliminandoVinculacion">
                        Cancelar
                      </button>
                      <button type="button" class="btn btn-danger btn-sm" (click)="confirmarEliminarVinculacion()" [disabled]="eliminandoVinculacion || !passwordEliminarVinculacion">
                        <span *ngIf="eliminandoVinculacion" class="spinner-border spinner-border-sm me-1"></span>
                        Confirmar eliminación
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Sin vincular: solo el botón "Vincular" -->
                <div class="col-12 mb-3 d-flex justify-content-center" *ngIf="!cargandoClienteVinculado && !clienteErpVinculado">
                  <button type="button" class="btn btn-primary py-2 px-5" (click)="abrirBusqueda()">
                    Vincular
                  </button>
                </div>

                <!-- Ya vinculado: listas de precio por moneda -->
                <ng-container *ngIf="clienteErpVinculado">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Tipo de precio (PEN)</label>
                    <select class="form-select" formControlName="tipo_precio_id">
                      <option [ngValue]="null">— Usar predeterminada —</option>
                      <option *ngFor="let tp of tiposPrecioPen" [ngValue]="tp.id">{{ tp.nombre }}</option>
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Tipo de precio (USD)</label>
                    <select class="form-select" formControlName="tipo_precio_id_usd">
                      <option [ngValue]="null">— Usar predeterminada —</option>
                      <option *ngFor="let tp of tiposPrecioUsd" [ngValue]="tp.id">{{ tp.nombre }}</option>
                    </select>
                  </div>
                </ng-container>
              </div>
            </div>

            <div class="modal-footer" style="flex-shrink:0;">
              <button type="button" class="btn btn-secondary" (click)="cerrar.emit()" [disabled]="guardando">
                <i class="ph ph-x me-1"></i>
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="formulario.invalid || formulario.pristine || guardando">
                <i *ngIf="!guardando" class="ph ph-check me-1"></i>
                <span *ngIf="guardando" class="spinner-border spinner-border-sm me-2"></span>
                {{ guardando ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
          </ng-container>
        </div>
      </div>
    </div>
  `
})

export class ClienteEditModalComponent implements OnInit {
  @Input() cliente: Cliente | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() clienteActualizado = new EventEmitter<Cliente>();

  tab: Tab = 'informacion';

  formulario!: FormGroup;
  guardando = false;
  tiposPrecio: TipoPrecio[] = [];
  codigoErpEstado: 'valido' | 'invalido' | 'verificando' | null = null;
  codigoErpNombre = '';

  departamentos: Departamento[] = [];
  // Opciones de provincia/distrito y el id_ubigeo final elegido, uno por
  // cada tarjeta de dirección (mismo índice que el FormArray "direcciones").
  provinciasPorDireccion: Provincia[][] = [];
  distritosPorDireccion: Distrito[][] = [];
  private idUbigeoPorDireccion: (string | null)[] = [];

  get direcciones(): FormArray {
    return this.formulario.get('direcciones') as FormArray;
  }

  // ============================================
  // "Vincular" — paso "Buscar cliente en Novik"
  // ============================================
  mostrandoBusqueda = false;
  pasoVinculacion: 'busqueda' | 'confirmar' | 'exito' = 'busqueda';
  busquedaQuery = '';
  buscandoErp = false;
  cargandoMas = false;
  hayMasResultados = false;
  private offsetActual = 0;
  resultadosBusqueda: Array<{ codigo: string; nombre: string; dni_ruc: string; tipo: string }> = [];
  private busqueda$ = new Subject<string>();

  // Paso "Confirmar vinculación"
  clienteErpSeleccionado: { codigo: string; nombre: string; dni_ruc: string; tipo: string } | null = null;
  mostrarCampoPassword = false;
  passwordVinculacion = '';
  errorVinculacion = '';
  vinculando = false;

  // Datos del cliente Novik ya vinculado (pestaña Avanzado)
  clienteErpVinculado: { codigo: string; nombre: string; dni_ruc: string; tipo: string } | null = null;
  cargandoClienteVinculado = false;

  // Menú de 3 puntos: modificar / eliminar vinculación
  mostrarMenuVinculacion = false;
  mostrandoEliminarVinculacion = false;
  passwordEliminarVinculacion = '';
  errorEliminarVinculacion = '';
  eliminandoVinculacion = false;

  get tiposPrecioPen(): TipoPrecio[] {
    return this.tiposPrecio.filter(tp => tp.tipo_moneda === 's' && tp.categoria === 'vinculado');
  }

  get tiposPrecioUsd(): TipoPrecio[] {
    return this.tiposPrecio.filter(tp => tp.tipo_moneda === 'd' && tp.categoria === 'vinculado');
  }

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private tiposPrecioService: TiposPrecioService,
    private ubigeoService: UbigeoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();

    this.ubigeoService.getDepartamentos().subscribe({
      next: (res) => { this.departamentos = res; },
      error: () => {},
    });

    this.tiposPrecioService.listar().subscribe({
      next: (res) => { this.tiposPrecio = (res.tipos_precio || []).filter(t => t.activo); },
      error: () => {}
    });

    // Búsqueda nueva (tipear o abrir el paso): reemplaza la lista y arranca
    // la paginación desde cero.
    this.busqueda$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        this.buscandoErp = true;
        this.offsetActual = 0;
        return this.clienteService.buscarEnErp(q.trim(), 0);
      })
    ).subscribe({
      next: (res) => {
        this.buscandoErp = false;
        if (res) {
          this.resultadosBusqueda = res.clientes || [];
          this.hayMasResultados = !!res.hay_mas;
          this.offsetActual = this.resultadosBusqueda.length;
        }
      },
      error: () => {
        this.buscandoErp = false;
        this.resultadosBusqueda = [];
        this.hayMasResultados = false;
      },
    });

    // Validar el código contra el ERP a medida que el admin escribe
    // (con debounce, sin bloquear el guardado si aún no verificó).
    this.formulario.get('codigo_erp')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(valor => {
        const codigo = (valor || '').trim().toUpperCase();
        if (!codigo) {
          this.codigoErpEstado = null;
          return of(null);
        }
        this.codigoErpEstado = 'verificando';
        return this.http.get<{ existe: boolean; nombre?: string }>(
          `${environment.erpApiUrl}/ecommerce/clientes/validar-codigo`,
          { params: { codigo } }
        );
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        this.codigoErpEstado = res.existe ? 'valido' : 'invalido';
        this.codigoErpNombre = res.nombre || '';
      },
      error: () => {
        this.codigoErpEstado = null;
      }
    });

    // Si es un cliente existente, traer el detalle completo (direcciones,
    // tipo_documento_id, etc.) porque la lista no trae todos esos campos.
    if (this.cliente?.id_cliente) {
      this.clienteService.getCliente(this.cliente.id_cliente).subscribe({
        next: (res) => {
          const detalle: any = res?.data?.cliente;
          if (!detalle) return;

          this.formulario.patchValue({
            tipo_documento_id: detalle.tipo_documento?.id ?? null,
            tipo_precio_id: detalle.tipo_precio_id ?? null,
            tipo_precio_id_usd: detalle.tipo_precio_id_usd ?? null,
          });

          const direccionesExistentes = detalle.direcciones || [];
          if (direccionesExistentes.length > 0) {
            direccionesExistentes.forEach((d: any) => this.agregarDireccion(d));
          } else {
            this.agregarDireccion();
          }
        },
        error: () => {},
      });
    } else {
      // Cliente nuevo: arrancar con una tarjeta de dirección vacía.
      this.agregarDireccion();
    }

    this.cargarClienteVinculado();
  }

  /** Trae del ERP Novik los datos (nombre, dni/ruc, tipo) del cliente ya
   * vinculado a este cliente e-commerce, para mostrarlos en Avanzado. */
  private cargarClienteVinculado(): void {
    const codigo = (this.cliente?.codigo_erp || '').trim();
    if (!codigo) {
      this.clienteErpVinculado = null;
      return;
    }
    this.cargandoClienteVinculado = true;
    this.clienteService.buscarEnErp(codigo, 0).subscribe({
      next: (res) => {
        this.cargandoClienteVinculado = false;
        this.clienteErpVinculado = (res.clientes || []).find(c => c.codigo === codigo) || null;
      },
      error: () => {
        this.cargandoClienteVinculado = false;
        this.clienteErpVinculado = null;
      },
    });
  }

  /** Agrega una tarjeta de dirección al FormArray; si viene `existente`
   * (de un cliente ya guardado), precarga y resuelve su departamento/
   * provincia/distrito a partir del id_ubigeo guardado. */
  agregarDireccion(existente?: any): void {
    const grupo = this.fb.group({
      id: [existente?.id ?? null],
      departamento_id: [null],
      provincia_id: [null],
      distrito_id: [null],
      urbanizacion: [existente?.urbanizacion ?? ''],
      calle_numero: [existente?.calle_numero ?? ''],
      indicaciones: [existente?.referencia ?? ''],
      predeterminada: [!!existente?.predeterminada],
    });

    this.direcciones.push(grupo);
    const index = this.direcciones.length - 1;
    this.provinciasPorDireccion[index] = [];
    this.distritosPorDireccion[index] = [];
    this.idUbigeoPorDireccion[index] = existente?.id_ubigeo != null ? String(existente.id_ubigeo) : null;

    if (existente?.id_ubigeo) {
      this.ubigeoService.getUbigeoChain(existente.id_ubigeo).subscribe({
        next: (res) => {
          const chain = res?.data;
          if (!chain) return;

          grupo.patchValue({ departamento_id: chain.departamento.id }, { emitEvent: false });

          // Provincias y distritos solo dependen de los IDs que ya trajo la
          // cadena de arriba, así que van en paralelo en vez de uno esperando
          // al otro (evita 2 round-trips secuenciales innecesarios).
          forkJoin({
            provincias: this.ubigeoService.getProvincias(chain.departamento.id),
            distritos: this.ubigeoService.getDistritos(chain.departamento.id, chain.provincia.id),
          }).subscribe(({ provincias, distritos }) => {
            this.provinciasPorDireccion[index] = provincias;
            this.distritosPorDireccion[index] = distritos;
            grupo.patchValue({
              provincia_id: chain.provincia.id,
              distrito_id: chain.distrito.id,
            }, { emitEvent: false });
          });
        },
        error: () => {},
      });
    }
  }

  eliminarDireccion(i: number): void {
    this.direcciones.removeAt(i);
    this.provinciasPorDireccion.splice(i, 1);
    this.distritosPorDireccion.splice(i, 1);
    this.idUbigeoPorDireccion.splice(i, 1);
  }

  /** Solo una dirección puede quedar marcada como predeterminada a la vez. */
  onPredeterminadaChange(i: number): void {
    if (!this.direcciones.at(i).get('predeterminada')?.value) return;
    this.direcciones.controls.forEach((grupo, idx) => {
      if (idx !== i) grupo.get('predeterminada')?.setValue(false, { emitEvent: false });
    });
  }

  onDepartamentoChangeDireccion(i: number): void {
    const grupo = this.direcciones.at(i);
    this.provinciasPorDireccion[i] = [];
    this.distritosPorDireccion[i] = [];
    this.idUbigeoPorDireccion[i] = null;
    grupo.patchValue({ provincia_id: null, distrito_id: null });

    const departamentoId = grupo.get('departamento_id')?.value;
    if (!departamentoId) return;
    this.ubigeoService.getProvincias(departamentoId).subscribe(res => this.provinciasPorDireccion[i] = res);
  }

  onProvinciaChangeDireccion(i: number): void {
    const grupo = this.direcciones.at(i);
    this.distritosPorDireccion[i] = [];
    this.idUbigeoPorDireccion[i] = null;
    grupo.patchValue({ distrito_id: null });

    const departamentoId = grupo.get('departamento_id')?.value;
    const provinciaId = grupo.get('provincia_id')?.value;
    if (!departamentoId || !provinciaId) return;
    this.ubigeoService.getDistritos(departamentoId, provinciaId).subscribe(res => this.distritosPorDireccion[i] = res);
  }

  onDistritoChangeDireccion(i: number): void {
    const grupo = this.direcciones.at(i);
    const distritoId = grupo.get('distrito_id')?.value;
    const distrito = (this.distritosPorDireccion[i] || []).find(d => d.id === distritoId);
    this.idUbigeoPorDireccion[i] = distrito?.id_ubigeo != null ? String(distrito.id_ubigeo) : null;
  }

  // ============================================
  // "Vincular" — paso "Buscar cliente en Novik"
  // ============================================
  abrirBusqueda(): void {
    this.busquedaQuery = '';
    this.resultadosBusqueda = [];
    this.pasoVinculacion = 'busqueda';
    this.clienteErpSeleccionado = null;
    this.mostrandoBusqueda = true;
    // Cargar el listado completo de clientes de Novik de una vez.
    this.busqueda$.next('');
  }

  cerrarBusqueda(): void {
    this.mostrandoBusqueda = false;
    this.mostrarCampoPassword = false;
    this.passwordVinculacion = '';
    this.errorVinculacion = '';
  }

  onBusquedaChange(q: string): void {
    this.busqueda$.next(q);
  }

  /** Se dispara al hacer scroll en la lista de resultados; si ya casi llega
   * al final y todavía hay más clientes en Novik, trae la siguiente página. */
  onScrollResultados(event: Event): void {
    const el = event.target as HTMLElement;
    const cercaDelFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (cercaDelFinal) this.cargarMas();
  }

  private cargarMas(): void {
    if (this.cargandoMas || this.buscandoErp || !this.hayMasResultados) return;

    this.cargandoMas = true;
    this.clienteService.buscarEnErp(this.busquedaQuery.trim(), this.offsetActual).subscribe({
      next: (res) => {
        this.cargandoMas = false;
        this.resultadosBusqueda = [...this.resultadosBusqueda, ...(res.clientes || [])];
        this.hayMasResultados = !!res.hay_mas;
        this.offsetActual = this.resultadosBusqueda.length;
      },
      error: () => {
        this.cargandoMas = false;
      },
    });
  }

  seleccionarClienteErp(r: { codigo: string; nombre: string; dni_ruc: string; tipo: string }): void {
    this.clienteErpSeleccionado = r;
    this.mostrarCampoPassword = false;
    this.passwordVinculacion = '';
    this.errorVinculacion = '';
    this.pasoVinculacion = 'confirmar';
  }

  inicialesUsuario(): string {
    const nombre = (this.formulario?.get('nombre')?.value || '').trim();
    if (!nombre) return '?';
    const partes = nombre.split(/\s+/);
    const primera = partes[0]?.[0] || '';
    const segunda = partes[1]?.[0] || '';
    return (primera + segunda).toUpperCase();
  }

  pedirPassword(): void {
    this.errorVinculacion = '';
    this.passwordVinculacion = '';
    this.mostrarCampoPassword = true;
  }

  ejecutarVinculacion(): void {
    if (!this.cliente?.id_cliente || !this.clienteErpSeleccionado || !this.passwordVinculacion) return;

    this.vinculando = true;
    this.errorVinculacion = '';
    this.clienteService.vincular(
      this.cliente.id_cliente,
      this.clienteErpSeleccionado.codigo,
      this.passwordVinculacion
    ).subscribe({
      next: (res) => {
        this.vinculando = false;
        if (res.status === 'success') {
          this.formulario.patchValue({ codigo_erp: res.data?.codigo_erp || this.clienteErpSeleccionado?.codigo });
          this.clienteErpVinculado = this.clienteErpSeleccionado;
          this.pasoVinculacion = 'exito';
        } else {
          this.errorVinculacion = res.message || 'No se pudo completar la vinculación.';
        }
      },
      error: (err) => {
        this.vinculando = false;
        this.errorVinculacion = err?.error?.message || 'No se pudo completar la vinculación.';
      },
    });
  }

  finalizarVinculacion(): void {
    this.cerrarBusqueda();
    if (this.clienteErpSeleccionado) {
      // Refleja el vínculo hecho en el objeto emitido al padre al guardar,
      // por si el admin cierra el modal sin tocar "Guardar".
      this.clienteActualizado.emit({
        ...(this.cliente as Cliente),
        codigo_erp: this.clienteErpSeleccionado.codigo,
      });
    }
  }

  private inicializarFormulario(): void {
    // Obtener nombre completo desde diferentes fuentes
    const nombreCompleto = (this.cliente as any)?.nombre ||
                          `${this.cliente?.nombres || ''} ${this.cliente?.apellidos || ''}`.trim();

    this.formulario = this.fb.group({
      tipo_documento_id: [(this.cliente as any)?.tipo_documento_id ?? null],
      numero_documento: [this.cliente?.numero_documento || ''],
      nombre: [nombreCompleto, Validators.required],
      estado: [this.cliente?.estado ?? true],
      email: [this.cliente?.email || '', [Validators.email]],
      telefono: [this.cliente?.telefono || ''],

      direcciones: this.fb.array([]),

      tipo_precio_id: [(this.cliente as any)?.tipo_precio_id ?? null],
      tipo_precio_id_usd: [(this.cliente as any)?.tipo_precio_id_usd ?? null],
      codigo_erp: [this.cliente?.codigo_erp || '']
    });
  }

  guardar(): void {
    if (this.formulario.invalid) return;

    this.guardando = true;
    const valores = this.formulario.value;
    const datosFormulario: any = {
      tipo_documento_id: valores.tipo_documento_id,
      numero_documento: valores.numero_documento,
      nombre: valores.nombre,
      estado: valores.estado,
      email: valores.email,
      telefono: valores.telefono,
      tipo_precio_id: valores.tipo_precio_id,
      tipo_precio_id_usd: valores.tipo_precio_id_usd,
      codigo_erp: valores.codigo_erp,
      direcciones: (valores.direcciones || []).map((d: any, i: number) => ({
        id: d.id,
        id_ubigeo: this.idUbigeoPorDireccion[i],
        calle_numero: d.calle_numero,
        urbanizacion: d.urbanizacion,
        indicaciones: d.indicaciones,
        predeterminada: d.predeterminada,
      })),
    };

    if (datosFormulario.codigo_erp) {
      datosFormulario.codigo_erp = String(datosFormulario.codigo_erp).trim().toUpperCase();
    } else {
      datosFormulario.codigo_erp = null;
    }

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

  @HostListener('document:click')
  onDocumentClick(): void {
    this.mostrarMenuVinculacion = false;
  }

  // ============================================
  // Menú de 3 puntos: modificar / eliminar vinculación
  // ============================================
  toggleMenuVinculacion(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarMenuVinculacion = !this.mostrarMenuVinculacion;
  }

  abrirEliminarVinculacion(): void {
    this.mostrarMenuVinculacion = false;
    this.mostrandoEliminarVinculacion = true;
    this.passwordEliminarVinculacion = '';
    this.errorEliminarVinculacion = '';
  }

  cancelarEliminarVinculacion(): void {
    this.mostrandoEliminarVinculacion = false;
    this.passwordEliminarVinculacion = '';
    this.errorEliminarVinculacion = '';
  }

  confirmarEliminarVinculacion(): void {
    if (!this.cliente?.id_cliente || !this.passwordEliminarVinculacion) return;

    this.eliminandoVinculacion = true;
    this.errorEliminarVinculacion = '';
    this.clienteService.desvincular(this.cliente.id_cliente, this.passwordEliminarVinculacion).subscribe({
      next: (res) => {
        this.eliminandoVinculacion = false;
        if (res.status === 'success') {
          this.formulario.patchValue({ codigo_erp: '' });
          this.clienteErpVinculado = null;
          this.cancelarEliminarVinculacion();
        } else {
          this.errorEliminarVinculacion = res.message || 'No se pudo quitar la vinculación.';
        }
      },
      error: (err) => {
        this.eliminandoVinculacion = false;
        this.errorEliminarVinculacion = err?.error?.message || 'No se pudo quitar la vinculación.';
      },
    });
  }

}
