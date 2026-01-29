import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CajasService } from '../../../../services/contabilidad/cajas.service';
import { CajaFormModalComponent } from '../../../../components/contabilidad/modals/caja-form-modal.component';
import { Caja, Tienda, CrearCajaDto, ActualizarCajaDto } from '../../../../models/contabilidad/caja.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cajas-dashboard',
  standalone: true,
  imports: [CommonModule, CajaFormModalComponent],
  templateUrl: './cajas-dashboard.component.html',
  styleUrls: ['./cajas-dashboard.component.scss']
})
export class CajasDashboardComponent implements OnInit {
  cajas: Caja[] = [];
  tiendas: Tienda[] = [];
  loading = false;
  procesando = false;

  // Modales
  mostrarModalCaja = false;
  cajaEditando: Caja | null = null;

  // Métricas
  get cajasAbiertas(): number {
    return this.cajas.filter(c => c.movimiento_actual).length;
  }

  get cajasCerradas(): number {
    return this.cajas.filter(c => !c.movimiento_actual).length;
  }

  get totalIngresos(): number {
    return this.cajas
      .filter(c => c.movimiento_actual)
      .reduce((sum, c) => sum + (c.movimiento_actual?.total_ingresos || 0), 0);
  }

  get totalEgresos(): number {
    return this.cajas
      .filter(c => c.movimiento_actual)
      .reduce((sum, c) => sum + (c.movimiento_actual?.total_egresos || 0), 0);
  }

  constructor(
    private cajasService: CajasService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;

    // Cargar cajas
    this.cajasService.listar().subscribe({
      next: (response: any) => {
        // Manejar respuesta directa o wrapped
        this.cajas = Array.isArray(response) ? response : (response.data || response.cajas || []);

        // 🔍 DEBUG: Ver estructura de datos
        console.log('📦 Cajas recibidas:', this.cajas);
        if (this.cajas.length > 0) {
          console.log('📦 Primera caja:', this.cajas[0]);
          if (this.cajas[0].movimiento_actual) {
            console.log('📦 Movimiento actual:', this.cajas[0].movimiento_actual);
          }
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar cajas:', error);
        Swal.fire('Error', 'No se pudieron cargar las cajas. Verifique la conexión con el servidor.', 'error');
        this.loading = false;
      }
    });

    // Cargar tiendas
    this.cajasService.obtenerTiendas().subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta de tiendas:', response);
        this.tiendas = Array.isArray(response) ? response : (response.data || response.tiendas || []);
        console.log('🏪 Tiendas cargadas:', this.tiendas);

        if (this.tiendas.length === 0) {
          console.warn('⚠️ No hay tiendas disponibles');
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar tiendas:', error);
        // Mostrar error si no hay tiendas
        Swal.fire({
          icon: 'warning',
          title: 'Sin tiendas',
          text: 'No se pudieron cargar las tiendas. Verifique que existan tiendas en el sistema.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  // ==================== CRUD CAJAS ====================

  abrirModalCrear(): void {
    console.log('🆕 Abriendo modal crear caja');
    console.log('🏪 Tiendas disponibles:', this.tiendas);

    if (this.tiendas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin tiendas',
        text: 'Debe crear al menos una tienda antes de crear una caja.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.cajaEditando = null;
    this.mostrarModalCaja = true;
  }

  abrirModalEditar(caja: Caja): void {
    this.cajaEditando = caja;
    this.mostrarModalCaja = true;
  }

  guardarCaja(data: CrearCajaDto): void {
    this.procesando = true;

    const request = this.cajaEditando
      ? this.cajasService.actualizar(this.cajaEditando.id, data as ActualizarCajaDto)
      : this.cajasService.crear(data);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: `Caja ${this.cajaEditando ? 'actualizada' : 'creada'} correctamente`,
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalCaja = false;
        this.cargarDatos();
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al guardar caja:', error);
        const mensaje = error.error?.error || 'Error al guardar la caja';
        Swal.fire('Error', mensaje, 'error');
        this.procesando = false;
      }
    });
  }

  // ==================== OPERACIONES ====================

  aperturarCaja(caja: Caja): void {
    this.router.navigate(['/dashboard/contabilidad/cajas/operacion'], {
      queryParams: { caja_id: caja.id, accion: 'aperturar' }
    });
  }

  operarCaja(caja: Caja): void {
    this.router.navigate(['/dashboard/contabilidad/cajas/operacion'], {
      queryParams: { caja_id: caja.id }
    });
  }

  verDetalle(caja: Caja): void {
    this.cajasService.ver(caja.id).subscribe({
      next: (detalle) => {
        this.mostrarDetalleCaja(detalle);
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        Swal.fire('Error', 'No se pudo cargar el detalle', 'error');
      }
    });
  }

  mostrarDetalleCaja(caja: Caja): void {
    const estado = caja.movimiento_actual ? 'ABIERTA' : 'CERRADA';
    const estadoClass = caja.movimiento_actual ? 'success' : 'secondary';

    let html = `
      <div class="text-start">
        <div class="mb-3">
          <strong>Código:</strong> ${caja.codigo}<br>
          <strong>Nombre:</strong> ${caja.nombre}<br>
          <strong>Tienda:</strong> ${caja.tienda?.nombre || 'Sin asignar'}<br>
          <strong>Estado:</strong> <span class="badge bg-${estadoClass}">${estado}</span>
        </div>
    `;

    if (caja.movimiento_actual) {
      const mov = caja.movimiento_actual;
      const montoInicial = typeof mov.monto_inicial === 'number' ? mov.monto_inicial : parseFloat(mov.monto_inicial || '0');
      const saldoActual = this.obtenerSaldoActual(caja);
      const totalIngresos = mov.total_ingresos || 0;
      const totalEgresos = mov.total_egresos || 0;

      html += `
        <hr>
        <h6>Movimiento Actual</h6>
        <strong>Fecha:</strong> ${mov.fecha}<br>
        <strong>Monto Inicial:</strong> S/ ${montoInicial.toFixed(2)}<br>
        <strong>Total Ingresos:</strong> <span class="text-success">S/ ${totalIngresos.toFixed(2)}</span><br>
        <strong>Total Egresos:</strong> <span class="text-danger">S/ ${totalEgresos.toFixed(2)}</span><br>
        <strong>Saldo Actual:</strong> <span class="fw-bold">S/ ${saldoActual.toFixed(2)}</span>
      `;

      if (mov.estado === 'CERRADA' && mov.monto_final !== undefined) {
        const diferencia = mov.diferencia || 0;
        const diferenciaClass = diferencia === 0 ? 'text-success' : (diferencia > 0 ? 'text-success' : 'text-danger');

        html += `
          <hr>
          <h6>Información de Cierre</h6>
          <strong>Monto Final:</strong> S/ ${mov.monto_final.toFixed(2)}<br>
          <strong>Monto Sistema:</strong> S/ ${(mov.monto_sistema || 0).toFixed(2)}<br>
          <strong>Diferencia:</strong> <span class="${diferenciaClass}">S/ ${diferencia.toFixed(2)}</span>
        `;
      }
    } else {
      html += `
        <hr>
        <p class="text-muted mb-0">
          <i class="ph ph-info me-2"></i>
          La caja está cerrada. No hay movimiento activo.
        </p>
      `;
    }

    html += '</div>';

    Swal.fire({
      title: 'Detalle de Caja',
      html: html,
      width: '600px',
      showCloseButton: true,
      showConfirmButton: false
    });
  }

  estaAbierta(caja: Caja): boolean {
    return !!caja.movimiento_actual;
  }

  obtenerSaldoActual(caja: Caja): number {
    if (!caja.movimiento_actual) return 0;

    const mov = caja.movimiento_actual;

    // Si tiene saldo_actual, usarlo
    if (mov.saldo_actual !== undefined && mov.saldo_actual !== null) {
      return mov.saldo_actual;
    }

    // Si no, calcularlo: monto_inicial + ingresos - egresos
    const montoInicial = mov.monto_inicial || 0;
    const ingresos = mov.total_ingresos || 0;
    const egresos = mov.total_egresos || 0;

    return montoInicial + ingresos - egresos;
  }
}
