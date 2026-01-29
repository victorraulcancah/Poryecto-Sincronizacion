// src/app/pages/dashboard/dashboard.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { UsuariosListComponent } from '../../component/usuarios/usuarios-list/usuarios-list.component';
import { UserRegistrationComponent } from '../../component/user-registration/user-registration.component';
import { ProductosListComponent } from './productos/productos-list/productos-list.component';
import { CategoriasListComponent } from './categorias/categorias-list/categorias-list.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    title: 'Dashboard',
  },
  {
    path: 'usuarios',
    component: UsuariosListComponent,
    title: 'Gestión de Usuarios',
  },
  { 
    path: 'users/create', 
    component: UserRegistrationComponent 
  },
  {
    path: 'productos',
    component: ProductosListComponent,
    title: 'Productos',
  },
  {
    path: 'categorias',
    component: CategoriasListComponent,
    title: 'Categorías',
  },
  {
    path: 'users/edit/:id',
    component: UserRegistrationComponent,
    title: 'Editar Usuario'
  },
  {
    path: 'users/:id',
    component: UserRegistrationComponent,
    title: 'Ver Usuario'
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    UsuariosListComponent,
    UserRegistrationComponent,
    ProductosListComponent,
    CategoriasListComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule { }