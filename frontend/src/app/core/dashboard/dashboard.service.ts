import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardResponse } from './dashboard.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(period = 7, status = 'all', from?: string, to?: string): Observable<DashboardResponse> {
    let params = new HttpParams().set('period', period).set('status', status);
    if (from && to) params = params.set('date_from', from).set('date_to', to);
    return this.http.get<DashboardResponse>(`${API_URL}/api/v1/admin/dashboard`, {
      withCredentials: true,
      params,
    });
  }
}
