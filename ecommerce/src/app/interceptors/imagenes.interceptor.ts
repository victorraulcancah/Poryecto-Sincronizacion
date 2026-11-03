import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Las fotos de productos y banners se suben tal cual (1 a 2 MB) y la tienda las
 * dibuja a unos cientos de píxeles. El backend sirve una versión reducida en
 * `/api/img/{ancho}/{ruta}` (ver ImagenReducidaController): aquí se cambian las
 * URLs de `/storage/...` por esa ruta en las respuestas del catálogo público,
 * sin tocar cada pantalla.
 *
 * Solo se reescriben respuestas de rutas públicas de la tienda; el panel de
 * administración sigue viendo las imágenes originales.
 */

/** Ancho que se pide según la ruta (debe ser uno de ImagenReducidaController::ANCHOS). */
const REGLAS: { patron: RegExp; ancho: number }[] = [
  // Detalle de un producto: la foto grande y la galería.
  { patron: /\/productos-publicos\/[^/?]+/, ancho: 1080 },
  // Listados y tarjetas de producto.
  { patron: /\/productos-publicos(\?|$)/, ancho: 480 },
  // Banners y ofertas: ocupan todo el ancho de la pantalla.
  { patron: /\/(banners|banners-horizontales|banners-promocionales|banners-ofertas)\/publico/, ancho: 1600 },
  { patron: /\/ofertas\/publicas/, ancho: 1600 },
  // Logos e íconos pequeños.
  { patron: /\/(categorias|marcas)\/publicas|\/marcas-publicas|\/categorias-sidebar/, ancho: 320 },
];

const EXTENSIONES = /\.(jpe?g|png|webp|gif)$/i;

const PREFIJO_STORAGE = () => `${environment.baseUrl}/storage/`;
const PREFIJO_REDUCIDA = () => `${environment.apiUrl}/img/`;

/** `/storage/x.jpg` → `/api/img/480/x.jpg`; lo que no sea una imagen de storage queda igual. */
export function urlReducida(url: string, ancho: number): string {
  const prefijo = PREFIJO_STORAGE();
  if (!url.startsWith(prefijo) || !EXTENSIONES.test(url.split('?')[0])) {
    return url;
  }
  return `${PREFIJO_REDUCIDA()}${ancho}/${url.substring(prefijo.length)}`;
}

/** Lo contrario: la URL original de una imagen reducida (para el respaldo si falla). */
export function urlOriginal(url: string): string | null {
  const prefijo = PREFIJO_REDUCIDA();
  if (!url.startsWith(prefijo)) return null;
  const resto = url.substring(prefijo.length).replace(/^\d+\//, '');
  return `${PREFIJO_STORAGE()}${resto}`;
}

function reescribir(valor: unknown, ancho: number): unknown {
  if (typeof valor === 'string') return urlReducida(valor, ancho);
  if (Array.isArray(valor)) return valor.map((v) => reescribir(v, ancho));
  if (valor && typeof valor === 'object') {
    const copia: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      copia[clave] = reescribir(v, ancho);
    }
    return copia;
  }
  return valor;
}

export const imagenesInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const regla = REGLAS.find((r) => r.patron.test(req.url));
  if (!regla) return next(req);

  return next(req).pipe(
    map((evento) =>
      evento instanceof HttpResponse && evento.body
        ? evento.clone({ body: reescribir(evento.body, regla.ancho) })
        : evento
    )
  );
};

/**
 * Si una imagen reducida no carga (por ejemplo el backend aún no tiene la ruta),
 * se vuelve a pedir la original una sola vez, en lugar de dejar un hueco.
 */
export function respaldarImagenesReducidas(documento: Document): void {
  documento.addEventListener(
    'error',
    (evento) => {
      const img = evento.target;
      if (!(img instanceof HTMLImageElement) || img.dataset['sinReducir']) return;

      const original = urlOriginal(img.currentSrc || img.src);
      if (!original) return;

      img.dataset['sinReducir'] = '1';
      img.src = original;
    },
    true
  );
}
