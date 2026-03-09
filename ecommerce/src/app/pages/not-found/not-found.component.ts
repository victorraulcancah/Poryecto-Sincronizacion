import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="py-120">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6 text-center">
            <h1 class="display-1 fw-bold text-main-600 mb-3">404</h1>
            <h3 class="mb-3">Página no encontrada</h3>
            <p class="text-gray-500 mb-4">
              Lo sentimos, la página que buscas no existe o ha sido movida.
            </p>
            <a routerLink="/" class="btn btn-main rounded-pill px-4 py-2">
              <i class="ph ph-house me-2"></i>Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class NotFoundComponent {}
