import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'vendor',
    renderMode: RenderMode.Client
  },
  {
    path: 'blog',
    renderMode: RenderMode.Client
  },
  {
    path: 'pasos-envio',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'forgot-password',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'privacy-policy',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'contact',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'cart',
    renderMode: RenderMode.Client
  },

  {
    path: 'checkout',
    renderMode: RenderMode.Client
  },
  {
    path: 'become-seller',
    renderMode: RenderMode.Client
  },
  {
    path: 'account',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'shop',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'shop/categoria/:categoriaSlug',
    renderMode: RenderMode.Server
  },
  {
    path: 'shop/marca/:marcaSlug',
    renderMode: RenderMode.Server
  },
  {
    path: 'index-two',
    renderMode: RenderMode.Client
  },
  {
    path: 'index-three',
    renderMode: RenderMode.Client
  },
  {
    path: 'index-laptop',
    renderMode: RenderMode.Client
  },
  {
    path: 'vendor-two',
    renderMode: RenderMode.Client
  },
  {
    path: 'vendor-details',
    renderMode: RenderMode.Client
  },
  {
    path: 'blog-details',
    renderMode: RenderMode.Client
  },
  {
    path: 'vendor-two-details',
    renderMode: RenderMode.Client
  },
  {
    path: 'product-details/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'product/:id/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: 'product-details-two',
    renderMode: RenderMode.Client
  },
  // Dashboard y app del motorizado: requieren sesión (token en localStorage),
  // así que el SSR no aporta nada (en el servidor el guard siempre redirige).
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'verify-email',
    renderMode: RenderMode.Server
  },
  {
    path: 'claimbook',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account',
    renderMode: RenderMode.Client
  },
  {
    path: 'arma-tu-pc',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/datos-personales',
    renderMode: RenderMode.Client
  },
  {

    path: 'my-account/direcciones',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/cotizaciones',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/compras',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/estado-cuenta',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/reclamos',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/motorizados',
    renderMode: RenderMode.Client
  },
  {
    path: 'motorizado',
    renderMode: RenderMode.Client
  },
  {
    path: 'motorizado/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'politica-cookies',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'ofertas',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/favoritos',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/cupones',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-account/configuracion',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];