import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reclamo {
  id?: number;
  numero_reclamo?: string;
  user_cliente_id?: number;
  
  // Datos del consumidor
  consumidor_nombre: string;
  consumidor_dni: string;
  consumidor_direccion: string;
  consumidor_telefono: string;
  consumidor_email: string;
  
  // Menor de edad
  es_menor_edad: boolean;
  apoderado_nombre?: string;
  apoderado_dni?: string;
  apoderado_direccion?: string;
  apoderado_telefono?: string;
  apoderado_email?: string;
  
  // Identificación del bien contratado
  tipo_bien: 'producto' | 'servicio';
  monto_reclamado: number;
  descripcion_bien: string;
  
  // Detalle de la reclamación
  tipo_solicitud: 'reclamo' | 'queja';
  detalle_reclamo: string;
  pedido_consumidor: string;
  
  // Respuesta del proveedor
  respuesta_proveedor?: string;
  fecha_respuesta?: string;
  
  // Estados del reclamo
  estado?: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';
  fecha_limite_respuesta?: string;
  
  // Auditoría
  created_at?: string;
  updated_at?: string;
}

export interface ReclamoResponse {
  status: string;
  message: string;
  reclamo?: Reclamo;
  reclamos?: Reclamo[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  estadisticas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReclamosService {
  private apiUrl = `${environment.apiUrl}/reclamos`;

  constructor(private http: HttpClient) { }

  // Crear un nuevo reclamo (público, no requiere autenticación)
  crearReclamo(reclamo: Reclamo): Observable<ReclamoResponse> {
    return this.http.post<ReclamoResponse>(`${this.apiUrl}/crear`, reclamo);
  }

  // Obtener reclamos del usuario autenticado
  obtenerMisReclamos(): Observable<ReclamoResponse> {
    return this.http.get<ReclamoResponse>(`${this.apiUrl}/mis-reclamos`);
  }

  // Obtener reclamo por ID
  obtenerReclamo(id: number): Observable<ReclamoResponse> {
    return this.http.get<ReclamoResponse>(`${this.apiUrl}/${id}`);
  }

  // Buscar reclamo por número (público)
  buscarPorNumero(numeroReclamo: string): Observable<ReclamoResponse> {
    return this.http.get<ReclamoResponse>(`${this.apiUrl}/buscar/${numeroReclamo}`);
  }

  // MÉTODOS PARA ADMINISTRADORES

  // Obtener todos los reclamos (admin)
  obtenerTodosReclamos(params?: any): Observable<ReclamoResponse> {
    return this.http.get<ReclamoResponse>(this.apiUrl, { params });
  }

  // Actualizar respuesta del proveedor (admin)
  actualizarRespuesta(id: number, respuesta: string, fechaRespuesta?: string): Observable<ReclamoResponse> {
    return this.http.patch<ReclamoResponse>(`${this.apiUrl}/${id}/respuesta`, {
      respuesta_proveedor: respuesta,
      fecha_respuesta: fechaRespuesta || new Date().toISOString().split('T')[0]
    });
  }

  // Cambiar estado del reclamo (admin)
  cambiarEstado(id: number, estado: string): Observable<ReclamoResponse> {
    return this.http.patch<ReclamoResponse>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  // Eliminar reclamo (admin)
  eliminarReclamo(id: number): Observable<ReclamoResponse> {
    return this.http.delete<ReclamoResponse>(`${this.apiUrl}/${id}`);
  }

  // Obtener estadísticas de reclamos (admin)
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }

  // Generar número de reclamo único
  generarNumeroReclamo(): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REC-${year}${month}-${randomNum}`;
  }

  // Validar formulario de reclamo
  validarReclamo(reclamo: Reclamo): string[] {
    const errores: string[] = [];

    // Validaciones básicas
    if (!reclamo.consumidor_nombre || reclamo.consumidor_nombre.length < 2) {
      errores.push('El nombre del consumidor es requerido y debe tener al menos 2 caracteres');
    }

    if (!reclamo.consumidor_dni || !/^\d{8}$/.test(reclamo.consumidor_dni)) {
      errores.push('El DNI debe tener exactamente 8 dígitos');
    }

    if (!reclamo.consumidor_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reclamo.consumidor_email)) {
      errores.push('El email no tiene un formato válido');
    }

    if (!reclamo.consumidor_telefono || !/^\d{9}$/.test(reclamo.consumidor_telefono)) {
      errores.push('El teléfono debe tener exactamente 9 dígitos');
    }

    if (!reclamo.consumidor_direccion || reclamo.consumidor_direccion.length < 10) {
      errores.push('La dirección es requerida y debe tener al menos 10 caracteres');
    }

    // Validaciones para menor de edad
    if (reclamo.es_menor_edad) {
      if (!reclamo.apoderado_nombre || reclamo.apoderado_nombre.length < 2) {
        errores.push('El nombre del apoderado es requerido para menores de edad');
      }
      if (!reclamo.apoderado_dni || !/^\d{8}$/.test(reclamo.apoderado_dni)) {
        errores.push('El DNI del apoderado debe tener exactamente 8 dígitos');
      }
      if (!reclamo.apoderado_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reclamo.apoderado_email)) {
        errores.push('El email del apoderado no tiene un formato válido');
      }
    }

    // Validaciones del bien/servicio
    if (!reclamo.monto_reclamado || reclamo.monto_reclamado <= 0) {
      errores.push('El monto reclamado debe ser mayor a 0');
    }

    if (!reclamo.descripcion_bien || reclamo.descripcion_bien.length < 10) {
      errores.push('La descripción del bien/servicio debe tener al menos 10 caracteres');
    }

    if (!reclamo.detalle_reclamo || reclamo.detalle_reclamo.length < 20) {
      errores.push('El detalle del reclamo debe tener al menos 20 caracteres');
    }

    if (!reclamo.pedido_consumidor || reclamo.pedido_consumidor.length < 10) {
      errores.push('El pedido del consumidor debe tener al menos 10 caracteres');
    }

    return errores;
  }

  // Obtener estados disponibles
  getEstadosReclamos(): Array<{value: string, label: string, class: string}> {
    return [
      { value: 'pendiente', label: 'Pendiente', class: 'bg-warning-50 text-warning-600' },
      { value: 'en_proceso', label: 'En Proceso', class: 'bg-info-50 text-info-600' },
      { value: 'resuelto', label: 'Resuelto', class: 'bg-success-50 text-success-600' },
      { value: 'cerrado', label: 'Cerrado', class: 'bg-secondary-50 text-secondary-600' }
    ];
  }

  // Obtener clase CSS para el estado
  getEstadoClass(estado: string): string {
    const estados = this.getEstadosReclamos();
    const estadoObj = estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.class : 'bg-gray-50 text-gray-600';
  }
}