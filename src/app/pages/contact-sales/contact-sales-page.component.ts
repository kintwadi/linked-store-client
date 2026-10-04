import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface ContactSalesRequest {
  fullName: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  planCode?: string | null;
  solution?: string | null;
  message: string;
}

export interface ContactSalesResponse {
  status: 'sent' | 'queued';
  destination?: string | null;
  message?: string | null;
}

const PLAN_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'CUSTOM', label: 'Custom / Enterprise Plan', hint: 'Unlimited orders. Dedicated success manager. SAML SSO, custom SLA & integrations.' },
  { value: 'PARTNER', label: 'Partnership / Co-marketing', hint: 'Press, integration partner, platform or reseller discussion.' },
  { value: 'OTHER', label: 'Other inquiry', hint: 'Anything else — we read every message.' },
];

@Component({
  selector: 'app-contact-sales-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(180deg, #fafaf8 0%, #f8f7f4 100%);
      color: #111827;
    }
    .gradient-text {
      background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .card-shadow {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
    }
    .btn-send {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      transition: all 0.3s ease;
    }
    .btn-send:hover:not(:disabled) {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
    }
    .btn-send:active { transform: translateY(0); }
    .btn-send:disabled { opacity: 0.65; cursor: not-allowed; }

    .success-alert { animation: slideDown 0.4s ease-out; }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .fade-in.delay-1 { animation-delay: 0.1s; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .badge-chip {
      transition: all 0.2s ease;
    }
    .badge-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .form-input {
      transition: all 0.2s ease;
    }
    .form-input:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
      outline: none;
    }

    .radio-card {
      transition: all 0.2s ease;
    }
    .radio-card:hover {
      border-color: #a78bfa;
      background: #faf5ff;
    }
    .radio-card.selected {
      border-color: #7c3aed;
      background: #f5f0ff;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
    }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 999px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .page { max-width: 1280px; margin: 0 auto; padding: 24px 20px 80px; }
    .brand-wrap { padding: 12px 0 4px; margin-bottom: 12px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #111827; font-weight: 600; font-size: 18px; user-select: none; }
    .brand-chip {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      display: inline-flex; align-items: center; justify-content: center; color: #ffffff;
      font-size: 13px; font-weight: 800; letter-spacing: -0.02em; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
    }

    .hero {
      display: grid; grid-template-columns: 1fr 1fr; gap: 48px 64px; padding: 24px 0 32px; align-items: start;
    }
    @media (max-width: 1023px) {
      .hero { grid-template-columns: 1fr; gap: 40px; }
    }

    .hero-copy h1 {
      font-size: 40px; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 24px;
    }
    @media (min-width: 1024px) {
      .hero-copy h1 { font-size: 52px; }
    }
    .hero-copy h1 .white { color: #111827; }
    .lede {
      font-size: 16px; line-height: 1.7; color: #4b5563; margin: 0 0 40px; max-width: 560px;
    }

    .meta-list { margin: 0 0 32px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    .meta-list li {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid rgba(229, 231, 235, 0.6);
      gap: 12px;
    }
    .meta-list li:last-child { border-bottom: none; }
    .meta-list .k { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: #374151; }
    .meta-list .k .emoji { font-size: 16px; line-height: 1; }
    .meta-list .v { font-size: 14px; color: #4b5563; text-align: right; }
    .meta-list .v strong { font-weight: 500; }
    .meta-list .v a { color: #7c3aed; font-weight: 500; text-decoration: none; transition: color 0.15s ease; }
    .meta-list .v a:hover { color: #6d28d9; }

    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .badge-chip {
      display: inline-flex; align-items: center; gap: 6px; cursor: default;
      padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 500;
    }
    .badge-chip.amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    .badge-chip.violet { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .badge-chip.gray { background: #f9fafb; color: #374151; border: 1px solid #e5e7eb; }
    .badge-chip.rose { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }

    .form-card {
      background: #ffffff; border-radius: 16px; padding: 32px 40px;
      border: 1px solid #f3f4f6;
    }
    @media (max-width: 640px) {
      .form-card { padding: 24px; border-radius: 16px; }
    }
    .form-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 4px;
    }
    .form-header h2 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 6px; }
    .form-header p { font-size: 14px; color: #6b7280; margin: 0; line-height: 1.5; }
    .pill-plan {
      display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px;
      background: #fffbeb; color: #92400e; border: 1px solid #fde68a;
      font-size: 12px; font-weight: 500; white-space: nowrap;
    }
    @media (max-width: 640px) { .pill-plan { display: none; } }

    .alert {
      border-radius: 12px; padding: 14px 16px; margin: 24px 0 0;
      border: 1px solid; display: flex; align-items: flex-start; gap: 12px;
      font-size: 14px; line-height: 1.5;
    }
    .alert.ok { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .alert.ok .icon-wrap { background: #10b981; }
    .alert.err { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .alert.err .icon-wrap { background: #ef4444; }
    .icon-wrap {
      width: 24px; height: 24px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 2px; color: #ffffff;
    }
    .icon-wrap svg { width: 14px; height: 14px; }
    .alert strong { display: block; font-size: 14px; margin-bottom: 2px; font-weight: 600; }
    .alert small { font-size: 13px; opacity: 0.9; }

    form.contact-form { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; }
    .row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .row-grid { grid-template-columns: 1fr; } }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    .field label {
      font-size: 14px; font-weight: 500; color: #374151;
      display: flex; align-items: center; gap: 4px;
    }
    .field label .req { color: #ef4444; }
    .form-input {
      width: 100%; box-sizing: border-box;
      padding: 10px 14px; font-size: 14px; line-height: 1.5;
      color: #111827; background: #ffffff;
      border: 1px solid #d1d5db; border-radius: 8px;
      font-family: inherit;
    }
    .form-input::placeholder { color: #9ca3af; }
    textarea.form-input { min-height: 120px; resize: vertical; }
    .hint { font-size: 12px; color: #9ca3af; line-height: 1.5; margin-top: 4px; }
    .field-error { font-size: 12px; color: #b91c1c; font-weight: 500; margin-top: 2px; }
    .field.invalid .form-input { border-color: #fca5a5; }

    .plan-options { display: flex; flex-direction: column; gap: 10px; margin-top: 2px; }
    .radio-card {
      display: flex; align-items: flex-start; gap: 12px; padding: 14px;
      border-radius: 12px; border: 2px solid #e5e7eb; background: #ffffff;
      cursor: pointer; user-select: none;
    }
    .radio-dot {
      margin-top: 2px; width: 20px; height: 20px; border-radius: 999px;
      border: 2px solid #d1d5db; background: #ffffff; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      transition: all 0.15s ease;
    }
    .radio-card.selected .radio-dot {
      border-color: #7c3aed; background: #7c3aed;
    }
    .radio-dot::after {
      content: ""; width: 8px; height: 8px; border-radius: 999px; background: #ffffff; transform: scale(0); transition: transform 0.15s ease;
    }
    .radio-card.selected .radio-dot::after { transform: scale(1); }
    .radio-card .label { font-size: 14px; font-weight: 600; color: #111827; }
    .radio-card .hint-small { font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 2px; }

    .actions {
      display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 8px;
    }
    @media (max-width: 640px) {
      .actions { flex-direction: column-reverse; align-items: stretch; }
    }
    .secondary { font-size: 14px; color: #6b7280; }
    .secondary a { color: #7c3aed; font-weight: 500; text-decoration: none; transition: color 0.15s ease; }
    .secondary a:hover { color: #6d28d9; }
    .btn-send {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer;
      color: #ffffff; font-weight: 600; font-size: 14px;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
    }
  `],
  template: `
    <div class="page">
      <div class="brand-wrap">
        <a class="brand" routerLink="/">
          <span class="brand-chip">LS</span>
          Linked-Store
        </a>
      </div>

      <section class="hero">
        <div class="hero-copy fade-in">
          <h1>
            <span class="gradient-text">Talk to the team behind</span><br>
            <span class="white">Linked-Store.</span>
          </h1>
          <p class="lede">
            Whether you're scaling from 1 store to 100+, evaluating Custom enterprise terms, or just have a quick question —
            a real person reads every message and typically replies within one business day.
          </p>

          <ul class="meta-list">
            <li>
              <span class="k">
                <span class="emoji">🌍</span>
                <span>Europe &amp; LATAM</span>
              </span>
              <span class="v">Lisbon / São Paulo friendly hours</span>
            </li>
            <li>
              <span class="k">
                <span class="emoji">⚡</span>
                <span>Average reply</span>
              </span>
              <span class="v"><strong>&lt; 1 business day</strong></span>
            </li>
            <li>
              <span class="k">
                <span class="emoji">🔒</span>
                <span>Your data</span>
              </span>
              <span class="v"><strong>Never shared, never spammed</strong></span>
            </li>
            <li>
              <span class="k">
                <span class="emoji">💬</span>
                <span>Prefer email?</span>
              </span>
              <span class="v">
                <a href="mailto:info&#64;vicinity24.com">info&#64;vicinity24.com</a>
              </span>
            </li>
          </ul>

          <div class="chips">
            <span class="badge-chip amber">⚡ Enterprise SLA</span>
            <span class="badge-chip violet">🏢 Multi-store network</span>
            <span class="badge-chip gray">🔧 Custom integrations</span>
            <span class="badge-chip rose">🧭 Dedicated success manager</span>
          </div>
        </div>

        <div class="form-card fade-in delay-1 card-shadow">
          <div class="form-header">
            <div>
              <h2>Send us a message</h2>
              <p>Fill out the form and we'll get back to the email you provide.</p>
            </div>
            @if (initialPlanCode()) {
              <span class="pill-plan">Interest: {{ initialPlanLabel() }}</span>
            }
          </div>

          @if (success()) {
            <div class="alert ok success-alert">
              <span class="icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              </span>
              <div>
                <strong>Message sent!</strong>
                <small>Thanks for reaching out — we'll reply to <b>{{ submittedEmail() }}</b> as soon as possible.</small>
              </div>
            </div>
          }
          @if (generalError()) {
            <div class="alert err success-alert">
              <span class="icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
              </span>
              <div>
                <strong>Couldn't send your message</strong>
                <small>{{ generalError() }}</small>
              </div>
            </div>
          }

          <form class="contact-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="row-grid">
              <div class="field" [class.invalid]="submitted && form.get('fullName')?.invalid">
                <label for="cs_name">Full name <span class="req">*</span></label>
                <input id="cs_name" class="form-input" type="text" formControlName="fullName" placeholder="Your full name" autocomplete="name" />
                @if (submitted && form.get('fullName')?.errors?.['required']) {
                  <span class="field-error">Please enter your full name.</span>
                }
              </div>
              <div class="field" [class.invalid]="submitted && form.get('email')?.invalid">
                <label for="cs_email">Work email <span class="req">*</span></label>
                <input id="cs_email" class="form-input" type="email" formControlName="email" placeholder="you@company.com" autocomplete="email" />
                @if (submitted && form.get('email')?.errors?.['required']) {
                  <span class="field-error">Email is required.</span>
                } @else if (submitted && form.get('email')?.errors?.['email']) {
                  <span class="field-error">Enter a valid email address.</span>
                }
              </div>
            </div>

            <div class="row-grid">
              <div class="field">
                <label for="cs_company">Company</label>
                <input id="cs_company" class="form-input" type="text" formControlName="company" placeholder="Acme Holdings (optional)" />
              </div>
              <div class="field">
                <label for="cs_phone">Phone number</label>
                <input id="cs_phone" class="form-input" type="tel" formControlName="phone" placeholder="+351 912 345 678 (optional)" autocomplete="tel" />
              </div>
            </div>

            <div class="field full">
              <label>Plan of interest <span class="req">*</span></label>
              <div class="plan-options" role="radiogroup" aria-label="Plan of interest">
                @for (opt of planOptions; track opt.value) {
                  <label
                    class="radio-card"
                    [class.selected]="form.get('planCode')?.value === opt.value"
                    (click)="form.get('planCode')?.setValue(opt.value); submitted = false;"
                    role="radio"
                    [attr.aria-checked]="form.get('planCode')?.value === opt.value"
                    tabindex="0"
                    (keydown.enter)="$event.preventDefault(); form.get('planCode')?.setValue(opt.value); submitted = false;"
                    (keydown.space)="$event.preventDefault(); form.get('planCode')?.setValue(opt.value); submitted = false;"
                  >
                    <span class="radio-dot"></span>
                    <span>
                      <span class="label">{{ opt.label }}</span>
                      <span class="hint-small" style="display:block;">{{ opt.hint }}</span>
                    </span>
                  </label>
                }
              </div>
              @if (submitted && !form.get('planCode')?.value) {
                <span class="field-error">Pick the plan or topic that best matches your inquiry.</span>
              }
            </div>

            <div class="field full" [class.invalid]="submitted && form.get('message')?.invalid">
              <label for="cs_message">Tell us a bit about what you need <span class="req">*</span></label>
              <textarea
                id="cs_message"
                class="form-input"
                rows="5"
                formControlName="message"
                placeholder="Include store count, locations, POS / ERP tools, and any timelines you have in mind."
              ></textarea>
              <div class="hint">10 characters minimum. Include store count, locations, POS / ERP tools, and any timelines you have in mind.</div>
              @if (submitted && form.get('message')?.errors?.['required']) {
                <span class="field-error">Please write a short message (10+ characters).</span>
              } @else if (submitted && form.get('message')?.errors?.['minlength']) {
                <span class="field-error">Please write 10+ characters so we can help you accurately.</span>
              }
            </div>

            <div class="actions">
              <span class="secondary">
                Or email us directly at
                <a href="mailto:info&#64;vicinity24.com">info&#64;vicinity24.com</a>.
              </span>
              <button type="submit" class="btn-send" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner" aria-hidden="true"></span>
                  <span>Sending…</span>
                } @else {
                  <span>Send</span>
                  <span>message</span>
                }
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class ContactSalesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    company: [''],
    phone: [''],
    planCode: [null as string | null],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  readonly planOptions = PLAN_OPTIONS;
  readonly initialPlanCode = signal<string | null>(null);
  readonly initialPlanLabel = signal<string>('Custom / Enterprise');
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly generalError = signal<string | null>(null);
  readonly submittedEmail = signal<string>('');

  submitted = false;

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const raw = (params?.['plan'] ?? params?.['tier'] ?? null) as string | null;
        if (raw) {
          const normalized = this.normalizePlan(raw);
          this.form.get('planCode')?.setValue(normalized, { emitEvent: false });
          this.initialPlanCode.set(normalized);
          const label = PLAN_OPTIONS.find(p => p.value === normalized)?.label ?? normalized;
          this.initialPlanLabel.set(label);
        } else {
          this.form.get('planCode')?.setValue('CUSTOM', { emitEvent: false });
          this.initialPlanCode.set('CUSTOM');
          this.initialPlanLabel.set('Custom / Enterprise Plan');
        }
      });
  }

  private normalizePlan(raw: string): string {
    const up = String(raw || '').toUpperCase();
    const match = PLAN_OPTIONS.find(p => p.value.toUpperCase() === up);
    if (match) return match.value;
    if (up.includes('ENTERPRISE') || up.includes('CUSTOM') || up === 'PLUS' || up === 'PRO') return 'CUSTOM';
    if (up.includes('PARTNER') || up.includes('AFFILIATE') || up.includes('PRESS')) return 'PARTNER';
    return 'OTHER';
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.generalError.set(null);
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const planCode = (raw.planCode as string | null) ?? 'OTHER';
    const payload: ContactSalesRequest = {
      fullName: (raw.fullName as string).trim(),
      email: (raw.email as string).trim(),
      company: (raw.company as string | null)?.trim() || null,
      phone: (raw.phone as string | null)?.trim() || null,
      planCode,
      solution: planCode,
      message: (raw.message as string).trim(),
    };

    this.submitting.set(true);
    try {
      const resp = await firstValueFrom(
        this.http.post<ContactSalesResponse>('/api/contact-sales', payload)
      );
      this.submittedEmail.set(payload.email);
      this.success.set(true);
      this.form.disable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (resp?.message) {
        // success banner is shown by default; no-op, good.
      }
    } catch (e: unknown) {
      const body = (e as any)?.error;
      const status = (e as any)?.status ?? 0;
      const bodyMessage: string | null = typeof body?.message === 'string' ? body.message : null;
      const bodyError: string | null = typeof body?.error === 'string' ? body.error : null;
      const code: string | null = (body?.error_code ?? body?.errorCode ?? null) as string | null;

      let detail: string;
      if (code === 'RATE_LIMITED') {
        detail = "You've submitted too many messages from this browser recently. Please wait a few minutes and try again.";
      } else if (code === 'GLOBAL_RATE_LIMIT') {
        detail = 'Our inbox is a little full right now — please try again in a few minutes.';
      } else if (code === 'SMTP_SEND_FAILED') {
        detail = bodyMessage ?? "We couldn't deliver your message right now. Please try again in a minute or email info@vicinity24.com directly.";
      } else if (code === 'VALIDATION_FAILED') {
        detail = bodyMessage ?? 'Please review the form and try again.';
      } else if (bodyMessage && !/no message available/i.test(bodyMessage)) {
        detail = bodyMessage;
      } else if (status && status >= 500 && status < 600) {
        detail = "We hit a temporary server issue. Please try again in a moment, or email info@vicinity24.com directly.";
      } else if (status === 0 || !status) {
        detail = "We couldn't reach our servers. Please check your internet connection and try again.";
      } else if (bodyError) {
        detail = bodyError;
      } else if (typeof (e as any)?.message === 'string' && (e as any).message) {
        detail = (e as any).message as string;
      } else {
        detail = 'Something went wrong. Please try again, or email info@vicinity24.com directly.';
      }
      this.generalError.set(detail);
    } finally {
      this.submitting.set(false);
    }
  }
}
