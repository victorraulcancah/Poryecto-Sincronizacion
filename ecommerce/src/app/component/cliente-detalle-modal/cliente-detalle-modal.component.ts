import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteDetalle } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-detalle-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ph ph-eye me-2"></i>
              Cliente: {{ clienteDetalle?.cliente?.nombre_completo }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>
          
          <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
            <div *ngIf="cargando" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2">Cargando detalles del cliente...</p>
            </div>

            <div *ngIf="!cargando && clienteDetalle" class="row">
              <!-- Información Principal -->
              <div class="col-md-4 mb-4">
                <div class="card h-100">
                  <div class="card-body text-center">
                    <div class="mb-3">
                      <div *ngIf="!clienteDetalle.cliente.foto" class="user-avatar mx-auto mb-2" 
                           style="width: 80px; height: 80px; font-size: 2rem;">
                        {{ getInitials(clienteDetalle.cliente.nombre_completo || '') }}
                      </div>
                      <img *ngIf="clienteDetalle.cliente.foto" 
                           [src]="clienteDetalle.cliente.foto" 
                           class="rounded-circle mb-2" 
                           style="width: 80px; height: 80px; object-fit: cover;">
                    </div>
                    <h5>{{ clienteDetalle.cliente.nombre_completo }}</h5>
                    <p class="text-muted">{{ clienteDetalle.cliente.tipo_documento?.nombre }} {{ clienteDetalle.cliente.numero_documento }}</p>
                    <p class="text-muted">{{ clienteDetalle.cliente.genero === 'M' ? 'Masculino' : clienteDetalle.cliente.genero === 'F' ? 'Femenino' : 'Otro' }}</p>
                    <p class="text-muted">{{ formatDate(clienteDetalle.cliente.fecha_nacimiento || '') }}</p>
                  </div>
                </div>
              </div>

              <!-- Información de Contacto -->
              <div class="col-md-8 mb-4">
                <div class="card h-100">
                  <div class="card-body">
                    <div class="row">
                      <div class="col-6 mb-3">
                        <strong><i class="ph ph-envelope me-2"></i>Email:</strong><br>
                        <span>{{ clienteDetalle.cliente.email }}</span>
                      </div>
                      <div class="col-6 mb-3">
                        <strong><i class="ph ph-phone me-2"></i>Teléfono:</strong><br>
                        <span>{{ clienteDetalle.cliente.telefono || 'No registrado' }}</span>
                      </div>
                      <div class="col-6 mb-3">
                        <strong><i class="ph ph-lock me-2"></i>Tipo de login:</strong><br>
                        <span class="badge" [class]="getTipoLoginClass(clienteDetalle.cliente.tipo_login)">
                          {{ getTipoLoginText(clienteDetalle.cliente.tipo_login) }}
                        </span>
                      </div>
                      <div class="col-6 mb-3">
                        <strong><i class="ph ph-calendar me-2"></i>Fecha registro:</strong><br>
                        <span>{{ formatDate(clienteDetalle.cliente.fecha_registro) }}</span>
                      </div>
                      <div class="col-6 mb-3">
                        <strong><i class="ph ph-info me-2"></i>Estado:</strong><br>
                        <span class="badge" [class]="clienteDetalle.cliente.estado ? 'bg-success' : 'bg-danger'">
                          {{ clienteDetalle.cliente.estado ? '✅ Activo' : '❌ Inactivo' }}
                        </span>
                      </div>
                      <div class="col-6 mb-3">
                        <button class="btn btn-sm btn-outline-primary" (click)="mostrarModalMensaje = true">
                          <i class="ph ph-envelope me-1"></i>
                          Enviar Mensaje
                        </button>
                        <button class="btn btn-sm btn-outline-warning ms-2" (click)="toggleEstado()">
                          <i class="ph ph-lock me-1"></i>
                          {{ clienteDetalle.cliente.estado ? 'Bloquear' : 'Desbloquear' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Direcciones Registradas -->
              <div class="col-12 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="ph ph-map-pin me-2"></i>📬 Direcciones Registradas</h6>
                  </div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table class="table table-sm">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Nombre destinatario</th>
                            <th>Dirección</th>
                            <th>Predet.</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let direccion of clienteDetalle.cliente.direcciones; let i = index">
                            <td>{{ i + 1 }}</td>
                            <td>{{ direccion.nombre_destinatario }}</td>
                            <td>{{ direccion.direccion_completa }}</td>
                            <td>
                              <span *ngIf="direccion.predeterminada" class="badge bg-success">✅ Sí</span>
                              <span *ngIf="!direccion.predeterminada" class="badge bg-secondary">❌ No</span>
                            </td>
                          </tr>
                          <tr *ngIf="!clienteDetalle.cliente.direcciones?.length">
                            <td colspan="4" class="text-center text-muted">No hay direcciones registradas</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="mt-2">
                      <button class="btn btn-sm btn-outline-secondary me-2">
                        <i class="ph ph-pencil me-1"></i>Editar dirección
                      </button>
                      <button class="btn btn-sm btn-outline-primary">
                        <i class="ph ph-plus me-1"></i>Nueva dirección
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Historial de Pedidos -->
              <div class="col-12 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="ph ph-shopping-cart me-2"></i>📦 Historial de Pedidos</h6>
                  </div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table class="table table-sm">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Monto</th>
                            <th>Pago</th>
                            <th>Ver</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let pedido of clienteDetalle.pedidos">
                            <td>{{ pedido.id }}</td>
                            <td>{{ formatDate(pedido.fecha) }}</td>
                            <td>
                              <span class="badge" [class]="getEstadoPedidoClass(pedido.estado)">
                                {{ pedido.estado }}
                              </span>
                            </td>
                            <td>S/ {{ pedido.monto.toFixed(2) }}</td>
                            <td>{{ pedido.metodo_pago }}</td>
                            <td>
                              <button class="btn btn-sm btn-outline-primary">
                                <i class="ph ph-eye"></i> Ver pedido
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Cupones Usados -->
              <div class="col-12 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="ph ph-ticket me-2"></i>🧾 Cupones Usados</h6>
                  </div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table class="table table-sm">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Descuento</th>
                            <th>Fecha uso</th>
                            <th>Pedido ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let cupon of clienteDetalle.cupones">
                            <td><code>{{ cupon.codigo }}</code></td>
                            <td>{{ cupon.descuento }}</td>
                            <td>{{ formatDate(cupon.fecha_uso) }}</td>
                            <td>{{ cupon.pedido_id }}</td>
                          </tr>
                          <tr *ngIf="!clienteDetalle.cupones?.length">
                            <td colspan="4" class="text-center text-muted">No ha usado cupones</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Estadísticas del Cliente -->
              <div class="col-12 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="ph ph-chart-bar me-2"></i>📈 Estadísticas del Cliente</h6>
                  </div>
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-3 mb-3">
                        <div class="text-center">
                          <h4 class="text-primary">S/ {{ clienteDetalle.estadisticas.total_gastado.toFixed(2) }}</h4>
                          <small class="text-muted">Total gastado</small>
                        </div>
                      </div>
                      <div class="col-md-3 mb-3">
                        <div class="text-center">
                          <h4 class="text-success">{{ clienteDetalle.estadisticas.total_pedidos }}</h4>
                          <small class="text-muted">Total pedidos</small>
                        </div>
                      </div>
                      <div class="col-md-3 mb-3">
                        <div class="text-center">
                          <h4 class="text-info">{{ formatDate(clienteDetalle.estadisticas.ultima_compra) }}</h4>
                          <small class="text-muted">Última compra</small>
                        </div>
                      </div>
                      <div class="col-md-3 mb-3">
                        <div class="text-center">
                          <h4 class="text-warning">{{ clienteDetalle.estadisticas.porcentaje_entregados }}%</h4>
                          <small class="text-muted">Entregados</small>
                        </div>
                      </div>
                    </div>
                    <div class="mt-3">
                      <strong>Productos favoritos:</strong>
                      <span *ngFor="let producto of clienteDetalle.estadisticas.productos_favoritos; let last = last">
                        {{ producto }}<span *ngIf="!last">, </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar.emit()">
              <i class="ph ph-arrow-left me-1"></i>
              Volver a listado
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para enviar mensaje -->
    <div *ngIf="mostrarModalMensaje" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5); z-index: 1060;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ph ph-envelope me-2"></i>
              Enviar mensaje o notificación al cliente
            </h5>
            <button type="button" class="btn-close" (click)="mostrarModalMensaje = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Asunto:</label>
              <input type="text" class="form-control" [(ngModel)]="mensaje.asunto" placeholder="Ingrese el asunto">
            </div>
            <div class="mb-3">
              <label class="form-label">Mensaje:</label>
              <textarea class="form-control" rows="4" [(ngModel)]="mensaje.contenido" placeholder="Escriba su mensaje aquí..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="mostrarModalMensaje = false">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="enviarMensaje()">
              <i class="ph ph-paper-plane me-1"></i>
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    
    .card {
      border: 1px solid #e9ecef;
      border-radius: 8px;
    }
    
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      padding: 0.75rem 1rem;
    }
    
    .badge {
      font-size: 0.75rem;
    }
    
    .table th {
      border-top: none;
      font-weight: 600;
      color: #495057;
      font-size: 0.875rem;
    }
    
    .table td {
      font-size: 0.875rem;
      vertical-align: middle;
    }
    
    .modal-xl {
      max-width: 1200px;
    }
  `]
})
export class ClienteDetalleModalComponent implements OnInit {
  @Input() clienteId: number | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() clienteActualizado = new EventEmitter<void>();

  clienteDetalle: ClienteDetalle | null = null;
  cargando = false;
  mostrarModalMensaje = false;

  mensaje = {
    asunto: '',
    contenido: ''
  };

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    if (this.clienteId) {
      this.cargarDetalleCliente();
    }
  }

  private cargarDetalleCliente(): void {
    if (!this.clienteId) return;

    this.cargando = true;
    this.clienteService.getClienteDetalle(this.clienteId).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.clienteDetalle = response.data;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle del cliente:', error);
        this.cargando = false;
      }
    });
  }

  getInitials(nombre: string): string {
    if (!nombre) return '';
    const names = nombre.split(' ');
    return names.map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
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

  getEstadoPedidoClass(estado: string): string {
    const classes = {
      'Entregado': 'bg-success',
      'Cancelado': 'bg-danger',
      'Pendiente': 'bg-warning',
      'Procesando': 'bg-info'
    };
    return classes[estado as keyof typeof classes] || 'bg-secondary';
  }

  formatDate(fecha: string): string {
    if (!fecha) return 'No registrado';
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  toggleEstado(): void {
    if (!this.clienteDetalle) return;
    
    this.clienteService.toggleEstadoCliente(this.clienteDetalle.cliente.id_cliente).subscribe({
      next: (response) => {
        if (response.status === 'success' && this.clienteDetalle) {
          this.clienteDetalle.cliente.estado = !this.clienteDetalle.cliente.estado;
          // this.clienteActualizado.emit(this.clienteDetalle.cliente); // 🔕 comentado temporalmente

        }
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
      }
    });
  }

  enviarMensaje(): void {
    if (!this.mensaje.asunto || !this.mensaje.contenido) {
      alert('Por favor complete todos los campos');
      return;
    }

    // Aquí iría la lógica para enviar el mensaje
    console.log('Enviando mensaje:', this.mensaje);
    alert('Mensaje enviado correctamente (funcionalidad pendiente)');
    
    this.mensaje = { asunto: '', contenido: '' };
    this.mostrarModalMensaje = false;
  }
}