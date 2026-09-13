import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 440px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      display: grid;
      gap: 20px;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-muted);
      text-decoration: none;
      font-size: 14px;
    }
    .back:hover { color: var(--color-ink); }
    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .page-subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .header {
      display: grid;
      gap: 8px;
    }
    .form-card {
      display: grid;
      gap: 14px;
    }
    .form-row {
      display: grid;
      gap: 6px;
    }
    .form-row label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-ink);
    }
    .form-row input[type="email"],
    .form-row input[type="password"] {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      font-size: 14px;
      color: var(--color-ink);
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
    .form-row input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-50);
    }
    .form-row input::placeholder {
      color: var(--color-muted);
    }
    .error-panel {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      font-size: 14px;
    }
    .signup-link {
      text-align: center;
      font-size: 14px;
      color: var(--color-muted);
    }
    .signup-link a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .signup-link a:hover {
      text-decoration: underline;
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      <div class="header">
        <h1 class="page-title">Welcome back</h1>
        <p class="page-subtitle">Log in to access your store dashboard and manage your account.</p>
      </div>

      <section class="card form-card">
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div style="display: grid; gap: 14px;">
            <div class="form-row">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" placeholder="you@example.com" />
            </div>

            <div class="form-row">
              <label for="password">Password</label>
              <input id="password" type="password" formControlName="password" placeholder="At least 8 characters" />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="submitting() || !loginForm.valid">
              @if (submitting()) {
                Logging in…
              } @else {
                Log in
              }
            </button>
          </div>
        </form>
      </section>

      @if (errorMessage()) {
        <div class="error-panel">{{ errorMessage() }}</div>
      }

      <p class="signup-link">
        Don't have an account? <a routerLink="/signup">Sign up</a>
      </p>
    </div>
  `,
})
export class LoginPageComponent {
  readonly loginForm: FormGroup;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const v = this.loginForm.value;
      const result = await this.authService.login(v.email, v.password);
      const user = result.user;
      const isAdmin =
        user?.isGlobalAdmin ||
        user?.role === 'GLOBAL_ADMIN' ||
        user?.role === 'STORE_ADMIN' ||
        user?.role === 'OWNER';
      if (isAdmin) {
        await this.router.navigate(['/admin']);
      } else {
        await this.router.navigate(['/']);
      }
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Login failed. Please check your email and password.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
