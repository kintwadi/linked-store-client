import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-store-staff-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      width: 100%;
      position: relative;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background:
        radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(20, 184, 166, 0.10) 0%, transparent 55%),
        linear-gradient(180deg, #f0fdf4 0%, #ecfeff 40%, #f0f9ff 100%);
      overflow: hidden;
    }

    .bg-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.55;
      pointer-events: none;
      z-index: 0;
    }
    .bg-orb.orb-1 {
      width: 560px; height: 560px;
      top: -200px; left: -140px;
      background: radial-gradient(circle, #10b981 0%, rgba(16,185,129,0) 70%);
    }
    .bg-orb.orb-2 {
      width: 600px; height: 600px;
      bottom: -220px; right: -180px;
      background: radial-gradient(circle, #14b8a6 0%, rgba(20,184,166,0) 70%);
    }
    .bg-orb.orb-3 {
      width: 480px; height: 480px;
      top: 45%; left: 55%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, #0ea5e9 0%, rgba(14,165,233,0) 70%);
      opacity: 0.25;
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

    .brand-wrap {
      width: 100%;
      max-width: 1100px;
      padding: 16px 0 12px 0;
      margin-bottom: 16px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: #0f172a;
      font-size: 24px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      letter-spacing: -0.01em;
    }
    .brand-icon {
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, #10b981 0%, #14b8a6 60%, #0ea5e9 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
    }
    .brand-icon svg {
      width: 18px; height: 18px;
      color: white;
      stroke-width: 2.4;
    }

    .login-wrap {
      width: 100%;
      max-width: 1100px;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 40px;
      margin-top: 24px;
      align-items: center;
    }

    .hero-panel {
      padding: 48px 44px;
      background:
        radial-gradient(circle at 10% 0%, rgba(16,185,129,0.35) 0%, transparent 45%),
        radial-gradient(circle at 100% 100%, rgba(20,184,166,0.35) 0%, transparent 50%),
        linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.8);
      box-shadow:
        0 20px 50px -20px rgba(16,185,129,0.35),
        0 10px 30px -10px rgba(20,184,166,0.25),
        inset 0 1px 0 rgba(255,255,255,0.9);
      backdrop-filter: blur(20px);
      animation: fadeInUp 0.7s ease-out;
      position: relative;
      overflow: hidden;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      background: linear-gradient(135deg, rgba(16,185,129,0.14), rgba(20,184,166,0.14));
      border: 1px solid rgba(16,185,129,0.28);
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      color: #047857;
      margin-bottom: 22px;
    }
    .hero-badge svg {
      width: 14px; height: 14px;
      stroke-width: 2.5;
    }

    .hero-title {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #065f46 0%, #0f766e 45%, #0369a1 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-sub {
      font-size: 16px;
      line-height: 1.65;
      color: #475569;
      margin: 0 0 30px 0;
    }

    .benefits {
      display: grid;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .benefit {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.6);
      border: 1px solid rgba(226,232,240,0.7);
      border-radius: 14px;
      transition: all 0.25s ease;
    }
    .benefit:hover {
      border-color: rgba(16,185,129,0.35);
      background: rgba(255,255,255,0.85);
      transform: translateX(3px);
    }
    .benefit-icon {
      width: 34px; height: 34px;
      flex-shrink: 0;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(20,184,166,0.18));
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .benefit-icon svg {
      width: 17px; height: 17px;
      color: #047857;
      stroke-width: 2.5;
    }
    .benefit-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 3px 0;
    }
    .benefit-desc {
      font-size: 13px;
      line-height: 1.5;
      color: #64748b;
      margin: 0;
    }

    .login-card {
      background: rgba(255,255,255,0.9);
      border-radius: 28px;
      padding: 44px 42px;
      box-shadow:
        0 20px 50px -20px rgba(2, 132, 199, 0.3),
        0 8px 24px -8px rgba(15, 23, 42, 0.08),
        inset 0 1px 0 rgba(255,255,255,1);
      border: 1px solid rgba(255,255,255,1);
      backdrop-filter: blur(18px);
      animation: slideUp 0.65s ease-out;
      position: relative;
      z-index: 10;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card-head {
      margin-bottom: 28px;
    }
    .card-head h1 {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    .card-head p {
      color: #64748b;
      font-size: 14.5px;
      line-height: 1.6;
      margin: 0;
    }

    .role-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16,185,129,0.08);
      color: #065f46;
      border: 1px solid rgba(16,185,129,0.2);
    }
    .role-chip.cyan   { background: rgba(20,184,166,0.08); color: #0f766e; border-color: rgba(20,184,166,0.2); }
    .role-chip.blue   { background: rgba(14,165,233,0.08); color: #0369a1; border-color: rgba(14,165,233,0.2); }
    .role-chip.amber  { background: rgba(245,158,11,0.10); color: #92400e; border-color: rgba(245,158,11,0.22); }
    .role-chip svg { width: 12px; height: 12px; stroke-width: 2.5; }

    form {
      display: grid;
      gap: 0;
    }

    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      color: #1e293b;
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
      color: #64748b;
      pointer-events: none;
      flex-shrink: 0;
    }
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.25s;
      background: #f8fafc;
      color: #0f172a;
      box-sizing: border-box;
    }
    input[type="email"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #10b981;
      background: white;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
    }
    input::placeholder { color: #94a3b8; }
    input.ng-invalid.ng-touched {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .row-helper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0 18px 0;
    }
    .forgot {
      font-size: 13px;
      font-weight: 500;
      color: #0f766e;
      text-decoration: none;
      transition: color 0.2s;
    }
    .forgot:hover { color: #065f46; text-decoration: underline; }

    .submit-btn {
      width: 100%;
      padding: 15px 18px;
      background: linear-gradient(135deg, #10b981 0%, #14b8a6 55%, #0ea5e9 100%);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 8px 22px -6px rgba(16, 185, 129, 0.45);
      font-family: inherit;
      position: relative;
      overflow: hidden;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -6px rgba(16, 185, 129, 0.55);
      filter: brightness(1.03);
    }
    .submit-btn:active:not(:disabled) { transform: translateY(0); }
    .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .submit-btn::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.6s ease;
    }
    .submit-btn:hover:not(:disabled)::after { left: 150%; }

    .error-panel {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 14px;
      padding: 13px 16px;
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
      color: #94a3b8;
      font-size: 12.5px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .divider span { padding: 0 16px; }

    .alt-link {
      text-align: center;
      color: #475569;
      font-size: 14px;
    }
    .alt-link a {
      color: #0f766e;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.25s;
    }
    .alt-link a:hover { color: #065f46; text-decoration: underline; }

    .store-footnote {
      margin-top: 26px;
      padding: 14px 16px;
      background: linear-gradient(135deg, rgba(16,185,129,0.07), rgba(20,184,166,0.07));
      border: 1px solid rgba(16,185,129,0.18);
      border-radius: 14px;
    }
    .store-footnote p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: #065f46;
    }
    .store-footnote strong { color: #047857; }

    @media (max-width: 960px) {
      .login-wrap { grid-template-columns: 1fr; gap: 28px; margin-top: 10px; }
      .hero-panel { padding: 34px 28px; order: 2; }
      .login-card { padding: 34px 28px; }
      .hero-title { font-size: 30px; }
    }
    @media (max-width: 640px) {
      .page { padding: 16px; }
      .navbar { padding: 12px 0; margin-bottom: 4px; }
      .logo { font-size: 20px; gap: 10px; }
      .hero-panel, .login-card { padding: 28px 22px; border-radius: 22px; }
      .hero-title { font-size: 26px; }
      .card-head h1 { font-size: 24px; }
      .benefit { padding: 12px 13px; }
    }
  `],
  template: `
    <div class="bg-orb orb-1" aria-hidden="true"></div>
    <div class="bg-orb orb-2" aria-hidden="true"></div>
    <div class="bg-orb orb-3" aria-hidden="true"></div>

    <div class="page">
      <div class="brand-wrap">
        <a class="brand" routerLink="/">
          <span class="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          {{ brand() }}
        </a>
      </div>

      <div class="login-wrap">
        <!-- Left: Branded Hero / Benefits -->
        <div class="hero-panel">
          <span class="hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Store Team Access
          </span>

          <h1 class="hero-title">Welcome back to<br/>your store dashboard</h1>
          <p class="hero-sub">
            Secure, role-based access for every member of your in-store team — from the front counter to fulfillment runners.
          </p>

          <ul class="benefits">
            <li class="benefit">
              <div class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <p class="benefit-title">Role-based permissions</p>
                <p class="benefit-desc">Each team member sees only the actions and screens they need for their role.</p>
              </div>
            </li>
            <li class="benefit">
              <div class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3h18v4H3z"/>
                  <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/>
                  <path d="M10 12h4"/>
                </svg>
              </div>
              <div>
                <p class="benefit-title">Inventory &amp; transactions</p>
                <p class="benefit-desc">Check stock, process sales, and manage customer pickups from one place.</p>
              </div>
            </li>
            <li class="benefit">
              <div class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p class="benefit-title">QR checkout &amp; sharing</p>
                <p class="benefit-desc">Share products with instant QR codes and track every pickup seamlessly.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Right: Login Card -->
        <div class="login-card">
          <div class="card-head">
            <h1>Staff Sign in</h1>
            <p>Use the store credentials your manager gave you to access the operations console.</p>
          </div>

          <div class="role-chip-row">
            <span class="role-chip cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Store Admin
            </span>
            <span class="role-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Clerk
            </span>
            <span class="role-chip blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
              Representative
            </span>
            <span class="role-chip amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88"/><path d="M14.47 14.48L20 20"/><path d="M8.12 8.12L12 12"/></svg>
              Runner
            </span>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="staff-email">Work email</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  id="staff-email"
                  type="email"
                  formControlName="email"
                  placeholder="you@store.com"
                  autocomplete="email" />
              </div>
            </div>

            <div class="form-group">
              <label for="staff-password">Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  id="staff-password"
                  type="password"
                  formControlName="password"
                  placeholder="Your store password"
                  autocomplete="current-password" />
              </div>
            </div>

            <div class="row-helper">
              <span></span>
              <a class="forgot" routerLink="/login">Forgot password?</a>
            </div>

            <button
              type="submit"
              class="submit-btn"
              [disabled]="submitting() || !loginForm.valid">
              @if (submitting()) {
                Signing you in…
              } @else {
                Sign in to Store Console
              }
            </button>

            @if (errorMessage()) {
              <div class="error-panel" role="alert">{{ errorMessage() }}</div>
            }
          </form>

          <div class="divider">
            <span>Not a store team member?</span>
          </div>

          <div class="alt-link">
            <a routerLink="/login">Go to Admin / Owner login →</a>
          </div>

          <div class="store-footnote">
            <p>
              <strong>First time?</strong> If you received a store invite link from your manager, use the password they shared with you. Need help or a password reset? Contact your Store Admin or Owner directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class StoreStaffLoginPageComponent {
  readonly loginForm: FormGroup;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly brand = this.brandService.displayName;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly brandService: BrandService,
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
        this.errorMessage.set('This login is for store staff only. Please use the regular customer login instead.');
      }
    } catch (err: unknown) {
      const anyErr = err as any;
      const msg: string =
        anyErr?.error?.message ??
        anyErr?.message ??
        'Sign in failed. Please verify your work email and store password.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
