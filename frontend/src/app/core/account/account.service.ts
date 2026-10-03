import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL as API } from '../config/api-url';

export interface Address {
  id: number;
  label: string;
  address: string;
  reference?: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface ProfilePayload {
  name: string;
  email: string;
  phone: string;
  birthday: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  addresses(): Observable<{ data: Address[] }> {
    return this.http.get<{ data: Address[] }>(`${API}/api/v1/addresses`);
  }

  saveAddress(value: Omit<Address, 'id'>, id?: number): Observable<{ data: Address }> {
    return this.mutate<{ data: Address }>(id ? 'put' : 'post', `/addresses${id ? '/' + id : ''}`, value);
  }

  removeAddress(id: number): Observable<void> {
    return this.mutate<void>('delete', `/addresses/${id}`);
  }

  updateProfile(value: ProfilePayload): Observable<{ data: ProfilePayload }> {
    return this.mutate<{ data: ProfilePayload }>('put', '/account/profile', value);
  }

  closeOtherSessions(): Observable<{ message: string }> {
    return this.mutate<{ message: string }>('delete', '/auth/other-sessions');
  }

  private mutate<T>(method: 'post' | 'put' | 'delete', path: string, body?: unknown): Observable<T> {
    return this.http.request<T>(method, `${API}/api/v1${path}`, { body });
  }
}
