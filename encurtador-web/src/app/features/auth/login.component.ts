import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container" style="max-width: 420px; margin-top: 64px">
      <div class="card">
        <h2>Entrar</h2>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div style="display: grid; gap: 10px">
            <input formControlName="email" type="email" placeholder="Email" />
            <input formControlName="senha" type="password" placeholder="Senha" />
            <button [disabled]="form.invalid || loading">Login</button>
          </div>
        </form>

        <p class="error" *ngIf="error">{{ error }}</p>

        <p style="font-size: 13px; color: #4b5563; margin-top: 12px">
          Usuários são pré-cadastrados pelo administrador.
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { email, senha } = this.form.getRawValue();
    this.loading = true;
    this.error = '';

    this.authService.login(email!, senha!).subscribe({
      next: (response) => {
        if (response.usuario.role === 'admin') {
          this.router.navigate(['/admin']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.error = 'Falha no login.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

}
