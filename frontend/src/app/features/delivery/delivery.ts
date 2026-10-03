import { DatePipe } from '@angular/common';
import { Component, OnDestroy, HostListener, inject, signal } from '@angular/core';
import { DeliveryIssue, Order } from '../../core/orders/order.model';
import { OrderService } from '../../core/orders/order.service';

@Component({ selector: 'app-delivery', imports: [DatePipe], templateUrl: './delivery.html', styleUrl: './delivery.scss' })
export class Delivery implements OnDestroy {
  private readonly service = inject(OrderService);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly gpsStatus = signal('GPS en espera: inicia un reparto para compartir ubicación.');
  private readonly timer = setInterval(() => { if (!document.hidden) this.load(); }, 10000);
  protected readonly savingOrderId = signal<number | null>(null);
  protected readonly issueOrderId = signal<number | null>(null);
  @HostListener('window:focus') onFocus(): void { this.load(); }
  private watchId: number | null = null;
  private lastLocationSentAt = 0;
  constructor() { this.load(); }
  ngOnDestroy(): void { clearInterval(this.timer); if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId); }
  protected load(): void {
    this.service.deliveries().subscribe({ next: ({ data }) => { this.orders.set(data); this.loading.set(false); this.syncLocationTracking(); }, error: () => { this.error.set('No se pudieron cargar las entregas.'); this.loading.set(false); } });
  }
  protected advance(order: Order): void {
    if (this.savingOrderId() !== null) return;
    if (order.status === 'out_for_delivery' && !window.confirm(`¿Confirmas que entregaste el pedido ${order.number}?`)) return;
    this.savingOrderId.set(order.id);
    const status = order.status === 'ready' ? 'out_for_delivery' : 'delivered';
    this.service.updateDelivery(order.id, status).subscribe({ next: ({ data }) => { this.savingOrderId.set(null); this.orders.update((orders) => orders.map((item) => item.id === data.id ? data : item)); this.syncLocationTracking(); }, error: (response) => { this.savingOrderId.set(null); this.error.set(response.error?.message ?? 'No se pudo actualizar la entrega.'); } });
  }
  protected reportIssue(order: Order, issue: DeliveryIssue): void {
    if (this.issueOrderId() !== null) return;
    const prompts: Record<DeliveryIssue, string> = {
      delayed: 'Explica brevemente la causa de la demora:',
      customer_unreachable: 'Indica cómo intentaste comunicarte con el cliente:',
      address_problem: 'Describe el inconveniente con la dirección:',
    };
    const note = window.prompt(prompts[issue])?.trim();
    if (!note) return;
    this.issueOrderId.set(order.id);
    this.service.reportDeliveryIssue(order.id, issue, note).subscribe({
      next: ({ data }) => {
        this.issueOrderId.set(null);
        this.orders.update((orders) => orders.map((item) => item.id === data.id ? data : item));
      },
      error: (response) => {
        this.issueOrderId.set(null);
        this.error.set(response.error?.message ?? 'No se pudo reportar la incidencia.');
      },
    });
  }
  protected resolveIssue(order: Order): void {
    if (this.issueOrderId() !== null) return;
    this.issueOrderId.set(order.id);
    this.service.reportDeliveryIssue(order.id, null).subscribe({
      next: ({ data }) => {
        this.issueOrderId.set(null);
        this.orders.update((orders) => orders.map((item) => item.id === data.id ? data : item));
      },
      error: (response) => {
        this.issueOrderId.set(null);
        this.error.set(response.error?.message ?? 'No se pudo cerrar la incidencia.');
      },
    });
  }
  protected issueLabel(issue: DeliveryIssue): string {
    return {
      delayed: 'Demora en el reparto',
      customer_unreachable: 'Cliente no disponible',
      address_problem: 'Problema con la dirección',
    }[issue];
  }
  private startLocationTracking(): void {
    if (this.watchId !== null) return;
    if (!navigator.geolocation) { this.gpsStatus.set('Tu dispositivo no admite GPS.'); return; }
    this.watchId = navigator.geolocation.watchPosition((position) => {
      if (!this.orders().some((order) => order.status === 'out_for_delivery')) return;
      const now = Date.now();
      if (now - this.lastLocationSentAt < 10_000) return;
      this.lastLocationSentAt = now;
      this.service.updateLocation(position.coords.latitude, position.coords.longitude).subscribe({ next: () => this.gpsStatus.set('Ubicación compartida con el cliente y administración.'), error: () => this.gpsStatus.set('No se pudo actualizar la ubicación.') });
    }, () => this.gpsStatus.set('Permite el acceso a tu ubicación para activar el GPS.'), { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 });
  }
  private syncLocationTracking(): void {
    if (this.orders().some((order) => order.status === 'out_for_delivery')) {
      this.gpsStatus.set('Activando ubicación GPS…');
      this.startLocationTracking();
      return;
    }
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.lastLocationSentAt = 0;
    }
    this.gpsStatus.set('GPS en espera: inicia un reparto para compartir ubicación.');
  }
}
