// src/app/components/splash-loader/splash-loader.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoaderService } from '../../services/loader.service';

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
  private subs = new Subscription();

  constructor(private loaderService: LoaderService) {
    this.subs.add(this.loaderService.visible$.subscribe(v => this.visible = v));
    this.subs.add(this.loaderService.mensaje$.subscribe(m => this.mensaje = m));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
