import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Product } from '../../core/catalog/catalog.model';
import { CatalogService } from '../../core/catalog/catalog.service';
import { FavoriteService } from '../../core/favorites/favorite.service';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);
  private readonly toasts = inject(ToastService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly auth = inject(AuthService);

  protected readonly product = signal<Product | null>(null);
  protected readonly related = signal<Product[]>([]);
  protected readonly quantity = signal(1);
  protected readonly loading = signal(true);
  protected readonly adding = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');

  constructor() {
    this.route.paramMap
      .pipe(switchMap((params) => this.catalogService.publicProduct(params.get('slug') ?? '')))
      .subscribe({
        next: ({ data, related }) => {
          this.product.set(data);
          this.related.set(related);
          this.quantity.set(1);
          this.loading.set(false);
          if (this.auth.authenticated()) {
            this.favorites.load().subscribe({ error: () => {} });
          }
        },
        error: () => {
          this.error.set('El producto no existe o ya no está disponible.');
          this.loading.set(false);
        },
      });
  }

  protected changeQuantity(change: number): void {
    this.quantity.set(Math.min(50, Math.max(1, this.quantity() + change)));
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product || !this.auth.authenticated()) return;
    this.adding.set(true);
    this.message.set('');
    this.error.set('');
    this.cartService.addProduct(product.id, this.quantity()).subscribe({
      next: () => {
        this.message.set(`${this.quantity()} unidad(es) agregadas al carrito.`);
        this.toasts.success('Agregado al carrito');
        this.adding.set(false);
      },
      error: () => {
        this.error.set('No se pudo agregar el producto al carrito.');
        this.toasts.error('No se pudo agregar el producto');
        this.adding.set(false);
      },
    });
  }

  protected imageFailed(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  protected toggleFavorite(): void {
    const product = this.product();
    if (!product || !this.auth.authenticated()) return;
    this.error.set('');
    const wasFavorite = this.favorites.isFavorite(product.id);
    this.favorites.toggle(product).subscribe({
      next: () => this.toasts.success(wasFavorite ? 'Producto quitado de favoritos' : 'Favorito guardado'),
      error: () => { this.error.set('No se pudo actualizar favoritos.'); this.toasts.error('No se pudo actualizar favoritos'); },
    });
  }
}
