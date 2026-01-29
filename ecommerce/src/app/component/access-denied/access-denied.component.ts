import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6 text-center">
          <div class="card">
            <div class="card-body">
              <i class="ph ph-lock text-danger" style="font-size: 4rem;"></i>
              <h3 class="mt-3">Acceso Denegado</h3>
              <p class="text-muted">No tienes permisos para acceder a esta sección.</p>
              <a routerLink="/dashboard" class="btn btn-primary">
                Volver al Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccessDeniedComponent {}