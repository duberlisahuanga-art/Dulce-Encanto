import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  OrderCollection,
  OrderPayload,
  OrderResponse,
  OrderStatus,
  PaymentStatus,
  CourierCollection,
  OrderChange,
  DeliveryIssue,
} from './order.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  mine(): Observable<OrderCollection> {
    return this.http.get<OrderCollection>(`${API_URL}/api/v1/orders`);
  }

  create(payload: OrderPayload): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('post', '/orders', payload);
  }

  admin(status?: string): Observable<OrderCollection> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<OrderCollection>(`${API_URL}/api/v1/admin/orders`, { params });
  }

  updateStatus(
    id: number,
    status: OrderStatus,
    expected_status?: OrderStatus,
    reason?: string,
  ): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('patch', `/admin/orders/${id}`, {
      status,
      expected_status,
      reason,
    });
  }

  couriers(): Observable<CourierCollection> {
    return this.http.get<CourierCollection>(`${API_URL}/api/v1/admin/delivery/couriers`);
  }

  assignCourier(
    orderId: number,
    deliveryUserId: number | null,
    expectedCourierId?: number | null,
  ): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('patch', `/admin/delivery/orders/${orderId}/assign`, {
      delivery_user_id: deliveryUserId,
      expected_courier_id: expectedCourierId,
    });
  }

  history(id: number): Observable<{ data: OrderChange[] }> {
    return this.http.get<{ data: OrderChange[] }>(
      `${API_URL}/api/v1/admin/orders/${id}/history`,
    );
  }

  requestCancellation(id: number, reason: string): Observable<OrderResponse> {
    return this.mutate('post', `/orders/${id}/cancellation-request`, { reason });
  }

  deliveries(): Observable<OrderCollection> {
    return this.http.get<OrderCollection>(`${API_URL}/api/v1/delivery/orders`);
  }

  updateDelivery(id: number, status: 'out_for_delivery' | 'delivered'): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('patch', `/delivery/orders/${id}`, { status });
  }

  reportDeliveryIssue(
    id: number,
    issue: DeliveryIssue | null,
    note?: string,
  ): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('patch', `/delivery/orders/${id}/issue`, {
      issue,
      note: note || null,
    });
  }

  updateLocation(latitude: number, longitude: number): Observable<void> {
    return this.mutate<void>('patch', '/delivery/location', { latitude, longitude });
  }

  payments(): Observable<OrderCollection> {
    return this.http.get<OrderCollection>(`${API_URL}/api/v1/admin/payments`);
  }

  updatePayment(id: number, status: PaymentStatus, reference?: string): Observable<OrderResponse> {
    return this.mutate<OrderResponse>('patch', `/admin/payments/${id}`, {
      status,
      reference: reference || null,
    });
  }

  private mutate<T>(method: 'post' | 'patch', path: string, body: unknown): Observable<T> {
    return this.http.request<T>(method, `${API_URL}/api/v1${path}`, { body });
  }
}
