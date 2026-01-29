import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CajasService } from '../../../../services/contabilidad/cajas.service';
import { TransaccionModalComponent } from '../../../../components/contabilidad/modals/transaccion-modal.component';
import { CerrarCajaModalComponent } from '../../../../components/contabilidad/modals/cerrar-caja-modal.component';
import {
  Caja,
  MovimientoCaja,
  Transaccion,
  TransaccionesResponse,
  AperturarCajaDto,
  RegistrarTransaccionDto,
  CerrarCajaDto
} from '../../../../models/contabilidad/caja.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-operacion-diaria',
  standalone: true,
  imports: [CommonModule, FormsModule, TransaccionModalComponent, CerrarCajaModalComponent],
  templateUrl: './operacion-diaria.component.html',
  styleUrls: ['./operacion-diaria.component.scss']
})
export class OperacionDiariaComponent implements OnInit {
  caja: Caja | null = null;
  movimiento: MovimientoCaja | null = null;
  transacciones: Transaccion[] = [];
  resumen: any = null;
  
  loading = false;
  procesando = false;
  
  // Modales
  mostrarModalTransaccion = false;
  mostrarModalCerrar = false;
  mostrarModalApertura = false;
  
  // Apertura
  montoInicial = 0;
  observacionesApertura = '';
  
  constructor(
    private cajasService: CajasService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const cajaId = params['caja_id'];
      const accion = params['accion'];
      
      if (cajaId) {
        this.cargarCaja(+cajaId, accion);
      } else {
        this.cargarCajasAbiertas();
      }
    });
  }
  
  cargarCaja(cajaId: number, accion?: string): void {
    this.loading = true;
    
    this.cajasService.ver(cajaId).subscribe({
      next: (caja) => {
        this.caja = caja;
        
        if (caja.movimiento_actual) {
          this.movimiento = caja.movimiento_actual;
          this.cargarTransacciones();
        } else if (accion === 'aperturar') {
          this.mostrarModalApertura = true;
        } else {
          Swal.fire({
            title: 'Caja Cerrada',
            text: '¿Deseas aperturar esta caja?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aperturar',
            cancelButtonText: 'Cancelar'
          }).then((result) => {
            if (result.isConfirmed) {
              this.mostrarModalApertura = true;
            } else {
              this.router.navigate(['/dashboard/contabilidad/cajas']);
            }
          });
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar caja:', error);
        Swal.fire('Error', 'No se pudo cargar la caja', 'error');
        this.router.navigate(['/dashboard/contabilidad/cajas']);
      }
    });
  }
  
  cargarCajasAbiertas(): void {
    this.loading = true;
    
    this.cajasService.obtenerAbiertas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          Swal.fire({
            title: 'No hay cajas abiertas',
            text: 'No hay cajas disponibles para operar',
            icon: 'info'
          }).then(() => {
            this.router.navigate(['/dashboard/contabilidad/cajas']);
          });
        } else if (cajas.length === 1) {
          this.caja = cajas[0];
          this.movimiento = cajas[0].movimiento_actual!;
          this.cargarTransacciones();
        } else {
          this.mostrarSelectorCajas(cajas);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar cajas abiertas:', error);
        Swal.fire('Error', 'No se pudieron cargar las cajas', 'error');
        this.router.navigate(['/dashboard/contabilidad/cajas']);
      }
    });
  }
  
  mostrarSelectorCajas(cajas: Caja[]): void {
    const options: any = {};
    cajas.forEach(c => {
      options[c.id] = `${c.nombre} (${c.codigo})`;
    });
    
    Swal.fire({
      title: 'Selecciona una caja',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Selecciona una caja',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.cargarCaja(+result.value);
      } else {
        this.router.navigate(['/dashboard/contabilidad/cajas']);
      }
    });
  }
  
  cargarTransacciones(): void {
    if (!this.caja) return;
    
    this.cajasService.obtenerTransacciones(this.caja.id).subscribe({
      next: (response: TransaccionesResponse) => {
        this.transacciones = response.transacciones;
        this.resumen = response.resumen;
        this.movimiento = response.movimiento;
      },
      error: (error) => {
        console.error('Error al cargar transacciones:', error);
      }
    });
  }
  
  // ==================== APERTURAR ====================
  
  aperturar(): void {
    if (!this.caja || this.montoInicial < 0) {
      Swal.fire('Error', 'Ingresa un monto inicial válido', 'error');
      return;
    }
    
    this.procesando = true;
    
    const data: AperturarCajaDto = {
      monto_inicial: this.montoInicial,
      observaciones: this.observacionesApertura
    };
    
    this.cajasService.aperturar(this.caja.id, data).subscribe({
      next: (movimiento) => {
        Swal.fire({
          icon: 'success',
          title: 'Caja Aperturada',
          text: 'La caja ha sido aperturada correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalApertura = false;
        this.movimiento = movimiento;
        this.cargarTransacciones();
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al aperturar:', error);
        Swal.fire('Error', error.error?.error || 'Error al aperturar la caja', 'error');
        this.procesando = false;
      }
    });
  }
  
  // ==================== TRANSACCIONES ====================
  
  registrarTransaccion(data: RegistrarTransaccionDto): void {
    if (!this.caja) return;
    
    this.procesando = true;
    
    this.cajasService.registrarTransaccion(this.caja.id, data).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Transacción Registrada',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalTransaccion = false;
        this.cargarTransacciones();
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al registrar transacción:', error);
        Swal.fire('Error', error.error?.error || 'Error al registrar la transacción', 'error');
        this.procesando = false;
      }
    });
  }
  
  anularTransaccion(transaccion: Transaccion): void {
    if (!this.caja) return;
    
    Swal.fire({
      title: '¿Anular transacción?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarAnulacion(transaccion.id);
      }
    });
  }
  
  ejecutarAnulacion(transaccionId: number): void {
    if (!this.caja) return;
    
    this.cajasService.anularTransaccion(this.caja.id, transaccionId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Transacción Anulada',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarTransacciones();
      },
      error: (error) => {
        console.error('Error al anular transacción:', error);
        Swal.fire('Error', error.error?.error || 'Error al anular la transacción', 'error');
      }
    });
  }
  
  // ==================== CERRAR CAJA ====================
  
  cerrarCaja(data: CerrarCajaDto): void {
    if (!this.caja) return;
    
    this.procesando = true;
    
    this.cajasService.cerrar(this.caja.id, data).subscribe({
      next: (resultado) => {
        const diferencia = resultado.diferencia;
        const icono = diferencia === 0 ? 'success' : 'warning';
        
        let mensaje = 'Caja cerrada correctamente';
        if (diferencia !== 0) {
          mensaje += `\n\nDiferencia: S/ ${Math.abs(diferencia).toFixed(2)}`;
          mensaje += diferencia > 0 ? ' (Sobrante)' : ' (Faltante)';
        }
        
        Swal.fire({
          icon: icono,
          title: 'Caja Cerrada',
          text: mensaje
        }).then(() => {
          this.router.navigate(['/dashboard/contabilidad/cajas']);
        });
        
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al cerrar caja:', error);
        Swal.fire('Error', error.error?.error || 'Error al cerrar la caja', 'error');
        this.procesando = false;
      }
    });
  }
  
  // ==================== UTILIDADES ====================
  
  get saldoActual(): number {
    return this.resumen?.saldo_actual || 0;
  }
  
  volver(): void {
    this.router.navigate(['/dashboard/contabilidad/cajas']);
  }
}
