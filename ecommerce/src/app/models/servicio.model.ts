export interface Servicio {
  id?: number;
  codigo_servicio?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  unidad_medida?: string;
  tipo_afectacion_igv?: string;
  mostrar_igv: boolean;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServicioListResponse {
  current_page: number;
  data: Servicio[];
  total: number;
  per_page: number;
  last_page?: number;
}

export interface ServicioResponse {
  success: boolean;
  data: Servicio;
  message?: string;
}
