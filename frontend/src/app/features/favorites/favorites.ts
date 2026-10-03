import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductQuantity } from '../../core/cart/product-quantity';
import { Product } from '../../core/catalog/catalog.model';
import { FavoriteService } from '../../core/favorites/favorite.service';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-favorites',
  imports: [CurrencyPipe, ProductQuantity, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites {
  protected readonly favorites = inject(FavoriteService);
  private readonly toasts = inject(ToastService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.favorites.load().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.error.set('No pudimos cargar tus favoritos.');
        this.loading.set(false);
      },
    });
  }

  protected remove(product: Product): void {
    this.favorites.remove(product.id).subscribe({
      next: () => this.toasts.success('Producto quitado de favoritos'),
      error: () => {
        this.error.set('No se pudo quitar el producto de favoritos.');
        this.toasts.error('No se pudo quitar el favorito');
      },
    });
  }

  protected displayPrice(product: Product): number {
    return Number(product.discounted_price ?? product.price);
  }

  protected imageFailed(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
