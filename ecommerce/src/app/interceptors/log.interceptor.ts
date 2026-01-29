import { HttpInterceptorFn } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export const logInterceptor: HttpInterceptorFn = (req, next) => { // ✅ interceptor funcional
  return next(req).pipe( // ✅ usamos pipe para "interceptar" lo que viene después
    tap(event => { // ✅ usamos tap para ejecutar una acción cuando llegue una respuesta
      if (event instanceof HttpResponse) { // ✅ verificamos si el evento es una respuesta HTTP
        // console.log('Respuesta del backend:', event.body); // ✅ mostramos la respuesta en consola
      }
    })
  );
};
