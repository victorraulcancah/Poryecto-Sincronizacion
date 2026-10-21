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

  // Si hay token, añadirlo a los headers
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Continuar con la petición y manejar errores
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Sanctum contesta 401 "Unauthenticated." cuando el token ya no existe: la cuenta se abrió en otro
      // dispositivo (cada login revoca los tokens anteriores) o el token venció. Los demás 401 son respuestas de
      // negocio ("Acceso no autorizado") y no cierran la sesión. Se compara con el token que llevaba ESTA petición
      // para que una respuesta tardía no cierre una sesión nueva iniciada entre tanto.
      const tokenRevocado =
        error.status === 401 &&
        !!token &&
        error.error?.message === 'Unauthenticated.' &&
        token === authService.getToken();

      if (tokenRevocado) {
        authService.cerrarSesionInvalida();
      }
      return throwError(() => error);
    })
  );
};