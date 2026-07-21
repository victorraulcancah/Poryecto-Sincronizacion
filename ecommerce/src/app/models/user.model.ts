// src/app/models/user.model.ts
export interface User {
  id: number;
  name?: string;
  email: string;
  roles: string[];
  permissions: string[];
  tipo_usuario?: 'admin' | 'cliente' | 'motorizado';
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;

  // Información de perfil
  telefono?: string;
  direccion?: string;
  avatar?: string;
  nombre_completo?: string;
  numero_documento?: string;
  tipo_documento?: string;

  // Datos de facturación (RUC/razón social), guardados aparte del DNI:
  // un mismo cliente puede pedir Boleta (con su DNI) o Factura (con su RUC).
  ruc?: string;
  razon_social?: string;

  // Para clientes - foto de perfil
  foto_url?: string;
  foto?: string;

  // Para motorizados
  motorizado_id?: number;
  username?: string;
  numero_unidad?: string;
  estadisticas?: {
    pedidos_asignados?: number;
    pedidos_entregados?: number;
    pedidos_pendientes?: number;
  };
}

export interface Role {
  id: number;
  nombre: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  tipo_usuario: 'admin' | 'cliente' | 'motorizado';
  user: {
    id: number;
    name?: string;
    nombre_completo?: string; // Para clientes
    email: string;
    roles: string[];
    permissions: string[];
    email_verified_at?: string;
    telefono?: string;
    numero_documento?: string;
    tipo_documento?: string;
    ruc?: string;
    razon_social?: string;

    // Para clientes - foto de perfil
    foto_url?: string;
    foto?: string;

    // Para motorizados
    motorizado_id?: number;
    username?: string;
    numero_unidad?: string;
    estadisticas?: {
      pedidos_asignados?: number;
      pedidos_entregados?: number;
      pedidos_pendientes?: number;
    };
  };
  token: string;
}
