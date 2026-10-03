import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { AuthResponse, AuthUser } from './user.model';
import { API_URL } from '../config/api-url';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<AuthUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = computed(() => this.currentUser() !== null);

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${API_URL}/api/v1/auth/register`, payload).pipe(
      map((response) => response.user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${API_URL}/api/v1/auth/login`, payload).pipe(
      map((response) => response.user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/api/v1/auth/forgot-password`,
      { email },
    );
  }

  resetPassword(payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_URL}/api/v1/auth/reset-password`,
      payload,
    );
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    return this.http.get<AuthResponse>(`${API_URL}/api/v1/auth/me`).pipe(
      map((response) => response.user),
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_URL}/api/v1/auth/logout`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return of(void 0);
        }
        return throwError(() => error);
      }),
      tap(() => this.currentUser.set(null)),
    );
  }

  clearLocalSession(): void {
    this.currentUser.set(null);
  }

  updatePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${API_URL}/api/v1/auth/password`, payload);
  }
}
