import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
];

const CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'USD - US Dollar ($)' },
  { code: 'EUR', name: 'EUR - Euro (€)' },
  { code: 'GBP', name: 'GBP - British Pound (£)' },
  { code: 'CAD', name: 'CAD - Canadian Dollar ($)' },
  { code: 'AUD', name: 'AUD - Australian Dollar ($)' },
  { code: 'CHF', name: 'CHF - Swiss Franc' },
  { code: 'SEK', name: 'SEK - Swedish Krona (kr)' },
  { code: 'NOK', name: 'NOK - Norwegian Krone (kr)' },
  { code: 'DKK', name: 'DKK - Danish Krone (kr)' },
  { code: 'PLN', name: 'PLN - Polish Zloty (zł)' },
  { code: 'CZK', name: 'CZK - Czech Koruna (Kč)' },
  { code: 'HUF', name: 'HUF - Hungarian Forint (Ft)' },
  { code: 'RON', name: 'RON - Romanian Leu (L)' },
  { code: 'HRK', name: 'HRK - Croatian Kuna (kn)' },
  { code: 'JPY', name: 'JPY - Japanese Yen (¥)' },
];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AT: 'EUR', BE: 'EUR', BG: 'EUR', HR: 'HRK', CY: 'EUR',
  CZ: 'CZK', DK: 'DKK', EE: 'EUR', FI: 'EUR', FR: 'EUR',
  DE: 'EUR', GR: 'EUR', HU: 'HUF', IE: 'EUR', IT: 'EUR',
  LV: 'EUR', LI: 'CHF', LT: 'EUR', LU: 'EUR', MT: 'EUR',
  NL: 'EUR', NO: 'NOK', PL: 'PLN', PT: 'EUR', RO: 'RON',
  SK: 'EUR', SI: 'EUR', ES: 'EUR', SE: 'SEK', CH: 'CHF',
  GB: 'GBP', US: 'USD', CA: 'USD', AU: 'USD', NZ: 'USD',
  JP: 'JPY',
};

function uppercaseValidator(len: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (!v || typeof v !== 'string') return null;
    if (v.length !== len) return { length: true };
    if (v !== v.toUpperCase()) return { uppercase: true };
    return null;
  };
}

interface InvitePreviewResponse {
  valid: boolean;
  expiresAt?: string;
  targetStore?: { id: string; businessName: string; logoUrl?: string | null; countryCode?: string | null; currencyCode?: string | null };
  targetRole?: string;
  prefillEmail?: string | null;
  errorMessage?: string | null;
}

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }

    .page {
      min-height: 100vh;
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
      color: #1a202c;
      font-size: 24px;
      font-weight: 700;
      text-decoration: none;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon::after {
      content: '';
      width: 16px;
      height: 16px;
      background: #ffffff;
      border-radius: 50%;
    }

    .nav-link {
      color: #2d3748;
      text-decoration: none;
      font-weight: 500;
      font-size: 16px;
      transition: color 0.3s;
    }

    .nav-link:hover { color: #5a67d8; }

    .signup-container {
      background: #ffffff;
      border-radius: 24px;
      padding: 48px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-header { margin-bottom: 32px; }

    .form-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 8px;
    }

    .form-header p {
      color: #718096;
      font-size: 16px;
      margin: 0;
    }

    .form-section { margin-bottom: 32px; }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }

    .form-group { margin-bottom: 20px; }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-row-wide {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
    }

    label .required { color: #e53e3e; }

    label .optional {
      font-weight: 400;
      color: #a0aec0;
    }

    .control,
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="tel"],
    input[type="number"],
    select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.3s;
      background: #f7fafc;
      box-sizing: border-box;
    }

    input[type="text"]:focus,
    input[type="email"]:focus,
    input[type="password"]:focus,
    input[type="tel"]:focus,
    input[type="number"]:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    input::placeholder { color: #a0aec0; }

    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-color: #f7fafc;
      padding-right: 40px;
    }

    select:focus { background-color: #ffffff; }

    input:disabled,
    select:disabled,
    input[aria-disabled="true"],
    select[aria-disabled="true"] {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
      border-color: #e5e7eb;
      opacity: 0.85;
    }

    input.error,
    select.error {
      border-color: #e53e3e;
      background: #fff5f5;
    }

    input.error:focus,
    select.error:focus {
      box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
    }

    .error-message {
      color: #e53e3e;
      font-size: 13px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .geo-btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 18px;
      border: 2px dashed #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.06) 0%, rgba(118, 75, 162, 0.06) 100%);
      color: #5a67d8;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
      font-family: inherit;
      margin-bottom: 20px;
    }

    .geo-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
      transform: translateY(-1px);
      border-color: #5a67d8;
      color: #4c51bf;
    }

    .geo-btn:active:not(:disabled) { transform: translateY(0); }

    .geo-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .geo-btn .pin {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
    }

    .geo-hint {
      margin-top: -12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #718096;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f0fff4;
      border: 1px solid #c6f6d5;
      border-radius: 10px;
    }

    .geo-hint .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38a169;
      flex-shrink: 0;
    }

    .geo-hint.loading {
      background: #f7fafc;
      border-color: #e2e8f0;
    }

    .geo-hint.loading .dot {
      background: #ed8936;
      animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
    }

    .checkbox-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #667eea;
      flex-shrink: 0;
    }

    .checkbox-group label {
      margin: 0;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
    }

    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      font-family: inherit;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .submit-btn:active:not(:disabled) { transform: translateY(0); }

    .submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      box-shadow: none;
    }

    .login-link {
      text-align: center;
      margin-top: 24px;
      color: #718096;
      font-size: 15px;
    }

    .login-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s;
    }

    .login-link a:hover { color: #764ba2; }

    .error-panel {
      margin-top: 20px;
      background: #fff5f5;
      color: #9b2c2c;
      border: 1px solid #fed7d7;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px;
      line-height: 1.5;
    }

    .banner {
      border-radius: 18px;
      padding: 16px 18px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;
      animation: slideUp 0.45s ease-out;
    }

    .banner .ico {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }

    .banner .body {
      display: grid;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .banner .title {
      font-size: 15px;
      font-weight: 700;
      color: #1a202c;
    }

    .banner .msg {
      font-size: 13.5px;
      color: #4a5568;
      line-height: 1.55;
    }

    .banner .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      border-radius: 999px;
      margin-top: 2px;
      justify-self: flex-start;
    }

    .banner.success {
      background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
      border: 1px solid #9ae6b4;
    }
    .banner.success .ico { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); }
    .banner.success .tag { background: rgba(72, 187, 120, 0.15); color: #276749; }

    .banner.danger {
      background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
      border: 1px solid #feb2b2;
    }
    .banner.danger .ico { background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); }
    .banner.danger .tag { background: rgba(245, 101, 101, 0.15); color: #9b2c2c; }

    .fieldset-disabled {
      position: relative;
    }

    .fieldset-disabled::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(249, 250, 251, 0.5);
      border-radius: 12px;
      pointer-events: none;
      backdrop-filter: blur(0.5px);
    }

    @media (max-width: 640px) {
      .page { padding: 12px; }
      .navbar { padding: 14px 0; margin-bottom: 10px; }
      .logo { font-size: 20px; }
      .logo-icon { width: 28px; height: 28px; }
      .logo-icon::after { width: 14px; height: 14px; }
      .signup-container {
        padding: 28px 20px;
        border-radius: 20px;
      }
      .form-row,
      .form-row-wide {
        grid-template-columns: 1fr;
      }
      .form-header h1 { font-size: 24px; }
    }
  `],
  template: `
    <div class="page">
      <nav class="navbar">
        <a class="logo" routerLink="/">
          <span class="logo-icon"></span>
          Linked-Store
        </a>
        <a class="nav-link" routerLink="/">Explore</a>
      </nav>

      <div class="signup-container">
        <div class="form-header">
          <h1>Create your account</h1>
          <p>Join Linked-Store and start managing your business</p>
        </div>

        @if (inviteBannerValid() || inviteBannerInvalid()) {
          @if (inviteBannerValid()) {
            <div class="banner success">
              <span class="ico">✉</span>
              <div class="body">
                <div class="title">You've been invited!</div>
                <div class="msg">
                  You've been invited to join
                  <strong>{{ invitePreview()?.targetStore?.businessName }}</strong>
                  as
                  <span class="tag">{{ invitePreview()?.targetRole }}</span>.
                  Store details are pre-filled below — they cannot be changed.
                </div>
              </div>
            </div>
          }
          @if (inviteBannerInvalid()) {
            <div class="banner danger">
              <span class="ico">!</span>
              <div class="body">
                <div class="title">Invite invalid</div>
                <div class="msg">
                  {{ invitePreview()?.errorMessage || 'The invite link is expired or has been revoked. Please request a new invitation from the store administrator.' }}
                </div>
              </div>
            </div>
          }
        }

        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()">
          <div class="form-section">
            <div class="form-group">
              <label for="email">Email <span class="required">*</span></label>
              <input id="email"
                     type="email"
                     formControlName="email"
                     placeholder="admin@linked.store"
                     [class.error]="signupForm.get('email')?.touched && signupForm.get('email')?.invalid" />
              @if (signupForm.get('email')?.touched && signupForm.get('email')?.invalid) {
                <div class="error-message">
                  <span>⚠</span>
                  <span>Valid email is required</span>
                </div>
              }
            </div>

            <div class="form-group">
              <label for="password">Password <span class="required">*</span></label>
              <input id="password"
                     type="password"
                     formControlName="password"
                     placeholder="••••••••"
                     [class.error]="signupForm.get('password')?.touched && signupForm.get('password')?.invalid" />
              @if (signupForm.get('password')?.touched && signupForm.get('password')?.invalid) {
                <div class="error-message">
                  <span>⚠</span>
                  <span>Password must be at least 8 characters</span>
                </div>
              }
            </div>

            <div class="form-group">
              <label for="fullName">Full name <span class="required">*</span></label>
              <input id="fullName"
                     type="text"
                     formControlName="fullName"
                     placeholder="Jane Doe"
                     [class.error]="signupForm.get('fullName')?.touched && signupForm.get('fullName')?.invalid" />
              @if (signupForm.get('fullName')?.touched && signupForm.get('fullName')?.invalid) {
                <div class="error-message">
                  <span>⚠</span>
                  <span>Full name is required</span>
                </div>
              }
            </div>

            <div class="form-group">
              <label for="phone">Phone <span class="optional">(optional)</span></label>
              <input id="phone"
                     type="tel"
                     formControlName="phone"
                     placeholder="+1 555 000 0000" />
            </div>
          </div>

          <div class="fieldset-disabled" [class.fieldset-disabled]="!!inviteToken()">
            <div class="form-section">
              <div class="section-title">Store Details</div>

              <div class="form-group">
                <label for="businessName">Business name <span class="required">*</span></label>
                <input id="businessName"
                       type="text"
                       formControlName="businessName"
                       placeholder="Your store name"
                       [attr.aria-disabled]="!!inviteToken()"
                       [disabled]="!!inviteToken()"
                       [class.error]="signupForm.get('businessName')?.touched && signupForm.get('businessName')?.invalid" />
                @if (signupForm.get('businessName')?.touched && signupForm.get('businessName')?.invalid) {
                  <div class="error-message">
                    <span>⚠</span>
                    <span>Business name is required</span>
                  </div>
                }
              </div>

              <div class="form-row-wide">
                <div class="form-group">
                  <label for="address">Address <span class="optional">(optional)</span></label>
                  <input id="address"
                         type="text"
                         formControlName="address"
                         placeholder="123 Main Street, Apt 4B"
                         [attr.aria-disabled]="!!inviteToken()"
                         [disabled]="!!inviteToken()" />
                </div>
                <div class="form-group">
                  <label for="postalCode">Postal code <span class="optional">(optional)</span></label>
                  <input id="postalCode"
                         type="text"
                         formControlName="postalCode"
                         placeholder="10001"
                         [attr.aria-disabled]="!!inviteToken()"
                         [disabled]="!!inviteToken()" />
                </div>
              </div>

              <button type="button"
                      class="geo-btn"
                      [disabled]="geoLoading() || !!inviteToken()"
                      (click)="onUseStoreLocation()">
                <span class="pin">📍</span>
                @if (geoLoading()) {
                  Detecting your location…
                } @else {
                  Use store location
                }
              </button>

              @if (geoHint()) {
                <div class="geo-hint" [class.loading]="geoLoading()">
                  <span class="dot"></span>
                  <span>{{ geoHint() }}</span>
                </div>
              }

              <div class="form-row">
                <div class="form-group">
                  <label for="latitude">Latitude</label>
                  <input id="latitude"
                         type="number" step="any"
                         formControlName="latitude"
                         placeholder="0"
                         [attr.aria-disabled]="!!inviteToken()"
                         [disabled]="!!inviteToken()" />
                </div>
                <div class="form-group">
                  <label for="longitude">Longitude</label>
                  <input id="longitude"
                         type="number" step="any"
                         formControlName="longitude"
                         placeholder="0"
                         [attr.aria-disabled]="!!inviteToken()"
                         [disabled]="!!inviteToken()" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="countryCode">Country <span class="required">*</span></label>
                  <select id="countryCode"
                          formControlName="countryCode"
                          [attr.aria-disabled]="!!inviteToken()"
                          [disabled]="!!inviteToken()"
                          [class.error]="signupForm.get('countryCode')?.touched && signupForm.get('countryCode')?.invalid">
                    <option value="" disabled>-- Select country --</option>
                    @for (c of COUNTRIES; track c.code) {
                      <option [value]="c.code">{{ c.name }}</option>
                    }
                  </select>
                  @if (signupForm.get('countryCode')?.touched && signupForm.get('countryCode')?.invalid) {
                    <div class="error-message">
                      <span>⚠</span>
                      <span>Country is required</span>
                    </div>
                  }
                </div>
                <div class="form-group">
                  <label for="currencyCode">Currency <span class="required">*</span></label>
                  <select id="currencyCode"
                          formControlName="currencyCode"
                          [class.error]="signupForm.get('currencyCode')?.touched && signupForm.get('currencyCode')?.invalid">
                    <option value="" disabled>-- Select currency --</option>
                    @for (c of CURRENCIES; track c.code) {
                      <option [value]="c.code">{{ c.name }}</option>
                    }
                  </select>
                  @if (signupForm.get('currencyCode')?.touched && signupForm.get('currencyCode')?.invalid) {
                    <div class="error-message">
                      <span>⚠</span>
                      <span>Currency is required</span>
                    </div>
                  }
                </div>
              </div>

              <div class="form-group">
                <label for="logoUrl">Logo URL <span class="optional">(optional)</span></label>
                <input id="logoUrl"
                       type="text"
                       formControlName="logoUrl"
                       placeholder="https://..."
                       [attr.aria-disabled]="!!inviteToken()"
                       [disabled]="!!inviteToken()" />
              </div>
            </div>
          </div>

          <div class="checkbox-group">
            <input id="isStoreAdmin" type="checkbox" formControlName="isStoreAdmin" />
            <label for="isStoreAdmin">Login as admin for this store</label>
          </div>

          <button type="submit"
                  class="submit-btn"
                  [disabled]="submitting() || !signupForm.valid || inviteBannerInvalid() || geoLoading()">
            @if (submitting()) {
              Creating account…
            } @else {
              Sign up
            }
          </button>
        </form>

        @if (errorMessage()) {
          <div class="error-panel">{{ errorMessage() }}</div>
        }

        <div class="login-link">
          Already have an account? <a routerLink="/login">Log in</a>
        </div>
      </div>
    </div>
  `,
})
export class SignupPageComponent implements OnInit {
  readonly signupForm: FormGroup;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly inviteToken = signal<string | null>(null);
  readonly invitePreview = signal<InvitePreviewResponse | null>(null);
  readonly inviteBannerValid = signal(false);
  readonly inviteBannerInvalid = signal(false);
  readonly geoLoading = signal(false);
  readonly geoHint = signal<string | null>(null);

  readonly COUNTRIES = COUNTRIES;
  readonly CURRENCIES = CURRENCIES;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  private geoHintTimeoutId: any = null;

  constructor() {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      fullName: ['', [Validators.required]],
      phone: [''],
      address: [''],
      postalCode: [''],
      businessName: ['', [Validators.required]],
      latitude: [0],
      longitude: [0],
      logoUrl: [''],
      isStoreAdmin: [true],
      countryCode: ['', [Validators.required, uppercaseValidator(2)]],
      currencyCode: ['', [Validators.required, uppercaseValidator(3)]],
    });

    this.signupForm.get('countryCode')?.valueChanges.subscribe((code: string) => {
      if (code && COUNTRY_TO_CURRENCY[code]) {
        this.signupForm.get('currencyCode')?.setValue(COUNTRY_TO_CURRENCY[code], { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('invite');
    if (token) {
      this.inviteToken.set(token);
      void this.previewInvite(token);
    }
  }

  onUseStoreLocation(): void {
    if (this.inviteToken()) return;
    if (this.geoLoading()) return;

    this.geoLoading.set(true);
    this.geoHint.set('Requesting location permission…');
    this.clearGeoHintTimer();

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.geoLoading.set(false);
      this.geoHint.set('📍 Geolocation unavailable in this browser. Manually enter latitude and longitude above.');
      this.scheduleGeoHintClear(11000);
      return;
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      this.geoLoading.set(false);
    };

    try {
      navigator.geolocation.getCurrentPosition(
        async (pos: GeolocationPosition) => {
          if (done) return;
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          this.signupForm.patchValue({ latitude: lat, longitude: lng }, { emitEvent: false });

          let resolvedAddress: string | undefined;
          let resolvedPostal: string | undefined;
          let resolvedCountry: string | undefined;

          try {
            const reverseUrl =
              `https://us1.locationiq.com/v1/reverse.php?key=pk.6e6a020601724217d800c808c51f0bd0` +
              `&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}` +
              `&format=json&zoom=18&addressdetails=1&normalizeaddress=1&accept-language=en`;
            const raw = await fetch(reverseUrl);
            if (raw.ok) {
              const json: any = await raw.json();
              if (json && typeof json === 'object') {
                const addr: Record<string, string> | undefined =
                  json.address && typeof json.address === 'object' ? json.address : undefined;
                if (addr) {
                  const house = addr['house_number'] ? String(addr['house_number']) : '';
                  const street = addr['road']
                    ? String(addr['road'])
                    : (addr['pedestrian'] ? String(addr['pedestrian']) : (addr['square'] ? String(addr['square']) : ''));
                  const line1Parts: string[] = [];
                  if (street) line1Parts.push(house ? `${house} ${street}` : street);
                  const neighborhood = addr['neighbourhood']
                    ? String(addr['neighbourhood'])
                    : (addr['suburb'] ? String(addr['suburb']) : (addr['city_district'] ? String(addr['city_district']) : ''));
                  if (neighborhood && !line1Parts.some(p => p.includes(neighborhood))) {
                    line1Parts.push(neighborhood);
                  }
                  const city = addr['city']
                    ? String(addr['city'])
                    : (addr['town'] ? String(addr['town']) : (addr['village'] ? String(addr['village']) : (addr['county'] ? String(addr['county']) : (addr['state'] ? String(addr['state']) : ''))));
                  if (city && !line1Parts.includes(city)) line1Parts.push(city);
                  resolvedAddress = line1Parts.join(', ') || (json.display_name ? String(json.display_name).split(',')[0] : undefined);
                  resolvedPostal = addr['postcode'] ? String(addr['postcode']) : undefined;
                  resolvedCountry = addr['country_code'] ? String(addr['country_code']).toUpperCase() : undefined;
                } else if (json.display_name) {
                  resolvedAddress = String(json.display_name);
                }
              }
            }
          } catch (_rev) {
            // no-op: browser reverse lookup is best-effort
          }

          if (resolvedAddress) this.signupForm.patchValue({ address: resolvedAddress }, { emitEvent: false });
          if (resolvedPostal) this.signupForm.patchValue({ postalCode: resolvedPostal }, { emitEvent: false });
          if (resolvedCountry && COUNTRIES.some(c => c.code === resolvedCountry)) {
            this.signupForm.patchValue({ countryCode: resolvedCountry }, { emitEvent: true });
          }

          cleanup();
          const pieces = [`📍 Location detected: ${lat}, ${lng} (coordinates applied above).`];
          if (resolvedAddress) pieces.push(`Address: ${resolvedAddress}.`);
          if (resolvedPostal) pieces.push(`Postal: ${resolvedPostal}.`);
          if (resolvedCountry) pieces.push(`Country: ${resolvedCountry}.`);
          this.geoHint.set(pieces.join(' '));
          this.scheduleGeoHintClear(14000);
          this.cdr.markForCheck();
        },
        (err: GeolocationPositionError) => {
          if (done) return;
          cleanup();
          let msg = 'Unable to detect location. Please enter coordinates manually.';
          if (err?.code === 1) msg = '📍 Location permission denied. Please allow access or enter coordinates manually.';
          else if (err?.code === 2) msg = '📍 Position unavailable. Please enter coordinates manually.';
          else if (err?.code === 3) msg = '📍 Location request timed out. Please try again or enter coordinates manually.';
          this.geoHint.set(msg);
          this.scheduleGeoHintClear(12000);
          this.cdr.markForCheck();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    } catch (e: any) {
      cleanup();
      this.geoHint.set('📍 Geolocation unavailable. Manually enter latitude and longitude.');
      this.scheduleGeoHintClear(12000);
    }

    // Safety fallback: resolve loading state after 14s even if geolocation callback stalls
    setTimeout(() => {
      if (!this.geoLoading()) return;
      this.geoLoading.set(false);
      if (!this.geoHint()) {
        this.geoHint.set('📍 Geolocation request timed out. Please enter coordinates manually.');
        this.scheduleGeoHintClear(10000);
      }
      this.cdr.markForCheck();
    }, 14000);
  }

  private scheduleGeoHintClear(ms: number): void {
    this.clearGeoHintTimer();
    this.geoHintTimeoutId = setTimeout(() => {
      this.geoHint.set(null);
    }, ms);
  }

  private clearGeoHintTimer(): void {
    if (this.geoHintTimeoutId != null) {
      clearTimeout(this.geoHintTimeoutId);
      this.geoHintTimeoutId = null;
    }
  }

  private async previewInvite(token: string): Promise<void> {
    try {
      const api = this.authService.resolveApiBasePublic();
      const res = await firstValueFrom(
        this.http.get<InvitePreviewResponse>(
          `${api}/auth/invites/${encodeURIComponent(token)}/preview`
        )
      );
      this.invitePreview.set(res);
      if (res?.valid) {
        this.inviteBannerValid.set(true);
        if (res.targetStore?.businessName) {
          this.signupForm.get('businessName')?.setValue(res.targetStore.businessName, { emitEvent: false });
        }
        if (res.targetStore?.countryCode) {
          this.signupForm.get('countryCode')?.setValue(res.targetStore.countryCode, { emitEvent: true });
        }
        if (res.targetStore?.currencyCode) {
          this.signupForm.get('currencyCode')?.setValue(res.targetStore.currencyCode, { emitEvent: false });
        }
        if (res.targetStore?.logoUrl) {
          this.signupForm.get('logoUrl')?.setValue(res.targetStore.logoUrl, { emitEvent: false });
        }
        if (res.prefillEmail) {
          this.signupForm.get('email')?.setValue(res.prefillEmail, { emitEvent: false });
        }
      } else {
        this.inviteBannerInvalid.set(true);
      }
    } catch {
      this.inviteBannerInvalid.set(true);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.signupForm.valid) return;
    if (this.inviteBannerInvalid()) return;
    if (this.geoLoading()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const v = this.signupForm.value;
      const payload = {
        email: v.email,
        password: v.password,
        fullName: v.fullName,
        phone: v.phone || undefined,
        address: v.address || undefined,
        postalCode: v.postalCode || undefined,
        businessName: v.businessName,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        logoUrl: v.logoUrl || undefined,
        isStoreAdmin: !!v.isStoreAdmin,
        countryCode: v.countryCode,
        currencyCode: v.currencyCode,
        inviteToken: this.inviteToken() ?? undefined,
      };
      const result = await this.authService.register(payload);
      const u = result.user as any;
      const isRunner = !!u && u.role === 'RUNNER';
      const adminish = !!u && (
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
      } else if (adminish) {
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
