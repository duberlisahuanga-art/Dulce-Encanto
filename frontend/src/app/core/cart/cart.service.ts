import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CakeQuotePayload } from '../cake-designer/cake-option.model';
import { AuthService } from '../auth/auth.service';
import { Cart, CartResponse } from './cart.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly cart = signal<Cart | null>(null);
  readonly count = computed(() => this.cart()?.items_count ?? 0);
  readonly limits = computed(() => this.cart()?.limits ?? { per_product: 10, per_order: 20 });

  constructor() {
    effect((cleanup) => {
      const userId = this.auth.user()?.id;
      this.cart.set(null);
      if (userId) {
        const subscription = this.get().subscribe({ error: () => {} });
        cleanup(() => subscription.unsubscribe());
      }
    });
  }

  quantity(productId: number): number {
    return this.cart()?.items.find((item) => item.product_id === productId)?.quantity ?? 0;
  }

  canAdd(productId: number): boolean {
    return (
      !!this.cart() &&
      this.count() < this.limits().per_order &&
      this.quantity(productId) < this.limits().per_product
    );
  }

  get(): Observable<CartResponse> {
    return this.http
      .get<CartResponse>(`${API_URL}/api/v1/cart`)
      .pipe(tap((response) => this.cart.set(response.data)));
  }

  addProduct(productId: number, quantity = 1): Observable<CartResponse> {
    return this.mutate('post', '/cart/products', { product_id: productId, quantity });
  }

  addCake(payload: CakeQuotePayload): Observable<CartResponse> {
    return this.mutate('post', '/cart/custom-cakes', payload);
  }

  update(itemId: number, quantity: number): Observable<CartResponse> {
    return this.mutate('patch', `/cart/items/${itemId}`, { quantity });
  }

  remove(itemId: number): Observable<CartResponse> {
    return this.mutate('delete', `/cart/items/${itemId}`);
  }

  clear(): Observable<void> {
    return this.mutate<void>('delete', '/cart');
  }

  applyCoupon(code: string): Observable<CartResponse> {
    return this.mutate('post', '/cart/coupon', { code });
  }

  removeCoupon(): Observable<CartResponse> {
    return this.mutate('delete', '/cart/coupon');
  }

  private mutate<T = CartResponse>(
    method: 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
  ): Observable<T> {
    return this.http
      .request<T>(method, `${API_URL}/api/v1${path}`, { body })
      .pipe(
        tap((response) => {
          const data = (response as CartResponse | undefined)?.data;
          this.cart.set(data ?? null);
        }),
      );
  }
}
