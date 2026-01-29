export type PopupSize = 'small' | 'medium' | 'large' | 'fullscreen';
export type PopupPosition = 'center' | 'bottom-right' | 'top-center' | 'bottom-center';
export type PopupTheme = 'light' | 'dark' | 'gradient';
export type PopupAnimation = 'fade' | 'slide' | 'zoom';
export type PopupAspectRatio = '16:9' | '4:3' | '1:1' | 'auto';

export interface Popup {
  id: number;
  recompensa_id: number;
  titulo: string;
  descripcion?: string;
  imagen_popup?: string;
  imagen_popup_url?: string;
  texto_boton: string;
  url_destino: string;
  mostrar_cerrar: boolean;
  auto_cerrar_segundos?: number;
  popup_activo: boolean;
  esta_activo: boolean;
  tiene_auto_cierre: boolean;
  // Nuevas propiedades de configuración visual
  size?: PopupSize;
  position?: PopupPosition;
  theme?: PopupTheme;
  blur_backdrop?: boolean;
  close_on_backdrop?: boolean;
  animation?: PopupAnimation;
  imagen_aspect_ratio?: PopupAspectRatio;
  recompensa?: {
    id: number;
    nombre: string;
    tipo: string;
    tipo_nombre?: string;
    estado: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  recompensa_info?: {
    id: number;
    nombre: string;
    tipo: string;
    estado: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PopupCreateRequest {
  titulo: string;
  descripcion?: string;
  imagen_popup?: File;
  texto_boton?: string;
  url_destino?: string;
  mostrar_cerrar?: boolean;
  auto_cerrar_segundos?: number;
  popup_activo?: boolean;
  // Nuevas propiedades de configuración visual
  size?: PopupSize;
  position?: PopupPosition;
  theme?: PopupTheme;
  blur_backdrop?: boolean;
  close_on_backdrop?: boolean;
  animation?: PopupAnimation;
  imagen_aspect_ratio?: PopupAspectRatio;
}

export interface PopupUpdateRequest {
  titulo?: string;
  descripcion?: string;
  imagen_popup?: File;
  texto_boton?: string;
  url_destino?: string;
  mostrar_cerrar?: boolean;
  auto_cerrar_segundos?: number;
  popup_activo?: boolean;
  // Nuevas propiedades de configuración visual
  size?: PopupSize;
  position?: PopupPosition;
  theme?: PopupTheme;
  blur_backdrop?: boolean;
  close_on_backdrop?: boolean;
  animation?: PopupAnimation;
  imagen_aspect_ratio?: PopupAspectRatio;
}

export interface PopupStats {
  total_popups: number;
  popups_activos: number;
  popups_inactivos: number;
  popups_con_auto_cierre: number;
  popups_sin_auto_cierre: number;
  distribucion_por_estado: {
    activos: number;
    inactivos: number;
  };
  configuraciones_comunes: {
    con_imagen: number;
    sin_imagen: number;
    con_auto_cierre: number;
    sin_auto_cierre: number;
  };
}

export interface RecompensaConPopups {
  id: number;
  nombre: string;
  tipo: string;
  tipo_nombre: string;
  estado: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  vigente: boolean;
  productos_count: number;
  popups_count: number;
  popups_activos_count: number;
  popup_status: 'con_popups' | 'sin_popups';
  created_at: string;
  updated_at: string;
}

export interface PopupFilters {
  nombre?: string;
  tipo?: string;
  estado?: string;
  page?: number;
  per_page?: number;
}

export interface PopupResponse {
  success: boolean;
  message: string;
  data: {
    recompensa?: {
      id: number;
      nombre: string;
      tipo: string;
      estado: string;
    };
    popups?: Popup[];
    total_popups?: number;
  };
}

export interface PopupListResponse {
  success: boolean;
  message: string;
  data: {
    recompensas: RecompensaConPopups[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export interface PopupStatsResponse {
  success: boolean;
  message: string;
  data: PopupStats;
}

export interface NotificacionRequest {
  cliente_ids: number[];
}

export interface NotificacionResponse {
  success: boolean;
  message: string;
  data: {
    total_enviadas: number;
    total_solicitadas: number;
    notificaciones_duplicadas: number;
  };
}

export interface NotificacionStats {
  total_notificaciones: number;
  por_estado: {
    enviadas: number;
    vistas: number;
    cerradas: number;
    expiradas: number;
  };
  tasa_apertura: number;
  tasa_cierre: number;
  clientes_unicos: number;
  distribucion_temporal: Array<{
    fecha: string;
    total: number;
    vistas: number;
  }>;
}

export interface NotificacionStatsResponse {
  success: boolean;
  message: string;
  data: NotificacionStats;
}