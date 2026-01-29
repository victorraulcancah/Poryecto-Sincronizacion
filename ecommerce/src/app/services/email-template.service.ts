import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmailTemplate, EmailTemplateUpdate } from '../models/email-template.model';

@Injectable({
  providedIn: 'root'
})
export class EmailTemplateService {

  private apiUrl = `${environment.apiUrl}/email-templates`;

  constructor(private http: HttpClient) {}

  getAllTemplates(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getTemplate(name: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${name}`);
  }

  // ANTES de la línea: return this.http.put<any>(`${this.apiUrl}/${name}`, data);
  updateTemplate(name: string, data: EmailTemplateUpdate): Observable<any> {
    // Procesar product_images para asegurar formato correcto
    if (data.product_images && Array.isArray(data.product_images)) {
      data.product_images = data.product_images.map(img => ({
        url: img.url || '',
        text: img.text || ''
      }));
    }
    
    return this.http.put<any>(`${this.apiUrl}/${name}`, data);
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<any>(`${this.apiUrl}/upload-image`, formData);
  }

  previewTemplate(name: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${name}/preview`);
  }

  getEmpresaInfo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/empresa/info`);
  }
}
