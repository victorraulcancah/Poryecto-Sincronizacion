export interface CajaChica {
  id: number;
  nombre: string;
  codigo: string;
  fondo_fijo: number;
  saldo_actual: number;
  responsable_id: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  responsable?: Usuario;
  porcentaje_disponible?: number;
}

export interface Usuario {
  id: number;
  name: string;
  email?: string;
}

export interface SaldoCajaChica {
  caja_id: number;
  nombre: string;
  fondo_fijo: number;
  saldo_actual: number;
  porcentaje_disponible: number;
}

export interface Gasto {
  id: number;
  caja_chica_id: number;
  fecha: string;
  monto: number;
  categoria: CategoriaGasto;
  descripcion: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor?: string;
  archivo_adjunto?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
  caja_chica?: CajaChica;
  aprobado_por?: Usuario;
}

export type CategoriaGasto = 
  | 'VIATICOS'
  | 'UTILES_OFICINA'
  | 'SERVICIOS'
  | 'MANTENIMIENTO'
  | 'TRANSPORTE'
  | 'OTROS';

export interface Reposicion {
  id: number;
  caja_chica_id: number;
  fecha: string;
  monto: number;
  created_at?: string;
  updated_at?: string;
}

export interface Rendicion {
  caja: CajaChica;
  movimientos: MovimientoRendicion[];
  resumen: ResumenRendicion;
}

export interface MovimientoRendicion {
  id: number;
  fecha: string;
  tipo: 'GASTO' | 'REPOSICION';
  categoria?: string;
  descripcion: string;
  monto: number;
}

export interface ResumenRendicion {
  fondo_fijo: number;
  total_gastos: number;
  total_reposiciones: number;
  saldo_actual: number;
}

// DTOs
export interface CrearCajaChicaDto {
  nombre: string;
  fondo_fijo: number;
  responsable_id: number;
  activo?: boolean;
}

export interface ActualizarCajaChicaDto {
  nombre?: string;
  fondo_fijo?: number;
  responsable_id?: number;
  activo?: boolean;
}

export interface RegistrarGastoDto {
  fecha: string;
  monto: number;
  categoria: CategoriaGasto;
  descripcion: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor?: string;
}

export interface AprobarGastoDto {
  estado: 'APROBADO' | 'RECHAZADO';
  observaciones?: string;
}

export interface ReposicionDto {
  monto: number;
}

export interface RendicionParams {
  fecha_inicio?: string;
  fecha_fin?: string;
}
