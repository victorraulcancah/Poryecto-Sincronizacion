// src\main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-PE';

// Registrar locale español de Perú
registerLocaleData(localeEs, 'es-PE');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
