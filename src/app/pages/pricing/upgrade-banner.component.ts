import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { distinctUntilChanged, Subscription } from 'rxjs';
import { SubscriptionPlanService } from '../../services/subscription-plan.service';

@Component({
  selector: 'app-upgrade-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; }

    .banner-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      max-width: 520px;
      width: calc(100% - 48px);
      pointer-events: none;
      visibility: hidden;
    }
    @media (max-width: 560px) {
      .banner-root {
        bottom: 16px;
        right: 16px;
        left: 16px;
        width: auto;
      }
    }

    .banner-card {
      pointer-events: auto;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(253, 230, 138, 0.6);
      border-radius: 18px;
      padding: 18px 20px;
      box-shadow:
        0 10px 40px rgba(180, 83, 9, 0.15),
        0 2px 8px rgba(15, 23, 42, 0.06);
      transform: translateY(20px) scale(0.98);
      opacity: 0;
      transition:
        opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .banner-card.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .banner-root.show {
      visibility: visible;
    }

    .banner-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .limit-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      font-size: 11px;
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .limit-pill svg { flex-shrink: 0; }

    .close-btn {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.15s ease;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .close-btn:hover {
      background: #fef3c7;
      color: #b45309;
    }

    .banner-title {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
      color: #78350f;
      letter-spacing: -0.01em;
    }

    .banner-body {
      margin: 0 0 16px;
      font-size: 13px;
      color: #92400e;
      line-height: 1.55;
    }

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
      color: #78350f;
      border: none;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 3px 10px rgba(245, 158, 11, 0.25);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
    }
    .btn-primary:active { transform: translateY(0); }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      padding: 10px 16px;
      border-radius: 10px;
      background: transparent;
      color: #a16207;
      border: 1px solid #fde68a;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-ghost:hover {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #854d0e;
    }
  `],
  template: `
    <div class="banner-root" [class.show]="visible()" aria-live="polite" aria-atomic="true">
      <div class="banner-card" [class.visible]="visible()">
        <div class="banner-head">
          <span class="limit-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Plan limit reached
          </span>
          <button type="button" class="close-btn" (click)="onDismiss()" aria-label="Dismiss banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <h3 class="banner-title">You&rsquo;ve reached your monthly order limit</h3>
        <p class="banner-body">
          Upgrade to Custom to process unlimited orders &mdash; or contact sales for enterprise terms.
        </p>

        <div class="banner-actions">
          <a class="btn-primary" routerLink="/pricing" (click)="onDismiss()">
            Upgrade now
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
          <button type="button" class="btn-ghost" (click)="onDismiss()">Dismiss</button>
        </div>
      </div>
    </div>
  `,
})
export class UpgradeBannerComponent implements OnInit, OnDestroy {
  private readonly subscriptionPlanService = inject(SubscriptionPlanService);

  readonly visible = signal(false);
  readonly details = signal<any>(null);

  private triggerSub?: Subscription;

  ngOnInit(): void {
    this.triggerSub = this.subscriptionPlanService.orderLimitTriggered$.pipe(
      distinctUntilChanged()
    ).subscribe((v) => {
      this.visible.set(v === true);
    });
  }

  ngOnDestroy(): void {
    this.triggerSub?.unsubscribe();
  }

  onDismiss(): void {
    this.subscriptionPlanService.dismissOrderLimitBanner();
  }
}
