import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {

  constructor() {}

  /**
   * Descarga un archivo Blob con el nombre especificado
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Extrae mensaje de error de una respuesta Blob
   */
  async extractErrorMessage(error: any): Promise<string> {
    let mensaje = 'Error al procesar la solicitud';

    if (error?.error instanceof Blob) {
      try {
        const text = await error.error.text();
        const errorObj = JSON.parse(text);
        mensaje = errorObj.message || mensaje;
      } catch (e) {
        // Si no se puede parsear, usar el mensaje por defecto
      }
    } else {
      mensaje = error?.error?.message || error?.message || mensaje;
    }

    return mensaje;
  }
}
