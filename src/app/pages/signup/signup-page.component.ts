import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 520px;
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
    .form-row input[type="text"],
    .form-row input[type="email"],
    .form-row input[type="password"],
    .form-row input[type="tel"],
    .form-row input[type="number"] {
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
    .checkbox-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 4px 0;
    }
    .checkbox-row input[type="checkbox"] {
      margin-top: 3px;
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
    }
    .checkbox-row label {
      font-size: 14px;
      color: var(--color-ink);
      line-height: 1.5;
    }
    .error-panel {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      font-size: 14px;
    }
    .login-link {
      text-align: center;
      font-size: 14px;
      color: var(--color-muted);
    }
    .login-link a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .login-link a:hover {
      text-decoration: underline;
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      <div class="header">
        <h1 class="page-title">Create your account</h1>
        <p class="page-subtitle">Sign up to manage your store, track transactions, and access the admin dashboard.</p>
      </div>

      <section class="card form-card">
        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()">
          <div style="display: grid; gap: 14px;">
            <div class="form-row">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" placeholder="you@example.com" />
            </div>

            <div class="form-row">
              <label for="password">Password</label>
              <input id="password" type="password" formControlName="password" placeholder="At least 8 characters" />
            </div>

            <div class="form-row">
              <label for="fullName">Full name</label>
              <input id="fullName" type="text" formControlName="fullName" placeholder="Jane Doe" />
            </div>

            <div class="form-row">
              <label for="phone">Phone (optional)</label>
              <input id="phone" type="tel" formControlName="phone" placeholder="+1 555 000 0000" />
            </div>

            <div class="form-row">
              <label for="businessName">Business name</label>
              <input id="businessName" type="text" formControlName="businessName" placeholder="Your store name" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-row">
                <label for="latitude">Latitude</label>
                <input id="latitude" type="number" step="any" formControlName="latitude" placeholder="37.7749" />
              </div>
              <div class="form-row">
                <label for="longitude">Longitude</label>
                <input id="longitude" type="number" step="any" formControlName="longitude" placeholder="-122.4194" />
              </div>
            </div>

            <div class="form-row">
              <label for="logoUrl">Logo URL (optional)</label>
              <input id="logoUrl" type="text" formControlName="logoUrl" placeholder="https://..." />
            </div>

            <div class="checkbox-row">
              <input id="isStoreAdmin" type="checkbox" formControlName="isStoreAdmin" />
              <label for="isStoreAdmin">Login as admin for this store</label>
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="submitting() || !signupForm.valid">
              @if (submitting()) {
                Creating account…
              } @else {
                Sign up
              }
            </button>
          </div>
        </form>
      </section>

      @if (errorMessage()) {
        <div class="error-panel">{{ errorMessage() }}</div>
      }

      <p class="login-link">
        Already have an account? <a routerLink="/login">Log in</a>
      </p>
    </div>
  `,
})
export class SignupPageComponent {
  readonly signupForm: FormGroup;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      fullName: ['', [Validators.required]],
      phone: [''],
      businessName: ['', [Validators.required]],
      latitude: [0, [Validators.required]],
      longitude: [0, [Validators.required]],
      logoUrl: [''],
      isStoreAdmin: [true],
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.signupForm.valid) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const v = this.signupForm.value;
      const payload = {
        email: v.email,
        password: v.password,
        fullName: v.fullName,
        phone: v.phone || undefined,
        businessName: v.businessName,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        logoUrl: v.logoUrl || undefined,
        isStoreAdmin: !!v.isStoreAdmin,
      };
      const result = await this.authService.register(payload);
      if (result.user?.isGlobalAdmin || result.user?.role === 'GLOBAL_ADMIN' || result.user?.role === 'STORE_ADMIN' || result.user?.role === 'OWNER') {
        await this.router.navigate(['/admin']);
      } else {
        await this.router.navigate(['/']);
      }
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Sign up failed. Please check your details and try again.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
