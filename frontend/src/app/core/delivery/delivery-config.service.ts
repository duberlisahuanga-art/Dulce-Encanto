import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DeliveryConfigurationResponse,
  DeliverySettings,
  DeliveryZone,
} from './delivery-config.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class DeliveryConfigService {
  private readonly http = inject(HttpClient);

  public(): Observable<DeliveryConfigurationResponse> {
    return this.http.get<DeliveryConfigurationResponse>(`${API_URL}/api/v1/delivery-configuration`);
  }

  admin(): Observable<DeliveryConfigurationResponse> {
    return this.http.get<DeliveryConfigurationResponse>(
      `${API_URL}/api/v1/admin/delivery-configuration`,
    );
  }

  settings(data: DeliverySettings): Observable<unknown> {
    return this.mutate('put', '/settings', data);
  }

  zone(data: { name?: string; fee?: string | number; is_active?: boolean }, id?: number): Observable<unknown> {
    return this.mutate(id ? 'put' : 'post', `/zones${id ? `/${id}` : ''}`, data);
  }

  block(date: string, reason: string): Observable<unknown> {
    return this.mutate('post', '/blocked-dates', { date, reason: reason || null });
  }

  unblock(id: number): Observable<unknown> {
    return this.mutate('delete', `/blocked-dates/${id}`, null);
  }

  private mutate(method: string, path: string, body: unknown): Observable<unknown> {
    return this.http.request(method, `${API_URL}/api/v1/admin/delivery-configuration${path}`, {
      body,
    });
  }
}
