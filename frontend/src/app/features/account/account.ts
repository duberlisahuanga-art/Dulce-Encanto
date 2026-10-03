import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AccountService, Address } from '../../core/account/account.service';
import { ToastService } from '../../core/notifications/toast.service';
import { LocationPicker, DeliveryPoint } from '../../core/delivery/location-picker';
import { DeliveryConfigService } from '../../core/delivery/delivery-config.service';
import { DeliveryConfiguration } from '../../core/delivery/delivery-config.model';
import { distanceInKilometers } from '../../core/delivery/delivery-distance';

@Component({
  selector: 'app-account',
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, LocationPicker],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly accountService = inject(AccountService);
  private readonly toasts = inject(ToastService);
  private readonly deliveryService = inject(DeliveryConfigService);
  protected readonly saving = signal(false);
  protected readonly profileMessage = signal('');
  protected readonly profileError = signal('');
  protected readonly loggingOut = signal(false);
  protected readonly passwordMessage = signal('');
  protected readonly passwordError = signal('');
  protected readonly section = signal<'summary' | 'profile' | 'security' | 'addresses'>('summary');
  protected readonly addresses = signal<Address[]>([]);
  protected readonly editingAddress = signal<Address | null>(null);
  protected readonly addressPoint = signal<DeliveryPoint | null>(null);
  protected readonly addressCoverage = signal('');
  protected readonly addressError = signal('');
  protected readonly deliveryConfig = signal<DeliveryConfiguration | null>(null);
  protected readonly profileForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    birthday: [''],
  });
  protected readonly addressForm = this.fb.nonNullable.group({ label: ['', Validators.required], address: ['', Validators.required], reference: [''], is_default: [false] });
  protected readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  });

  constructor() {
    this.fillProfile();
    this.deliveryService.public().subscribe({ next: ({ data }) => this.deliveryConfig.set(data) });
    this.route.data.subscribe((data) => { this.section.set(data['section'] ?? 'summary'); if(data['section']==='addresses') this.accountService.addresses().subscribe(r=>this.addresses.set(r.data)); });
  }

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.auth.clearLocalSession();
        this.router.navigateByUrl('/ingresar');
      },
    });
  }

  protected changePassword(): void {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.password !== value.password_confirmation) {
      this.passwordError.set('Completa los campos y confirma correctamente la contraseña nueva.');
      return;
    }
    this.saving.set(true);
    this.passwordError.set('');
    this.passwordMessage.set('');
    this.auth.updatePassword(value).subscribe({
      next: ({ message }) => {
        this.passwordMessage.set(message);
        this.passwordForm.reset();
        this.saving.set(false);
      },
      error: (response) => {
        this.passwordError.set(response.error?.errors?.current_password?.[0] ?? 'No se pudo cambiar la contraseña.');
        this.saving.set(false);
      },
    });
  }
  protected saveProfile(): void {
    if (this.profileForm.invalid || this.saving()) {
      this.profileForm.markAllAsTouched();
      this.profileError.set('Completa tu nombre y correo correctamente.');
      return;
    }
    const value = this.profileForm.getRawValue();
    this.saving.set(true);
    this.profileError.set('');
    this.profileMessage.set('');
    this.accountService.updateProfile({ ...value, birthday: value.birthday || null }).subscribe({
      next: () => {
        this.auth.loadCurrentUser().subscribe(() => this.fillProfile());
        this.profileMessage.set('Perfil actualizado correctamente.');
        this.toasts.success('Perfil actualizado');
        this.saving.set(false);
      },
      error: (response) => {
        const errors = response.error?.errors;
        this.profileError.set(errors ? Object.values(errors).flat().join(' ') : 'No se pudo actualizar tu perfil.');
        this.toasts.error('No se pudo actualizar el perfil');
        this.saving.set(false);
      },
    });
  }
  protected editAddress(address?: Address): void {
    this.editingAddress.set(address ?? null);
    this.addressError.set('');
    this.addressCoverage.set('');
    this.addressPoint.set(address?.latitude != null && address.longitude != null ? { latitude: address.latitude, longitude: address.longitude } : null);
    this.addressForm.reset(address ? { label: address.label, address: address.address, reference: address.reference ?? '', is_default: address.is_default } : { label: '', address: '', reference: '', is_default: this.addresses().length === 0 });
    if (this.addressPoint()) this.updateAddressCoverage(this.addressPoint()!);
  }
  protected selectAddressPoint(point: DeliveryPoint): void {
    this.addressPoint.set(point);
    this.updateAddressCoverage(point);
  }
  protected saveAddress(): void {
    const point = this.addressPoint();
    if (this.addressForm.invalid || !point || !this.addressIsCovered(point)) {
      this.addressForm.markAllAsTouched();
      this.addressError.set(!point ? 'Selecciona la ubicación de la dirección en el mapa.' : 'La dirección debe estar dentro del radio permitido para delivery.');
      return;
    }
    this.addressError.set('');
    this.accountService.saveAddress({ ...this.addressForm.getRawValue(), ...point }, this.editingAddress()?.id).subscribe({
      next: () => { this.editingAddress.set(null); this.addressPoint.set(null); this.toasts.success('Dirección guardada'); this.accountService.addresses().subscribe(r=>this.addresses.set(r.data)); },
      error: (response) => { this.addressError.set(response.error?.errors?.address?.[0] ?? response.error?.message ?? 'No se pudo guardar la dirección.'); },
    });
  }
  protected removeAddress(address: Address): void { if(confirm(`¿Eliminar ${address.label}?`)) this.accountService.removeAddress(address.id).subscribe(()=>{this.toasts.success('Dirección eliminada');this.accountService.addresses().subscribe(r=>this.addresses.set(r.data));}); }
  private fillProfile(): void {
    const user = this.auth.user();
    if (!user) return;
    this.profileForm.patchValue({ name: user.name, email: user.email, phone: user.phone ?? '', birthday: user.birthday ?? '' });
  }
  protected storePoint(): DeliveryPoint {
    const store = this.deliveryConfig()?.store;
    return store ? { latitude: store.latitude, longitude: store.longitude } : { latitude: -12.0464, longitude: -77.0428 };
  }
  protected maximumDeliveryDistance(): number {
    return this.deliveryConfig()?.store.maximum_distance_km ?? 15;
  }
  private addressIsCovered(point: DeliveryPoint): boolean {
    return distanceInKilometers(this.storePoint(), point) <= this.maximumDeliveryDistance();
  }
  private updateAddressCoverage(point: DeliveryPoint): void {
    const distance = distanceInKilometers(this.storePoint(), point);
    const maximum = this.maximumDeliveryDistance();
    this.addressCoverage.set(distance <= maximum
      ? `Ubicación válida: está a ${distance.toFixed(1)} km de la tienda.`
      : `No podemos registrar esta dirección: está a ${distance.toFixed(1)} km y el máximo es ${maximum} km.`);
    this.addressError.set(distance <= maximum ? '' : 'Selecciona una ubicación más cercana a la tienda.');
  }
}
