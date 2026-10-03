import { CartService } from '../../core/cart/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProductQuantity } from '../../core/cart/product-quantity';
import { FloatingCartSummary } from '../../core/cart/floating-cart-summary';
import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog.service';
import { Product } from '../../core/catalog/catalog.model';
import { Promotion } from '../../core/promotions/promotion.model';
import { PromotionService } from '../../core/promotions/promotion.service';

@Component({
  selector: 'app-cold-zone',
  imports: [CurrencyPipe, RouterLink, ProductQuantity, FloatingCartSummary],
  templateUrl: './cold-zone.html',
  styleUrl: './cold-zone.scss',
})
export class ColdZone {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly catalog = inject(CatalogService);
  private readonly promotionService = inject(PromotionService);
  protected readonly products = signal<Product[]>([]);
  protected readonly promotions = signal<Promotion[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly loadingPromotions = signal(true);
  protected readonly loadError = signal(false);
  protected readonly selectedType = signal<'todos' | 'promocion'>('todos');
  protected readonly search = signal('');
  protected readonly sort = signal('recommended');
  protected readonly limit = signal(12);
  protected readonly brokenImages = signal<Set<number>>(new Set());

  protected readonly coldProducts = computed(() => {
    const unique = new Map<number, Product>();
    [
      ...this.promotions()
        .flatMap((p) => p.products ?? [])
        .filter((p) => this.isColdProduct(p)),
      ...this.products(),
    ]
      .filter((p) => p.is_available && p.is_active)
      .forEach((p) => unique.set(p.id, p));
    return [...unique.values()];
  });
  protected readonly filteredProducts = computed(() => {
    const term = this.normalize(this.search().trim());
    const products = this.coldProducts().filter(
      (product) =>
        (!term || this.normalize(`${product.name} ${this.description(product)}`).includes(term)) &&
        (this.selectedType() === 'todos' || !!product.promotion || !!product.coupon_promotion),
    );
    if (this.sort() === 'price-asc')
      products.sort((a, b) => this.displayPrice(a) - this.displayPrice(b));
    if (this.sort() === 'price-desc')
      products.sort((a, b) => this.displayPrice(b) - this.displayPrice(a));
    return products;
  });
  protected readonly visibleProducts = computed(() =>
    this.filteredProducts().slice(0, this.limit()),
  );
  protected readonly coldPromotions = computed(() =>
    this.promotions().filter((p) =>
      (p.products ?? []).some((product) => this.isColdProduct(product)),
    ),
  );

  constructor() {
    this.loadProducts();
    this.promotionService.public().subscribe({
      next: ({ data }) => {
        this.promotions.set(data);
        this.loadingPromotions.set(false);
      },
      error: () => this.loadingPromotions.set(false),
    });
  }

  protected loadProducts(): void {
    this.loadingProducts.set(true);
    this.loadError.set(false);
    this.catalog.publicCategories().subscribe({
      next: ({ data }) => {
        this.products.set(
          data
            .filter((c) => c.slug === 'zona-fria')
            .flatMap((category) =>
              (category.products ?? []).map((product) => ({ ...product, category })),
            ),
        );
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loadingProducts.set(false);
      },
    });
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.limit.set(12);
  }
  protected setType(value: 'todos' | 'promocion'): void {
    this.selectedType.set(value);
    this.limit.set(12);
  }
  protected setSort(value: string): void {
    this.sort.set(value);
    this.limit.set(12);
  }
  protected resetFilters(): void {
    this.setSearch('');
    this.setType('todos');
    this.setSort('recommended');
  }
  protected imageFailed(id: number): void {
    this.brokenImages.update((ids) => new Set([...ids, id]));
  }

  protected description(product: Product): string {
    const description = (product.description ?? '')
      .replace(/^Producto de prueba importado desde Open Food Facts:\s*/i, '')
      .trim();
    return description
      ? description.charAt(0).toLocaleUpperCase('es') + description.slice(1)
      : 'Un antojo para disfrutar bien frío.';
  }
  protected displayPrice(product: Product): number {
    return Number(product.discounted_price ?? product.price);
  }
  protected originalPrice(product: Product): number {
    return Number(product.original_price ?? product.price);
  }
  protected discountLabel(product: Product): string {
    const promotion = product.promotion ?? product.coupon_promotion;
    if (!promotion) return '';
    const label =
      promotion.discount_type === 'percentage'
        ? `−${Number(promotion.discount_value)}%`
        : `−S/ ${Number(promotion.discount_value).toFixed(2)}`;
    return product.promotion ? label : `${label} con cupón`;
  }
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }
  private isColdProduct(product: Product): boolean {
    return product.category?.slug === 'zona-fria';
  }
}
