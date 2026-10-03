import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, HostListener, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Courier, Order, OrderStatus, OrderChange } from '../../../core/orders/order.model';
import { OrderService } from '../../../core/orders/order.service';
@Component({
  selector: 'app-orders-admin',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './orders-admin.html',
  styleUrl: './orders-admin.scss',
})
export class OrdersAdmin implements OnDestroy {
  private requestedOrderId: string | null = inject(ActivatedRoute).snapshot.queryParamMap.get('pedido');
  private readonly auth = inject(AuthService);
  protected readonly saving = signal<number | null>(null);
  protected readonly message = signal('');
  protected readonly history = signal<OrderChange[]>([]);
  private refreshing = false;
  private readonly timer = setInterval(() => { if (!document.hidden) this.load(false); }, 10000);
  ngOnDestroy(): void { clearInterval(this.timer); }
  @HostListener('window:focus') onFocus(): void { this.load(false); }
  protected can(permission: string): boolean { return this.auth.user()?.permissions.includes(permission) ?? false; }
  protected availableStatuses(order: Order) {
    const next: Record<string, string[]> = {pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','cancelled'],ready:[order.delivery_method === 'pickup' ? 'delivered' : 'out_for_delivery','cancelled'],out_for_delivery:['delivered','cancelled']};
    return this.statuses.filter(item => item.value === order.status || ((next[order.status] ?? []).includes(item.value) && this.can(item.value === 'confirmed' ? 'pedidos.confirmar' : item.value === 'cancelled' ? 'pedidos.cancelar' : ['preparing','ready'].includes(item.value) ? 'pedidos.preparar' : order.delivery_method === 'pickup' ? 'pedidos.entregar_tienda' : 'delivery.actualizar')));
  }
  protected show(order: Order): void { this.selected.set(order); this.history.set([]); this.service.history(order.id).subscribe({ next: r => this.history.set(r.data), error: () => this.error.set('No se pudo cargar el historial.') }); }

  private readonly service = inject(OrderService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly selected = signal<Order | null>(null);
  protected readonly statusFilter = signal('');
  protected readonly couriers = signal<Courier[]>([]);
  protected readonly statuses: { value: OrderStatus; label: string }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'En preparación' },
    { value: 'ready', label: 'Listo' },
    { value: 'out_for_delivery', label: 'En ruta' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];
  constructor() {
    this.load();
    if (this.can('delivery.asignar')) this.service.couriers().subscribe({ next: ({ data }) => this.couriers.set(data), error: () => this.error.set('No se pudieron cargar los repartidores.') });
  }
  protected assign(order: Order, value: string, control: HTMLSelectElement): void {
    control.value = String(order.courier?.id ?? '');
    if (this.saving()) return;
    this.saving.set(order.id); this.error.set(''); this.message.set('');
    this.service.assignCourier(order.id, value ? +value : null, order.courier?.id ?? null).subscribe({
      next: ({ data }) => this.saved(data), error: response => this.failed(response),
    });
  }
  protected load(showLoading = true): void {
    if (this.saving() || this.refreshing) return;
    this.refreshing = true;
    if (showLoading) this.loading.set(true);
    this.service.admin(this.statusFilter()).subscribe({
      next: ({ data }) => {
        if (this.requestedOrderId) {
          const requested = data.find(order => String(order.id) === this.requestedOrderId);
          this.requestedOrderId = null;
          if (requested) this.show(requested);
        }
        this.orders.set(data); this.loading.set(false); this.refreshing = false;
        const selected = this.selected();
        if (selected) { const current = data.find(item => item.id === selected.id); if (current) this.selected.set(current); }
      },
      error: () => { this.error.set('No se pudieron actualizar los pedidos.'); this.loading.set(false); this.refreshing = false; },
    });
  }
  protected update(order: Order, status: OrderStatus, control: HTMLSelectElement): void {
    control.value = order.status;
    if (this.saving() || status === order.status) return;
    let reason: string | undefined;
    if (status === 'cancelled') { reason = window.prompt('Motivo de cancelación:')?.trim(); if (!reason) return; }
    this.saving.set(order.id); this.error.set(''); this.message.set('');
    this.service.updateStatus(order.id, status, order.status, reason).subscribe({next: ({ data }) => this.saved(data), error: response => this.failed(response)});
  }
  private saved(order: Order): void {
    this.orders.update(orders => orders.map(item => item.id === order.id ? order : item));
    if (this.selected()?.id === order.id) this.show(order);
    this.saving.set(null); this.message.set('Cambios guardados.'); this.load(false);
  }
  private failed(response: {error?: {message?: string}}): void {
    this.saving.set(null); this.error.set(response.error?.message ?? 'No se pudo guardar. Se mantiene el valor anterior.'); this.load(false);
  }
  protected statusLabel(status: OrderStatus): string {
    return this.statuses.find((item) => item.value === status)?.label ?? status;
  }
  protected workflowSteps(order: Order): { value: OrderStatus; label: string }[] {
    return [
      { value: 'pending', label: 'Pendiente' },
      { value: 'confirmed', label: 'Confirmado' },
      { value: 'preparing', label: 'Preparando' },
      { value: 'ready', label: 'Listo' },
      ...(order.delivery_method === 'delivery' ? [{ value: 'out_for_delivery' as OrderStatus, label: 'En ruta' }] : []),
      { value: 'delivered', label: 'Entregado' },
    ];
  }
  protected workflowActive(order: Order, index: number): boolean {
    return this.workflowSteps(order).findIndex((step) => step.value === order.status) >= index;
  }
  protected nextAction(order: Order): string {
    if (order.status === 'pending') return 'Confirma el pedido para iniciar su preparación.';
    if (order.status === 'confirmed') return 'Pásalo a preparación cuando el equipo comience a elaborarlo.';
    if (order.status === 'preparing') return 'Márcalo como listo cuando esté preparado para entregar.';
    if (order.status === 'ready' && order.delivery_method === 'pickup') return 'El cliente puede recogerlo; luego márcalo como entregado.';
    if (order.status === 'ready' && !order.courier) return 'Asigna un repartidor para entregarle el pedido.';
    if (order.status === 'ready') return 'El pedido está asignado; el repartidor lo iniciará desde su panel.';
    if (order.status === 'out_for_delivery') return 'El repartidor está en ruta y confirmará la entrega.';
    if (order.status === 'delivered') return 'Pedido completado.';
    return 'Pedido cancelado.';
  }
  protected itemsTotal(order: Order): number {
    return order.items.reduce((total, item) => total + Number(item.subtotal), 0);
  }
  protected hasAdjustedTotal(order: Order): boolean {
    return Math.abs(this.itemsTotal(order) - Number(order.total)) > 0.001;
  }
  protected mapUrl(order: Order): SafeResourceUrl | null {
    const courier = order.courier;
    if (courier?.latitude == null || courier.longitude == null) return null;
    const latitude = courier.latitude; const longitude = courier.longitude; const delta = 0.008;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`);
  }
}
