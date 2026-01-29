// ============================================
// MODELOS PARA FACTURACIÓN ELECTRÓNICA
// ============================================

export interface Empresa {
  id?: number;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  domicilio_fiscal: string;
  ubigeo: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  urbanizacion?: string;
  codigo_local?: string;
  email?: string;
  telefono?: string;
  web?: string;
  logo_path?: string;
  sol_usuario?: string;
  sol_endpoint?: 'beta' | 'prod';
  estado?: 'activo' | 'inactivo';
  created_at?: string;
  updated_at?: string;
}

export interface Certificado {
  id?: number;
  empresa_id: number;
  nombre_archivo: string;
  ruta_archivo: string;
  propietario?: string;
  emisor?: string;
  numero_serie?: string;
  fecha_emision?: string;
  fecha_vencimiento: string;
  tamanio_bytes?: number;
  hash_sha256?: string;
  estado?: 'activo' | 'vencido' | 'revocado';
  created_at?: string;
  updated_at?: string;
}

export interface Serie {
  id?: number;
  empresa_id?: number;
  tipo_comprobante: '01' | '03' | '07' | '08' | '09'; // 01=Factura, 03=Boleta, 07=NC, 08=ND, 09=Guía
  serie: string;
  correlativo?: number; // Campo que devuelve el backend
  correlativo_actual?: number; // Alias para compatibilidad
  correlativo_minimo?: number;
  correlativo_maximo?: number;
  sede_id?: number;
  caja_id?: number;
  activo?: boolean; // Campo que devuelve el backend
  estado?: 'activo' | 'inactivo';
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cliente {
  id?: number;
  tipo_documento: '1' | '6' | '4' | '7' | '-'; // 1=DNI, 6=RUC, 4=CE, 7=PASS, -=SIN DOC
  numero_documento: string;
  nombre?: string; // Opcional para compatibilidad
  razon_social?: string; // Campo principal que devuelve la API
  nombre_comercial?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  tipo_cliente?: 'natural' | 'juridico';
  categoria?: string;
  estado?: 'activo' | 'inactivo';
  created_at?: string;
  updated_at?: string;
}

export interface VentaItem {
  id?: number;
  venta_id?: number;
  producto_id?: number;
  codigo_producto?: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_sin_igv?: number;
  tipo_afectacion_igv: string;
  porcentaje_igv?: number;
  descuento?: number;
  subtotal: number;
  igv: number;
  total: number;
  orden?: number;
  created_at?: string;
}

export interface Venta {
  id?: number;
  codigo_venta: string;
  empresa_id: number;
  cliente_id: number;
  cliente_tipo_documento?: string;
  cliente_numero_documento?: string;
  cliente_nombre?: string;
  cliente_direccion?: string;
  cliente_email?: string;
  fecha_venta: string;
  hora_venta: string;
  subtotal: number;
  descuento_items: number;
  descuento_global: number;
  subtotal_neto: number;
  igv: number;
  total: number;
  moneda: string;
  metodo_pago?: string;
  monto_pagado?: number;
  monto_cambio?: number;
  observaciones?: string;
  comprobante_id?: number;
  estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
  motivo_anulacion?: string;
  sede_id?: number;
  caja_id?: number;
  usuario_id?: number;
  items?: VentaItem[];
  cliente?: Cliente;
  comprobante?: Comprobante;
  created_at?: string;
  updated_at?: string;
}

export interface ComprobanteItem {
  id?: number;
  comprobante_id: number;
  codigo?: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  tipo_afectacion_igv?: string;
  porcentaje_igv?: number;
  descuento?: number;
  subtotal: number;
  igv: number;
  total: number;
  orden?: number;
  created_at?: string;
}

export interface Comprobante {
  id?: number;
  empresa_id: number;
  venta_id?: number;
  tipo_comprobante: '01' | '03' | '07' | '08';
  serie: string;
  numero: number;
  numero_completo?: string;
  fecha_emision: string;
  hora_emision: string;
  fecha_vencimiento?: string;
  cliente_tipo_documento?: string;
  cliente_numero_documento?: string;
  cliente_nombre?: string;
  cliente_direccion?: string;
  moneda: string;
  subtotal: number;
  descuentos?: number;
  igv: number;
  total: number;
  hash?: string;
  qr_path?: string;
  xml_path?: string;
  xml_firmado_path?: string;
  cdr_path?: string;
  estado_sunat: 'PENDIENTE' | 'ACEPTADO' | 'ACEPTADO_OBS' | 'RECHAZADO' | 'BAJA';
  codigo_sunat?: string;
  mensaje_sunat?: string;
  fecha_envio_sunat?: string;
  fecha_respuesta_sunat?: string;
  comprobante_ref_id?: number;
  tipo_comprobante_ref?: string;
  serie_ref?: string;
  numero_ref?: number;
  motivo_nota?: string;
  tipo_nota_credito?: string;
  tipo_nota_debito?: string;
  observaciones?: string;
  leyendas?: any;
  items?: ComprobanteItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Resumen {
  id?: number;
  empresa_id: number;
  fecha_resumen: string;
  fecha_generacion: string;
  correlativo: number;
  identificador: string;
  ticket?: string;
  cantidad_comprobantes?: number;
  total_gravado?: number;
  total_exonerado?: number;
  total_inafecto?: number;
  total_igv?: number;
  total_general?: number;
  xml_path?: string;
  cdr_path?: string;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  codigo_sunat?: string;
  mensaje_sunat?: string;
  fecha_envio?: string;
  fecha_procesamiento?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Baja {
  id?: number;
  empresa_id: number;
  fecha_baja: string;
  fecha_generacion: string;
  correlativo: number;
  identificador: string;
  ticket?: string;
  cantidad_comprobantes?: number;
  xml_path?: string;
  cdr_path?: string;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  codigo_sunat?: string;
  mensaje_sunat?: string;
  fecha_envio?: string;
  fecha_procesamiento?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditoriaSunat {
  id?: number;
  empresa_id: number;
  tipo_operacion: 'EMISION' | 'CONSULTA' | 'RESUMEN' | 'BAJA';
  entidad_tipo?: string;
  entidad_id?: number;
  entidad_referencia?: string;
  endpoint_url?: string;
  request_headers?: any;
  request_body?: string;
  response_status?: number;
  response_headers?: any;
  response_body?: string;
  response_time_ms?: number;
  exitoso: boolean;
  codigo_sunat?: string;
  mensaje_sunat?: string;
  intento?: number;
  ip_address?: string;
  usuario_id?: number;
  created_at?: string;
}

// ============================================
// INTERFACES PARA FORMULARIOS
// ============================================

export interface VentaFormData {
  cliente: {
    tipo_documento: string;
    numero_documento: string;
    nombre: string;
    direccion?: string;
    email?: string;
    telefono?: string;
  };
  items: VentaItemFormData[];
  descuento_global?: number;
  metodo_pago?: string;
  observaciones?: string;
  moneda?: string;
}

export interface VentaItemFormData {
  tipo_item?: 'PRODUCTO' | 'SERVICIO'; // Nuevo campo para diferenciar
  producto_id?: number;
  servicio_id?: number; // Nuevo campo para servicios
  codigo_producto?: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  tipo_afectacion_igv: string;
  descuento?: number;
  descuento_unitario?: number; // Alias para compatibilidad con API
  subtotal?: number;
  igv?: number;
  total?: number;
}

export interface FacturarFormData {
  tipo_comprobante: '01' | '03';
  serie?: string;
  metodo_pago?: string;
  observaciones?: string;
  fecha_vencimiento?: string;
}

export interface NotaCreditoFormData {
  comprobante_referencia: {
    tipo: string;
    serie: string;
    numero: number;
  };
  tipo_nota_credito: string;
  motivo: string;
  descripcion: string;
  items: VentaItemFormData[];
  serie: string;
  observaciones?: string;
}

export interface BajaFormData {
  comprobantes: {
    tipo: string;
    serie: string;
    numero: number;
    motivo: string;
  }[];
  fecha_baja: string;
}

// ============================================
// INTERFACES PARA RESPUESTAS DE API
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    from: number;
    to: number;
  };
}

// ============================================
// ENUMS Y CONSTANTES
// ============================================

export const TIPOS_DOCUMENTO = {
  DNI: '1',
  RUC: '6',
  CE: '4',
  PASS: '7',
  SIN_DOC: '-'
} as const;

export const TIPOS_COMPROBANTE = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08'
} as const;

export const TIPOS_AFECTACION_IGV = {
  GRAVADO: '10',
  EXONERADO: '20',
  INAFECTO: '30'
} as const;

export const ESTADOS_SUNAT = {
  PENDIENTE: 'PENDIENTE',
  ACEPTADO: 'ACEPTADO',
  ACEPTADO_OBS: 'ACEPTADO_OBS',
  RECHAZADO: 'RECHAZADO',
  BAJA: 'BAJA'
} as const;

export const METODOS_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA',
  CREDITO: 'CREDITO',
  YAPE: 'YAPE',
  PLIN: 'PLIN'
} as const;

// ============================================
// INTERFACES PARA NOTAS DE CRÉDITO/DÉBITO
// ============================================

export interface ComprobanteReferencia {
  id: number;
  serie: string;
  correlativo: string;
  tipo_comprobante: string;
  numero_completo: string;
}

export interface NotaCredito {
  id: number;
  serie: string;
  numero: string;
  serie_comprobante_ref: string;
  numero_comprobante_ref: string;
  tipo_comprobante_ref: string;
  venta_id: number;
  cliente_id: number;
  fecha_emision: string;
  motivo: string;
  tipo_nota_credito: string;
  subtotal: string | number;
  igv: string | number;
  total: string | number;
  moneda: string;
  estado: string; // 'pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado'
  xml: string | null;
  cdr: string | null;
  hash: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  pdf_url?: string;
  xml_url?: string;
  cdr_url?: string | null;
  tipo_nota_credito_nombre?: string;
  cliente?: Cliente;
  venta?: any;
}

export interface NotaDebito {
  id: number;
  serie: string;
  numero: string;
  serie_comprobante_ref: string;
  numero_comprobante_ref: string;
  tipo_comprobante_ref: string;
  venta_id: number;
  cliente_id: number;
  fecha_emision: string;
  motivo: string;
  tipo_nota_debito: string;
  subtotal: string | number;
  igv: string | number;
  total: string | number;
  moneda: string;
  estado: string; // 'pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado'
  xml: string | null;
  cdr: string | null;
  hash: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  pdf_url?: string;
  xml_url?: string;
  cdr_url?: string | null;
  tipo_nota_debito_nombre?: string;
  cliente?: Cliente;
  venta?: any;
}

export interface NotaCreditoCreateRequest {
  comprobante_referencia_id: number;
  motivo_nota: string;
  motivo_nota_descripcion?: string;
  productos: Array<{
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
  }>;
  observaciones?: string;
}

export interface NotaDebitoCreateRequest {
  comprobante_referencia_id: number;
  motivo_nota: string;
  motivo_nota_descripcion?: string;
  productos: Array<{
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
  }>;
  observaciones?: string;
}

export interface NotasEstadisticas {
  total_notas: number;
  monto_total: string | number;
  por_estado: Array<{
    estado: string;
    cantidad: number;
    monto: string | number;
  }>;
  periodo: {
    inicio: string;
    fin: string;
  };
}

export interface NotasPaginatedResponse {
  current_page: number;
  data: NotaCredito[] | NotaDebito[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export const TIPOS_NOTA_CREDITO = {
  ANULACION_OPERACION: '01',
  ANULACION_ERROR_RUC: '02',
  CORRECCION_ERROR_DESCRIPCION: '03',
  DESCUENTO_GLOBAL: '04',
  DESCUENTO_ITEM: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_VALOR: '09',
  OTROS: '10'
} as const;

export const TIPOS_NOTA_DEBITO = {
  INTERESES_MORA: '01',
  AUMENTO_VALOR: '02',
  PENALIDADES: '03',
  AJUSTES_EXPORTACION: '10',
  AJUSTES_IVAP: '11'
} as const;

export const ESTADOS_NOTA = {
  PENDIENTE: 'pendiente',
  GENERADO: 'generado',
  ENVIADO: 'enviado',
  ACEPTADO: 'aceptado',
  RECHAZADO: 'rechazado',
  ANULADO: 'anulado'
} as const;


