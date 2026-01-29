import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RecompensasRoutingModule } from './recompensas-routing.module';
import { RecompensasDashboardComponent } from './recompensas-dashboard/recompensas-dashboard.component';
import { RecompensasListSimpleComponent } from './recompensas-list/recompensas-list-simple.component';
import { RecompensasAnalyticsComponent } from './recompensas-analytics/recompensas-analytics.component';
import { RecompensasDetalleComponent } from './recompensas-detalle/recompensas-detalle.component';
import { RecompensasAuditoriaComponent } from './recompensas-auditoria/recompensas-auditoria.component';
import { RecompensasPopupsGlobalComponent } from './recompensas-popups-global/recompensas-popups-global.component';
import { RecompensasPopupsListComponent } from './recompensas-popups-list/recompensas-popups-list.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RecompensasRoutingModule,
    RecompensasDashboardComponent,
    RecompensasListSimpleComponent,
    RecompensasAnalyticsComponent,
    RecompensasDetalleComponent,
    RecompensasAuditoriaComponent,
    RecompensasPopupsGlobalComponent,
    RecompensasPopupsListComponent
  ],
  providers: []
})
export class RecompensasModule { }
