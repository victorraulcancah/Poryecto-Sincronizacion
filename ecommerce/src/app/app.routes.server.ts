import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'vendor',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'blog',
    renderMode: RenderMode.Prerender
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
    renderMode: RenderMode.Prerender
  },

  {
    path: 'checkout',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'become-seller',
    renderMode: RenderMode.Prerender
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
    renderMode: RenderMode.Prerender
  },
  {
    path: 'index-three',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'index-laptop',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'vendor-two',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'vendor-details',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'blog-details',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'vendor-two-details',
    renderMode: RenderMode.Prerender
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
    renderMode: RenderMode.Prerender
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Server
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
    renderMode: RenderMode.Prerender
  },
  {
    path: 'arma-tu-pc',
    renderMode: RenderMode.Prerender
  },
  {

    path: 'my-account/direcciones',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/cotizaciones',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/compras',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/reclamos',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/recompensas',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'dashboard/motorizados',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado/dashboard',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado/pedidos',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado/perfil',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado/rutas',
    renderMode: RenderMode.Server
  },
  {
    path: 'motorizado/historial',
    renderMode: RenderMode.Server
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
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-account/cupones',
    renderMode: RenderMode.Prerender
  }

  
];