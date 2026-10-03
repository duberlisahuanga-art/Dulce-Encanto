import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PromotionCollection, PromotionResponse } from './promotion.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly http = inject(HttpClient);

  public(): Observable<PromotionCollection> {
    return this.http.get<PromotionCollection>(`${API_URL}/api/v1/promotions`);
  }

  admin(): Observable<PromotionCollection> {
    return this.http.get<PromotionCollection>(`${API_URL}/api/v1/admin/promotions`);
  }

  save(payload: FormData, id?: number): Observable<PromotionResponse> {
    if (id) payload.set('_method', 'PUT');

    return this.mutate<PromotionResponse>('post', id ? `/admin/promotions/${id}` : '/admin/promotions', payload);
  }

  remove(id: number): Observable<void> {
    return this.mutate<void>('delete', `/admin/promotions/${id}`);
  }

  private mutate<T>(
    method: 'post' | 'put' | 'delete',
    path: string,
    body?: unknown,
  ): Observable<T> {
    return this.http.request<T>(method, `${API_URL}/api/v1${path}`, { body });
  }
}
