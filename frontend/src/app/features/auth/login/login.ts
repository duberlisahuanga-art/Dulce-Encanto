import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../shared-auth.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      this.error.set('Ingresa un correo válido y tu contraseña.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();

    this.auth
      .login(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/cuenta');
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(
            error.error?.errors?.email?.[0] ??
            error.error?.errors?.password?.[0] ??
            error.error?.errors?.remember?.[0] ??
            error.error?.message ??
            'No fue posible iniciar sesión.'
          );
        },
      });
  }
}
