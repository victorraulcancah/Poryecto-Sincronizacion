import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MotorizadoGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/account']);
      return false;
    }

    if (!this.authService.isMotorizado()) {
      // Redirigir según el tipo de usuario
      const userType = this.authService.getUserType();
      switch(userType) {
        case 'admin':
          this.router.navigate(['/dashboard']);
          break;
        case 'cliente':
          this.router.navigate(['/']);
          break;
        default:
          this.router.navigate(['/account']);
      }
      return false;
    }

    return true;
  }
}