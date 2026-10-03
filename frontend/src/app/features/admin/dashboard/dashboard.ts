import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardData } from '../../../core/dashboard/dashboard.model';
import { DashboardService } from '../../../core/dashboard/dashboard.service';
import { OrderStatus } from '../../../core/orders/order.model';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnDestroy {
  private readonly service = inject(DashboardService);
  private request?: Subscription;
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly period = signal(7);
  protected readonly status = signal('all');
  protected readonly custom = signal(false);
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly selectedBar = signal(0);
  protected readonly today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  protected readonly statuses: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'En preparación' },
    { value: 'ready', label: 'Listo' },
    { value: 'out_for_delivery', label: 'En ruta' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];
  protected readonly chartDays = computed(() => {
    const days = this.data()?.sales_by_day ?? [];
    const size = Math.max(1, Math.ceil(days.length / 12));
    const groups: { date: string; end: string; total: number }[] = [];
    for (let i = 0; i < days.length; i += size) {
      const group = days.slice(i, i + size);
      groups.push({
        date: group[0].date,
        end: group[group.length - 1].date,
        total: Math.round(group.reduce((sum, day) => sum + Number(day.total), 0) * 100) / 100,
      });
    }
    return groups;
  });
  protected readonly chartMax = computed(() => {
    const max = Math.max(...this.chartDays().map((day) => day.total), 1);
    const step = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / step) * step;
  });
  protected readonly ticks = computed(() => [
    this.chartMax(),
    this.chartMax() * 0.75,
    this.chartMax() * 0.5,
    this.chartMax() * 0.25,
    0,
  ]);
  protected readonly topQuantity = computed(() =>
    Math.max(...(this.data()?.top_products.map((p) => p.quantity) ?? []), 1),
  );
  protected readonly activeBar = computed(() => this.chartDays()[this.selectedBar()]);

  constructor() {
    this.load();
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  protected choosePeriod(days: number): void {
    this.period.set(days);
    this.custom.set(false);
    this.load();
  }
  protected openCustom(): void {
    this.custom.set(true);
    this.dateFrom.set(this.data()?.date_from ?? this.today);
    this.dateTo.set(this.data()?.date_to ?? this.today);
  }
  protected load(): void {
    if (this.custom()) {
      const from = this.dateFrom(),
        to = this.dateTo();
      if (
        !from ||
        !to ||
        from > to ||
        to > this.today ||
        (Date.parse(to) - Date.parse(from)) / 86400000 > 365
      ) {
        this.error.set('Selecciona fechas válidas, hasta hoy y con un máximo de 366 días.');
        return;
      }
    }
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.service
      .get(
        this.period(),
        this.status(),
        this.custom() ? this.dateFrom() : undefined,
        this.custom() ? this.dateTo() : undefined,
      )
      .subscribe({
        next: ({ data }) => {
          this.data.set(data);
          this.selectedBar.set(Math.max(0, this.chartDays().length - 1));
          this.updatedAt.set(new Date());
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo actualizar el resumen. Inténtalo nuevamente.');
          this.loading.set(false);
        },
      });
  }
  protected statusLabel(status: OrderStatus): string {
    return this.statuses.find((s) => s.value === status)?.label ?? status;
  }
  protected barHeight(total: number): number {
    return (total / this.chartMax()) * 100;
  }
}
