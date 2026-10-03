import { CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { concatMap, finalize, from } from 'rxjs';
import { DeliveryIssue, Order, OrderStatus } from '../../core/orders/order.model';
import { OrderService } from '../../core/orders/order.service';
import { DeliveryTrackingMap } from '../../core/delivery/delivery-tracking-map';
import { CartService } from '../../core/cart/cart.service';
import { ToastService } from '../../core/notifications/toast.service';
@Component({
  selector: 'app-orders',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, UpperCasePipe, DeliveryTrackingMap],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnDestroy {
  protected readonly now = signal(Date.now());
  private readonly timer = setInterval(() => {
    this.now.set(Date.now());
    if (!document.hidden) this.load();
  }, 10000);
  private refreshing = false;
  ngOnDestroy(): void { clearInterval(this.timer); }
  @HostListener('window:focus') onFocus(): void { this.load(); }
  protected steps(order: Order): {status: OrderStatus; label: string}[] {
    return [{status:'pending',label:'Pendiente'},{status:'confirmed',label:'Confirmado'},{status:'preparing',label:'Preparando'},{status:'ready',label:order.delivery_method === 'pickup' ? 'Listo para recoger' : 'Listo'}, ...(order.delivery_method === 'delivery' ? [{status:'out_for_delivery' as OrderStatus,label:'En ruta'}] : []), {status:'delivered',label:'Entregado'}];
  }
  protected stepState(order: Order, index: number): 'completed' | 'current' | 'pending' {
    const current = this.steps(order).findIndex((step) => step.status === order.status);
    if (index < current) return 'completed';
    if (index === current) return 'current';
    return 'pending';
  }

  protected statusMessage(order: Order): string {
    const messages: Record<OrderStatus, string> = {
      pending: 'Recibimos tu pedido y estamos validando el pago y la disponibilidad.',
      confirmed: 'Tu pedido está confirmado. Pronto comenzaremos a prepararlo.',
      preparing: 'Estamos preparando tu pedido con cuidado.',
      ready: order.delivery_method === 'pickup'
        ? 'Tu pedido está listo para recoger en tienda.'
        : 'Tu pedido está listo y espera la salida del repartidor.',
      out_for_delivery: 'El repartidor lleva tu pedido hacia la dirección registrada.',
      delivered: 'El pedido fue marcado como entregado.',
      cancelled: 'Este pedido fue cancelado.',
    };
    return messages[order.status];
  }
  protected requestCancellation(order: Order): void {
    const reason = window.prompt('Explica por qué deseas cancelar el pedido:')?.trim(); if (!reason) return;
    this.service.requestCancellation(order.id, reason).subscribe({ next: () => this.load(), error: response => this.error.set(response.error?.message ?? 'No se pudo enviar la solicitud.') });
  }

  private readonly service = inject(OrderService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly connectionWarning = signal('');
  protected readonly lastUpdatedAt = signal<Date | null>(null);
  protected readonly trackingOrderId = signal<number | null>(null);
  protected readonly repeatingOrderId = signal<number | null>(null);
  protected readonly labels: Record<OrderStatus, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'En preparación',
    ready: 'Listo',
    out_for_delivery: 'En ruta',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  constructor() { this.load(); }
  private load(): void {
    if (this.refreshing) return; this.refreshing = true;
    this.service.mine().subscribe({
      next: ({ data }) => {
        this.refreshing = false;
        this.orders.set(data);
        this.error.set('');
        this.connectionWarning.set('');
        this.lastUpdatedAt.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.refreshing = false;
        if (this.orders().length) {
          this.connectionWarning.set('No pudimos actualizar el seguimiento. Mostramos la última información disponible y volveremos a intentarlo.');
        } else {
          this.error.set('No se pudieron cargar tus pedidos.');
        }
        this.loading.set(false);
      },
    });
  }
  protected progress(status: OrderStatus): number {
    return { pending: 1, confirmed: 2, preparing: 3, ready: 4, out_for_delivery: 5, delivered: 6, cancelled: 0 }[status];
  }
  protected toggleTracking(orderId: number): void {
    this.trackingOrderId.update((current) => current === orderId ? null : orderId);
  }
  protected hasTrackingLocation(order: Order): boolean {
    return order.status === 'out_for_delivery'
      && order.latitude != null
      && order.longitude != null
      && order.courier?.latitude != null
      && order.courier.longitude != null;
  }
  protected isLocationFresh(order: Order): boolean {
    const updatedAt = order.courier?.location_updated_at;
    if (!updatedAt) return false;
    const timestamp = Date.parse(updatedAt);
    return Number.isFinite(timestamp) && this.now() - timestamp <= 45_000;
  }
  protected locationAge(order: Order): string {
    const updatedAt = order.courier?.location_updated_at;
    if (!updatedAt) return 'sin hora disponible';
    const seconds = Math.max(0, Math.floor((this.now() - Date.parse(updatedAt)) / 1000));
    if (!Number.isFinite(seconds)) return 'sin hora disponible';
    if (seconds < 60) return `hace ${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    return `hace ${Math.floor(minutes / 60)} h`;
  }
  protected distance(order: Order): number | null {
    if (!this.hasTrackingLocation(order)) return null;
    const radians = Math.PI / 180;
    const latitudeDelta = (order.latitude! - order.courier!.latitude!) * radians;
    const longitudeDelta = (order.longitude! - order.courier!.longitude!) * radians;
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(order.courier!.latitude! * radians) * Math.cos(order.latitude! * radians)
      * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
  protected timeline(order: Order): { id: string; status: OrderStatus; createdAt: string }[] {
    return [
      { id: `placed-${order.id}`, status: 'pending', createdAt: order.placed_at },
      ...(order.status_history ?? []).map((event) => ({
        id: `change-${event.id}`,
        status: event.status,
        createdAt: event.created_at,
      })),
    ];
  }
  protected timelineLabel(order: Order, status: OrderStatus): string {
    if (status === 'ready' && order.delivery_method === 'pickup') return 'Listo para recoger';
    return this.labels[status];
  }
  protected issueLabel(issue: DeliveryIssue): string {
    return {
      delayed: 'El reparto presenta una demora',
      customer_unreachable: 'El repartidor no pudo comunicarse contigo',
      address_problem: 'Hay un inconveniente con la dirección',
    }[issue];
  }
  protected repeatOrder(order: Order): void {
    const products = order.items.filter((item) => item.product_id);
    if (!products.length || this.repeatingOrderId()) {
      this.toasts.info('No hay productos para repetir', 'Las tortas personalizadas deben agregarse nuevamente.');
      return;
    }

    this.repeatingOrderId.set(order.id);
    from(products)
      .pipe(
        concatMap((item) => this.cart.addProduct(item.product_id!, item.quantity)),
        finalize(() => this.repeatingOrderId.set(null)),
      )
      .subscribe({
        next: () => {},
        error: (response) => this.toasts.error('No se pudo repetir el pedido', response.error?.message ?? 'Revisa límites o disponibilidad.'),
        complete: () => {
          this.toasts.success('Pedido agregado al carrito');
          this.router.navigateByUrl('/carrito');
        },
      });
  }
}
