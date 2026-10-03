import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CartService } from './cart.service';

@Component({
  selector: 'app-floating-cart-summary',
  imports: [CurrencyPipe, RouterLink],
  template: `
    @if (hasItems()) {
      <aside class="cart-summary" aria-label="Resumen del carrito">
        <div class="cart-summary-copy">
          <strong>
            {{ cart.count() }} {{ cart.count() === 1 ? 'unidad' : 'unidades' }} en tu carrito
          </strong>
          <span>Total: {{ +(cart.cart()?.total ?? 0) | currency: 'PEN' : 'S/ ' : '1.2-2' }}</span>
        </div>
        <a routerLink="/carrito">Ver carrito <span aria-hidden="true">→</span></a>
      </aside>
    }
  `,
  styleUrl: './floating-cart-summary.scss',
  host: {
    '[class.has-items]': 'hasItems()',
  },
})
export class FloatingCartSummary {
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  protected readonly hasItems = computed(() => this.auth.authenticated() && this.cart.count() > 0);
}
