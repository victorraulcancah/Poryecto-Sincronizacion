export class Cliente {
  id_cliente: number = 0;
  tipo_documento_id: number = 0;
  numero_documento: string = '';
  nombres: string = '';
  apellidos: string = '';
  email: string = '';
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: 'M' | 'F' | 'Otro';
  contrasena_hash?: string;
  foto?: string;
  tipo_login: 'manual' | 'google' | 'facebook' = 'manual';
  fecha_registro: string = '';
  estado: boolean = true;
  nombre_completo?: string;
  tipo_documento?: TipoDocumento;
  direccion_principal?: ClienteDireccion;
  direcciones?: ClienteDireccion[];
}

export interface ClienteDireccion {
  id_direccion: number;
  cliente_id: number;
  nombre_destinatario: string;
  direccion_completa: string;
  ubigeo_id: number;
  codigo_postal?: string;
  es_principal: boolean;
  fecha_creacion: string;
  ubigeo?: UbigeoInfo;
}

export interface TipoDocumento {
  id: number;
  nombre: string;
  created_at: string;
  updated_at: string;
}

export interface UbigeoInfo {
  id_ubigeo: number;
  departamento: string;
  provincia: string;
  distrito: string;
  nombre: string;
}

export interface ClienteEstadisticas {
  total_pedidos: number;
  total_gastado: number;
  ultima_compra: string;
  productos_favoritos: string[];
  porcentaje_entregados: number;
}

export interface ClientePedido {
  id: number;
  fecha: string;
  estado: string;
  monto: number;
  metodo_pago: string;
}

export interface ClienteCupon {
  codigo: string;
  descuento: string;
  fecha_uso: string;
  pedido_id: number;
}

export interface ClienteDetalle {
  cliente: Cliente;
  estadisticas: ClienteEstadisticas;
  pedidos: ClientePedido[];
  cupones: ClienteCupon[];
}

export interface ClientesResponse {
  status: string;
  data: {
    data: Cliente[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ClientesFiltros {
  search?: string;
  estado?: boolean | string;
  tipo_login?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  per_page?: number;
  page?: number;
}

export interface EstadisticasGenerales {
  total_clientes: number;
  clientes_activos: number;
  clientes_nuevos: number;
}


