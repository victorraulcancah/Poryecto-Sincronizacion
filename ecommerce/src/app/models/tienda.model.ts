export interface Tienda {
  id: number;
  nombre: string;
  descripcion?: string;
  logo?: string;
  estado: 'ACTIVA' | 'INACTIVA';
  created_at?: string;
  updated_at?: string;
}

export interface CrearTiendaDto {
  nombre: string;
  descripcion?: string;
  logo?: string;
  estado?: 'ACTIVA' | 'INACTIVA';
}

export interface ActualizarTiendaDto {
  nombre?: string;
  descripcion?: string;
  logo?: string;
  estado?: 'ACTIVA' | 'INACTIVA';
}
