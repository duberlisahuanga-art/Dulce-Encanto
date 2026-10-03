import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShoppingAssistantState {
  readonly opened = signal(false);

  open(): void {
    this.opened.set(true);
  }

  close(): void {
    this.opened.set(false);
  }
}
