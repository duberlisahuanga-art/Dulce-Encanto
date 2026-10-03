import { CartService } from '../../core/cart/cart.service';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CatalogService } from '../../core/catalog/catalog.service';
import { PromotionService } from '../../core/promotions/promotion.service';
import { ColdZone } from './cold-zone';

describe('ColdZone catalog', () => {
  const products = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? 'Helado de maracuyá' : `Helado ${i + 1}`,
    slug: `helado-${i + 1}`,
    price: String(i + 10),
    image_url: null,
    description: 'Producto de prueba importado desde Open Food Facts: postre frío.',
    is_active: true,
    is_available: true,
    ...(i === 1
      ? { discounted_price: '5.00', promotion: { discount_type: 'fixed', discount_value: '6' } }
      : {}),
    ...(i === 2 ? { coupon_promotion: { discount_type: 'percentage', discount_value: '10' } } : {}),
  }));
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ColdZone],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authenticated: signal(false) } },
        {
          provide: CartService,
          useValue: { quantity: () => 0, count: signal(0), cart: signal(null) },
        },
        {
          provide: CatalogService,
          useValue: {
            publicCategories: () =>
              of({ data: [{ id: 5, name: 'Zona fría', slug: 'zona-fria', products }] }),
          },
        },
        { provide: PromotionService, useValue: { public: () => of({ data: [] }) } },
      ],
    }),
  );
  function setup() {
    const fixture = TestBed.createComponent(ColdZone);
    fixture.detectChanges();
    return fixture;
  }
  it('loads more and resets pagination when searching without accents', () => {
    const f = setup();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.product-card').length).toBe(12);
    el.querySelector<HTMLButtonElement>('.catalog-bottom button')!.click();
    f.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(14);
    const input = el.querySelector('input')!;
    input.value = 'maracuya';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(1);
    expect(el.textContent).not.toContain('Open Food Facts');
    el.querySelector<HTMLButtonElement>('.result-count button')!.click();
    f.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(12);
  });
  it('sorts by payable price and distinguishes coupon offers', () => {
    const f = setup();
    const el = f.nativeElement as HTMLElement;
    const select = el.querySelector('select')!;
    select.value = 'price-asc';
    select.dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(el.querySelector('.product-card h3')?.textContent).toContain('Helado 2');
    el.querySelectorAll<HTMLButtonElement>('.tabs button')[1].click();
    f.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(2);
    expect(el.textContent).toContain('con cupón');
    expect(el.querySelectorAll('.price-row del').length).toBe(1);
  });
  it('explains unmatched search results and provides a reset', () => {
    const f = setup();
    const el = f.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    input.value = 'no existe';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toContain('No encontramos ese antojo');
    el.querySelector<HTMLButtonElement>('.empty button')!.click();
    f.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(12);
  });
  it('offers retry when the catalog request fails', () => {
    TestBed.overrideProvider(CatalogService, {
      useValue: { publicCategories: () => throwError(() => new Error('offline')) },
    });
    const f = setup();
    expect(f.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Reintentar');
    expect(f.nativeElement.querySelector('.empty')).toBeNull();
  });
});
