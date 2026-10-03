import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: '../shared-auth.scss',
})
export class ForgotPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly isResetMode = signal(false);
  private readonly resetToken = signal('');

  protected readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (token) {
      this.isResetMode.set(true);
      this.resetToken.set(token);
      if (email) {
        this.resetForm.controls.email.setValue(email);
      }
    }
  }

  protected submitForgot(): void {
    if (this.forgotForm.invalid || this.loading()) {
      this.forgotForm.markAllAsTouched();
      this.error.set('Ingresa un correo electrónico válido.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.auth
      .forgotPassword(this.forgotForm.controls.email.value)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.message.set(message);
          this.toasts.info('Revisa tu correo', message);
        },
        error: (response) => {
          this.error.set(response.error?.errors?.email?.[0] ?? 'No se pudo procesar la solicitud.');
        },
      });
  }

  protected submitReset(): void {
    if (this.resetForm.invalid || this.loading()) {
      this.resetForm.markAllAsTouched();
      if (this.resetForm.controls.password.invalid) {
        this.error.set('La nueva contraseña debe tener al menos 8 caracteres.');
      } else {
        this.error.set('Por favor completa todos los campos requeridos.');
      }
      return;
    }

    if (this.resetForm.controls.password.value !== this.resetForm.controls.password_confirmation.value) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.auth
      .resetPassword({
        token: this.resetToken(),
        email: this.resetForm.controls.email.value,
        password: this.resetForm.controls.password.value,
        password_confirmation: this.resetForm.controls.password_confirmation.value,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.message.set(message);
          this.toasts.success('Contraseña actualizada', message);
          this.resetForm.controls.password.reset();
          this.resetForm.controls.password_confirmation.reset();
        },
        error: (response) => {
          const err =
            response.error?.errors?.token?.[0] ??
            response.error?.errors?.email?.[0] ??
            response.error?.errors?.password?.[0] ??
            response.error?.message ??
            'No se pudo restablecer la contraseña.';
          this.error.set(err);
        },
      });
  }
}
