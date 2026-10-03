import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Customer } from '../../../core/customers/customer.model';
import { CustomerService } from '../../../core/customers/customer.service';

@Component({
  selector: 'app-customers-admin',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './customers-admin.html',
  styleUrl: './customers-admin.scss',
})
export class CustomersAdmin {
  private readonly service = inject(CustomerService);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly selected = signal<Customer | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.service.list(this.search().trim()).subscribe({
      next: ({ data }) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los clientes.');
        this.loading.set(false);
      },
    });
  }

  protected view(customer: Customer): void {
    this.service.show(customer.id).subscribe({
      next: ({ data }) => this.selected.set(data),
      error: () => this.error.set('No se pudo cargar el historial.'),
    });
  }
}
