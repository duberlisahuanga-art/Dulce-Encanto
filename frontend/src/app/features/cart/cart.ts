import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cart as CartModel, CartItem } from '../../core/cart/cart.model';
import { CartService } from '../../core/cart/cart.service';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cartService = inject(CartService);
  private readonly toasts = inject(ToastService);
  protected readonly cart = signal<CartModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly couponCode = signal('');
  protected readonly couponMessage = signal('');
  protected readonly couponError = signal(false);
  protected readonly applyingCoupon = signal(false);

  constructor() {
    this.load();
  }

  protected change(id: number, quantity: number): void {
    this.error.set('');
    if (quantity < 1) {
      this.remove(id);
      return;
    }
    this.cartService.update(id, quantity).subscribe({
      next: ({ data }) => { this.cart.set(data); this.toasts.success('Carrito actualizado'); },
      error: response => { this.error.set(response.error?.message ?? 'No se pudo actualizar el carrito.'); this.toasts.error('No se pudo actualizar el carrito'); },
    });
  }
  protected remove(id: number): void {
    this.cartService.remove(id).subscribe({
      next: ({ data }) => { this.cart.set(data); this.toasts.success('Producto quitado del carrito'); },
      error: () => { this.error.set('No se pudo eliminar el producto.'); this.toasts.error('No se pudo eliminar el producto'); },
    });
  }
  protected clear(): void {
    this.cartService.clear().subscribe({
      next: () => { this.load(); this.toasts.success('Carrito vaciado'); },
      error: () => { this.error.set('No se pudo vaciar el carrito.'); this.toasts.error('No se pudo vaciar el carrito'); },
    });
  }
  protected applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) {
      this.couponError.set(true);
      this.couponMessage.set('Escribe el código que recibiste para comprobar sus condiciones.');
      return;
    }
    this.couponMessage.set('');
    this.couponError.set(false);
    this.applyingCoupon.set(true);
    this.cartService.applyCoupon(code).subscribe({
      next: ({ data }) => {
        this.cart.set(data);
        this.couponMessage.set('Cupón aplicado correctamente.');
        this.toasts.success('Cupón aplicado');
        this.applyingCoupon.set(false);
      },
      error: (response) => {
        this.couponError.set(true);
        this.couponMessage.set(response.error?.errors?.code?.[0] ?? 'No se pudo aplicar el cupón.');
        this.toasts.error('No se pudo aplicar el cupón');
        this.applyingCoupon.set(false);
      },
    });
  }
  protected removeCoupon(): void {
    this.cartService.removeCoupon().subscribe({
      next: ({ data }) => {
        this.cart.set(data);
        this.couponCode.set('');
        this.couponError.set(false);
        this.couponMessage.set('Cupón eliminado.');
        this.toasts.info('Cupón eliminado');
      },
    });
  }
  protected promotionLabel(item: CartItem): string {
    if (!item.promotion) return '';
    return item.promotion.discount_type === 'percentage'
      ? `${+item.promotion.discount_value}% DSCTO`
      : `S/ ${(+item.promotion.discount_value).toFixed(2)} DSCTO`;
  }
  protected couponProgress(): number {
    const coupon = this.cart()?.coupon;
    if (!coupon || +coupon.minimum_purchase <= 0) return 100;
    return Math.min(100, (+this.cart()!.subtotal / +coupon.minimum_purchase) * 100);
  }
  private load(): void {
    this.cartService.get().subscribe({
      next: ({ data }) => {
        this.cart.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el carrito.');
        this.loading.set(false);
      },
    });
  }
}
