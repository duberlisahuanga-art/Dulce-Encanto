import { ProductQuantity } from '../../core/cart/product-quantity';
import { FloatingCartSummary } from '../../core/cart/floating-cart-summary';
import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Category, Product } from '../../core/catalog/catalog.model';
import { CatalogService } from '../../core/catalog/catalog.service';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { FavoriteService } from '../../core/favorites/favorite.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Promotion } from '../../core/promotions/promotion.model';
import { PromotionService } from '../../core/promotions/promotion.service';

@Component({
  selector: 'app-catalog',
  imports: [CurrencyPipe, RouterLink, ProductQuantity, FloatingCartSummary],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog implements OnDestroy {
  private readonly coldCategorySlug = 'zona-fria';
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly promotionService = inject(PromotionService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly actionError = signal('');
  protected readonly search = signal('');
  protected readonly visibleCount = signal(12);
  protected readonly selectedCategory = signal<number | null>(null);
  protected readonly sort = signal<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  protected readonly maximumPrice = signal(500);
  protected readonly addingProductId = signal<number | null>(null);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly filtersOpen = signal(false);
  protected readonly promotions = signal<Promotion[]>([]);
  protected readonly heroIndex = signal(0);
  private heroTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly products = computed(() =>
    this.categories().flatMap((category) => category.products ?? []),
  );
  protected readonly heroProducts = computed(() => {
    const withImages = this.products().filter((product) => product.image_url);
    return (withImages.length ? withImages : this.products()).slice(0, 8);
  });
  protected readonly heroProduct = computed(() => {
    const products = this.heroProducts();
    return products.length ? products[this.heroIndex() % products.length] : null;
  });
  protected readonly featuredPromotion = computed(() => this.promotions()[0] ?? null);
  protected readonly secondaryPromotions = computed(() => this.promotions().slice(1));
  protected readonly filteredProducts = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('es');
    const categoryId = this.selectedCategory();
    const products = this.products().filter(
      (product) =>
        (!categoryId || product.category_id === categoryId) &&
        this.displayPrice(product) <= this.maximumPrice() &&
        (!term ||
          `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('es').includes(term)),
    );

    return [...products].sort((left, right) => {
      if (this.sort() === 'price-asc') return this.displayPrice(left) - this.displayPrice(right);
      if (this.sort() === 'price-desc') return this.displayPrice(right) - this.displayPrice(left);
      if (this.sort() === 'name') return left.name.localeCompare(right.name, 'es');
      return 0;
    });
  });
  protected readonly visibleProducts = computed(() => this.filteredProducts().slice(0, this.visibleCount()));

  constructor() {
    this.catalogService.publicCategories().subscribe({
      next: ({ data }) => {
        const catalogCategories = data.filter((category) => category.slug !== this.coldCategorySlug);
        this.categories.set(catalogCategories);
        const categorySlug = this.route.snapshot.queryParamMap.get('categoria');
        if (categorySlug) {
          this.selectedCategory.set(catalogCategories.find((category) => category.slug === categorySlug)?.id ?? null);
        }
        const highestPrice = Math.ceil(
          Math.max(
            ...catalogCategories
              .flatMap((category) => category.products ?? [])
              .map((product) => Number(product.price)),
            100,
          ),
        );
        this.maximumPrice.set(highestPrice);
        this.startHeroRotation();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el catálogo. Inténtalo nuevamente.');
        this.loading.set(false);
      },
    });
    this.route.queryParamMap.subscribe((params) => {
      this.visibleCount.set(12);
      this.search.set(params.get('buscar') ?? '');
      const categorySlug = params.get('categoria');
      this.selectedCategory.set(
        categorySlug ? this.categories().find((category) => category.slug === categorySlug)?.id ?? null : null,
      );
    });
    this.promotionService.public().subscribe({ next: ({ data }) => this.promotions.set(data) });
    if (this.auth.authenticated()) {
      this.favorites.load().subscribe({ error: () => {} });
    }
  }

  ngOnDestroy(): void {
    if (this.heroTimer) {
      clearInterval(this.heroTimer);
    }
  }

  protected chooseHeroProduct(index: number): void {
    this.heroIndex.set(index);
    this.startHeroRotation();
  }

  protected addToCart(productId: number): void {
    this.message.set('');
    this.actionError.set('');
    this.addingProductId.set(productId);
    this.cartService.addProduct(productId).subscribe({
      next: () => {
        this.message.set('Producto agregado al carrito.');
        this.toasts.success('Agregado al carrito');
        this.addingProductId.set(null);
      },
      error: () => {
        this.actionError.set('No se pudo agregar el producto. Inténtalo nuevamente.');
        this.toasts.error('No se pudo agregar el producto');
        this.addingProductId.set(null);
      },
    });
  }

  protected categoryImage(category: Category): string | null {
    return category.products?.find((product) => product.image_url)?.image_url ?? null;
  }

  protected chooseCategory(categoryId: number | null): void {
    this.selectedCategory.set(categoryId);
    this.visibleCount.set(12);
    this.filtersOpen.set(false);
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
    this.visibleCount.set(12);
  }

  protected updateSort(value: 'featured' | 'price-asc' | 'price-desc' | 'name'): void {
    this.sort.set(value);
    this.visibleCount.set(12);
  }

  protected updateMaximumPrice(value: number): void {
    this.maximumPrice.set(value);
    this.visibleCount.set(12);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + 12);
  }

  protected resetFilters(): void {
    this.visibleCount.set(12);
    this.search.set('');
    this.selectedCategory.set(null);
    this.maximumPrice.set(
      Math.ceil(Math.max(...this.products().map((product) => Number(product.price)), 100)),
    );
    this.sort.set('featured');
  }

  protected imageFailed(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  protected displayPrice(product: Product): number {
    return Number(product.discounted_price ?? product.price);
  }

  protected discountLabel(product: Product): string {
    const promotion = product.promotion ?? product.coupon_promotion;
    if (!promotion) return '';

    return promotion.discount_type === 'percentage'
      ? `-${Number(promotion.discount_value)}%`
      : `-S/ ${Number(promotion.discount_value).toFixed(2)}`;
  }

  protected toggleFavorite(product: Product, event: Event): void {
    event.stopPropagation();
    this.actionError.set('');
    const wasFavorite = this.favorites.isFavorite(product.id);
    this.favorites.toggle(product).subscribe({
      next: () => this.toasts.success(wasFavorite ? 'Producto quitado de favoritos' : 'Favorito guardado'),
      error: () => {
        this.actionError.set('No se pudo actualizar favoritos.');
        this.toasts.error('No se pudo actualizar favoritos');
      },
    });
  }

  private startHeroRotation(): void {
    if (this.heroTimer) {
      clearInterval(this.heroTimer);
    }

    if (this.heroProducts().length < 2) {
      return;
    }

    this.heroTimer = setInterval(() => {
      const length = this.heroProducts().length;
      if (length > 1) {
        this.heroIndex.update((index) => (index + 1) % length);
      }
    }, 15000);
  }
}
