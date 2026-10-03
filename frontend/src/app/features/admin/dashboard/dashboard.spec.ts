import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Dashboard } from './dashboard';
import { DashboardService } from '../../../core/dashboard/dashboard.service';
import { DashboardData, DashboardResponse } from '../../../core/dashboard/dashboard.model';

const summary: DashboardData = {
  orders_today: 0,
  sales_today: '0.00',
  orders_period: 2,
  sales_period: '30.30',
  pending_orders: 1,
  customers: 1,
  date_from: '2026-01-01',
  date_to: '2026-01-30',
  period_days: 30,
  status_filter: 'all',
  sales_by_day: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    label: 'Día',
    total: i === 0 ? '10.10' : i === 1 ? '20.20' : '0.00',
  })),
  top_products: [],
  recent_orders: [],
};

describe('Dashboard', () => {
  function setup(get = vi.fn(() => of({ data: summary }))) {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: DashboardService, useValue: { get } }],
    });
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    return { fixture, get, element: fixture.nativeElement as HTMLElement };
  }
  it('aggregates long periods without losing sales amounts and exposes exact selectable totals', () => {
    const { fixture, element } = setup();
    const bars = element.querySelectorAll<HTMLButtonElement>('.bar-column');
    expect(bars.length).toBe(10);
    expect(bars[0].getAttribute('aria-label')).toContain('S/ 30.30');
    bars[0].click();
    fixture.detectChanges();
    expect(element.querySelector('.chart-detail')?.textContent).toContain('30.30');
    expect(element.querySelector('.chart-detail')?.textContent).toContain('03/01/2026');
  });
  it('rejects inverted custom dates without requesting new metrics', () => {
    const { fixture, element, get } = setup();
    [...element.querySelectorAll<HTMLButtonElement>('.periods button')]
      .find((button) => button.textContent?.trim() === 'Personalizado')!
      .click();
    fixture.detectChanges();
    const [from, to] = element.querySelectorAll<HTMLInputElement>('input[type=date]');
    from.value = '2026-01-20';
    from.dispatchEvent(new Event('input'));
    to.value = '2026-01-10';
    to.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.custom-dates button')!.click();
    fixture.detectChanges();
    expect(get).toHaveBeenCalledTimes(1);
    expect(element.querySelector('[role=alert]')?.textContent).toContain(
      'Selecciona fechas válidas',
    );
  });
  it('ignores a stale response when a new period has been selected', () => {
    const first = new Subject<DashboardResponse>();
    const second = new Subject<DashboardResponse>();
    const get = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { fixture, element } = setup(get);
    [...element.querySelectorAll<HTMLButtonElement>('.periods button')]
      .find((button) => button.textContent?.trim() === '30 días')!
      .click();
    fixture.detectChanges();
    second.next({ data: { ...summary, orders_period: 30 } });
    fixture.detectChanges();
    first.next({ data: { ...summary, orders_period: 7 } });
    fixture.detectChanges();
    expect(element.querySelector('.metrics strong')?.textContent).toBe('30');
  });
});
