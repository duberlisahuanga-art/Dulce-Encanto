import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StaffCollection, StaffPayload, StaffResponse } from './staff-user.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class StaffUserService {
  private readonly http = inject(HttpClient);

  list(): Observable<StaffCollection> {
    return this.http.get<StaffCollection>(`${API_URL}/api/v1/admin/staff-users`);
  }

  save(payload: StaffPayload, id?: number): Observable<StaffResponse> {
    return this.http.request<StaffResponse>(
      id ? 'put' : 'post',
      `${API_URL}/api/v1/admin/staff-users${id ? `/${id}` : ''}`,
      { body: payload },
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/api/v1/admin/staff-users/${id}`);
  }
}
