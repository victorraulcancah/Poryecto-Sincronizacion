export interface Role {
  id: number
  name: string
  guard_name: string
  created_at: string
  updated_at: string
  permissions?: Permission[]
}

export interface Permission {
  id: number
  name: string
  guard_name: string
  created_at: string
  updated_at: string
}

export interface PermissionGroup {
  module: string;
  originalModule: string;
  permissions: {
    [action: string]: Permission | null
  }
}

export interface RolePermissionUpdate {
  role_id: number
  permissions: string[]
}
