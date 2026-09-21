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
    :host {
      display: block;
      min-height: 100vh;
      width: 100%;
      position: relative;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f9fafb;
      overflow: hidden;
    }

    .bg-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.55;
      pointer-events: none;
      z-index: 0;
    }
    .bg-orb.orb-1 {
      width: 520px; height: 520px;
      top: -180px; left: -120px;
      background: radial-gradient(circle, #818cf8 0%, rgba(129,140,248,0) 70%);
    }
    .bg-orb.orb-2 {
      width: 560px; height: 560px;
      bottom: -200px; right: -160px;
      background: radial-gradient(circle, #a78bfa 0%, rgba(167,139,250,0) 70%);
    }
    .bg-orb.orb-3 {
      width: 440px; height: 440px;
      top: 40%; left: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, #c4b5fd 0%, rgba(196,181,253,0) 70%);
      opacity: 0.35;
    }

    .page {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }

    .navbar {
      width: 100%;
      max-width: 1200px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      margin-bottom: 20px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      user-select: none;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .logo-icon::after {
      content: '';
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
    }

    .nav-link {
      color: #4b5563;
      text-decoration: none;
      font-weight: 500;
      font-size: 16px;
      transition: all 0.2s;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
    }
    .nav-link:hover {
      color: #4f46e5;
      background: #eef2ff;
    }

    .login-container {
      background: white;
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      border: 1px solid #e5e7eb;
      animation: slideUp 0.6s ease-out;
      position: relative;
      z-index: 10;
      backdrop-filter: blur(10px);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 32px;
      transition: all 0.2s;
      cursor: pointer;
      user-select: none;
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
    }
    .back-link:hover {
      color: #4f46e5;
      transform: translateX(-4px);
    }
    .back-link svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .form-header {
      margin-bottom: 32px;
    }
    .form-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    .form-header p {
      color: #6b7280;
      font-size: 15px;
      line-height: 1.6;
      margin: 0;
    }

    form {
      display: grid;
      gap: 0;
    }

    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .input-wrapper {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #9ca3af;
      pointer-events: none;
      flex-shrink: 0;
    }
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.3s;
      background: #f9fafb;
      color: #1f2937;
      box-sizing: border-box;
    }
    input[type="email"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #4f46e5;
      background: white;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    input::placeholder {
      color: #9ca3af;
    }
    input.ng-invalid.ng-touched {
      border-color: #f87171;
      box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
    }

    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      margin-top: 8px;
      font-family: inherit;
      position: relative;
      overflow: hidden;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
    }
    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }
    .submit-btn::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transition: left 0.6s ease;
    }
    .submit-btn:hover:not(:disabled)::after {
      left: 150%;
    }

    .error-panel {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px;
      margin-top: 16px;
      animation: shake 0.4s ease;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
      color: #9ca3af;
      font-size: 13px;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }
    .divider span {
      padding: 0 16px;
    }

    .signup-link {
      text-align: center;
      color: #4b5563;
      font-size: 15px;
    }
    .signup-link a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s;
    }
    .signup-link a:hover {
      color: #7c3aed;
    }

    @media (max-width: 640px) {
      .login-container {
        padding: 32px 24px;
        border-radius: 20px;
      }
      .form-header h1 {
        font-size: 28px;
      }
      .navbar {
        padding: 12px 0;
        margin-bottom: 8px;
      }
      .logo {
        font-size: 20px;
        gap: 10px;
      }
    }
  `],
  template: `
    <div class="bg-orb orb-1" aria-hidden="true"></div>
    <div class="bg-orb orb-2" aria-hidden="true"></div>
    <div class="bg-orb orb-3" aria-hidden="true"></div>

    <div class="page">
      <nav class="navbar">
        <a class="logo" routerLink="/">
          <span class="logo-icon" aria-hidden="true"></span>
          Linked-Store
        </a>
        <a class="nav-link" routerLink="/">Explore</a>
      </nav>

      <div class="login-container">
        <button type="button" class="back-link" (click)="goHome()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to home
        </button>

        <div class="form-header">
          <h1>Welcome back</h1>
          <p>Log in to access your store dashboard and manage your account.</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="storea@gmail.com"
                autocomplete="email" />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password" />
            </div>
          </div>

          <button
            type="submit"
            class="submit-btn"
            [disabled]="submitting() || !loginForm.valid">
            @if (submitting()) {
              Logging in…
            } @else {
              Log in
            }
          </button>

          @if (errorMessage()) {
            <div class="error-panel" role="alert">{{ errorMessage() }}</div>
          }
        </form>

        <div class="divider">
          <span>or</span>
        </div>

        <div class="signup-link">
          Don't have an account? <a routerLink="/signup">Sign up</a>
        </div>
      </div>
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

  async goHome(): Promise<void> {
    await this.router.navigate(['/']);
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const v = this.loginForm.value as { email: string; password: string };
      const result = await this.authService.login(v.email, v.password);
      const user = result.user;
      const u = user as any;
      const isRunner = !!u && u.role === 'RUNNER';
      const isAllowedAdminish =
        !!u && (
          u.isGlobalAdmin === true ||
          u.role === 'GLOBAL_ADMIN' ||
          u.role === 'OWNER' ||
          u.role === 'STORE_ADMIN' ||
          u.role === 'STORE_REPRESENTATIVE' ||
          u.role === 'CLERK' ||
          u.role === 'RUNNER'
        );
      if (isRunner) {
        await this.router.navigate(['/runner', 'pickup']);
      } else if (isAllowedAdminish) {
        await this.router.navigate(['/admin']);
      } else {
        await this.router.navigate(['/']);
      }
    } catch (err: unknown) {
      const anyErr = err as any;
      const msg: string =
        anyErr?.error?.message ??
        anyErr?.message ??
        'Login failed. Please check your email and password.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
