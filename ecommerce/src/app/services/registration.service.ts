import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Role {
  id: number;
  name: string;
}

export interface DocumentType {
  id: number;
  nombre: string;
}

export interface UbigeoItem {
  id: string;
  nombre: string;
  id_ubigeo: number; // ← AGREGAR esta línea

}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

    private apiUrl = `${environment.apiUrl}`; // Cambia por tu URL base


  constructor(private http: HttpClient) { }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  getDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.apiUrl}/document-types`);
  }

  getDepartamentos(): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${this.apiUrl}/departamentos`);
  }

  getProvincias(departamentoId: string): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${this.apiUrl}/provincias/${departamentoId}`);
  }

  getDistritos(departamentoId: string, provinciaId: string): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${this.apiUrl}/distritos/${departamentoId}/${provinciaId}`);
  }

  registerUser(userData: any, avatar?: File): Observable<any> {
  const formData = new FormData();
  
  // Agregar datos básicos
  Object.keys(userData).forEach(key => {
    if (key !== 'addresses') {
      formData.append(key, userData[key]);
    }
  });
  
  // Agregar direcciones
  userData.addresses.forEach((address: any, index: number) => {
    Object.keys(address).forEach(addressKey => {
      formData.append(`addresses[${index}][${addressKey}]`, address[addressKey]);
    });
  });
  
  // Agregar avatar si existe
  if (avatar) {
    formData.append('avatar', avatar);
  }
  
  return this.http.post(`${this.apiUrl}/usuarios/register`, formData);
  }
    
}
