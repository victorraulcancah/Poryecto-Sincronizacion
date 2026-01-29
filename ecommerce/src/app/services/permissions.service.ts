// src\app\services\permissions.service.ts
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
private permissionsSubject = new BehaviorSubject<string[]>([]);
public permissions$: Observable<string[]> = this.permissionsSubject.asObservable();


 constructor(private authService: AuthService) {
  // Evitar error en SSR verificando si estamos en el navegador
  if (typeof window !== 'undefined' && localStorage) {
    const userData = localStorage.getItem('current_user');
    if (userData) {
      const user = JSON.parse(userData);
      this.setPermissions(user.permissions || []);
    }
  }
}


   public refreshPermissions(): Observable<any> {
  return this.authService.refreshPermissions();
}

   setPermissions(permissions: string[]): void {
    this.permissionsSubject.next(permissions);
  }

  hasPermission(permission: string): boolean {
    const user = this.authService.getCurrentUser();
    return user?.permissions?.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasRole(role: string): boolean {
    const user = this.authService.getCurrentUser();
    return user?.roles?.includes(role) ?? false;
  }

  canAccess(permission: string): Observable<boolean> {
    return this.authService.currentUser.pipe(
      map(user => user?.permissions?.includes(permission) ?? false)
    );
  }

  // Nuevo método para actualizar permisos en tiempo real
  updatePermissions(newPermissions: string[]): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      user.permissions = newPermissions;
      localStorage.setItem('current_user', JSON.stringify(user));
      this.authService.setCurrentUser(user);
      this.setPermissions(newPermissions);
    }
  }

  // Método para verificar permisos en tiempo real
  hasPermissionRealTime(permission: string): Observable<boolean> {
    return this.permissions$.pipe(
      map(permissions => permissions.includes(permission))
    );
  }

  // Métodos específicos para módulos de almacén
  canViewProductos(): boolean {
    return this.hasPermission('productos.ver');
  }

  canCreateProductos(): boolean {
    return this.hasPermission('productos.create');
  }

  canEditProductos(): boolean {
    return this.hasPermission('productos.edit');
  }

  canDeleteProductos(): boolean {
    return this.hasPermission('productos.delete');
  }

  canViewCategorias(): boolean {
    return this.hasPermission('categorias.ver');
  }

  canCreateCategorias(): boolean {
    return this.hasPermission('categorias.create');
  }

  canEditCategorias(): boolean {
    return this.hasPermission('categorias.edit');
  }

  canDeleteCategorias(): boolean {
    return this.hasPermission('categorias.delete');
  }

  canViewMarcas(): boolean {
    return this.hasPermission('marcas.ver');
  }

  canCreateMarcas(): boolean {
    return this.hasPermission('marcas.create');
  }

  canEditMarcas(): boolean {
    return this.hasPermission('marcas.edit');
  }

  canDeleteMarcas(): boolean {
    return this.hasPermission('marcas.delete');
  }

  canViewSecciones(): boolean {
    return this.hasPermission('secciones.ver');
  }

  canCreateSecciones(): boolean {
    return this.hasPermission('secciones.create');
  }

  canEditSecciones(): boolean {
    return this.hasPermission('secciones.edit');
  }

  canDeleteSecciones(): boolean {
    return this.hasPermission('secciones.delete');
  }

  // Métodos específicos para información de empresa
  canViewEmpresaInfo(): boolean {
    return this.hasPermission('empresa_info.ver');
  }

  canEditEmpresaInfo(): boolean {
    return this.hasPermission('empresa_info.edit');
  }

  // Métodos específicos para envío de correos
  canViewEmailTemplates(): boolean {
    return this.hasPermission('envio_correos.ver');
  }

  canEditEmailTemplates(): boolean {
    return this.hasPermission('envio_correos.edit');
  }

  // Métodos específicos para motorizados
  canViewMotorizados(): boolean {
    return this.hasPermission('motorizados.ver');
  }

  canCreateMotorizados(): boolean {
    return this.hasPermission('motorizados.create');
  }

  canShowMotorizados(): boolean {
    return this.hasPermission('motorizados.show');
  }

  canEditMotorizados(): boolean {
    return this.hasPermission('motorizados.edit');
  }

  canDeleteMotorizados(): boolean {
    return this.hasPermission('motorizados.delete');
  }

}
