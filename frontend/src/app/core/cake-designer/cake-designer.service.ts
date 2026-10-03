import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { ApiCollection, ApiItem } from '../catalog/catalog.model';
import {
  CakeImage,
  CakeOption,
  CakeOptionPayload,
  CakeOptions,
  CakeQuote,
  CakeQuotePayload,
} from './cake-option.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class CakeDesignerService {
  private readonly http = inject(HttpClient);

  options(): Observable<{ data: CakeOptions }> {
    return this.http.get<{ data: CakeOptions }>(`${API_URL}/api/v1/cake-designer/options`);
  }

  quote(payload: CakeQuotePayload): Observable<{ data: CakeQuote }> {
    return this.http.post<{ data: CakeQuote }>(`${API_URL}/api/v1/cake-designer/quote`, payload);
  }

  generateImage(payload: CakeQuotePayload): Observable<{ data: CakeImage }> {
    return this.http.post<{ data: CakeImage }>(`${API_URL}/api/v1/cake-designer/image`, payload);
  }

  adminOptions(): Observable<ApiCollection<CakeOption>> {
    return this.http.get<ApiCollection<CakeOption>>(`${API_URL}/api/v1/admin/cake-options`);
  }

  saveOption(payload: CakeOptionPayload, id?: number): Observable<ApiItem<CakeOption>> {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'available_colors' || value === undefined) continue;
      if (value instanceof File) body.append(key, value);
      else if (value != null) body.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      else body.append(key, '');
    }
    payload.available_colors.forEach((color, index) => body.append(`available_colors[${index}]`, color));
    if (id) body.append('_method', 'PUT');
    return this.http.post<ApiItem<CakeOption>>(`${API_URL}/api/v1/admin/cake-options${id ? '/' + id : ''}`, body);
  }

  deleteOption(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/api/v1/admin/cake-options/${id}`);
  }
}
