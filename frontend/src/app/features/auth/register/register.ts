import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../shared-auth.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), this.passwordStrengthValidator],
    ],
    password_confirmation: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      this.error.set(this.passwordMessage() ?? 'Revisa los campos marcados antes de continuar.');
      return;
    }

    const value = this.form.getRawValue();
    if (value.password !== value.password_confirmation) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth
      .register(value)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toasts.success('Cuenta creada', 'Bienvenido a Dulce Encanto.');
          this.router.navigateByUrl('/cuenta');
        },
        error: (error: HttpErrorResponse) => {
          const errors = error.error?.errors;
          this.error.set(
            errors
              ? Object.values(errors).flat().map((message) => this.humanizeError(String(message))).join(' ')
              : 'No fue posible crear la cuenta.',
          );
        },
      });
  }

  protected passwordMessage(): string | null {
    const control = this.form.controls.password;
    if (!control.touched && !control.dirty) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Ingresa una contraseña.';
    }

    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (control.hasError('letters')) {
      return 'La contraseña debe incluir al menos una letra.';
    }

    if (control.hasError('numbers')) {
      return 'La contraseña debe incluir al menos un número.';
    }

    return null;
  }

  protected passwordHas(kind: 'length' | 'letters' | 'numbers'): boolean {
    const value = this.form.controls.password.value;
    if (kind === 'length') {
      return value.length >= 8;
    }

    if (kind === 'letters') {
      return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(value);
    }

    return /\d/.test(value);
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    if (!value) {
      return null;
    }

    return {
      ...(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(value) ? null : { letters: true }),
      ...(/\d/.test(value) ? null : { numbers: true }),
    };
  }

  private humanizeError(message: string): string {
    const messages: Record<string, string> = {
      'validation.password.letters': 'La contraseña debe incluir al menos una letra.',
      'validation.password.numbers': 'La contraseña debe incluir al menos un número.',
      'validation.min.string': 'La contraseña debe tener al menos 8 caracteres.',
      'validation.confirmed': 'Las contraseñas no coinciden.',
      'validation.unique': 'El correo electrónico ya está registrado.',
    };

    return messages[message] ?? message;
  }
}
