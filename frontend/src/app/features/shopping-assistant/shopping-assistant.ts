import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, effect, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { ProductQuantity } from '../../core/cart/product-quantity';
import { AuthService } from '../../core/auth/auth.service';
import { Product } from '../../core/catalog/catalog.model';
import { filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShoppingAssistantState } from './shopping-assistant-state';
import { API_URL } from '../../core/config/api-url';

interface Recommendation {
  product: Product;
  reason: string;
}

interface AssistantResponse {
  message: string;
  recommendations: Recommendation[];
}

@Component({
  selector: 'app-shopping-assistant',
  imports: [CurrencyPipe, RouterLink, ProductQuantity],
  templateUrl: './shopping-assistant.html',
  styleUrl: './shopping-assistant.scss',
})
export class ShoppingAssistant implements OnDestroy {
  @ViewChild('assistantDialog') private dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly state = inject(ShoppingAssistantState);
  protected readonly auth = inject(AuthService);
  protected readonly request = signal('');
  protected readonly budget = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly answer = signal<AssistantResponse | null>(null);

  constructor() {
    effect(() => {
      const opened = this.state.opened();
      queueMicrotask(() => {
        const dialog = this.dialog?.nativeElement;
        if (opened && dialog && !dialog.open) dialog.showModal();
        if (!opened && dialog?.open) dialog.close();
      });
    });
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.state.close());
  }

  ngOnDestroy(): void {
    this.state.close();
  }

  protected onDialogClose(): void {
    this.state.close();
    this.launcher?.nativeElement.focus();
  }

  protected onDialogClick(event: MouseEvent): void {
    const bounds = this.dialog?.nativeElement.getBoundingClientRect();
    if (bounds && (event.clientX < bounds.left || event.clientX > bounds.right)) {
      this.state.close();
    }
  }

  protected ask(event: SubmitEvent): void {
    event.preventDefault();
    const request = this.request().trim();
    if (request.length < 8 || this.loading()) return;
    const budget = Number(this.budget());
    if (this.budget() && (!Number.isFinite(budget) || budget < 1 || budget > 2000)) {
      this.error.set('Ingresa un presupuesto entre S/ 1 y S/ 2000.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.http
      .post<AssistantResponse>(`${API_URL}/api/v1/catalog/recommendations`, {
        request,
        budget: this.budget() ? budget : null,
      })
      .subscribe({
        next: (answer) => {
          this.answer.set(answer);
          this.loading.set(false);
        },
        error: (response: HttpErrorResponse) => {
          this.error.set(response.error?.message ?? 'No pudimos buscar sugerencias. Inténtalo otra vez.');
          this.loading.set(false);
        },
      });
  }

  protected example(value: string): void {
    this.request.set(value);
    this.answer.set(null);
    this.error.set('');
  }
}
