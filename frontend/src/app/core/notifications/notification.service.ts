import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL as API } from '../config/api-url';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);

  load(): Observable<{ data: AppNotification[]; unread_count: number }> {
    return this.http
      .get<{ data: AppNotification[]; unread_count: number }>(`${API}/api/v1/notifications`)
      .pipe(
        tap((r) => {
          this.items.set(r.data);
          this.unread.set(r.unread_count);
        }),
      );
  }

  read(id: number): Observable<unknown> {
    return this.mutate(`/notifications/${id}/read`).pipe(
      tap(() => {
        this.items.update((xs) =>
          xs.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)),
        );
        this.unread.update((n) => Math.max(0, n - 1));
      }),
    );
  }

  readAll(): Observable<unknown> {
    return this.mutate('/notifications/read-all').pipe(
      tap(() => {
        this.items.update((xs) =>
          xs.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })),
        );
        this.unread.set(0);
      }),
    );
  }

  private mutate(path: string): Observable<unknown> {
    return this.http.patch(`${API}/api/v1${path}`, {});
  }
}
