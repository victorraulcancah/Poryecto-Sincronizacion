import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecompensasDashboardComponent } from './recompensas-dashboard/recompensas-dashboard.component';
import { RecompensasListSimpleComponent } from './recompensas-list/recompensas-list-simple.component';
import { RecompensasAnalyticsComponent } from './recompensas-analytics/recompensas-analytics.component';
import { RecompensasDetalleComponent } from './recompensas-detalle/recompensas-detalle.component';
import { RecompensasAuditoriaComponent } from './recompensas-auditoria/recompensas-auditoria.component';
import { RecompensasConfiguracionDescuentosComponent } from './recompensas-configuracion-descuentos/recompensas-configuracion-descuentos.component';
import { RecompensasConfiguracionEnviosComponent } from './recompensas-configuracion-envios/recompensas-configuracion-envios.component';
import { RecompensasConfiguracionRegalosComponent } from './recompensas-configuracion-regalos/recompensas-configuracion-regalos.component';
import { RecompensasPopupsGlobalComponent } from './recompensas-popups-global/recompensas-popups-global.component';
import { RecompensasPopupsListComponent } from './recompensas-popups-list/recompensas-popups-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    component: RecompensasDashboardComponent,
    data: { 
      title: 'Dashboard de Recompensas',
      breadcrumb: 'Dashboard'
    }
  },
  { 
    path: 'popups', 
    component: RecompensasPopupsGlobalComponent,
    data: { 
      title: 'Gestión de Popups',
      breadcrumb: 'Popups'
    }
  },
  { 
    path: 'popups/todos', 
    component: RecompensasPopupsListComponent,
    data: { 
      title: 'Todos los Popups',
      breadcrumb: 'Todos los Popups'
    }
  },
  { 
    path: 'lista', 
    component: RecompensasListSimpleComponent,
    data: { 
      title: 'Lista de Recompensas',
      breadcrumb: 'Lista'
    }
  },
  { 
    path: 'detalle/:id', 
    component: RecompensasDetalleComponent,
    data: { 
      title: 'Detalle de Recompensa',
      breadcrumb: 'Detalle'
    }
  },
  { 
    path: 'analytics', 
    component: RecompensasAnalyticsComponent,
    data: { 
      title: 'Analytics de Recompensas',
      breadcrumb: 'Analytics'
    }
  },
  { 
    path: 'auditoria', 
    component: RecompensasAuditoriaComponent,
    data: { 
      title: 'Auditoría de Recompensas',
      breadcrumb: 'Auditoría'
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecompensasRoutingModule { }
