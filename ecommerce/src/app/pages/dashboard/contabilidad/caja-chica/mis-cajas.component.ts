import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../services/auth.service';
import { CajaChicaService } from '../../../../services/contabilidad/caja-chica.service';
import { GastoModalComponent } from '../../../../components/contabilidad/modals/gasto-modal.component';
import { CajaChicaFormModalComponent } from '../../../../components/contabilidad/modals/caja-chica-form-modal.component';
import { CajaChica, RegistrarGastoDto, ReposicionDto } from '../../../../models/contabilidad/caja-chica.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mis-cajas',
  standalone: true,
  imports: [CommonModule, FormsModule, GastoModalComponent, CajaChicaFormModalComponent],
  templateUrl: './mis-cajas.component.html',
  styleUrls: ['./mis-cajas.component.scss']
})
export class MisCajasComponent implements OnInit {
  cajasChicas: CajaChica[] = [];
  usuarios: any[] = [];
  loading = false;
  procesando = false;
  
  // Control de permisos
  puedeCrearCaja = false;
  puedeRegistrarGastos = false;
  
  // Modales
  mostrarModalGasto = false;
  mostrarModalReposicion = false;
  mostrarModalCrear = false;
  cajaSeleccionada: CajaChica | null = null;
  
  // Reposición
  montoReposicion = 0;
  
  constructor(
    private cajaChicaService: CajaChicaService,
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.verificarPermisos();
    this.cargarDatos();
  }
  
  verificarPermisos(): void {
    // Solo Administrador, Gerente y Contador pueden crear cajas chicas
    this.puedeCrearCaja = this.authService.hasPermission('contabilidad.caja_chica.crear');
    
    // Para registrar gastos, también se verifica si es responsable de alguna caja
    this.puedeRegistrarGastos = this.authService.hasPermission('contabilidad.caja_chica.crear');
    
    console.log('🔐 Permisos verificados:', {
      puedeCrearCaja: this.puedeCrearCaja,
      puedeRegistrarGastos: this.puedeRegistrarGastos
    });
  }
  
  cargarDatos(): void {
    this.cargarCajas();
    this.cargarUsuarios();
  }
  
  cargarCajas(): void {
    this.loading = true;
    console.log('🔍 Intentando cargar cajas chicas desde:', `${this.cajaChicaService['apiUrl']}`);
    
    this.cajaChicaService.listar().subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta del servidor:', response);
        // Manejar tanto respuesta directa como wrapped
        const cajas = Array.isArray(response) ? response : (response.data || response.cajas || []);
        console.log('📦 Cajas procesadas:', cajas);
        
        this.cajasChicas = cajas.map((caja: CajaChica) => ({
          ...caja,
          porcentaje_disponible: (caja.saldo_actual / caja.fondo_fijo) * 100
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        console.error('❌ Error body:', error.error);
        
        let mensaje = 'No se pudieron cargar las cajas chicas.';
        
        if (error.status === 0) {
          mensaje += ' El servidor no responde. Verifique que el backend esté ejecutándose.';
          console.error('🔴 ERROR DE BACKEND: El servidor no está disponible en la URL configurada');
        } else if (error.status === 404) {
          mensaje += ' Endpoint no encontrado. Verifique la ruta del API.';
          console.error('🔴 ERROR DE BACKEND: Endpoint /api/contabilidad/caja-chica no existe');
        } else if (error.status === 401) {
          mensaje += ' No autorizado. Verifique su sesión.';
          console.error('🔴 ERROR DE BACKEND: Token de autenticación inválido o expirado');
        } else if (error.status === 403) {
          mensaje += ' No tienes permisos para acceder a este módulo.';
          console.error('🔴 ERROR DE BACKEND: Falta el permiso "contabilidad.caja_chica.ver"');
          console.error('📋 Solución: Asignar permisos al usuario en el backend Laravel');
        } else if (error.status === 500) {
          mensaje += ' Error interno del servidor.';
          console.error('🔴 ERROR DE BACKEND: Error 500 en el servidor');
        } else {
          mensaje += ` Error ${error.status}: ${error.error?.message || error.message}`;
        }
        
        Swal.fire('Error', mensaje, 'error');
        this.loading = false;
      }
    });
  }
  
  abrirModalGasto(caja: CajaChica): void {
    // Verificar si puede registrar gastos
    if (!this.puedeRegistrarGastos) {
      Swal.fire({
        icon: 'warning',
        title: 'Acceso Denegado',
        text: 'No tienes permisos para registrar gastos en esta caja chica'
      });
      return;
    }
    
    this.cajaSeleccionada = caja;
    this.mostrarModalGasto = true;
  }
  
  registrarGasto(event: { data: RegistrarGastoDto, archivo?: File }): void {
    if (!this.cajaSeleccionada) return;
    
    this.procesando = true;
    
    // Crear FormData para enviar archivo
    const formData = new FormData();
    formData.append('fecha', event.data.fecha);
    formData.append('monto', event.data.monto.toString());
    formData.append('categoria', event.data.categoria);
    formData.append('descripcion', event.data.descripcion);
    
    if (event.data.comprobante_tipo) {
      formData.append('comprobante_tipo', event.data.comprobante_tipo);
    }
    if (event.data.comprobante_numero) {
      formData.append('comprobante_numero', event.data.comprobante_numero);
    }
    if (event.data.proveedor) {
      formData.append('proveedor', event.data.proveedor);
    }
    if (event.archivo) {
      formData.append('archivo_adjunto', event.archivo);
    }
    
    this.cajaChicaService.registrarGasto(this.cajaSeleccionada.id, formData).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Gasto Registrado',
          text: 'El gasto ha sido registrado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalGasto = false;
        this.cargarCajas();
        this.procesando = false;
      },
      error: (error: any) => {
        console.error('Error al registrar gasto:', error);
        Swal.fire('Error', error.error?.error || 'Error al registrar el gasto', 'error');
        this.procesando = false;
      }
    });
  }
  
  abrirModalReposicion(caja: CajaChica): void {
    this.cajaSeleccionada = caja;
    this.montoReposicion = caja.fondo_fijo - caja.saldo_actual;
    this.mostrarModalReposicion = true;
  }
  
  registrarReposicion(): void {
    if (!this.cajaSeleccionada || this.montoReposicion <= 0) {
      Swal.fire('Error', 'Ingrese un monto válido', 'error');
      return;
    }
    
    this.procesando = true;
    const data: ReposicionDto = { monto: this.montoReposicion };
    
    this.cajaChicaService.reposicion(this.cajaSeleccionada.id, data).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Reposición Registrada',
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalReposicion = false;
        this.cargarCajas();
        this.procesando = false;
      },
      error: (error: any) => {
        console.error('Error al registrar reposición:', error);
        Swal.fire('Error', error.error?.error || 'Error al registrar la reposición', 'error');
        this.procesando = false;
      }
    });
  }
  
  verRendicion(caja: CajaChica): void {
    // Navegar a vista de rendición o mostrar modal
    Swal.fire('Próximamente', 'La rendición estará disponible pronto', 'info');
  }
  
  cargarUsuarios(): void {
    // Cargar lista de usuarios para asignar como responsables
    this.http.get<any>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (response: any) => {
        this.usuarios = Array.isArray(response) ? response : (response.data || response.usuarios || []);
        console.log('👥 Usuarios cargados:', this.usuarios);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        // Si no tiene permisos para ver usuarios, mostrar mensaje informativo
        if (error.status === 403) {
          console.warn('⚠️ No tienes permisos para ver la lista de usuarios. Contacta al administrador.');
        }
        // Continuar sin usuarios, el modal mostrará un mensaje
        this.usuarios = [];
      }
    });
  }
  
  abrirModalCrear(): void {
    // Verificar permisos antes de abrir el modal
    if (!this.puedeCrearCaja) {
      Swal.fire({
        icon: 'warning',
        title: 'Acceso Denegado',
        text: 'Solo Administradores, Gerentes y Contadores pueden crear cajas chicas'
      });
      return;
    }
    
    this.mostrarModalCrear = true;
  }
  
  crearCajaChica(data: any): void {
    this.procesando = true;
    
    this.cajaChicaService.crear(data).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Caja chica creada correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        this.mostrarModalCrear = false;
        this.cargarCajas();
        this.procesando = false;
      },
      error: (error) => {
        console.error('Error al crear caja chica:', error);
        const mensaje = error.error?.error || 'Error al crear la caja chica';
        Swal.fire('Error', mensaje, 'error');
        this.procesando = false;
      }
    });
  }
  
  getColorPorcentaje(porcentaje: number): string {
    if (porcentaje >= 60) return 'success';
    if (porcentaje >= 30) return 'warning';
    return 'danger';
  }
}
