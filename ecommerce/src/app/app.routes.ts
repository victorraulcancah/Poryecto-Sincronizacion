// src\app\app.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './layouts/main-layouts/layout/layout.component';
import { SecondlayoutComponent } from './layouts/alt-layouts/secondlayout/secondlayout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';

// Solo importa componentes que se cargan inmediatamente
import { IndexComponent } from './pages/index/index.component';
import { BlogComponent } from './pages/blog/blog.component';
import { ContactComponent } from './pages/contact/contact.component';
import { BlogDetailsComponent } from './pages/blog-details/blog-details.component';
import { CartComponent } from './pages/cart/cart.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { BecomeSellerComponent } from './pages/become-seller/become-seller.component';
import { AccountComponent } from './pages/account/account.component';
import { RegisterComponent } from './pages/register/register.component';
import { IndexTwoComponent } from './pages/index-two/index-two.component';
import { IndexThreeComponent } from './pages/index-three/index-three.component';
import { IndexLaptopComponent } from './pages/index-laptop/index-laptop.component';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { MotorizadoGuard } from './guards/motorizado.guard';
import { inject } from '@angular/core';
import { VentasComponent } from './pages/dashboard/ventas/ventas.component';
import { VentasListComponent } from './pages/dashboard/ventas/ventas-list.component';
import { NuevaVentaComponent } from './pages/dashboard/ventas/nueva-venta.component';
import { EstadisticasVentasComponent } from './pages/dashboard/ventas/estadisticas-ventas.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        component: IndexComponent,
        title: 'Home',
      },
      {
        path: 'blog',
        component: BlogComponent,
        title: 'Blog',
      },
      {
        path: 'pasos-envio',
        loadComponent: () =>
          import('./pages/pasos-envio/pasos-envio.component').then(
            (m) => m.PasosEnvioComponent
          ),
        title: 'Pasos de Envío',
      },
      {
        path: 'contact',
        component: ContactComponent,
        title: 'Contact',
      },
      {
        path: 'blog-details',
        component: BlogDetailsComponent,
        title: 'Blog Details',
      },
      {
        path: 'cart',
        component: CartComponent,
        title: 'Cart',
      },

      {
        path: 'checkout',
        component: CheckoutComponent,
        title: 'Checkout',
      },
      {
        path: 'become-seller',
        component: BecomeSellerComponent,
        title: 'Become Seller',
      },
      {
        path: 'account',
        component: AccountComponent,
        title: 'Account',
      },
      {
        path: 'register',
        component: RegisterComponent,
        title: 'Register',
      },
      {
        path: 'my-account',
        loadComponent: () =>
          import('./pages/my-account/my-account.component').then(
            (m) => m.MyAccountComponent
          ),
        title: 'Mi Cuenta',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            redirectTo: 'direcciones',
            pathMatch: 'full'
          },
          {
            path: 'direcciones',
            loadComponent: () =>
              import('./pages/my-account/direcciones/direcciones.component').then(
                (m) => m.DireccionesComponent
              ),
            title: 'Mis Direcciones'
          },
          {
            path: 'cotizaciones',
            loadComponent: () =>
              import('./pages/my-account/cotizaciones/cotizaciones.component').then(
                (m) => m.CotizacionesComponent
              ),
            title: 'Mis Cotizaciones'
          },
          {
            path: 'compras',
            loadComponent: () =>
              import('./pages/my-account/compras/compras.component').then(
                (m) => m.ComprasComponent
              ),
            title: 'Mis Compras'
          },
          {
            path: 'favoritos',
            loadComponent: () =>
              import('./pages/my-account/favoritos/favoritos.component').then(
                (m) => m.FavoritosComponent
              ),
            title: 'Mis Favoritos'
          },
          {
            path: 'reclamos',
            loadComponent: () =>
              import('./pages/my-account/reclamos/reclamos.component').then(
                (m) => m.ReclamosComponent
              ),
            title: 'Mis Reclamos'
          },
          {
            path: 'recompensas',
            loadComponent: () =>
              import('./pages/my-account/recompensas/recompensas.component').then(
                (m) => m.RecompensasMiCuentaComponent
              ),
            title: 'Mis Recompensas'
          },
          {
            path: 'cupones',
            loadComponent: () =>
              import('./pages/my-account/cupones/cupones.component').then(
                (m) => m.CuponesComponent
              ),
            title: 'Mis Cupones'
          }
        ]
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./pages/email-verification/email-verification.component').then(
            (m) => m.EmailVerificationComponent
          ),
        title: 'Verificación de Email',
      },
      {
        path: 'index-two',
        component: IndexTwoComponent,
        title: 'Index Two',
      },
      {
        path: 'index-three',
        component: IndexThreeComponent,
        title: 'Index Three',
      },
      {
        path: 'index-laptop',
        component: IndexLaptopComponent,
        title: 'Index Laptop',
      },
      // ✅ Lazy Loading para Shop
      {
        path: 'shop',
        loadComponent: () =>
          import('./pages/shop/shop.component').then((m) => m.ShopComponent),
        title: 'Shop',
      },
      // ✅ NUEVO: Página de Ofertas
      {
        path: 'ofertas',
        loadComponent: () =>
          import('./pages/ofertas/ofertas.component').then((m) => m.OfertasComponent),
        title: 'Ofertas Especiales',
      },
      // ✅ NUEVO: Ruta SEO-friendly para categorías con slug
      {
        path: 'shop/categoria/:categoriaSlug',
        loadComponent: () =>
          import('./pages/shop/shop.component').then((m) => m.ShopComponent),
        title: 'Shop',
      },
      // ✅ NUEVO: Ruta SEO-friendly para marcas con slug
      {
        path: 'shop/marca/:marcaSlug',
        loadComponent: () =>
          import('./pages/shop/shop.component').then((m) => m.ShopComponent),
        title: 'Shop',
      },
      // ✅ Lazy Loading para Vendor
      {
        path: 'vendor',
        loadComponent: () =>
          import('./pages/vendor/vendor.component').then(
            (m) => m.VendorComponent
          ),
        title: 'Vendor',
      },
      {
        path: 'vendor-details',
        loadComponent: () =>
          import('./pages/vendor-details/vendor-details.component').then(
            (m) => m.VendorDetailsComponent
          ),
        title: 'Vendor Details',
      },
      {
        path: 'vendor-two',
        loadComponent: () =>
          import('./pages/vendor-two/vendor-two.component').then(
            (m) => m.VendorTwoComponent
          ),
        title: 'Vendor Two',
      },
      {
        path: 'vendor-two-details',
        loadComponent: () =>
          import(
            './pages/vendor-two-details/vendor-two-details.component'
          ).then((m) => m.VendorTwoDetailsComponent),
        title: 'Vendor Two Details',
      },
      {
        path: 'product-details/:id',
        loadComponent: () =>
          import('./pages/product-details/product-details.component').then(
            (m) => m.ProductDetailsComponent
          ),
        title: 'Product Details',
      },
      // ✅ NUEVO: Ruta SEO-friendly para productos con slug
      {
        path: 'product/:id/:slug',
        loadComponent: () =>
          import('./pages/product-details/product-details.component').then(
            (m) => m.ProductDetailsComponent
          ),
        title: 'Product Details',
      },
      {
        path: 'product-details-two',
        loadComponent: () =>
          import(
            './pages/product-details-two/product-details-two.component'
          ).then((m) => m.ProductDetailsTwoComponent),
        title: 'Product Details Two',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent
          ),
        title: 'Recuperar Contraseña',
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
          ),
        title: 'Restablecer Contraseña',
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('./pages/privacy-policy/privacy-policy.component').then(
            (m) => m.PrivacyPolicyComponent
          ),
        title: 'Política de Privacidad',
      },
      {
        path: 'politica-cookies',
        loadComponent: () =>
          import('./pages/politica-cookies/politica-cookies.component').then(
            (m) => m.PoliticaCookiesComponent
          ),
        title: 'Política de Cookies',
      },
      {
        path: 'claimbook',
        loadComponent: () =>
          import('./pages/claimbook/claimbook.component').then(
            (m) => m.ClaimbookComponent
          ),
        title: 'Libro de Reclamaciones',
      },
      {
        path: 'arma-tu-pc',
        loadComponent: () =>
          import('./pages/arma-pc-publico/arma-pc-publico.component').then(
            (m) => m.ArmaPcPublicoComponent
          ),
        title: 'Arma tu PC',
      },
    ],
  },
  // ✅ Lazy Loading para Dashboard
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Dashboard',
      },
      {
        path: 'access-denied',
        loadComponent: () =>
          import('./component/access-denied/access-denied.component').then(
            (m) => m.AccessDeniedComponent
          ),
        title: 'Acceso Denegado',
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import(
            './component/usuarios/usuarios-list/usuarios-list.component'
          ).then((m) => m.UsuariosListComponent),
        title: 'Gestión de Usuarios',
        canActivate: [permissionGuard],
        data: { permission: 'usuarios.ver' },
      },
      // ✅ MÓDULO DE FACTURACIÓN ELECTRÓNICA
      {
        path: 'facturacion',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/dashboard/dashboard-facturacion.component').then(
            (m) => m.DashboardFacturacionComponent
          ),
        title: 'Dashboard Facturación',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/comprobantes',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/comprobantes/comprobantes-list.component').then(
            (m) => m.ComprobantesListComponent
          ),
        title: 'Comprobantes Electrónicos',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/series',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/series/series-list.component').then(
            (m) => m.SeriesListComponent
          ),
        title: 'Series de Comprobantes',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/resumenes',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/resumenes/resumenes-list.component').then(
            (m) => m.ResumenesListComponent
          ),
        title: 'Resúmenes Diarios',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/bajas',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/bajas/bajas-list.component').then(
            (m) => m.BajasListComponent
          ),
        title: 'Comunicaciones de Baja',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/auditoria',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/auditoria/auditoria-list.component').then(
            (m) => m.AuditoriaListComponent
          ),
        title: 'Auditoría SUNAT',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/certificados',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/certificados/certificados-list.component').then(
            (m) => m.CertificadosListComponent
          ),
        title: 'Certificados Digitales',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/notas-credito',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/notas-credito/notas-credito-list.component').then(
            (m) => m.NotasCreditoListComponent
          ),
        title: 'Notas de Crédito',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/notas-debito',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/notas-debito/notas-debito-list.component').then(
            (m) => m.NotasDebitoListComponent
          ),
        title: 'Notas de Débito',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/catalogos',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/catalogos/catalogos-sunat.component').then(
            (m) => m.CatalogosSunatComponent
          ),
        title: 'Catálogos SUNAT',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'facturacion/configuracion',
        loadComponent: () =>
          import('./pages/dashboard/facturacion/configuracion/configuracion-empresa.component').then(
            (m) => m.ConfiguracionEmpresaComponent
          ),
        title: 'Configuración de Empresa',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.ver' },
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./pages/dashboard/horarios/horarios.component').then(
            (m) => m.HorariosComponent
          ),
        canActivate: [permissionGuard],
        data: { permission: 'horarios.ver' },
      },
      {
        path: 'users/create',
        loadComponent: () =>
          import(
            './component/user-registration/user-registration.component'
          ).then((m) => m.UserRegistrationComponent),
        title: 'Crear Usuario',
        canActivate: [permissionGuard],
        data: { permission: 'usuarios.ver' },
      },
      // ✅ MÓDULO DE RECOMPENSAS - NUEVO SISTEMA COMPLETO
      {
        path: 'recompensas',
        loadChildren: () =>
          import('./pages/dashboard/recompensas/recompensas.module').then(
            (m) => m.RecompensasModule
          ),
        canActivate: [permissionGuard],
        data: { permission: 'recompensas.ver' },
      },
      // ✅ RUTAS DE ALMACÉN CORREGIDAS
      {
        path: 'almacen',
        loadComponent: () =>
          import('./pages/dashboard/almacen/almacen.component').then(
            (m) => m.AlmacenComponent
          ),
        title: 'Gestión de Almacén',
        children: [
          {
            path: '',
            redirectTo: 'productos',
            pathMatch: 'full',
          },
          {
            path: 'productos',
            loadComponent: () =>
              import(
                './pages/dashboard/almacen/productos/productos-list.component'
              ).then((m) => m.ProductosListComponent),
            title: 'Productos',
          },
          {
            path: 'categorias',
            loadComponent: () =>
              import(
                './pages/dashboard/almacen/categorias/categorias-list.component'
              ).then((m) => m.CategoriasListComponent),
            title: 'Categorías',
          },
          {
            path: 'marcas',
            loadComponent: () =>
              import(
                './pages/dashboard/almacen/marcas/marcas-list.component'
              ).then((m) => m.MarcasListComponent),
            title: 'Marcas',
          },
          {
            path: 'kardex',
            loadComponent: () =>
              import(
                './pages/dashboard/contabilidad/kardex/kardex-producto.component'
              ).then((m) => m.KardexProductoComponent),
            title: 'Kardex de Inventario',
          },
        ],
      },
      // ✅ MÓDULO DE CONTABILIDAD

      {
        path: 'contabilidad/kardex',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/kardex/kardex-producto.component').then(
            (m) => m.KardexProductoComponent
          ),
        title: 'Kardex de Inventario',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.kardex.ver' },
      },
      {
        path: 'contabilidad/cxc',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/cxc/cxc-list.component').then(
            (m) => m.CxcListComponent
          ),
        title: 'Cuentas por Cobrar',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.cuentas-cobrar.ver' },
      },
      {
        path: 'contabilidad/cxp',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/cxp/cxp-list.component').then(
            (m) => m.CxpListComponent
          ),
        title: 'Cuentas por Pagar',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.cuentas-pagar.ver' },
      },
      {
        path: 'contabilidad/cajas',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/cajas/cajas-main.component').then(
            (m) => m.CajasMainComponent
          ),
        title: 'Gestión de Cajas',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.cajas.ver' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/dashboard/contabilidad/cajas/cajas-dashboard.component').then(
                (m) => m.CajasDashboardComponent
              ),
            title: 'Cajas'
          },
          {
            path: 'tiendas',
            loadComponent: () =>
              import('./pages/dashboard/contabilidad/cajas/tiendas-list.component').then(
                (m) => m.TiendasListComponent
              ),
            title: 'Tiendas'
          },
          {
            path: 'caja-chica',
            loadComponent: () =>
              import('./pages/dashboard/contabilidad/caja-chica/mis-cajas.component').then(
                (m) => m.MisCajasComponent
              ),
            title: 'Caja Chica'
          },
          {
            path: 'flujo-caja',
            loadComponent: () =>
              import('./pages/dashboard/contabilidad/cajas/flujo-caja.component').then(
                (m) => m.FlujoCajaComponent
              ),
            title: 'Flujo de Caja'
          }
        ]
      },
      {
        path: 'contabilidad/cajas/operacion',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/cajas/operacion-diaria.component').then(
            (m) => m.OperacionDiariaComponent
          ),
        title: 'Operación Diaria',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.cajas.ver' },
      },
      {
        path: 'contabilidad/cajas/historial',
        loadComponent: () =>
          import('./pages/dashboard/contabilidad/cajas/historial-cajas.component').then(
            (m) => m.HistorialCajasComponent
          ),
        title: 'Historial de Cajas',
        canActivate: [permissionGuard],
        data: { permission: 'contabilidad.cajas.ver' },
      },
      {
        path: 'guias-remision',
        loadComponent: () =>
          import('./pages/dashboard/guias-remision/guias-remision-list.component').then(
            (m) => m.GuiasRemisionListComponent
          ),
        title: 'Guías de Remisión',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.guias_remision.ver' },
      },
      {
        path: 'guias-remision/remitente',
        loadComponent: () =>
          import('./pages/dashboard/guias-remision/remitente/guias-remitente-list.component').then(
            (m) => m.GuiasRemitenteListComponent
          ),
        title: 'GRE Remitente',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.guias_remision.ver' },
      },
      {
        path: 'guias-remision/transportista',
        loadComponent: () =>
          import('./pages/dashboard/guias-remision/transportista/guias-transportista-list.component').then(
            (m) => m.GuiasTransportistaListComponent
          ),
        title: 'GRE Transportista',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.guias_remision.ver' },
      },
      {
        path: 'guias-remision/traslado-interno',
        loadComponent: () =>
          import('./pages/dashboard/guias-remision/traslado-interno/traslado-interno-list.component').then(
            (m) => m.TrasladoInternoListComponent
          ),
        title: 'Traslado Interno',
        canActivate: [permissionGuard],
        data: { permission: 'facturacion.guias_remision.ver' },
      },
      {
        path: 'ventas',
        component: VentasComponent,
        children: [
          { path: '', component: VentasListComponent },
          {
            path: 'nueva',
            loadComponent: () =>
              import('./pages/dashboard/pos/pos.component').then(
                (m) => m.PosComponent
              ),
            title: 'Nueva Venta - POS'
          },
          {
            path: 'editar/:id',
            loadComponent: () =>
              import('./pages/dashboard/pos/pos.component').then(
                (m) => m.PosComponent
              ),
            title: 'Editar Venta - POS'
          },
          { path: 'estadisticas', component: EstadisticasVentasComponent },
        ],
      },
      // ✅ NUEVAS RUTAS PARA OFERTAS Y CUPONES
      {
        path: 'ofertas',
        loadComponent: () =>
          import(
            './pages/dashboard/ofertas/ofertas-list/ofertas-list.component'
          ).then((m) => m.OfertasListComponent),
        title: 'Gestión de Ofertas',
        canActivate: [permissionGuard],
        data: { permission: 'ofertas.ver' },
      },
      {
        path: 'cupones',
        loadComponent: () =>
          import(
            './pages/dashboard/cupones/cupones-list/cupones-list.component'
          ).then((m) => m.CuponesListComponent),
        title: 'Gestión de Cupones',
        canActivate: [permissionGuard],
        data: { permission: 'cupones.ver' },
      },
      // Agregar después de la ruta de almacén
      {
        path: 'roles',
        loadComponent: () =>
          import(
            './pages/dashboard/roles/roles-management/roles-management.component'
          ).then((m) => m.RolesManagementComponent),
        title: 'Gestión de Roles',
      },
      {
        path: 'users/edit/:id',
        loadComponent: () =>
          import(
            './component/user-registration/user-registration.component'
          ).then((m) => m.UserRegistrationComponent),
        title: 'Editar Usuario',
        canActivate: [permissionGuard],
        data: { permission: 'usuarios.ver' },
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import(
            './component/user-registration/user-registration.component'
          ).then((m) => m.UserRegistrationComponent),
        title: 'Ver Usuario',
        canActivate: [permissionGuard],
        data: { permission: 'usuarios.ver' },
      },
      {
        path: 'banners',
        loadComponent: () =>
          import(
            './pages/dashboard/banners/banners-list/banners-list.component'
          ).then((m) => m.BannersListComponent),
        title: 'Gestión de Banners',
      },
      {
        path: 'banners/horizontales',
        loadComponent: () =>
          import(
            './pages/dashboard/banners/banners-horizontales/banners-horizontales.component'
          ).then((m) => m.BannersHorizontalesComponent),
        title: 'Banners Horizontales',
        canActivate: [permissionGuard],
        data: { permission: 'banners.ver' },
      },
      {
        path: 'banners-promocionales',
        loadComponent: () =>
          import(
            './pages/dashboard/banners-promocionales/banners-promocionales-list/banners-promocionales-list.component'
          ).then((m) => m.BannersPromocionalesListComponent),
        title: 'Banners Promocionales',
      },
      {
        path: 'banners-flash-sales',
        loadComponent: () =>
          import(
            './pages/dashboard/banners-flash-sales/banners-flash-sales-list/banners-flash-sales-list.component'
          ).then((m) => m.BannersFlashSalesListComponent),
        title: 'Banners Flash Sales',
        canActivate: [permissionGuard],
        data: { permission: 'banners_flash_sales.ver' },
      },
      {
        path: 'banners-ofertas',
        loadComponent: () =>
          import(
            './pages/dashboard/banners-ofertas/banners-ofertas-list/banners-ofertas-list.component'
          ).then((m) => m.BannersOfertasListComponent),
        title: 'Banners Ofertas',
        canActivate: [permissionGuard],
        data: { permission: 'banners_ofertas.ver' },
      },
      // Dentro de las rutas de dashboard, agrega:
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/dashboard/clientes/clientes.component').then(
            (m) => m.ClientesComponent
          ),
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'clientes.ver' },
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import(
            './pages/dashboard/clientes/cliente-detalle/cliente-detalle.component'
          ).then((m) => m.ClienteDetalleComponent),
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'clientes.show' },
      },
      {
        path: 'pedidos', // ✅ CORRECTO
        loadComponent: () =>
          import(
            './component/pedidos/pedidos-list/pedidos-list.component'
          ).then((m) => m.PedidosListComponent),
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'pedidos.ver' },
      },
      {
        path: 'compras',
        loadComponent: () =>
          import(
            './component/compras/compras-list/compras-list.component'
          ).then((m) => m.ComprasListComponent),
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'compras.ver' },
      },
      {
        path: 'reclamos',
        loadComponent: () =>
          import('./pages/dashboard/reclamos/reclamos.component').then(
            (m) => m.ReclamosComponent
          ),
        title: 'Gestión de Reclamos',
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'reclamos.ver' },
      },
      {
        path: 'motorizados',
        loadComponent: () =>
          import('./pages/dashboard/motorizados/motorizados-list/motorizados-list.component').then(
            (m) => m.MotorizadosListComponent
          ),
        title: 'Gestión de Motorizados',
        canActivate: [permissionGuard],
        data: { permission: 'motorizados.ver' },
      },
      // ✅ RUTAS DE CONFIGURACIÓN - Formas de Envío y Tipos de Pago
      {
        path: 'formas-envio',
        loadComponent: () =>
          import('./pages/dashboard/formas-envio/formas-envio.component').then(
            (m) => m.FormasEnvioComponent
          ),
        title: 'Gestión de Formas de Envío',
        canActivate: [permissionGuard],
        data: { permission: 'configuracion.ver' },
      },
      {
        path: 'tipos-pago',
        loadComponent: () =>
          import('./pages/dashboard/tipos-pago/tipos-pago.component').then(
            (m) => m.TiposPagoComponent
          ),
        title: 'Gestión de Tipos de Pago',
        canActivate: [permissionGuard],
        data: { permission: 'configuracion.ver' },
      },
      {
        path: 'pasos-envio',
        loadComponent: () =>
          import('./pages/dashboard/pasos-envio/pasos-envio-admin.component').then(
            (m) => m.PasosEnvioAdminComponent
          ),
        title: 'Gestión de Tipos de Pago',
        canActivate: [permissionGuard],
        data: { permission: 'configuracion.ver' },
      },
      // Agrega estas rutas justo después:
      {
        path: 'motorizados/crear',
        loadComponent: () =>
          import('./pages/dashboard/motorizados/motorizados-form/motorizados-form/motorizados-form.component').then(
            (m) => m.MotorizadosFormComponent
          ),
        title: 'Nuevo Motorizado',
        canActivate: [permissionGuard],
        data: { permission: 'motorizados.create' },
      },
      {
        path: 'motorizados/ver/:id',
        loadComponent: () =>
          import('./pages/dashboard/motorizados/motorizados-ver/motorizados-ver.component').then(
            m => m.MotorizadosVerComponent
          ),
        title: 'Ver Motorizado',
        canActivate: [permissionGuard],
        data: { permission: 'motorizados.ver' }
      },
      {
        path: 'motorizados/editar/:id',
        loadComponent: () =>
          import('./pages/dashboard/motorizados/motorizados-form/motorizados-form/motorizados-form.component').then(
            (m) => m.MotorizadosFormComponent
          ),
        title: 'Editar Motorizado',
        canActivate: [permissionGuard],
        data: { permission: 'motorizados.edit' },
      },
      // ✅ NUEVO: Arma tu PC
      {
        path: 'arma-pc',
        loadComponent: () =>
          import('./pages/dashboard/arma-pc/arma-pc.component').then(
            (m) => m.ArmaPcComponent
          ),
        title: 'Configurar Arma tu PC',
        canActivate: [permissionGuard],
        data: { permission: 'categorias.edit' },
      },
      {
        path: 'empresa-info',
        loadComponent: () =>
          import('./pages/dashboard/empresa-info/empresa-info.component').then(
            (m) => m.EmpresaInfoComponent
          ),
        title: 'Información de Empresa',
        canActivate: [permissionGuard],
        data: { permission: 'empresa_info.ver' },
      },
      {
        path: 'email-templates',
        loadComponent: () =>
          import('./pages/dashboard/email-templates/email-templates.component').then(
            (m) => m.EmailTemplatesComponent
          ),
        title: 'Gestión de Correos',
        canActivate: [permissionGuard],
        data: { permission: 'envio_correos.ver' },
      },
      // ✅ RUTAS DE PERFIL Y CONFIGURACIÓN
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/dashboard/perfil/perfil.component').then(
            (m) => m.PerfilComponent
          ),
        title: 'Mi Perfil',
        canActivate: [authGuard],
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./pages/dashboard/configuracion/configuracion.component').then(
            (m) => m.ConfiguracionComponent
          ),
        title: 'Configuración del Sistema',
        canActivate: [authGuard],
      },
      // ✅ RUTAS DE FACTURACIÓN ELECTRÓNICA
      // La ruta POS ahora está en /dashboard/ventas/nueva
      {
        path: 'facturacion-config',
        loadComponent: () =>
          import('./pages/dashboard/facturacion-config/facturacion-config.component').then(
            (m) => m.FacturacionConfigComponent
          ),
        title: 'Configuración de Facturación',
        canActivate: [permissionGuard],
        data: { permission: 'configuracion.ver' },
      },
      {
        path: 'facturacion-test',
        loadComponent: () =>
          import('./pages/dashboard/facturacion-test/facturacion-test.component').then(
            (m) => m.FacturacionTestComponent
          ),
        title: 'Prueba de Facturación',
        canActivate: [permissionGuard],
        data: { permission: 'ventas.create' },
      },
    ],
  },
  // ✅ RUTAS PARA MOTORIZADOS (App de Delivery)
  {
    path: 'motorizado',
    loadComponent: () =>
      import('./layouts/motorizado-layout/motorizado-layout.component').then(
        (m) => m.MotorizadoLayoutComponent
      ),
    canActivate: [MotorizadoGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/motorizado/dashboard/motorizado-dashboard.component').then(
            (m) => m.MotorizadoDashboardComponent
          ),
        title: 'Dashboard - Motorizado'
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./pages/motorizado/pedidos/pedidos-asignados.component').then(
            (m) => m.PedidosAsignadosComponent
          ),
        title: 'Mis Pedidos'
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/motorizado/perfil/motorizado-perfil.component').then(
            (m) => m.MotorizadoPerfilComponent
          ),
        title: 'Mi Perfil'
      },
      {
        path: 'rutas',
        loadComponent: () =>
          import('./pages/motorizado/rutas/motorizado-rutas.component').then(
            (m) => m.MotorizadoRutasComponent
          ),
        title: 'Rutas'
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./pages/motorizado/historial/motorizado-historial.component').then(
            (m) => m.MotorizadoHistorialComponent
          ),
        title: 'Historial'
      }
    ]
  },
  {
    path: '',
    component: SecondlayoutComponent,
    children: [],
  },
];
