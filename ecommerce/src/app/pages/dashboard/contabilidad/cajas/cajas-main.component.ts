import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cajas-main',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="cajas-container">
      <div class="cajas-header">
        <h1>Gestión de Cajas</h1>
      </div>

      <nav class="cajas-nav">
        <a routerLink="/dashboard/contabilidad/cajas" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          Cajas
        </a>
        <a routerLink="/dashboard/contabilidad/cajas/tiendas" routerLinkActive="active">
          Tiendas
        </a>
        <a routerLink="/dashboard/contabilidad/cajas/caja-chica" routerLinkActive="active">
          Caja Chica
        </a>
        <a routerLink="/dashboard/contabilidad/cajas/flujo-caja" routerLinkActive="active">
          Flujo de Caja
        </a>
      </nav>

      <div class="cajas-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .cajas-container {
      padding: 20px;
    }

    .cajas-header {
      margin-bottom: 20px;
    }

    .cajas-header h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
    }

    .cajas-nav {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 24px;
    }

    .cajas-nav a {
      padding: 12px 24px;
      text-decoration: none;
      color: #6b7280;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .cajas-nav a:hover {
      color: #1a1a1a;
    }

    .cajas-nav a.active {
      color: var(--primary-color, #3b82f6);
      border-bottom-color: var(--primary-color, #3b82f6);
    }

    .cajas-content {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class CajasMainComponent {}
