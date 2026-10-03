import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerCollection, CustomerResponse } from './customer.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  list(search = ''): Observable<CustomerCollection> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<CustomerCollection>(`${API_URL}/api/v1/admin/customers`, {
      params,
      withCredentials: true,
    });
  }

  show(id: number): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`${API_URL}/api/v1/admin/customers/${id}`, {
      withCredentials: true,
    });
  }
}
