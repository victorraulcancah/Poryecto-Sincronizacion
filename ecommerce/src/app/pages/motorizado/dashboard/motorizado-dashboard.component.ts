import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

interface Notificacion {
  tipo: 'info' | 'warning' | 'success' | 'error';
  titulo: string;
  mensaje: string;
  fecha: Date;
  nuevo?: boolean;
  accion_url?: string;
  accion_texto?: string;
}

@Component({
  selector: 'app-motorizado-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./motorizado-dashboard.component.html",
  styleUrl: "./motorizado-dashboard.component.scss"
})
export class MotorizadoDashboardComponent implements OnInit {
  currentUser: User | null = null;
  isOnline = false;
  estadisticas: any = {};

  notificaciones: Notificacion[] = [
    {
      tipo: 'info',
      titulo: 'Nuevo pedido asignado',
      mensaje: 'Se te ha asignado un pedido en Lima Centro',
      fecha: new Date(),
      nuevo: true,
      accion_url: '/motorizado/pedidos',
      accion_texto: 'Ver pedido'
    },
    {
      tipo: 'success',
      titulo: 'Entrega completada',
      mensaje: 'Has completado exitosamente la entrega del pedido #12345',
      fecha: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
      nuevo: false
    },
    {
      tipo: 'warning',
      titulo: 'Ruta actualizada',
      mensaje: 'Tu ruta de entregas ha sido optimizada con nuevos pedidos',
      fecha: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      nuevo: false,
      accion_url: '/motorizado/rutas',
      accion_texto: 'Ver ruta'
    }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // Si no hay usuario, usar datos por defecto
    if (!this.currentUser) {
      this.currentUser = {
        id: 1,
        name: 'Emer Gonzales',
        numero_unidad: 'MOT-003',
        email: 'emer@motorizado.com',
        tipo_usuario: 'motorizado',
        roles: ['motorizado'],
        permissions: ['pedidos.ver', 'pedidos.aceptar', 'rutas.ver'],
        estadisticas: {
          pedidos_pendientes: 3,
          pedidos_asignados: 8,
          pedidos_entregados: 12
        }
      } as User;
    }

    // Inicializar estadísticas con valores por defecto para demo
    this.estadisticas = this.currentUser?.estadisticas || {
      pedidos_pendientes: 3,
      pedidos_asignados: 8,
      pedidos_entregados: 12,
      ganancias_dia: '85.50'
    };
  }

  toggleStatus(): void {
    this.isOnline = !this.isOnline;
    // Aquí se haría la llamada al backend para actualizar el estado
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      // El AuthService ya maneja la redirección
    });
  }

  getNotificationIcon(tipo: string): string {
    switch(tipo) {
      case 'info': return 'ph ph-info';
      case 'warning': return 'ph ph-warning';
      case 'success': return 'ph ph-check-circle';
      case 'error': return 'ph ph-x-circle';
      default: return 'ph ph-bell';
    }
  }

  getProgressWidth(tipo: string): number {
    const total = 100; // Meta diaria
    switch(tipo) {
      case 'pendientes':
        return Math.min((this.estadisticas?.pedidos_pendientes || 0) / 10 * 100, 100);
      case 'asignados':
        return Math.min((this.estadisticas?.pedidos_asignados || 0) / 15 * 100, 100);
      case 'entregados':
        return Math.min((this.estadisticas?.pedidos_entregados || 0) / 20 * 100, 100);
      case 'ganancias':
        const ganancias = parseFloat(this.estadisticas?.ganancias_dia || 0);
        const metaGanancias = 200; // Meta diaria de S/ 200
        return Math.min((ganancias / metaGanancias) * 100, 100);
      default:
        return 0;
    }
  }

  getTipoTexto(tipo: string): string {
    switch(tipo) {
      case 'info': return 'Información';
      case 'warning': return 'Advertencia';
      case 'success': return 'Éxito';
      case 'error': return 'Error';
      default: return 'Notificación';
    }
  }

  getTimeAgo(fecha: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();

    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) {
      return 'Ahora mismo';
    } else if (minutos < 60) {
      return `Hace ${minutos} min`;
    } else if (horas < 24) {
      return `Hace ${horas}h`;
    } else {
      return `Hace ${dias}d`;
    }
  }
}