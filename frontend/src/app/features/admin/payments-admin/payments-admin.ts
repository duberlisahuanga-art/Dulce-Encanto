import { AuthService } from '../../../core/auth/auth.service';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Order, PaymentStatus } from '../../../core/orders/order.model';
import { OrderService } from '../../../core/orders/order.service';

type PaymentFilter = 'all' | PaymentStatus;

@Component({
  selector: 'app-payments-admin',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './payments-admin.html',
  styleUrl: './payments-admin.scss',
})
export class PaymentsAdmin {
  @ViewChild('reviewDialog') private reviewDialog!: ElementRef<HTMLDialogElement>;
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly pendingReview = signal<{
    order: Order;
    status: 'approved' | 'rejected';
  } | null>(null);
  protected readonly reviewError = signal('');
  protected readonly auth = inject(AuthService);
  private readonly service = inject(OrderService);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly filter = signal<PaymentFilter>('all');
  protected readonly savingPaymentId = signal<number | null>(null);
  protected readonly filteredOrders = computed(() =>
    this.orders().filter(
      (order) => this.filter() === 'all' || order.payment?.status === this.filter(),
    ),
  );
  protected readonly summary = computed(() => {
    const payments = this.orders().flatMap((order) => (order.payment ? [order.payment] : []));

    return {
      total: payments.length,
      pending: payments.filter((payment) => payment.status === 'pending').length,
      approved: payments.filter((payment) => payment.status === 'approved').length,
      rejected: payments.filter((payment) => payment.status === 'rejected').length,
    };
  });

  constructor() {
    this.load();
  }

  protected review(order: Order, status: PaymentStatus): void {
    if (!order.payment || order.payment.status !== 'pending' || this.savingPaymentId()) return;

    if (status === 'pending' || !this.auth.user()?.permissions?.includes('pagos.aprobar')) return;
    this.pendingReview.set({ order, status });
    this.reviewError.set('');
    this.changeDetector.detectChanges();
    this.reviewDialog.nativeElement.showModal();
  }

  protected closeReview(): void {
    if (this.savingPaymentId()) return;
    this.reviewDialog.nativeElement.close();
    this.pendingReview.set(null);
    this.reviewError.set('');
  }

  protected cancelReview(event: Event): void {
    event.preventDefault();
    this.closeReview();
  }

  protected confirmReview(): void {
    const review = this.pendingReview();
    if (
      !review ||
      this.savingPaymentId() ||
      !this.auth.user()?.permissions?.includes('pagos.aprobar')
    )
      return;
    const { order, status } = review;
    if (!order.payment || order.payment.status !== 'pending') return;
    this.reviewError.set('');
    this.error.set('');
    this.message.set('');
    this.savingPaymentId.set(order.payment.id);
    this.service.updatePayment(order.payment.id, status).subscribe({
      next: ({ data }) => {
        this.orders.update((orders) => orders.map((item) => (item.id === data.id ? data : item)));
        this.message.set(`Pago ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente.`);
        this.savingPaymentId.set(null);
        this.closeReview();
      },
      error: () => {
        this.reviewError.set('No se pudo actualizar el pago. Inténtalo nuevamente.');
        this.savingPaymentId.set(null);
      },
    });
  }

  protected setFilter(filter: PaymentFilter): void {
    this.filter.set(filter);
  }

  protected methodLabel(method: string): string {
    return (
      {
        cash: 'Efectivo',
        yape: 'Yape',
        plin: 'Plin',
        transfer: 'Transferencia',
        card: 'Tarjeta',
      }[method.toLowerCase()] ?? method
    );
  }

  protected statusLabel(status: PaymentStatus): string {
    return { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[status];
  }

  private load(): void {
    this.service.payments().subscribe({
      next: ({ data }) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los pagos.');
        this.loading.set(false);
      },
    });
  }
}
