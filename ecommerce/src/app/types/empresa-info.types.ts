// src/types/empresa-info.types.ts

export interface EmpresaInfo {
  id: number;
  nombre_empresa: string;
  ruc: string;
  razon_social: string;
  direccion: string;
  telefono?: string;
  celular?: string;
  email?: string;
  website?: string;
  logo?: string;
  logo_url?: string;
  descripcion?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
  horario_atencion?: string;
  created_at: string;
  updated_at: string;
}

export interface EmpresaInfoCreate {
  nombre_empresa: string;
  ruc: string;
  razon_social: string;
  direccion: string;
  telefono?: string;
  celular?: string;
  email?: string;
  website?: string;
  logo?: File;
  descripcion?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
  horario_atencion?: string;
}