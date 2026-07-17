// src/app/types/sobre-nosotros.types.ts

export interface EmpresaValor {
  id: number;
  titulo: string;
  descripcion?: string;
  imagen?: string;
  imagen_url?: string;
  orden: number;
  activo: boolean;
}

export interface EmpresaValorForm {
  titulo: string;
  descripcion?: string;
  imagen?: File;
  orden?: number;
  activo?: boolean;
}

export interface EmpresaHito {
  id: number;
  anio: string;
  descripcion: string;
  imagen?: string;
  imagen_url?: string;
  orden: number;
  activo: boolean;
}

export interface EmpresaHitoForm {
  anio: string;
  descripcion: string;
  imagen?: File;
  orden?: number;
  activo?: boolean;
}

export interface EmpresaPremio {
  id: number;
  titulo: string;
  anio?: string;
  imagen?: string;
  imagen_url?: string;
  orden: number;
  activo: boolean;
}

export interface EmpresaPremioForm {
  titulo: string;
  anio?: string;
  imagen?: File;
  orden?: number;
  activo?: boolean;
}

export interface EmpresaBannerNosotros {
  id: number;
  imagen: string;
  imagen_url?: string;
  titulo?: string;
  subtitulo?: string;
  orden: number;
  activo: boolean;
}

export interface EmpresaBannerNosotrosForm {
  titulo?: string;
  subtitulo?: string;
  imagen?: File;
  orden?: number;
  activo?: boolean;
}

export interface EmpresaMetodoPago {
  id: number;
  nombre: string;
  imagen?: string;
  imagen_url?: string;
  orden: number;
  activo: boolean;
}

export interface EmpresaMetodoPagoForm {
  nombre: string;
  imagen?: File;
  orden?: number;
  activo?: boolean;
}

export interface SobreNosotrosPublico {
  nombre_empresa?: string;
  descripcion?: string;
  imagen_descripcion_url?: string;
  sobre_nosotros?: string;
  imagen_introduccion_url?: string;
  duracion_banner_segundos?: number;
  horario_atencion?: string;
  direccion?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  banners: EmpresaBannerNosotros[];
  valores: EmpresaValor[];
  hitos: EmpresaHito[];
  premios: EmpresaPremio[];
}
