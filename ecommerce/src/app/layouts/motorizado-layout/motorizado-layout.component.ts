import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-motorizado-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './motorizado-layout.component.html',
  styleUrl: './motorizado-layout.component.scss'
})
export class MotorizadoLayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isOnline = false;
  pedidosPendientes = 0;
  notificacionesCount = 0;
  sidebarCollapsed = false;
  currentTime = new Date();

  // Actualizar datos cada minuto
  private intervalId: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // Si no hay usuario o datos incompletos, usar datos por defecto
    if (!this.currentUser) {
      this.currentUser = {
        id: 1,
        name: 'Emer Gonzales',
        numero_unidad: 'MOT-003',
        email: 'emer@motorizado.com',
        tipo_usuario: 'motorizado', // Importante para el guard
        roles: ['motorizado'],
        permissions: ['pedidos.ver', 'pedidos.aceptar', 'rutas.ver'],
        estadisticas: {
          pedidos_pendientes: 3,
          pedidos_asignados: 8,
          pedidos_entregados: 12
        }
      } as User;
    }

    // Asegurar que tiene el tipo correcto y propiedades requeridas
    if (this.currentUser) {
      if (!this.currentUser.tipo_usuario) {
        this.currentUser.tipo_usuario = 'motorizado';
      }
      if (!this.currentUser.roles) {
        this.currentUser.roles = ['motorizado'];
      }
      if (!this.currentUser.permissions) {
        this.currentUser.permissions = ['pedidos.ver', 'pedidos.aceptar', 'rutas.ver'];
      }
      if (!this.currentUser.estadisticas) {
        this.currentUser.estadisticas = {
          pedidos_pendientes: 3,
          pedidos_asignados: 8,
          pedidos_entregados: 12
        };
      }
    }

    // Para desarrollo: simular que está logueado como motorizado
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      localStorage.setItem('user_type', 'motorizado');
      localStorage.setItem('isLoggedIn', 'true');
    }

    this.pedidosPendientes = this.currentUser?.estadisticas?.pedidos_pendientes || 3;
    this.notificacionesCount = 3; // Simulado
    this.isOnline = true; // Simulado - debería conectarse al estado real

    // Actualizar tiempo cada minuto
    this.intervalId = setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'M';
    const names = this.currentUser.name.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return 'M';
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }
}