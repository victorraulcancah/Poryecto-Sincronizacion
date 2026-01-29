import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';
import { AuthService } from '../services/auth.service';


export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);
  const authService = inject(AuthService);

  const requiredPermission = route.data['permission'] as string;

  if (!requiredPermission) {
    return true; // Si no se especifica permiso, permitir acceso
  }

  // Verificar si el usuario es admin (acceso total)
  const currentUser = authService.getCurrentUser();
  if (currentUser?.tipo_usuario === 'admin') {
    console.log('🔓 Usuario admin - Acceso permitido a:', route.routeConfig?.path);
    return true;
  }

  if (permissionsService.hasPermission(requiredPermission)) {
    return true;
  }

  console.log('🚫 Acceso denegado - Usuario:', currentUser?.email, 'Permiso requerido:', requiredPermission);
  
  // Redirigir a página de acceso denegado (o dashboard con error)
  router.navigate(['/dashboard'], { 
    queryParams: { error: 'access_denied' } 
  });
  return false;
};
