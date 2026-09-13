import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-checkout-cancel-page',
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
      background: #fef2f2;
      border: 2px solid #fecaca;
      color: #dc2626;
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
      cursor: pointer;
      border: 1px solid transparent;
      font-size: 15px;
    }
    .btn-primary {
      background: var(--color-primary);
      color: #fff;
    }
    .btn-ghost {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-ink);
    }
  `],
  template: `
    <div class="wrap">
      <div class="icon" aria-hidden="true">×</div>
      <h1>Payment not completed</h1>
      <p class="sub">No charges were made. You can try again whenever you're ready.</p>
      <div class="actions">
        <button class="btn btn-primary" (click)="onBack()">Back to checkout</button>
        <a class="btn btn-ghost" routerLink="/">Home</a>
      </div>
    </div>
  `,
})
export class CheckoutCancelPageComponent {
  readonly product = signal<Product | null>(null);

  constructor(private readonly router: Router) {
    const last = history.state?.product as Product | undefined;
    if (last?.id) this.product.set(last);
  }

  onBack(): void {
    const p = this.product();
    if (p) {
      this.router.navigate(['/checkout'], {
        state: { product: structuredClone(p) },
      }).catch(() => this.router.navigateByUrl('/'));
      return;
    }
    this.router.navigateByUrl('/');
  }
}
