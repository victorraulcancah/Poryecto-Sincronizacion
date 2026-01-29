// src/app/component/auth-menu/auth-menu.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-auth-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-menu.component.html',
  styleUrl: './auth-menu.component.scss'
})
export class AuthMenuComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  isAuthMenuOpen = false;
  isUserMenuOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isLoggedIn = !!user;
        this.currentUser = user;
        
        // Cerrar menús cuando cambie el estado de autenticación
        this.isAuthMenuOpen = false;
        this.isUserMenuOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleAuthMenu(): void {
    this.isAuthMenuOpen = !this.isAuthMenuOpen;
    this.isUserMenuOpen = false; // Cerrar el otro menú
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isAuthMenuOpen = false; // Cerrar el otro menú
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Forzar logout local aunque falle el servidor
        this.authService.clearLocalSession();
        this.router.navigate(['/']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.auth-menu-wrapper')) {
      this.isAuthMenuOpen = false;
      this.isUserMenuOpen = false;
    }
  }
}