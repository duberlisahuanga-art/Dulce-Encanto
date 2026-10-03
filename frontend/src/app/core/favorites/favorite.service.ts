import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Product } from '../catalog/catalog.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  readonly products = signal<Product[]>([]);
  readonly ids = computed(() => new Set(this.products().map((product) => product.id)));
  readonly count = computed(() => this.products().length);

  load(): Observable<{ data: Product[] }> {
    return this.http
      .get<{ data: Product[] }>(`${API_URL}/api/v1/favorites`)
      .pipe(tap(({ data }) => this.products.set(data)));
  }

  isFavorite(productId: number): boolean {
    return this.ids().has(productId);
  }

  toggle(product: Product): Observable<unknown> {
    return this.isFavorite(product.id) ? this.remove(product.id) : this.add(product);
  }

  add(product: Product): Observable<unknown> {
    return this.mutate('post', `/favorites/${product.id}`).pipe(
      tap(() => {
        if (!this.isFavorite(product.id)) {
          this.products.update((current) => [product, ...current]);
        }
      }),
    );
  }

  remove(productId: number): Observable<unknown> {
    return this.mutate('delete', `/favorites/${productId}`).pipe(
      tap(() =>
        this.products.update((current) => current.filter((product) => product.id !== productId)),
      ),
    );
  }

  private mutate(method: 'post' | 'delete', path: string): Observable<unknown> {
    return this.http.request(method, `${API_URL}/api/v1${path}`);
  }
}
