import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StaffRole, StaffUser } from '../../../core/staff/staff-user.model';
import { StaffUserService } from '../../../core/staff/staff-user.service';

@Component({
  selector: 'app-staff-users-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-users-admin.html',
  styleUrl: './staff-users-admin.scss',
})
export class StaffUsersAdmin {
  protected readonly availablePermissions = [
    'catalogo.gestionar', 'tortas.gestionar', 'pedidos.ver', 'pedidos.confirmar', 'pedidos.preparar', 'pedidos.cancelar', 'pedidos.entregar_tienda',
    'pagos.ver', 'pagos.aprobar', 'promociones.ver', 'promociones.gestionar',
    'delivery.ver', 'delivery.asignar', 'delivery.actualizar', 'reportes.ver', 'usuarios.ver',
  ];
  private readonly service = inject(StaffUserService);
  private readonly fb = inject(FormBuilder);
  protected readonly users = signal<StaffUser[]>([]);
  protected readonly editing = signal<StaffUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['vendedor' as StaffRole, Validators.required],
    password: [''],
    password_confirmation: [''],
    permissions: [[] as string[]],
  });

  constructor() { this.load(); }

  protected load(): void {
    this.service.list().subscribe({
      next: ({ data }) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los usuarios internos.'); this.loading.set(false); },
    });
  }

  protected edit(user: StaffUser): void {
    this.editing.set(user);
    this.form.reset({ name: user.name, email: user.email, role: user.role, password: '', password_confirmation: '', permissions: user.permissions });
    this.error.set(''); this.success.set('');
  }

  protected cancel(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '', role: 'vendedor', password: '', password_confirmation: '', permissions: [] });
  }

  protected submit(): void {
    const value = this.form.getRawValue();
    if (this.form.invalid || (!this.editing() && !value.password) || value.password !== value.password_confirmation) {
      this.error.set('Completa los datos y confirma correctamente la contraseña.'); return;
    }
    this.saving.set(true); this.error.set(''); this.success.set('');
    this.service.save(value, this.editing()?.id).subscribe({
      next: () => { this.success.set(this.editing() ? 'Usuario actualizado.' : 'Usuario creado.'); this.cancel(); this.load(); this.saving.set(false); },
      error: (response) => { this.error.set(response.error?.message ?? 'No se pudo guardar el usuario.'); this.saving.set(false); },
    });
  }

  protected hasPermission(permission: string): boolean { return this.form.controls.permissions.value.includes(permission); }

  protected togglePermission(permission: string, checked: boolean): void {
    const current = this.form.controls.permissions.value;
    this.form.controls.permissions.setValue(checked ? [...current, permission] : current.filter((item) => item !== permission));
  }

  protected remove(user: StaffUser): void {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    this.service.remove(user.id).subscribe({
      next: () => { this.success.set('Usuario eliminado.'); this.load(); },
      error: (response) => this.error.set(response.error?.message ?? 'No se pudo eliminar el usuario.'),
    });
  }
}
