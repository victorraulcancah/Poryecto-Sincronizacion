import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const originInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo agregar headers para peticiones al backend de 7power
  if (req.url.includes(environment.apiUrl)) {
    const modifiedReq = req.clone({
      setHeaders: {
        'X-Company-Id': '1' // ID de la empresa en la base de datos de 7power
      }
    });
    return next(modifiedReq);
  }
  
  return next(req);
};
