import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

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
    .confirm {
      max-width: 480px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 14px;
      background: #eff6ff;
      color: #1e3a8a;
      border: 1px solid #bfdbfe;
    }
    .confirm.err {
      background: #fef2f2;
      color: #7f1d1d;
      border-color: #fecaca;
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
      @if (confirmMsg(); as msg) {
        <div class="confirm" [class.err]="confirmError()">{{ msg }}</div>
      }
      @if (sessionId()) {
        <div class="sid">Session: {{ sessionId() }}</div>
      }
      <div class="actions">
        <a class="btn btn-primary" routerLink="/">Back to home</a>
      </div>
    </div>
  `,
})
export class CheckoutSuccessPageComponent implements OnInit {
  readonly sessionId = signal<string | null>(null);
  readonly confirmMsg = signal<string | null>(null);
  readonly confirmError = signal(false);

  constructor(private readonly products: ProductService) {
    try {
      const sid = new URLSearchParams(window.location.search).get('session_id');
      if (sid) this.sessionId.set(sid);
    } catch {
      // ignore
    }
  }

  async ngOnInit(): Promise<void> {
    const sid = this.sessionId();
    if (!sid) return;
    try {
      const res = await this.products.confirmSessionPaid(sid);
      if (res?.finalized) {
        this.confirmMsg.set('Transaction finalized. Store dashboards updated live.');
      } else if (res?.status === 'not_paid') {
        this.confirmMsg.set(res.message ?? 'Awaiting payment confirmation.');
        this.confirmError.set(true);
      } else {
        this.confirmMsg.set(res.message ?? 'Payment confirmed; webhook will finalize shortly.');
      }
    } catch (err: any) {
      this.confirmError.set(true);
      this.confirmMsg.set('Could not confirm session with backend; webhook will finalize it. ' + (err?.message ?? ''));
    }
  }
}
