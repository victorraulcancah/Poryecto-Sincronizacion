import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HorariosService, Horario, Usuario } from '../../../services/horarios.service';
import { PermissionsService } from '../../../services/permissions.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';


@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss']
})
export class HorariosComponent implements OnInit {
  // Estados
  isLoading = false;
  isSubmitting = false;
  mostrarModal = false;
  vistaActual: 'tabla' | 'calendario' = 'tabla';

  // Datos
  todosLosUsuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  disponibilidad: { [key: number]: boolean } = {};

  // Filtros
  filtroUsuario = '';
  filtroRol = '';
  filtroEstado = '';

  // Formulario
  horarioForm: FormGroup;
  horarioEditando: Horario | null = null;

  // Permisos
  puedeCrearHorarios = false;
  puedeEditarHorarios = false;
  puedeEliminarHorarios = false;

  // Agregar después de las otras propiedades
  usuarioSeleccionadoCalendario = '';
  usuarioCalendarioData: Usuario | null = null;

  // Gestión masiva
  mostrarModalMasivo = false;
  usuariosSeleccionados: number[] = [];
  todosSeleccionados = false;
  horarioMasivoForm: FormGroup;

  // Constantes
  diasSemana = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  constructor(
    private horariosService: HorariosService,
    private permissionsService: PermissionsService,
    private fb: FormBuilder
  ) {
    this.horarioForm = this.fb.group({
      user_id: ['', Validators.required],
      dia_semana: ['', Validators.required],
      hora_inicio: ['', Validators.required],
      hora_fin: ['', Validators.required],
      es_descanso: [false],
      fecha_especial: [''],
      comentarios: ['']
    });
        // Agregar después del horarioForm
    this.horarioMasivoForm = this.fb.group({
      plantilla: ['personalizado'],
      accion: ['agregar']
    });
    this.diasSemana.forEach(dia => {
      this.horarioMasivoForm.addControl(dia.key + '_activo', this.fb.control(false));
      this.horarioMasivoForm.addControl(dia.key + '_inicio', this.fb.control(''));
      this.horarioMasivoForm.addControl(dia.key + '_fin', this.fb.control(''));
      this.horarioMasivoForm.addControl(dia.key + '_descanso', this.fb.control(false));
    });

  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.cargarHorarios();
  }

  verificarPermisos(): void {
    this.puedeCrearHorarios = this.permissionsService.hasPermission('horarios.create');
    this.puedeEditarHorarios = this.permissionsService.hasPermission('horarios.edit');
    this.puedeEliminarHorarios = this.permissionsService.hasPermission('horarios.delete');
  }

  cargarHorarios(): void {
    this.isLoading = true;
    this.horariosService.obtenerHorarios(this.filtroRol).subscribe({
      next: (response) => {
        this.todosLosUsuarios = response.usuarios;
        this.disponibilidad = {};
        
        // Mapear disponibilidad
        response.disponibles_ahora.forEach((item: any) => {
          this.disponibilidad[item.id] = item.disponible;
        });
        this.inicializarUsuarios();

        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar horarios:', error);
        this.isLoading = false;
        Swal.fire('Error', 'No se pudieron cargar los horarios', 'error');
      }
    });
  }

  inicializarUsuarios(): void {
    this.todosLosUsuarios.forEach(usuario => {
      if (usuario.mostrarImagen === undefined) {
        usuario.mostrarImagen = true;
      }
    });
  }

  aplicarFiltros(): void {
    let usuarios = [...this.todosLosUsuarios];

    // Filtro por usuario
    if (this.filtroUsuario) {
      usuarios = usuarios.filter(u => u.id.toString() === this.filtroUsuario);
    }

    // Filtro por rol - AGREGAR ESTE BLOQUE
    if (this.filtroRol) {
      usuarios = usuarios.filter(u => {
        return u.roles && u.roles.some(role => role.name === this.filtroRol);
      });
    }

    // Filtro por estado de disponibilidad
    if (this.filtroEstado) {
      usuarios = usuarios.filter(u => {
        const disponible = this.estaDisponible(u.id);
        return this.filtroEstado === 'disponible' ? disponible : !disponible;
      });
    }

    this.usuariosFiltrados = usuarios;
  }

  cambiarVista(): void {
    this.vistaActual = this.vistaActual === 'tabla' ? 'calendario' : 'tabla';
  }

  estaDisponible(userId: number): boolean {
    return this.disponibilidad[userId] || false;
  }

  obtenerRolPrincipal(usuario: Usuario): string {
    return usuario.roles?.[0]?.name || 'Sin rol';
  }

  obtenerHorariosDia(usuario: Usuario, dia: string): Horario[] {
    return usuario.horarios?.filter(h => h.dia_semana === dia && !h.fecha_especial) || [];
  }

  abrirModalHorario(horario?: Horario, usuarioPreseleccionado?: number): void {
    this.horarioEditando = horario || null;
    
    if (horario) {
      this.horarioForm.patchValue({
        user_id: horario.user_id,
        dia_semana: horario.dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        es_descanso: horario.es_descanso,
        fecha_especial: horario.fecha_especial || '',
        comentarios: horario.comentarios || ''
      });
    } else {
      this.horarioForm.reset();
      this.horarioForm.patchValue({
        es_descanso: false,
        user_id: usuarioPreseleccionado || ''
      });
    }
    
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.horarioEditando = null;
    this.horarioForm.reset();
  }

  guardarHorario(): void {
    if (this.horarioForm.invalid) return;

    this.isSubmitting = true;
    const horarioData = this.horarioForm.value;

    // Limpiar fecha_especial si está vacía
    if (!horarioData.fecha_especial) {
      horarioData.fecha_especial = null;
    }

    const request = this.horarioEditando 
      ? this.horariosService.actualizarHorario(this.horarioEditando.id!, horarioData)
      : this.horariosService.crearHorario(horarioData);

    request.subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Éxito!',
          text: response.message,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        this.cerrarModal();
        this.cargarHorarios();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error al guardar horario:', error);
        const mensaje = error.error?.error || 'Error al guardar el horario';
        Swal.fire('Error', mensaje, 'error');
        this.isSubmitting = false;
      }
    });
  }

  editarHorarioUsuario(usuario: Usuario): void {
  Swal.fire({
    title: `Editar horarios de ${usuario.name}`,
    html: `
      <div class="text-start">
        <p><strong>Usuario:</strong> ${usuario.name}</p>
        <p><strong>Email:</strong> ${usuario.email}</p>
        <p><strong>Rol:</strong> ${this.obtenerRolPrincipal(usuario)}</p>
        <p><strong>Estado:</strong> ${this.estaDisponible(usuario.id) ? '🟢 Disponible' : '🔴 No disponible'}</p>
        <hr>
        <p class="mb-2"><strong>Horarios actuales:</strong></p>
        ${this.generarResumenHorarios(usuario)}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Agregar nuevo horario',
    cancelButtonText: 'Cerrar',
    confirmButtonColor: '#3085d6',
    width: '600px'
  // Código existente antes...
  }).then((result) => {
    if (result.isConfirmed) {
      // Abrir modal con usuario preseleccionado
      this.abrirModalHorario(undefined, usuario.id);
    }
  });
}

verDetalleUsuario(usuario: Usuario): void {
  const horariosDetalle = this.generarDetalleCompleto(usuario);
  
  Swal.fire({
    title: `Detalle de ${usuario.name}`,
    html: horariosDetalle,
    confirmButtonText: 'Cerrar',
    width: '700px',
    customClass: {
      htmlContainer: 'text-start'
    }
  });
}

private generarResumenHorarios(usuario: Usuario): string {
  let html = '<div class="row">';
  
  this.diasSemana.forEach(dia => {
    const horarios = this.obtenerHorariosDia(usuario, dia.key);
    html += `<div class="col-6 mb-2">`;
    html += `<strong>${dia.label}:</strong> `;
    
    if (horarios.length === 0) {
      html += '<span class="text-muted">Sin horario</span>';
    } else {
      html += horarios.map(h => 
        h.es_descanso ? 
        '<span class="badge bg-secondary">Descanso</span>' : 
        `<span class="badge bg-primary">${h.hora_inicio} - ${h.hora_fin}</span>`
      ).join(' ');
    }
    
    html += '</div>';
  });
  
  html += '</div>';
  return html;
}

  private generarDetalleCompleto(usuario: Usuario): string {
    const disponible = this.estaDisponible(usuario.id);
    
    return `
    <div class="container-fluid" style="background-color: #f8fafc; min-height: 100vh; padding: 20px 0;">
      <!-- Información del Usuario -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h6 class="mb-0"><i class="fas fa-user me-2"></i> Información del Usuario</h6>
          </div>
          <div class="card-body p-4">
            <div class="row g-4">
              <div class="col-md-6">
                <p class="mb-3"><strong><i class="fas fa-id-card me-2 text-primary"></i> Nombre:</strong> ${usuario.name}</p>
                <p class="mb-3"><strong><i class="fas fa-envelope me-2 text-primary"></i> Email:</strong> ${usuario.email}</p>
              </div>
              <div class="col-md-6">
                <p class="mb-3"><strong><i class="fas fa-user-tag me-2 text-primary"></i> Rol:</strong> ${this.obtenerRolPrincipal(usuario)}</p>
                <p class="mb-3">
                  <strong><i class="fas fa-circle me-2 text-primary"></i> Estado actual:</strong> 
                  <span class="badge ${disponible ? 'bg-success' : 'bg-danger'} ms-2">
                    ${disponible ? '🟢 Disponible ahora' : '🔴 No disponible'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Horarios Semanales -->
        <div class="card border-0 shadow-sm" style="margin-top: 1.5rem;">
        <div class="card-header text-white" style="background: linear-gradient(135deg, rgba(142, 154, 175, 0.5) 0%, rgba(108, 123, 149, 0.5) 100%);">
          <h6 class="mb-0"><i class="fas fa-calendar-alt me-2"></i> Horarios Semanales</h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th class="fw-bold text-center ps-3 pt-4" style="width: 20%;">
                    <i class="fas fa-calendar-day me-2"></i> Día
                  </th>
                  <th class="fw-bold ps-3 pe-4 pt-4">
                    <i class="fas fa-clock me-2"></i> Horarios
                  </th>
                </tr>
              </thead>
                <tbody>
                  ${this.generarFilasHorarios(usuario)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generarFilasHorarios(usuario: Usuario): string {
    return this.diasSemana.map(dia => {
      const horarios = this.obtenerHorariosDia(usuario, dia.key);
      const contenidoHorarios = this.generarContenidoHorarios(horarios);
      
      return `
        <tr class="align-middle">
          <td class="text-center fw-bold text-dark ps-3">${dia.label}</td>
          <td class="py-3 ps-3 pe-4">${contenidoHorarios}</td>
        </tr>
      `;
    }).join('');
  }

  private generarContenidoHorarios(horarios: Horario[]): string {
    if (horarios.length === 0) {
      return '<span class="text-muted fst-italic"><i class="fas fa-minus-circle me-1"></i>Sin horario asignado</span>';
    }
    
    const badges = horarios.map(h => {
      if (h.es_descanso) {
        return '<span class="badge bg-secondary me-1 mb-1"><i class="fas fa-bed me-1"></i>Descanso</span>';
      } else {
        return `<span class="badge bg-primary me-1 mb-1"><i class="fas fa-clock me-1"></i>${h.hora_inicio} - ${h.hora_fin}</span>`;
      }
    }).join('');
    
    const comentarios = horarios.filter(h => h.comentarios).map(h => h.comentarios);
    const comentariosHtml = comentarios.length > 0 
      ? `<br><small class="text-muted mt-1"><i class="fas fa-comment-dots me-1"></i>Comentarios: ${comentarios.join(', ')}</small>`
      : '';
    
    return `<div>${badges}${comentariosHtml}</div>`;
  }
  
 exportarHorarios(): void {
  if (this.usuariosFiltrados.length === 0) {
    Swal.fire('Info', 'No hay datos para exportar', 'info');
    return;
  }

  // Crear datos para Excel
  const excelData = this.generarDatosExcel();
  
  // Crear workbook
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Horarios');

  // Configurar anchos de columna
  const colWidths = [
    { wch: 20 }, // Usuario
    { wch: 25 }, // Email
    { wch: 15 }, // Rol
    { wch: 15 }, // Estado
    { wch: 20 }, // Lunes
    { wch: 20 }, // Martes
    { wch: 20 }, // Miércoles
    { wch: 20 }, // Jueves
    { wch: 20 }, // Viernes
    { wch: 20 }, // Sábado
    { wch: 20 }  // Domingo
  ];
  ws['!cols'] = colWidths;

  // Descargar archivo
  const fileName = `horarios_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  Swal.fire({
    title: '¡Éxito!',
    text: 'Horarios exportados correctamente',
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });
}

private generarDatosExcel(): any[] {
  return this.usuariosFiltrados.map(usuario => {
    const fila: any = {
      'Usuario': usuario.name,
      'Email': usuario.email,
      'Rol': this.obtenerRolPrincipal(usuario),
      'Estado': this.estaDisponible(usuario.id) ? 'Disponible' : 'No disponible'
    };

    this.diasSemana.forEach(dia => {
      const horarios = this.obtenerHorariosDia(usuario, dia.key);
      if (horarios.length === 0) {
        fila[dia.label] = '-';
      } else {
        fila[dia.label] = horarios.map(h => 
          h.es_descanso ? 'Descanso' : `${h.hora_inicio}-${h.hora_fin}`
        ).join('; ');
      }
    });

    return fila;
  });
}


  private generarDatosCSV(): string {
    const headers = [
      'Usuario',
      'Email', 
      'Rol',
      'Estado',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo'
    ];

    let csvContent = headers.join(',') + '\n';

    this.usuariosFiltrados.forEach(usuario => {
      const fila = [
        `"${usuario.name}"`,
        `"${usuario.email}"`,
        `"${this.obtenerRolPrincipal(usuario)}"`,
        `"${this.estaDisponible(usuario.id) ? 'Disponible' : 'No disponible'}"`,
        ...this.diasSemana.map(dia => {
          const horarios = this.obtenerHorariosDia(usuario, dia.key);
          if (horarios.length === 0) return '"-"';
          return `"${horarios.map(h => 
            h.es_descanso ? 'Descanso' : `${h.hora_inicio}-${h.hora_fin}`
          ).join('; ')}"`;
        })
      ];
      
      csvContent += fila.join(',') + '\n';
    });

    return csvContent;
  }

  onImageError(event: any) {
    const imgElement = event.target;
    
    // Encontrar el usuario en el array y marcar que no debe mostrar imagen
    const userInfo = imgElement.closest('.user-info');
    const userName = userInfo.querySelector('.user-name').textContent.trim();
    
    // Buscar el usuario en el array y marcar la imagen como fallida
    const usuario = this.usuariosFiltrados.find(u => u.name === userName);
    if (usuario) {
      usuario.mostrarImagen = false;
    }
  }

  generarColorPorNombre(nombre: string): string {
    const colores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
    ];
    
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colores.length;
    return colores[index];
  }

  obtenerUrlAvatar(usuario: any): string {
    if (usuario?.profile?.avatar_url) {
      return `${environment.baseUrl}${usuario.profile.avatar_url}`;
    }
    return '/assets/images/avatar/default-avatar.png';
  }

  cambiarUsuarioCalendario(): void {
    if (this.usuarioSeleccionadoCalendario) {
      this.usuarioCalendarioData = this.usuariosFiltrados.find(
        u => u.id.toString() === this.usuarioSeleccionadoCalendario
      ) || null;
    } else {
      this.usuarioCalendarioData = null;
    }
  }

  abrirModalGestionMasiva(): void {
    this.mostrarModalMasivo = true;
    this.usuariosSeleccionados = [];
    this.todosSeleccionados = false;
    
    // Resetear formulario completo
    this.horarioMasivoForm.reset();
    
    // Setear valores por defecto
    this.horarioMasivoForm.patchValue({
      plantilla: 'personalizado',
      accion: 'agregar'
    });
    
    // Resetear todos los controles de días
    this.diasSemana.forEach(dia => {
      this.horarioMasivoForm.patchValue({
        [dia.key + '_activo']: false,
        [dia.key + '_inicio']: '',
        [dia.key + '_fin']: '',
        [dia.key + '_descanso']: false
      });
    });
  }


  cerrarModalMasivo(): void {
    this.mostrarModalMasivo = false;
    this.horarioMasivoForm.reset();
    this.usuariosSeleccionados = [];
    this.todosSeleccionados = false;
    
    // Setear valores por defecto
    this.horarioMasivoForm.patchValue({
      plantilla: 'personalizado',
      accion: 'agregar'
    });
    
    // Resetear todos los controles de días
    this.diasSemana.forEach(dia => {
      this.horarioMasivoForm.patchValue({
        [dia.key + '_activo']: false,
        [dia.key + '_inicio']: '',
        [dia.key + '_fin']: '',
        [dia.key + '_descanso']: false
      });
    });
  }



toggleTodosUsuarios(event: any): void {
  this.todosSeleccionados = event.target.checked;
  if (this.todosSeleccionados) {
    this.usuariosSeleccionados = this.todosLosUsuarios.map(u => u.id);
  } else {
    this.usuariosSeleccionados = [];
  }
}

toggleUsuario(userId: number, event: any): void {
  if (event.target.checked) {
    this.usuariosSeleccionados.push(userId);
  } else {
    this.usuariosSeleccionados = this.usuariosSeleccionados.filter(id => id !== userId);
  }
  this.todosSeleccionados = this.usuariosSeleccionados.length === this.todosLosUsuarios.length;
}

aplicarPlantilla(event: any): void {
  const plantilla = event.target.value;
  
  // Resetear solo los controles de días (no toda la forma)
  this.diasSemana.forEach(dia => {
    this.horarioMasivoForm.patchValue({
      [dia.key + '_activo']: false,
      [dia.key + '_inicio']: '',
      [dia.key + '_fin']: '',
      [dia.key + '_descanso']: false
    });
  });
  
  // Mantener los valores de plantilla y acción
  this.horarioMasivoForm.patchValue({ 
    plantilla: plantilla,
    accion: this.horarioMasivoForm.get('accion')?.value || 'agregar'
  });
  
  if (plantilla === 'full_time') {
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
      this.horarioMasivoForm.patchValue({
        [dia + '_activo']: true,
        [dia + '_inicio']: '08:00',
        [dia + '_fin']: '17:00',
        [dia + '_descanso']: false
      });
    });
  } else if (plantilla === 'medio_tiempo') {
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
      this.horarioMasivoForm.patchValue({
        [dia + '_activo']: true,
        [dia + '_inicio']: '08:00',
        [dia + '_fin']: '12:00',
        [dia + '_descanso']: false
      });
    });
  } else if (plantilla === 'noche') {
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
      this.horarioMasivoForm.patchValue({
        [dia + '_activo']: true,
        [dia + '_inicio']: '18:00',
        [dia + '_fin']: '02:00',
        [dia + '_descanso']: false
      });
    });
  }
}


aplicarHorariosMasivos(): void {
  console.log('=== INICIANDO GESTIÓN MASIVA ===');
  console.log('Usuarios seleccionados:', this.usuariosSeleccionados);
  const accionMasiva = this.horarioMasivoForm.get('accion')?.value || 'agregar';
  console.log('Acción:', accionMasiva);

  
  if (this.usuariosSeleccionados.length === 0) {
    Swal.fire('Error', 'Selecciona al menos un usuario', 'error');
    return;
  }

  // Verificar que al menos un día esté activo
  const diasActivos = this.diasSemana.filter(dia => 
    this.horarioMasivoForm.get(dia.key + '_activo')?.value
  );

  console.log('Días activos:', diasActivos.map(d => d.label));

  if (diasActivos.length === 0) {
    Swal.fire('Error', 'Selecciona al menos un día para aplicar horarios', 'error');
    return;
  }

  // Validar horarios completos para días activos
  const erroresValidacion: string[] = [];
  diasActivos.forEach(dia => {
    const horaInicio = this.horarioMasivoForm.get(dia.key + '_inicio')?.value;
    const horaFin = this.horarioMasivoForm.get(dia.key + '_fin')?.value;
    const esDescanso = this.horarioMasivoForm.get(dia.key + '_descanso')?.value;
    
    console.log(`${dia.label}: inicio=${horaInicio}, fin=${horaFin}, descanso=${esDescanso}`);
    
    if (!esDescanso && (!horaInicio || !horaFin)) {
      erroresValidacion.push(`${dia.label}: Debe especificar hora de inicio y fin`);
    }
  });

  if (erroresValidacion.length > 0) {
    console.log('Errores de validación:', erroresValidacion);
    Swal.fire('Error de validación', erroresValidacion.join('<br>'), 'error');
    return;
  }

  console.log('Iniciando procesamiento de usuarios...');
  this.isSubmitting = true;
  
  // ... resto del código igual

  let usuariosProcesados = 0;
  let errores = 0;
  let mensajesError: string[] = [];

  const promesas = this.usuariosSeleccionados.map(userId => {
    return this.procesarUsuarioMasivo(userId);
  });

  Promise.all(promesas).then(resultados => {
    resultados.forEach(resultado => {
      if (resultado.success) {
        usuariosProcesados++;
      } else {
        errores++;
        if (resultado.mensaje) {
          mensajesError.push(resultado.mensaje);
        }
      }
    });
    
    this.isSubmitting = false;
    this.cerrarModalMasivo();

    // Agregar un pequeño delay antes de recargar para asegurar que la BD se actualice
    setTimeout(() => {
      this.cargarHorarios();
    }, 500);
    
    let mensajeHtml = `<p>✅ Usuarios procesados: ${usuariosProcesados}</p>`;
    if (errores > 0) {
      mensajeHtml += `<p>❌ Errores: ${errores}</p>`;
      if (mensajesError.length > 0) {
        mensajeHtml += `<hr><small>${mensajesError.slice(0, 5).join('<br>')}</small>`;
      }
    }
    
    Swal.fire({
      title: '¡Proceso completado!',
      html: mensajeHtml,
      icon: usuariosProcesados > 0 ? 'success' : 'warning'
    });
  }).catch(error => {
    console.error('Error en gestión masiva:', error);
    this.isSubmitting = false;
    Swal.fire('Error', 'Error al procesar los horarios masivos', 'error');
  });
}

private procesarUsuarioMasivo(userId: number): Promise<{success: boolean, mensaje?: string}> {
        return new Promise(async (resolve) => {
          try {
            const usuario = this.todosLosUsuarios.find(u => u.id === userId);
            const nombreUsuario = usuario ? usuario.name : `Usuario ${userId}`;

            const accionMasiva = this.horarioMasivoForm.get('accion')?.value || 'agregar';
            console.log(`=== PROCESANDO ${nombreUsuario} - Acción: ${accionMasiva} ===`);

            if (accionMasiva === 'reemplazar') {

            const diasActivos = this.diasSemana
              .filter(dia => this.horarioMasivoForm.get(dia.key + '_activo')?.value)
              .map(dia => dia.key);
            
            console.log(`Eliminando horarios existentes para días: ${diasActivos.join(', ')}`);
            console.log(`URL del servicio: ${this.horariosService['apiUrl']}/eliminar-usuario`);
            
            if (diasActivos.length > 0) {
              try {
            const resultado = await this.horariosService.eliminarHorariosUsuario(userId, diasActivos).toPromise();
            console.log('Respuesta de eliminación:', resultado);
          } catch (error: unknown) {
          console.error(`Error eliminando horarios de ${nombreUsuario}:`, error);

          if (typeof error === 'object' && error !== null) {
            const errObj = error as { error?: any; message?: string };
            console.error('Detalles del error de eliminación:', errObj.error || errObj.message);
            resolve({
              success: false,
              mensaje: `Error eliminando horarios de ${nombreUsuario}: ${errObj.error?.error || errObj.message || error}`
            });
          } else {
            // En caso sea string u otro tipo
            console.error('Error desconocido:', error);
            resolve({
              success: false,
              mensaje: `Error eliminando horarios de ${nombreUsuario}: ${String(error)}`
            });
          }
        }

        }
      }
      const promesasHorarios: Promise<any>[] = [];

      for (const dia of this.diasSemana) {
        const activo = this.horarioMasivoForm.get(dia.key + '_activo')?.value;
        
        if (activo) {
          const horaInicio = this.horarioMasivoForm.get(dia.key + '_inicio')?.value;
          const horaFin = this.horarioMasivoForm.get(dia.key + '_fin')?.value;
          const esDescanso = this.horarioMasivoForm.get(dia.key + '_descanso')?.value || false;

          console.log(`${dia.label}: ${horaInicio}-${horaFin}, Descanso: ${esDescanso}`);

          // Validar que las horas estén completas para horarios no de descanso
          if (!esDescanso && (!horaInicio || !horaFin)) {
            console.warn(`Horario incompleto para ${dia.label} del usuario ${nombreUsuario}`);
            continue;
          }

          const horarioData = {
            user_id: userId,
            dia_semana: dia.key,
            hora_inicio: esDescanso ? '00:00' : horaInicio,
            hora_fin: esDescanso ? '23:59' : horaFin,
            es_descanso: esDescanso,
            fecha_especial: undefined,
            comentarios: `Creado por gestión masiva - ${accionMasiva}`,
            activo: true
          };

          console.log('Datos del horario a crear:', horarioData);

          const promesa = this.horariosService.crearHorario(horarioData).toPromise()
            .then(response => {
              console.log(`✅ Horario creado para ${nombreUsuario} - ${dia.label}:`, response);
              return response;
            })
            // Reemplázala por:
            .catch(error => {
              console.error(`❌ Error creando horario para ${nombreUsuario}, día ${dia.key}:`, error);
              console.error('Detalles del error:', error.error || error.message || error);
              throw new Error(`${dia.label}: ${error.error?.error || error.message || 'Error desconocido'}`);
            });
            
          promesasHorarios.push(promesa);
        }
      }

      if (promesasHorarios.length === 0) {
        console.log(`No hay horarios para crear para ${nombreUsuario}`);
        resolve({success: true});
        return;
      }

      console.log(`Creando ${promesasHorarios.length} horarios para ${nombreUsuario}...`);
      await Promise.all(promesasHorarios);
      console.log(`✅ ${nombreUsuario} procesado correctamente`);
      resolve({success: true});

    } catch (error) {
      console.error('Error en procesarUsuarioMasivo:', error);
      const usuario = this.todosLosUsuarios.find(u => u.id === userId);
      const nombreUsuario = usuario ? usuario.name : `Usuario ${userId}`;
      resolve({success: false, mensaje: `Error procesando ${nombreUsuario}: ${error}`});
    }
  });
}



private verificarSolapamientoHorarios(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  // Convertir horas a minutos para facilitar comparación
  const toMinutes = (tiempo: string): number => {
    const [horas, minutos] = tiempo.split(':').map(Number);
    return horas * 60 + minutos;
  };

  let inicioMinutos1 = toMinutes(inicio1);
  let finMinutos1 = toMinutes(fin1);
  let inicioMinutos2 = toMinutes(inicio2);
  let finMinutos2 = toMinutes(fin2);

  // Manejar turnos noche (que cruzan medianoche)
  if (finMinutos1 < inicioMinutos1) { // Turno 1 cruza medianoche
    finMinutos1 += 24 * 60; // Agregar 24 horas
  }
  
  if (finMinutos2 < inicioMinutos2) { // Turno 2 cruza medianoche
    finMinutos2 += 24 * 60; // Agregar 24 horas
  }

  // Verificar solapamiento estándar
  const solapamiento = (inicioMinutos1 < finMinutos2 && finMinutos1 > inicioMinutos2);
  
  // Verificar solapamiento con turnos que cruzan medianoche
  const solapamientoNoche = (
    (inicioMinutos1 < finMinutos2 - 24 * 60 && finMinutos1 > inicioMinutos2) || // Turno 2 cruza, comparar con día anterior
    (inicioMinutos1 < finMinutos2 && finMinutos1 > inicioMinutos2 + 24 * 60)    // Turno 1 cruza, comparar con día siguiente
  );

  return solapamiento || solapamientoNoche;
}



// Función para editar un horario específico
editarHorario(horario: Horario): void {
  this.abrirModalHorario(horario);
}

// Función para eliminar un horario específico
eliminarHorario(horario: Horario): void {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `¿Deseas eliminar este horario del ${this.obtenerNombreDia(horario.dia_semana)}?`,
    html: `
      <div class="text-start">
        <p><strong>Horario:</strong> ${horario.es_descanso ? 'Descanso' : `${horario.hora_inicio} - ${horario.hora_fin}`}</p>
        ${horario.comentarios ? `<p><strong>Comentarios:</strong> ${horario.comentarios}</p>` : ''}
        ${horario.fecha_especial ? `<p><strong>Fecha especial:</strong> ${horario.fecha_especial}</p>` : ''}
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.confirmarEliminacionHorario(horario);
    }
  });
}

// Función auxiliar para confirmar eliminación
private confirmarEliminacionHorario(horario: Horario): void {
  this.horariosService.eliminarHorario(horario.id!).subscribe({
    next: (response) => {
      Swal.fire({
        title: '¡Eliminado!',
        text: response.message || 'Horario eliminado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      this.cargarHorarios(); // Recargar datos
    },
    error: (error) => {
      console.error('Error al eliminar horario:', error);
      const mensaje = error.error?.error || 'Error al eliminar el horario';
      Swal.fire('Error', mensaje, 'error');
    }
  });
}

// Función auxiliar para obtener nombre del día
private obtenerNombreDia(diaClave: string): string {
  const dia = this.diasSemana.find(d => d.key === diaClave);
  return dia ? dia.label : diaClave;
}

// Agrega estas funciones al final de la clase HorariosComponent, antes del último }

mostrarAccionesHorario(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement;
  const acciones = target?.querySelector('.horario-actions') as HTMLElement;
  if (acciones) {
    acciones.style.opacity = '1';
  }
}

ocultarAccionesHorario(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement;
  const acciones = target?.querySelector('.horario-actions') as HTMLElement;
  if (acciones) {
    acciones.style.opacity = '0';
  }
}

private esHorarioValido(horaInicio: string, horaFin: string): boolean {
  // Validar formato básico
  if (!horaInicio || !horaFin) return false;
  
  // Para turno noche (ej: 18:00 a 02:00), la hora fin puede ser menor que la hora inicio
  // Esto es válido y representa un turno que cruza medianoche
  return true;
}

private hayTurnoNoche(horaInicio: string, horaFin: string): boolean {
  // Convertir a minutos para comparar correctamente
  const toMinutes = (tiempo: string): number => {
    const [horas, minutos] = tiempo.split(':').map(Number);
    return horas * 60 + minutos;
  };
  
  const inicioMinutos = toMinutes(horaInicio);
  const finMinutos = toMinutes(horaFin);
  
  // Detectar si es un turno noche (hora fin menor que hora inicio)
  return finMinutos < inicioMinutos;
}


}
