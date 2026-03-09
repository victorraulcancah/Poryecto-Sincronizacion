# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peruvian ecommerce platform (7Power) with an **Angular 19 frontend** and **Laravel 12 backend** in a monorepo structure. Features include product sales, SUNAT electronic invoicing, rewards/gamification system, POS, delivery driver management, and accounting.

## Repository Structure

```
ecommerce/          # Angular 19 frontend (SSR enabled)
ecommerce-back/     # Laravel 12 backend (PHP 8.2+)
```

## Development Commands

### Frontend (`ecommerce/`)

```bash
npm install          # Install dependencies
npm start            # Dev server on :4200 (ng serve)
npm run build        # Production build (includes SSR)
npm test             # Run Karma + Jasmine tests
npm run analyze      # Bundle size analysis (source-map-explorer)
```

### Backend (`ecommerce-back/`)

```bash
composer install                # Install dependencies
composer run dev                # Start all: artisan serve + queue + pail + vite (concurrent)
php artisan serve               # Backend only on :8000
php artisan migrate             # Run database migrations
php artisan db:seed             # Seed database
composer test                   # Run PHPUnit tests (clears config first)
php artisan pint                # Code formatting (Laravel Pint)
```

## Architecture

### Frontend (Angular 19)

- **Styling**: SCSS + Bootstrap 5.3.5, icons via FontAwesome + Phosphor
- **State management**: No NgRx — uses RxJS BehaviorSubjects in individual services
- **HTTP**: HttpClient with Fetch API (`withFetch()`), base URL from `environment.ts` → `http://localhost:8000/api`
- **SSR**: Enabled with `@angular/ssr`, Express server entry at `src/server.ts`
- **Notifications**: ngx-toastr (toasts), sweetalert2 (dialogs)
- **Data tables**: @swimlane/ngx-datatable
- **PDF/Excel export**: jspdf + html2canvas, xlsx

**Three layout zones:**
1. `LayoutComponent` — Public storefront (shop, cart, checkout, product pages)
2. `DashboardLayoutComponent` — Admin panel (requires `authGuard`, routes use `permissionGuard` with `data: { permission: 'module.action' }`)
3. `MotorizadoLayoutComponent` — Delivery driver portal (requires `MotorizadoGuard`)

**Auth flow:**
- JWT token stored in localStorage (`auth_token` key, 12h expiry)
- `authInterceptor` injects token; 401 triggers auto-logout
- `AuthService` uses manual `Injector` + `setTimeout` to avoid circular deps with `PermissionsService` and `CartService`
- Public API calls skip token injection

**Key conventions:**
- Most routes use `loadComponent()` for lazy loading
- Services follow pattern: `private subject = new BehaviorSubject<T>(initial)` with `public observable$ = this.subject.asObservable()`
- SCSS include path: `src/assets/sass` (organized into abstracts, components, layout, partials, shared, utilities)
- Cart is hybrid: API-backed for logged-in users, localStorage for guests

### Backend (Laravel 12)

**API routes are modular** (`routes/api/`):
- `public.php` — Unauthenticated endpoints (`/publico/*`, auth login/register)
- `admin.php` — Admin authentication
- `facturacion.php` — SUNAT invoicing (comprobantes, notas, guías)
- `contabilidad.php` — Accounting (kardex, CxC, CxP, cajas)
- `productos.php` — Inventory/product management
- `ecommerce.php` — Orders and cart
- `recompensas.php` — Rewards/gamification
- `marketing.php` — Banners and promotions
- `servicios.php` — Service endpoints

**Auth**: JWT (`tymon/jwt-auth`) + Sanctum. Role-based permissions via `spatie/laravel-permission`.

**Key integrations:**
- **SUNAT**: Electronic invoicing via `greenter/greenter` (Peruvian tax authority)
- **7Power**: Product sync (`SincronizacionController` at `/sincronizacion/7power`)
- **PDF**: `barryvdh/laravel-dompdf` for document generation
- **Number-to-words**: `luecano/numero-a-letras` for invoice amounts

**Service layer**: Business logic in `app/Services/` (GreenterService, KardexService, NotificacionService, AsignadorRecompensas, PdfGeneratorService, etc.)

**Database**: MySQL. Queue and cache use the database driver.

## Business Domain Glossary

- **Comprobante**: Electronic invoice/receipt (SUNAT)
- **Guía de Remisión**: Shipping/transport guide (SUNAT requirement)
- **Kardex**: Inventory movement ledger
- **Motorizado**: Delivery driver
- **Pedido**: Customer order (ecommerce)
- **Venta**: Sale transaction (POS/admin)
- **CxC/CxP**: Cuentas por Cobrar/Pagar (accounts receivable/payable)
- **Recompensa**: Reward (points, discounts, free shipping, gifts)
- **Ubigeo**: Peruvian geographic location code system
- **IGV**: Peruvian sales tax (similar to VAT)
