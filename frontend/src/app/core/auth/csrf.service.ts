import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, map, Observable, of, shareReplay } from 'rxjs';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class CsrfService {
  // Use HttpBackend to bypass interceptors and avoid circular dependencies
  private readonly http = new HttpClient(inject(HttpBackend));
  private pending$: Observable<void> | null = null;

  getToken(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const cookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('XSRF-TOKEN='));
    if (!cookie) {
      return null;
    }
    const raw = cookie.substring('XSRF-TOKEN='.length);
    return raw ? decodeURIComponent(raw) : null;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  ensureCsrf(): Observable<void> {
    if (this.hasToken()) {
      return of(void 0);
    }
    return this.refresh();
  }

  refresh(): Observable<void> {
    if (this.pending$) {
      return this.pending$;
    }
    this.pending$ = this.http
      .get<void>(`${API_URL}/sanctum/csrf-cookie`, { withCredentials: true })
      .pipe(
        map(() => void 0),
        shareReplay(1),
        finalize(() => {
          this.pending$ = null;
        }),
      );
    return this.pending$;
  }
}
