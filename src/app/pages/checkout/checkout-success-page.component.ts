import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-success-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      padding: 48px 16px;
      text-align: center;
      display: grid;
      gap: 20px;
      justify-items: center;
    }
    .icon {
      width: 88px;
      height: 88px;
      border-radius: 999px;
      background: #ecfdf5;
      border: 2px solid #a7f3d0;
      color: #059669;
      display: grid;
      place-items: center;
      font-size: 44px;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: 26px;
    }
    .sub {
      margin: 0;
      color: var(--color-muted);
      font-size: 15px;
    }
    .sid {
      padding: 8px 14px;
      background: #f3f4f6;
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--color-muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      word-break: break-all;
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 8px;
    }
    .btn {
      padding: 12px 20px;
      border-radius: var(--radius-md);
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
    }
    .btn-primary {
      background: var(--color-primary);
      color: #fff;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-ink);
    }
  `],
  template: `
    <div class="wrap">
      <div class="icon" aria-hidden="true">✓</div>
      <h1>Payment successful</h1>
      <p class="sub">Thanks — your order is now paid.</p>
      @if (sessionId()) {
        <div class="sid">Session: {{ sessionId() }}</div>
      }
      <div class="actions">
        <a class="btn btn-primary" routerLink="/">Back to home</a>
      </div>
    </div>
  `,
})
export class CheckoutSuccessPageComponent {
  readonly sessionId = signal<string | null>(null);

  constructor() {
    try {
      const sid = new URLSearchParams(window.location.search).get('session_id');
      if (sid) this.sessionId.set(sid);
    } catch {
      // ignore
    }
  }
}
