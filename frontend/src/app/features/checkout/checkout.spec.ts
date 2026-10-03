import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { DeliveryConfigService } from '../../core/delivery/delivery-config.service';
import { OrderService } from '../../core/orders/order.service';
import { Checkout } from './checkout';

describe('Checkout validation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ phone: '' }) } },
        { provide: AccountService, useValue: { addresses: () => of({ data: [] }) } },
        {
          provide: DeliveryConfigService,
          useValue: {
            public: () => of({
              data: {
                settings: {
                  max_units_per_product: 10,
                  max_units_per_order: 20,
                  minimum_lead_days: 1,
                  daily_capacity: 20,
                  opening_time: '09:00',
                  closing_time: '18:00',
                },
                store: { latitude: -12.0464, longitude: -77.0428, maximum_distance_km: 15 },
                zones: [],
                blocked_dates: [],
              },
            }),
          },
        },
        {
          provide: CartService,
          useValue: {
            cart: signal(null),
            get: () => of({
              data: {
                id: 1,
                items: [{
                  id: 1,
                  type: 'product',
                  product_id: 1,
                  name: 'Torta de chocolate',
                  unit_price: '65.00',
                  quantity: 1,
                  subtotal: '65.00',
                  discount: '0.00',
                  total: '65.00',
                  image_url: null,
                  promotion: null,
                  configuration: null,
                }],
                items_count: 1,
                limits: { per_product: 10, per_order: 20 },
                subtotal: '65.00',
                discount: '0.00',
                total: '65.00',
                coupon: null,
                currency: 'PEN',
              },
            }),
          },
        },
        { provide: OrderService, useValue: { create: () => of({}) } },
      ],
    });
  });

  it('removes non-numeric characters and limits the phone to nine digits', () => {
    const fixture = TestBed.createComponent(Checkout);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const phone = element.querySelector<HTMLInputElement>('input[formControlName="phone"]')!;

    phone.value = '98a7-654 3210';
    phone.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(phone.value).toBe('987654321');
  });

  it('shows an alert beside every missing required field', () => {
    const fixture = TestBed.createComponent(Checkout);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('aside button')!.click();
    fixture.detectChanges();

    const alerts = Array.from(element.querySelectorAll<HTMLElement>('[role="alert"]'))
      .map((element) => element.textContent?.trim());

    expect(alerts).toContain('Selecciona una fecha de entrega.');
    expect(alerts).toContain('Ingresa tu número de teléfono.');
    expect(alerts).toContain('Revisa los campos marcados antes de confirmar el pedido.');
  });
});
