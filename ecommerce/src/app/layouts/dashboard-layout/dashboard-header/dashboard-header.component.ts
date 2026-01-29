// src/app/layouts/dashboard-layout/dashboard-header/dashboard-header.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-header.component.html',
  styleUrls: ['./dashboard-header.component.scss']
})
export class DashboardHeaderComponent implements OnInit {

  @Output() toggleSidebar = new EventEmitter<void>();

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  getAvatarInitials(): string {
    const user = this.authService.getCurrentUser();
    const role = user?.roles?.[0];

    if (role === 'superadmin') {
      return 'SA';
    }

    // Fallback to user name if available, otherwise role, otherwise 'US'
    const name = user?.name || role || 'Usuario';

    if (name) {
      const words = name.split(' ');
      if (words.length > 1) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }

    return 'US'; // Default initials
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

isDropdownOpen = false;

toggleDropdown(): void {
  this.isDropdownOpen = !this.isDropdownOpen;
}

closeDropdown(): void {
  this.isDropdownOpen = false;
}

logout(): void {
  this.closeDropdown();
  this.authService.logout().subscribe({
    next: () => {
      // Cambia '/login' por la ruta correcta que tengas
      this.router.navigate(['/account']); // o la ruta que uses para login
    },
    error: (error) => {
      console.error('Error al cerrar sesión:', error);
      // Aún así redirigir al login
      this.router.navigate(['/account']);
    }
  });
}
}