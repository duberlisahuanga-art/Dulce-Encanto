import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, NgIf } from '@angular/common';
import { CatalogService } from '../../core/catalog/catalog.service';
import { PromotionService } from '../../core/promotions/promotion.service';
import { RouterLink } from '@angular/router';
import { Category, Product } from '../../core/catalog/catalog.model';
import { AuthService } from '../../core/auth/auth.service';
import { FavoriteService } from '../../core/favorites/favorite.service';
import { ShoppingAssistantState } from '../shopping-assistant/shopping-assistant-state';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CurrencyPipe, NgIf],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly catalog = inject(CatalogService);
  private readonly promotionsService = inject(PromotionService);
  private readonly coldCategorySlug = 'zona-fria';
  protected readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly assistant = inject(ShoppingAssistantState);
  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly promotions = signal<any[]>([]);

  constructor() {
    this.catalog
      .publicCategories()
      .subscribe((response) =>
        this.categories.set(
          response.data.filter((category) => category.slug !== this.coldCategorySlug).slice(0, 5),
        ),
      );
    this.catalog
      .publicProducts()
      .subscribe((response) =>
        this.products.set(
          response.data
            .filter((product) => product.category?.slug !== this.coldCategorySlug)
            .slice(0, 4),
        ),
      );
    this.promotionsService
      .public()
      .subscribe((response) => this.promotions.set(response.data.slice(0, 3)));
    if (this.auth.authenticated()) {
      this.favorites.load().subscribe({ error: () => {} });
    }
  }

  protected hideBrokenImage(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.hidden = true;
    image.parentElement?.setAttribute('aria-label', image.alt);
  }

  protected categoryCount(category: Category): number {
    return category.products_count ?? category.products?.length ?? 0;
  }

  protected categoryImage(category: Category): string | null {
    return category.products?.find((product) => product.image_url)?.image_url ?? null;
  }
}
