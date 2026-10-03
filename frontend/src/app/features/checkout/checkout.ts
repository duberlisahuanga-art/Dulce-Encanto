import { LocationPicker, DeliveryPoint } from '../../core/delivery/location-picker';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Cart } from '../../core/cart/cart.model';
import { CartService } from '../../core/cart/cart.service';
import { OrderService } from '../../core/orders/order.service';
import { DeliveryConfigService } from '../../core/delivery/delivery-config.service';
import { DeliveryConfiguration } from '../../core/delivery/delivery-config.model';
import { distanceInKilometers } from '../../core/delivery/delivery-distance';
import { AccountService, Address } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, LocationPicker],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly deliveryService = inject(DeliveryConfigService);
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);
  protected readonly point = signal<DeliveryPoint | null>(null);
  protected readonly coverage = signal('');
  protected readonly addresses = signal<Address[]>([]);
  protected readonly selectedAddressId = signal<number | null>(null);
  protected readonly deliveryConfig = signal<DeliveryConfiguration | null>(null);
  protected readonly cart = signal<Cart | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});
  protected readonly minimumDate = signal(this.localDate());
  protected readonly form = this.formBuilder.nonNullable.group({
    delivery_date: ['', [Validators.required, this.deliveryDateValidator()]],
    delivery_method: ['pickup' as 'pickup' | 'delivery', Validators.required],
    delivery_zone_id: [0],
    phone: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    address: ['', Validators.maxLength(255)],
    notes: ['', Validators.maxLength(1000)],
    payment_method: ['cash' as 'cash' | 'yape' | 'plin' | 'transfer', Validators.required],
  });
  constructor() {
    this.form.controls.phone.setValue(this.onlyDigits(this.auth.user()?.phone ?? ''));
    this.updateDeliveryValidators(this.form.controls.delivery_method.value);
    this.form.controls.delivery_method.valueChanges.subscribe((method) => this.updateDeliveryValidators(method));
    this.form.valueChanges.subscribe(() => {
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
    });
    this.accountService.addresses().subscribe({ next: ({ data }) => { this.addresses.set(data); const preferred = data.find((address) => address.is_default); if (preferred) this.useAddress(preferred.id); } });
    this.deliveryService.public().subscribe({ next: ({ data }) => {
      this.deliveryConfig.set(data);
      this.minimumDate.set(this.localDate(data.settings.minimum_lead_days));
      this.form.controls.delivery_date.setValidators([Validators.required, this.deliveryDateValidator()]);
      this.form.controls.delivery_date.updateValueAndValidity({ emitEvent: false });
    } });
    this.cartService.get().subscribe({
      next: ({ data }) => {
        this.cart.set(data);
        if (data.free_delivery) this.form.controls.delivery_method.setValue('delivery');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el carrito.');
        this.loading.set(false);
      },
    });
  }
  protected filterPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = this.onlyDigits(input.value);
    input.value = digits;
    this.form.controls.phone.setValue(digits);
  }
  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }
  protected fieldServerError(field: string): string {
    return this.serverErrors()[field] ?? '';
  }
  protected submit(): void {
    this.submitted.set(true);
    this.serverErrors.set({});
    if (this.form.invalid || !this.cart()?.items.length) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de confirmar el pedido.');
      return;
    }
    const value = this.form.getRawValue();
    if (this.cart()?.free_delivery && value.delivery_method !== 'delivery') {
      this.error.set('El cupón de envío gratis requiere seleccionar delivery.');
      return;
    }
    if (value.delivery_method === 'delivery' && !value.address.trim()) {
      this.form.controls.address.setErrors({ required: true });
      this.error.set('Ingresa la dirección de entrega.');
      return;
    }
    if (value.delivery_method === 'delivery' && !value.delivery_zone_id) {
      this.form.controls.delivery_zone_id.setErrors({ required: true });
      this.error.set('Selecciona una zona de reparto.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.orderService
      .create({
        ...value,
        address: value.delivery_method === 'delivery' ? value.address : null,
        delivery_zone_id: value.delivery_method === 'delivery' ? value.delivery_zone_id : null,
        latitude: value.delivery_method === 'delivery' ? this.point()?.latitude ?? null : null,
        longitude: value.delivery_method === 'delivery' ? this.point()?.longitude ?? null : null,
        notes: value.notes || null,
      })
      .subscribe({
        next: () => { this.cartService.cart.set(null); this.router.navigateByUrl('/mis-pedidos'); },
        error: (response) => {
          const validationErrors = response?.error?.errors ?? {};
          this.serverErrors.set(Object.fromEntries(
            Object.entries(validationErrors).map(([field, messages]) => [field, Array.isArray(messages) ? String(messages[0]) : String(messages)]),
          ));
          this.error.set(validationErrors.coupon?.[0] ?? response?.error?.message ?? 'No se pudo registrar el pedido.');
          this.saving.set(false);
        },
      });
  }
  protected selectedFee(): number {
    if (this.form.controls.delivery_method.value !== 'delivery') return 0;
    if (this.cart()?.free_delivery) return 0;
    return +(this.deliveryConfig()?.zones.find(zone => zone.id === +this.form.controls.delivery_zone_id.value)?.fee ?? 0);
  }
  protected useAddress(id: number | string): void {
    const address = this.addresses().find((item) => item.id === +id);
    this.point.set(null); this.coverage.set('');
    this.selectedAddressId.set(address?.id ?? null);
    if (address) {
      this.form.patchValue({ address: address.address, notes: address.reference ?? this.form.controls.notes.value });
      if (address.latitude != null && address.longitude != null) {
        this.selectPoint({ latitude: address.latitude, longitude: address.longitude });
        this.selectedAddressId.set(address.id);
      } else {
        this.form.controls.delivery_zone_id.setValue(0);
        this.coverage.set('Actualiza esta dirección y selecciona su ubicación en el mapa antes de usarla.');
      }
    }
  }
  protected selectPoint(point: DeliveryPoint): void {
    this.point.set(point); this.selectedAddressId.set(null);
    const store = this.storePoint();
    const maximumDistance = this.maximumDeliveryDistance();
    const distance = distanceInKilometers(store, point);
    if (distance > maximumDistance) {
      this.form.controls.delivery_zone_id.setValue(0);
      this.form.controls.address.setErrors({ outsideCoverage: true });
      this.coverage.set(`Esta dirección está a ${distance.toFixed(1)} km de la tienda. El máximo permitido es ${maximumDistance} km.`);
      return;
    }
    if (this.form.controls.address.hasError('outsideCoverage')) this.form.controls.address.updateValueAndValidity({ emitEvent: false });
    const zones = this.deliveryConfig()?.zones ?? [];
    const configured = zones.filter(zone => zone.latitude != null && zone.longitude != null && zone.radius_km != null);
    const matches = configured.filter(zone => {
      const radians = Math.PI / 180;
      const a = Math.sin((point.latitude - zone.latitude!) * radians / 2) ** 2 + Math.cos(point.latitude * radians) * Math.cos(zone.latitude! * radians) * Math.sin((point.longitude - zone.longitude!) * radians / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1-a))) <= zone.radius_km!;
    }).sort((a,b) => +a.fee - +b.fee);
    if (matches.length) { this.form.controls.delivery_zone_id.setValue(matches[0].id); this.coverage.set('Dentro de la zona ' + matches[0].name + '.'); }
    else { this.form.controls.delivery_zone_id.setValue(0); this.coverage.set(configured.length === zones.length && zones.length ? 'Este punto está fuera de las zonas de reparto.' : 'Selecciona la zona de reparto. La cobertura geográfica aún no está configurada para todas las zonas.'); }
  }
  protected storePoint(): DeliveryPoint {
    const store = this.deliveryConfig()?.store;
    return store ? { latitude: store.latitude, longitude: store.longitude } : { latitude: -12.0464, longitude: -77.0428 };
  }
  protected maximumDeliveryDistance(): number {
    return this.deliveryConfig()?.store.maximum_distance_km ?? 15;
  }
  private updateDeliveryValidators(method: 'pickup' | 'delivery'): void {
    const address = this.form.controls.address;
    const zone = this.form.controls.delivery_zone_id;

    address.setValidators(method === 'delivery' ? [Validators.required, Validators.maxLength(255)] : [Validators.maxLength(255)]);
    zone.setValidators(method === 'delivery' ? [Validators.required, Validators.min(1)] : []);
    address.updateValueAndValidity({ emitEvent: false });
    zone.updateValueAndValidity({ emitEvent: false });
  }
  private deliveryDateValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = String(control.value ?? '');
      if (!value) return null;
      if (value < this.minimumDate()) return { tooEarly: true };
      if (this.deliveryConfig()?.blocked_dates.some((blocked) => blocked.date.slice(0, 10) === value)) return { blocked: true };
      return null;
    };
  }
  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 9);
  }
  private localDate(addDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + addDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
