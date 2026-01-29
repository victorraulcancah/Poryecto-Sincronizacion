import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhotoUploadService {

  constructor(private http: HttpClient) {}

  uploadClientPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);

    const headers = new HttpHeaders();
    const token = localStorage.getItem('auth_token');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(`${environment.baseUrl}/api/cliente/upload-foto`, formData, {
      headers: headers
    });
  }

  deleteClientPhoto(): Observable<any> {
    const headers = new HttpHeaders();
    const token = localStorage.getItem('auth_token');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.delete(`${environment.baseUrl}/api/cliente/delete-foto`, {
      headers: headers
    });
  }
}