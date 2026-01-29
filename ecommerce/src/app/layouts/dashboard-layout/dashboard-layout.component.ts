// src/app/layouts/dashboard-layout/dashboard-layout.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebarComponent } from './dashboard-sidebar/dashboard-sidebar.component';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { PopupWrapperComponent } from '../../components/popup-wrapper/popup-wrapper.component';
import { AuthService } from '../../services/auth.service';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DashboardSidebarComponent,
    DashboardHeaderComponent,
    PopupWrapperComponent
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  
  isSidebarOpen = false;
  isSidebarCollapsed = false; 
  isDesktop = false;
  public esSuperadmin: boolean = false;
  puedeVerUsuarios = false;

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService
  ) {
      // Escuchar cambios de permisos
    window.addEventListener('permissionsUpdated', () => {
      this.puedeVerUsuarios = this.permissionsService.hasPermission('usuarios.ver');
    });
  }

 // In dashboard-sidebar.component.ts - Update the ngOnInit method
ngOnInit(): void {
  const currentUser = this.authService.getCurrentUser();
  // Usar getRoleNames() de Spatie que devuelve un array
  this.esSuperadmin = currentUser?.roles?.includes('superadmin') ?? false; 
  this.puedeVerUsuarios = this.permissionsService.hasPermission('usuarios.ver');
  this.checkScreenSize();
}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isDesktop = window.innerWidth >= 992;
    if (this.isDesktop) {
      this.isSidebarOpen = true;
    } else {
      this.isSidebarOpen = false;
      this.isSidebarCollapsed = false; 
    }
  }

onSidebarCollapse(isCollapsed: boolean): void {
  this.isSidebarCollapsed = isCollapsed;

  // Emitir inmediatamente para evitar espacio en blanco
  window.dispatchEvent(new Event('sidebarChanged'));

  // Emitir al final de la animación para el ajuste fino
  setTimeout(() => {
    window.dispatchEvent(new Event('sidebarChanged'));
  }, 320);
}

toggleSidebar(): void {
  this.isSidebarOpen = !this.isSidebarOpen;
  console.log('🍔 Toggle Sidebar - isSidebarOpen:', this.isSidebarOpen);

  // Emitir inmediatamente para evitar espacio en blanco
  window.dispatchEvent(new Event('sidebarChanged'));

  // Emitir al final de la animación para el ajuste fino
  setTimeout(() => {
    window.dispatchEvent(new Event('sidebarChanged'));
  }, 320);
}


  onSidebarToggle(isOpen: boolean): void {
    this.isSidebarOpen = isOpen;
  }



  closeSidebar(): void {
    if (!this.isDesktop) {
      this.isSidebarOpen = false;
    }
  }
}