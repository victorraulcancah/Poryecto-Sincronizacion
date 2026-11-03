import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { imagenesInterceptor, urlOriginal, urlReducida } from './imagenes.interceptor';

describe('imagenesInterceptor', () => {
  const foto = `${environment.baseUrl}/storage/productos/a.jpg`;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([imagenesInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reduce las imágenes del listado de productos a 480', () => {
    let respuesta: any;
    http.get(`${environment.apiUrl}/productos-publicos?per_page=8`).subscribe((r) => (respuesta = r));

    backend.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/productos-publicos`)).flush({
      productos: [{ id: 1, nombre: 'Driver', imagen_principal: foto }],
    });

    expect(respuesta.productos[0].imagen_principal).toBe(`${environment.apiUrl}/img/480/productos/a.jpg`);
    expect(respuesta.productos[0].nombre).toBe('Driver');
  });

  it('pide 1080 en el detalle y 1600 en los banners', () => {
    let detalle: any;
    let banners: any;
    http.get(`${environment.apiUrl}/productos-publicos/7`).subscribe((r) => (detalle = r));
    http.get(`${environment.apiUrl}/banners/publicos`).subscribe((r) => (banners = r));

    backend.expectOne(`${environment.apiUrl}/productos-publicos/7`).flush({ imagen_principal: foto });
    backend.expectOne(`${environment.apiUrl}/banners/publicos`).flush({ data: [{ imagen_url: foto }] });

    expect(detalle.imagen_principal).toBe(`${environment.apiUrl}/img/1080/productos/a.jpg`);
    expect(banners.data[0].imagen_url).toBe(`${environment.apiUrl}/img/1600/productos/a.jpg`);
  });

  it('no toca rutas del panel ni peticiones que no son GET', () => {
    let panel: any;
    http.get(`${environment.apiUrl}/productos`).subscribe((r) => (panel = r));
    backend.expectOne(`${environment.apiUrl}/productos`).flush({ imagen_principal: foto });
    expect(panel.imagen_principal).toBe(foto);

    let creado: any;
    http.post(`${environment.apiUrl}/productos-publicos`, {}).subscribe((r) => (creado = r));
    backend.expectOne(`${environment.apiUrl}/productos-publicos`).flush({ imagen_principal: foto });
    expect(creado.imagen_principal).toBe(foto);
  });

  it('urlReducida deja igual lo que no es una imagen de storage', () => {
    expect(urlReducida('https://otro.com/a.jpg', 480)).toBe('https://otro.com/a.jpg');
    expect(urlReducida(`${environment.baseUrl}/storage/docs/a.pdf`, 480)).toBe(`${environment.baseUrl}/storage/docs/a.pdf`);
    expect(urlReducida('/placeholder-product.jpg', 480)).toBe('/placeholder-product.jpg');
  });

  it('urlOriginal devuelve la imagen de storage', () => {
    expect(urlOriginal(urlReducida(foto, 720))).toBe(foto);
    expect(urlOriginal(foto)).toBeNull();
  });
});
