export interface Caja {
  id: number;
  nombre: string;
  codigo: string;
  tienda_id?: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  tienda?: Tienda;
  movimiento_actual?: MovimientoCaja;
}

export interface Tienda {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface MovimientoCaja {
  id: number;
  caja_id: number;
  user_id: number;
  tipo: 'APERTURA' | 'CIERRE';
  fecha: string;
  hora: string;
  monto_inicial: number;
  monto_final?: number;
  monto_sistema?: number;
  diferencia?: number;
  observaciones?: string;
  estado: 'ABIERTA' | 'CERRADA';
  created_at?: string;
  updated_at?: string;
  caja?: Caja;
  user?: Usuario;
  saldo_actual?: number;
  total_ingresos?: number;
  total_egresos?: number;
}

export interface Usuario {
  id: number;
  name: string;
  email?: string;
}

export interface Transaccion {
  id: number;
  caja_movimiento_id: number;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: 'VENTA' | 'COBRO' | 'GASTO' | 'RETIRO' | 'OTRO';
  monto: number;
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN';
  referencia?: string;
  venta_id?: number;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EstadoCaja {
  caja_id: number;
  nombre: string;
  estado: 'ABIERTA' | 'CERRADA';
  movimiento?: MovimientoCaja;
}

export interface TransaccionesResponse {
  movimiento: MovimientoCaja;
  transacciones: Transaccion[];
  resumen: ResumenCaja;
}

export interface ResumenCaja {
  monto_inicial: number;
  total_ingresos: number;
  total_egresos: number;
  saldo_actual: number;
  cantidad_transacciones?: number;
}

export interface ReporteCaja {
  movimiento: MovimientoCaja;
  resumen: ResumenCaja;
  por_metodo_pago: MetodoPagoResumen[];
  transacciones: Transaccion[];
}

export interface MetodoPagoResumen {
  metodo_pago: string;
  total: number;
}

export interface ResultadoCierre {
  movimiento: MovimientoCaja;
  diferencia: number;
  monto_sistema: number;
  monto_final: number;
}

// DTOs para formularios
export interface CrearCajaDto {
  nombre: string;
  tienda_id: number;
  activo: boolean;
}

export interface ActualizarCajaDto {
  nombre?: string;
  tienda_id?: number;
  activo?: boolean;
}

export interface AperturarCajaDto {
  monto_inicial: number;
  observaciones?: string;
}

export interface CerrarCajaDto {
  monto_final: number;
  observaciones?: string;
}

export interface RegistrarTransaccionDto {
  tipo: 'INGRESO' | 'EGRESO';
  categoria: 'VENTA' | 'COBRO' | 'GASTO' | 'RETIRO' | 'OTRO';
  monto: number;
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN';
  referencia?: string;
  venta_id?: number;
  descripcion?: string;
}
