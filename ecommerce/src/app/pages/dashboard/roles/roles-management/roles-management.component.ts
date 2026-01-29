import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { RolesService } from "../../../../services/roles.service"
import { Role, Permission, PermissionGroup } from "../../../../models/role.model"
import { PermissionModalComponent } from "../permission-modal/permission-modal.component"
import { AuthService } from '../../../../services/auth.service'; // <-- ruta ejemplo
import { PermissionsService } from '../../../../services/permissions.service'; // <-- ruta ejemplo
import Swal from 'sweetalert2'


@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PermissionModalComponent],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h4 class="card-title mb-0">Gestión de Roles y Permisos</h4>
              <!-- <button class="btn btn-primary" (click)="openCreateRoleModal()">
                <i class="fas fa-plus"></i> Nuevo Rol
              </button> -->
            </div>
            <div class="card-body">
              <!-- Lista de Roles -->
              <div class="row">
                <div class="col-md-3">
                  <h5>Roles Disponibles</h5>
                  <div class="list-group">
                    <button 
                      type="button" 
                      class="list-group-item list-group-item-action"
                      [class.active]="selectedRole?.id === role.id"
                      *ngFor="let role of roles"
                      (click)="selectRole(role)">
                      <div class="d-flex w-100 justify-content-between">
                        <!-- Eliminado: {{ role.name }} - reemplazado por titlecase para capitalizar -->
                        <h6 class="mb-1">{{ role.name | titlecase }}</h6> <!-- ← MODIFICADO: agregado | titlecase -->
                        <!-- <button 
                          class="btn btn-sm btn-outline-danger"
                          (click)="deleteRole(role.id, $event)"
                          [disabled]="role.name === 'superadmin'">
                          <i class="fas fa-trash"></i>
                        </button> -->
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Panel de Permisos -->
                <div class="col-md-9">
                  <div *ngIf="selectedRole" class="permissions-panel">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <h5>Permisos para: {{ selectedRole.name | titlecase }}</h5> <!-- ← MODIFICADO: agregado | titlecase -->
                      <!-- Eliminado: class="btn btn-success" - cambiado por btn-primary para usar estilos del botón eliminado -->
                      <button 
                        class="btn btn-primary" 
                        (click)="savePermissions()"
                        [disabled]="!hasChanges">
                        <i class="fas fa-save"></i> Guardar Cambios
                      </button>
                    </div>

                    <!-- Filtro de búsqueda -->
                    <div class="mb-3">
                      <input 
                        type="text" 
                        class="form-control" 
                        placeholder="Buscar permisos..."
                        [(ngModel)]="searchFilter"
                        (input)="filterPermissions()">
                    </div>

                    <!-- Tabla de Permisos por Módulo -->
                    <div class="table-responsive">
                      <!-- Eliminado: tabla anterior con nombres de permisos visibles y columna "Acciones" -->
                      <table class="table table-bordered">
                        <thead class="table-dark">
                          <tr>
                            <th>Módulo</th>
                            <th>Ver</th>
                            <th>Detalle</th> <!-- ← NUEVO: columna para permisos .show -->
                            <th>Crear</th>
                            <th>Editar</th>
                            <th>Eliminar</th>
                            <!-- Eliminado: columna "Acciones" - no tiene utilidad -->
                          </tr>
                        </thead>
                        <!-- Antes de la línea <tbody> -->
                        <tbody>
                          <tr *ngFor="let group of filteredPermissionGroups">
                            <td class="fw-bold">{{ group.module | titlecase }}</td>
                            <td>
                              <div class="form-check">
                                <input 
                                  class="form-check-input" 
                                  type="checkbox"
                                  [checked]="isPermissionChecked(group.originalModule + '.ver')"
                                  (change)="togglePermission(group.originalModule + '.ver', $event)"
                                  [disabled]="!getPermissionByName(group.originalModule + '.ver')"> <!-- 🐱 MODIFICADO: usar originalModule -->
                              </div>
                            </td>
                            <td>
                              <div class="form-check">
                                <input 
                                  class="form-check-input" 
                                  type="checkbox"
                                  [checked]="isPermissionChecked(group.originalModule + '.show')"
                                  (change)="togglePermission(group.originalModule + '.show', $event)"
                                  [disabled]="!getPermissionByName(group.originalModule + '.show')"> <!-- 🐱 MODIFICADO: usar originalModule -->
                              </div>
                            </td>
                            <td>
                              <div class="form-check">
                                <input 
                                  class="form-check-input" 
                                  type="checkbox"
                                  [checked]="isPermissionChecked(group.originalModule + '.create')"
                                  (change)="togglePermission(group.originalModule + '.create', $event)"
                                  [disabled]="!getPermissionByName(group.originalModule + '.create')"> <!-- 🐱 MODIFICADO: usar originalModule -->
                              </div>
                            </td>
                            <td>
                              <div class="form-check">
                                <input 
                                  class="form-check-input" 
                                  type="checkbox"
                                  [checked]="isPermissionChecked(group.originalModule + '.edit')"
                                  (change)="togglePermission(group.originalModule + '.edit', $event)"
                                  [disabled]="!getPermissionByName(group.originalModule + '.edit')"> <!-- 🐱 MODIFICADO: usar originalModule -->
                              </div>
                            </td>
                            <td>
                              <div class="form-check">
                                <input 
                                  class="form-check-input" 
                                  type="checkbox"
                                  [checked]="isPermissionChecked(group.originalModule + '.delete')"
                                  (change)="togglePermission(group.originalModule + '.delete', $event)"
                                  [disabled]="!getPermissionByName(group.originalModule + '.delete')"> <!-- 🐱 MODIFICADO: usar originalModule -->
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div *ngIf="!selectedRole" class="text-center text-muted">
                    <!-- Eliminado: fas fa-hand-pointer - apuntaba hacia arriba -->
                    <i class="fas fa-hand-point-left fa-3x mb-3"></i> <!-- ← MODIFICADO: cambiado a fa-hand-point-left para que apunte a la izquierda -->
                    <p>Selecciona un rol para gestionar sus permisos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear rol -->
    <div class="modal fade" id="createRoleModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Nuevo Rol</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre del Rol</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="newRoleName"
                placeholder="Ej: editor, moderador">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="createRole()">Crear Rol</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .permissions-panel {
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      padding: 1rem;
      background-color: #f8f9fa;
    }
    
    .list-group-item.active {
      background-color: #0d6efd;
      border-color: #0d6efd;
    }
    
    .table th {
      text-align: center;
      vertical-align: middle;
    }
    
    .table td {
      text-align: center;
      vertical-align: middle;
    }
    
    .form-check {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .form-check-label {
      font-size: 0.875rem;
      margin-left: 0.5rem;
    }
    /* Nuevo estilo para bajar la posición del mensaje */
    .text-center.text-muted {
      margin-top: 3rem; /* ← NUEVO: baja el contenido 3rem desde arriba */
    }
  `,
  ],
})
export class RolesManagementComponent implements OnInit {
  roles: Role[] = []
  permissions: Permission[] = []
  selectedRole: Role | null = null
  rolePermissions: string[] = []
  originalRolePermissions: string[] = []
  permissionGroups: PermissionGroup[] = []
  filteredPermissionGroups: PermissionGroup[] = []
  searchFilter = ""
  newRoleName = ""
  hasChanges = false

    constructor(
      private rolesService: RolesService,              // Ya existente
      private authService: AuthService,                 // Nuevo: AuthService
      private permissionsService: PermissionsService    // Nuevo: PermissionsService
    ) {}


  ngOnInit() {
    this.loadRoles()
    this.loadPermissions()
  }
  
  loadRoles() {
    this.rolesService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles.filter(role => role.name !== 'superadmin')
      },
      error: (error) => {
        console.error("Error loading roles:", error)
      },
    })
  }

  loadPermissions() {
    this.rolesService.getPermissions().subscribe({
      next: (permissions) => {
        console.log('🐱 Permisos recibidos del servidor:', permissions);
        this.permissions = permissions
        this.groupPermissionsByModule()
      },
      error: (error) => {
        console.error("Error loading permissions:", error)
      },
    })
  }

 groupPermissionsByModule() {
  const modules = new Set<string>()

  // Extraer módulos únicos
  this.permissions.forEach((permission) => {
    const [module] = permission.name.split(".")
    modules.add(module)
  })

  console.log('🐱 Módulos únicos extraídos:', Array.from(modules)); // 🐱 NUEVO: ver módulos únicos

  // Crear grupos de permisos
  this.permissionGroups = Array.from(modules).map((module) => ({
    module: module.replace(/_/g, ' '), // 🐱 Para mostrar en la UI
    originalModule: module, // 🐱 NUEVO: guardar el nombre original para usar en las consultas
    permissions: {
      ver: this.permissions.find((p) => p.name === `${module}.ver`) || null,
      show: this.permissions.find((p) => p.name === `${module}.show`) || null,
      create: this.permissions.find((p) => p.name === `${module}.create`) || null,
      edit: this.permissions.find((p) => p.name === `${module}.edit`) || null,
      delete: this.permissions.find((p) => p.name === `${module}.delete`) || null,
    },
  }))

  console.log('🐱 Grupos de permisos procesados:', this.permissionGroups); // 🐱 NUEVO: ver grupos finales

  this.filteredPermissionGroups = [...this.permissionGroups]
}

  selectRole(role: Role) {
    this.selectedRole = role
    this.loadRolePermissions(role.id)
  }

  loadRolePermissions(roleId: number) {
    this.rolesService.getRolePermissions(roleId).subscribe({
      next: (permissions) => {
        this.rolePermissions = permissions.map((p) => p.name)
        this.originalRolePermissions = [...this.rolePermissions]
        this.hasChanges = false
      },
      error: (error) => {
        console.error("Error loading role permissions:", error)
      },
    })
  }

  isPermissionChecked(permissionName: string): boolean {
    return this.rolePermissions.includes(permissionName)
  }

  togglePermission(permissionName: string, event: any) {
    if (event.target.checked) {
      if (!this.rolePermissions.includes(permissionName)) {
        this.rolePermissions.push(permissionName)
      }
    } else {
      this.rolePermissions = this.rolePermissions.filter((p) => p !== permissionName)
    }
    this.checkForChanges()
  }

  checkForChanges() {
    this.hasChanges =
      JSON.stringify(this.rolePermissions.sort()) !== JSON.stringify(this.originalRolePermissions.sort())
  }

  getPermissionByName(name: string): Permission | undefined {
    return this.permissions.find((p) => p.name === name)
  }

  selectAllModulePermissions(module: string) {
    // Eliminado: solo buscaba ver, create, edit, delete
    const modulePermissions = this.permissions.filter((p) => p.name.startsWith(module + ".")).map((p) => p.name)

    modulePermissions.forEach((permName) => {
      if (!this.rolePermissions.includes(permName)) {
        this.rolePermissions.push(permName)
      }
    })

    this.checkForChanges()
  }

  deselectAllModulePermissions(module: string) {
    this.rolePermissions = this.rolePermissions.filter((p) => !p.startsWith(module + "."))
    this.checkForChanges()
  }

  filterPermissions() {
    if (!this.searchFilter.trim()) {
      this.filteredPermissionGroups = [...this.permissionGroups]
      return
    }

    const filter = this.searchFilter.toLowerCase()
    this.filteredPermissionGroups = this.permissionGroups.filter((group) => group.module.toLowerCase().includes(filter))
  }

  savePermissions() {
    if (!this.selectedRole) return

    this.rolesService.updateRolePermissions(this.selectedRole.id, this.rolePermissions).subscribe({
      next: () => {
        this.originalRolePermissions = [...this.rolePermissions]
        this.hasChanges = false

        // Eliminado: alert("Permisos actualizados correctamente") - reemplazado por Swal
        Swal.fire({
          title: '¡Éxito!',
          text: 'Permisos actualizados correctamente',
          icon: 'success',
          confirmButtonText: 'OK'
        })
      },
      error: (error) => {
        console.error("Error updating permissions:", error)
          Swal.fire({
          title: 'Error',
          text: 'Error al actualizar permisos',
          icon: 'error',
          confirmButtonText: 'OK'
        })
      },
    })
  }

  openCreateRoleModal() {
    this.newRoleName = ""
    // Aquí deberías usar tu sistema de modales preferido (Bootstrap, Angular Material, etc.)
    // Por simplicidad, uso un prompt
    const name = prompt("Nombre del nuevo rol:")
    if (name && name.trim()) {
      this.createRole(name.trim())
    }
  }

  createRole(name?: string) {
    const roleName = name || this.newRoleName
    if (!roleName.trim()) return

    this.rolesService.createRole(roleName).subscribe({
      next: (role) => {
        this.roles.push(role)
        this.newRoleName = ""
        alert("Rol creado correctamente")
      },
      error: (error) => {
        console.error("Error creating role:", error)
        alert("Error al crear rol")
      },
    })
  }

  deleteRole(roleId: number, event: Event) {
    event.stopPropagation()

    if (confirm("¿Estás seguro de eliminar este rol?")) {
      this.rolesService.deleteRole(roleId).subscribe({
        next: () => {
          this.roles = this.roles.filter((r) => r.id !== roleId)
          if (this.selectedRole?.id === roleId) {
            this.selectedRole = null
            this.rolePermissions = []
          }
          alert("Rol eliminado correctamente")
        },
        error: (error) => {
          console.error("Error deleting role:", error)
          alert("Error al eliminar rol")
        },
      })
    }
  }
}
