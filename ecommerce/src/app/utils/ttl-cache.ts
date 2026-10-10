// src/app/utils/ttl-cache.ts
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

interface EntradaCache<T> {
  expira: number;
  fuente$: Observable<T>;
}

/**
 * Cache en memoria para peticiones GET públicas (categorías, marcas, info de
 * empresa) que varios componentes de la misma pantalla piden a la vez.
 *
 * - Comparte UNA sola petición entre todos los que la pidan (shareReplay).
 * - La respuesta vive `ttlMs` (60 s por defecto) y luego se vuelve a pedir.
 * - Los errores NO se cachean: si la petición falla, la próxima llamada
 *   vuelve a pedir al servidor.
 *
 * La instancia vive dentro del servicio que la crea. En SSR los servicios
 * `providedIn: 'root'` son una instancia por petición, así que no hay datos
 * compartidos entre usuarios.
 */
export class TtlCache<T = any> {
  private entradas = new Map<string, EntradaCache<T>>();

  constructor(private readonly ttlMs: number = 60_000) {}

  /**
   * Devuelve la petición cacheada para `clave` o, si no existe o expiró,
   * crea una nueva con `fabrica` y la guarda.
   */
  obtener(clave: string, fabrica: () => Observable<T>): Observable<T> {
    const ahora = Date.now();
    const existente = this.entradas.get(clave);
    if (existente && existente.expira > ahora) {
      return existente.fuente$;
    }

    const fuente$: Observable<T> = fabrica().pipe(
      catchError((error) => {
        // No se cachean los errores: se descarta la entrada para reintentar
        if (this.entradas.get(clave)?.fuente$ === fuente$) {
          this.entradas.delete(clave);
        }
        return throwError(() => error);
      }),
      // refCount: si todos los suscriptores cancelan antes de la respuesta,
      // la petición HTTP se cancela y la próxima suscripción la repite.
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.entradas.set(clave, { expira: ahora + this.ttlMs, fuente$ });
    return fuente$;
  }

  /** Descarta una clave (o todo el cache si no se indica) para forzar una nueva petición. */
  invalidar(clave?: string): void {
    if (clave === undefined) {
      this.entradas.clear();
    } else {
      this.entradas.delete(clave);
    }
  }
}
