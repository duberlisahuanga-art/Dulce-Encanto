import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Product } from '../../core/catalog/catalog.model';
import { CatalogService } from '../../core/catalog/catalog.service';
import { ProductDetail } from './product-detail';

describe('ProductDetail', () => {
  const product: Product = {
    id: 1,
    category_id: 1,
    name: 'Torta de chocolate',
    slug: 'torta-chocolate',
    description: 'Torta artesanal',
    price: '70.00',
    image_url: null,
    is_available: true,
    is_active: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: product.slug })) },
        },
        {
          provide: CatalogService,
          useValue: { publicProduct: () => of({ data: product, related: [] }) },
        },
        { provide: CartService, useValue: {} },
        { provide: AuthService, useValue: { authenticated: signal(false) } },
      ],
    }).compileComponents();
  });

  it('renders the public product information', () => {
    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Torta de chocolate');
    expect(fixture.nativeElement.textContent).toContain('70.00');
  });
});
