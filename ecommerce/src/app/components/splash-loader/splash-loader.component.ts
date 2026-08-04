// src/app/components/splash-loader/splash-loader.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoaderService } from '../../services/loader.service';
import { EmpresaInfoService } from '../../services/empresa-info.service';

@Component({
  selector: 'app-splash-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-loader.component.html',
  styleUrl: './splash-loader.component.scss'
})
export class SplashLoaderComponent implements OnDestroy {
  visible = false;
  mensaje = 'Cargando...';
  logoUrl: string | null = null;
  colorFondo: string | null = null;
  private subs = new Subscription();

  constructor(
    private loaderService: LoaderService,
    private empresaInfoService: EmpresaInfoService
  ) {
    this.subs.add(this.loaderService.visible$.subscribe(v => {
      this.visible = v;
      if (v) this.cargarPersonalizacion();
    }));
    this.subs.add(this.loaderService.mensaje$.subscribe(m => this.mensaje = m));
  }

  // Se consulta a la DB cada vez que el splash se muestra (no se cachea acá;
  // el service igual guarda su propia copia en localStorage para evitar el
  // "flash" del logo/color por defecto mientras responde).
  private cargarPersonalizacion(): void {
    this.empresaInfoService.obtenerEmpresaInfoPublica().subscribe({
      next: (data) => {
        if (data?.logo_url) this.logoUrl = data.logo_url;
        if (data?.splash_color_fondo) this.colorFondo = data.splash_color_fondo;
      },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
