// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener el token
  const token = authService.getToken();

  // Endpoints que NO deben enviar token de autenticación
  // Según especificaciones del backend, el endpoint de popups con user_cliente_id NO debe enviar token
  const urlsWithoutToken = [
    '/cliente/recompensas/popups-activos',
    '/publico/recompensas/popups-activos'
  ];

  const shouldSkipToken = urlsWithoutToken.some(url => req.url.includes(url));

  // Si hay token Y la URL NO está en la lista de exclusión, añadirlo a los headers
  if (token && !shouldSkipToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Continuar con la petición y manejar errores
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 (Unauthorized), limpiar la sesión y redirigir al login
      if (error.status === 401) {
        // Solo limpiar sesión si el usuario estaba logueado
        if (authService.isLoggedIn()) {
          authService.logout();
        }
      }
      return throwError(() => error);
    })
  );
};