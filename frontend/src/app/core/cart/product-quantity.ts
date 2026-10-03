import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { CartService } from './cart.service';
import { ToastService } from '../notifications/toast.service';
@Component({
  selector: 'app-product-quantity',
  imports: [CurrencyPipe],
  template: `@if (showCartDetails() && quantity() > 0) {
      <p class="cart-item-state">
        <span class="cart-check" aria-hidden="true">✓</span> {{ quantity() }}
        {{ quantity() === 1 ? 'unidad en tu carrito' : 'unidades en tu carrito' }}
      </p>
    }
    <div
      class="quantity"
      [class.just-updated]="justUpdated()"
      role="group"
      [attr.aria-label]="'Cantidad en el carrito' + (productName() ? ': ' + productName() : '')"
    >
      @if (quantity()) {
        <button
          type="button"
          [disabled]="busy()"
          (click)="change(-1)"
          [attr.aria-label]="'Quitar una unidad' + (productName() ? ': ' + productName() : '')"
        >
          −
        </button>
        <output aria-live="polite">{{ quantity() }}</output>
        <button
          type="button"
          [disabled]="busy() || !cart.canAdd(productId())"
          (click)="change(1)"
          [attr.aria-label]="'Agregar una unidad' + (productName() ? ': ' + productName() : '')"
        >
          +
        </button>
      } @else {
        <button type="button" [disabled]="busy() || !cart.canAdd(productId())" (click)="change(1)">
          {{ busy() ? 'Agregando…' : addLabel() }}
        </button>
      }
    </div>
    @if (showCartDetails() && quantity() > 0 && cartItem(); as item) {
      <p class="line-total">
        Subtotal: <strong>{{ +item.total | currency: 'PEN' : 'S/ ' : '1.2-2' }}</strong>
      </p>
    }
    @if (!cart.canAdd(productId()) && cart.cart()) {
      <small
        >Límite:
        {{
          quantity() >= cart.limits().per_product
            ? cart.limits().per_product + ' por producto'
            : cart.limits().per_order + ' por compra'
        }}</small
      >
    }
    @if (error()) {
      <small role="alert">{{ error() }}</small>
    }`,
  styles: [
    `
      :host(.full-width) .quantity {
        display: flex;
        justify-content: center;
        gap: 0;
      }
      :host(.full-width) .quantity:has(output) {
        width: fit-content;
        margin-inline: auto;
        border: 1px solid #dcb8c4;
        border-radius: 0.65rem;
        background: #fff7f9;
        overflow: hidden;
      }
      :host(.full-width) .quantity:has(output) button {
        border-radius: 0;
        background: transparent;
        color: #8f3f59;
      }
      :host(.full-width) .quantity:has(output) button:hover:not(:disabled) {
        background: #f4e3e9;
      }
      :host(.full-width) .quantity:has(output) output {
        display: grid;
        place-items: center;
        min-width: 3rem;
        padding-inline: 0.25rem;
        border-inline: 1px solid #e9d4db;
      }
      :host(.full-width) .quantity.just-updated:has(output) {
        animation: selected-flash 0.85s ease-out;
      }
      @keyframes selected-flash {
        0% {
          box-shadow: 0 0 0 4px #e5a9bb;
        }
        100% {
          box-shadow: 0 0 0 0 transparent;
        }
      }
      .cart-item-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        margin: 0 0 0.5rem;
        color: #8f3f59;
        font-size: 0.73rem;
        font-weight: 700;
        text-align: center;
      }
      .cart-check {
        display: grid;
        place-items: center;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        background: #8f3f59;
        color: #fff;
        font-size: 0.7rem;
      }
      .line-total {
        margin: 0.55rem 0 0;
        color: #6e5660;
        font-size: 0.77rem;
        text-align: center;
      }
      .line-total strong {
        color: #4a2932;
      }
      @media (prefers-reduced-motion: reduce) {
        :host(.full-width) .quantity.just-updated:has(output) {
          animation: none;
        }
      }
      :host(.full-width) .quantity > button:only-child {
        width: 100%;
        font-weight: 600;
        font-size: 0.8rem;
      }
      :host(.full-width) output {
        text-align: center;
      }
      button:focus-visible {
        outline: 3px solid #8f3f59;
        outline-offset: 3px;
      }
      :host {
        display: block;
      }
      .quantity {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      button {
        border: 0;
        border-radius: 0.6rem;
        background: #8f3f59;
        color: white;
        min-width: 44px;
        min-height: 44px;
        padding: 0.4rem 0.7rem;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      output {
        font-weight: 700;
        color: #4a2932;
      }
      small {
        display: block;
        max-width: 12rem;
        margin-top: 0.35rem;
        color: #8f3f59;
        font-size: 0.72rem;
      }
    `,
  ],
})
export class ProductQuantity implements OnDestroy {
  readonly showCartDetails = input(false);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly justUpdated = signal(false);
  readonly productName = input('');
  readonly addLabel = input('Agregar');
  readonly productId = input.required<number>();
  protected readonly cart = inject(CartService);
  protected readonly toasts = inject(ToastService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly quantity = computed(() => this.cart.quantity(this.productId()));
  protected readonly cartItem = computed(() =>
    this.cart.cart()?.items.find((item) => item.product_id === this.productId()),
  );
  ngOnDestroy(): void {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
  }
  protected change(delta: number): void {
    if (this.busy() || (delta > 0 && !this.cart.canAdd(this.productId()))) return;
    const item = this.cart.cart()?.items.find((item) => item.product_id === this.productId());
    const wasFirstAddition = this.quantity() === 0;
    const next = this.quantity() + delta;
    const request =
      delta > 0
        ? this.cart.addProduct(this.productId())
        : item
          ? next
            ? this.cart.update(item.id, next)
            : this.cart.remove(item.id)
          : null;
    if (!request) return;
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: () => {
        this.busy.set(false);
        if (delta > 0 && wasFirstAddition && !this.showCartDetails()) {
          this.toasts.success('Agregado al carrito');
        }
        this.justUpdated.set(false);
        if (this.highlightTimer) clearTimeout(this.highlightTimer);
        queueMicrotask(() => this.justUpdated.set(true));
        this.highlightTimer = setTimeout(() => this.justUpdated.set(false), 850);
      },
      error: (response) => {
        this.busy.set(false);
        this.error.set(response.error?.message ?? 'No se pudo guardar la cantidad.');
        this.toasts.error('No se pudo actualizar el carrito');
      },
    });
  }
}
