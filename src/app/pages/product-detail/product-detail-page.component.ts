import { ChangeDetectorRef, Component, computed, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, SimilarProductsResult } from '../../shared/models/product.model';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

type ReservationStatus = 'idle' | 'pending' | 'accepted' | 'denied' | 'expired';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--color-muted);
      margin-bottom: 24px;
    }
    .back-link:hover { color: var(--color-primary); }

    .pdp {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 48px;
      align-items: start;
    }

    .gallery-wrap {
      position: sticky;
      top: 90px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gallery {
      position: relative;
      aspect-ratio: 1 / 1;
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
      border: 1px solid var(--color-border);
    }
    .gallery img.slide {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.015);
      transition: opacity .32s ease, transform .5s ease;
      pointer-events: none;
    }
    .gallery img.slide.active {
      opacity: 1;
      transform: scale(1);
    }
    .gallery .arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: rgba(255,255,255,.9);
      border: 1px solid var(--color-border);
      color: #111827;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      font-size: 18px;
      font-weight: 700;
      box-shadow: var(--shadow-sm);
      transition: background .15s ease, transform .15s ease;
    }
    .gallery .arrow:hover { background: #fff; transform: translateY(-50%) scale(1.04); }
    .gallery .arrow:disabled { opacity: .4; cursor: not-allowed; transform: translateY(-50%); }
    .gallery .arrow.prev { left: 12px; }
    .gallery .arrow.next { right: 12px; }

    .gallery .dots {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(2px);
    }
    .gallery .dots i {
      display: inline-block;
      width: 6px; height: 6px; border-radius: 999px;
      background: rgba(255,255,255,.45);
      cursor: pointer;
    }
    .gallery .dots i.active { background: #fff; transform: scale(1.2); }

    .thumbs {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }
    .thumb {
      aspect-ratio: 1 / 1;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid transparent;
      background: #fff;
      cursor: pointer;
      padding: 0;
    }
    .thumb img {
      width: 100%; height: 100%; object-fit: cover;
      display: block;
    }
    .thumb.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(79,70,229,.12);
    }
    .thumb:hover:not(.active) { border-color: var(--color-border); }

    .info { display: flex; flex-direction: column; gap: 20px; }
    .category {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .12em;
      color: var(--color-primary);
      font-weight: 600;
    }
    .price-row {
      display: flex; align-items: center; gap: 14px;
    }

    .request-card {
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .request-card h4 { font-size: 15px; }
    .request-card .fine { font-size: 12px; color: var(--color-muted); }
    .request-result {
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      background: #ecfdf5;
      color: #065f46;
      font-size: 14px;
      border: 1px solid #a7f3d0;
    }
    .request-result.error {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }

    .countdown {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: var(--radius-sm);
      background: #eef2ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }
    .countdown.accepted {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .countdown.denied,
    .countdown.expired {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }
    .countdown .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; opacity: .85; }
    .countdown .sub   { font-size: 13px; margin-top: 2px; opacity: .9; }
    .countdown .time  {
      font-variant-numeric: tabular-nums;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -.02em;
    }
    .countdown .progress {
      grid-column: 1 / -1;
      height: 4px;
      background: rgba(0,0,0,.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .countdown .progress > i {
      display: block;
      height: 100%;
      width: 0%;
      background: currentColor;
      border-radius: 999px;
      transition: width 1s linear;
      opacity: .75;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(0,0,0,.04);
    }
    .status-pill.pending  { background: #e0e7ff; color: #3730a3; }
    .status-pill.accepted { background: #d1fae5; color: #065f46; }
    .status-pill.denied   { background: #fee2e2; color: #991b1b; }
    .status-pill.expired  { background: #fee2e2; color: #991b1b; }

    .meta-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 8px;
    }
    .meta {
      padding: 14px;
      background: #fafafa;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
    .meta dt { font-size: 12px; color: var(--color-muted); margin-bottom: 4px; }
    .meta dd { font-size: 14px; font-weight: 600; }

    .similar { margin-top: 72px; }
    .section-title {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 16px;
    }
    .similar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .sp {
      display: flex; flex-direction: column; gap: 10px;
      transition: transform .15s ease, box-shadow .15s ease;
      cursor: pointer;
    }
    .sp:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .sp-img {
      aspect-ratio: 1 / 1;
      overflow: hidden;
      border-bottom: 1px solid var(--color-border);
      background: #fff;
    }
    .sp-img img { width: 100%; height: 100%; object-fit: cover; }
    .sp-body { padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 4px; }
    .sp-title { font-size: 14px; font-weight: 600; line-height: 1.3; }
    .sp-brand { font-size: 12px; color: var(--color-muted); }

    @media (max-width: 960px) {
      .pdp { grid-template-columns: 1fr; gap: 28px; }
      .gallery-wrap { position: static; }
      .similar-grid { grid-template-columns: repeat(2, 1fr); }
      .thumbs { grid-template-columns: repeat(5, 1fr); }
    }
    @media (max-width: 520px) {
      .meta-row { grid-template-columns: 1fr; }
      .gallery .arrow { width: 36px; height: 36px; font-size: 16px; }
    }

    /* ============ HELD RESERVATION BANNER ============ */
    .held-banner {
      border-radius: 18px;
      padding: 18px 20px;
      display: grid;
      gap: 14px;
      background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%);
      color: #fff;
      box-shadow: 0 10px 28px -14px rgba(109,40,217,0.55);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .held-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .held-title {
      display: inline-flex; align-items: center; gap: 10px;
      font-size: 17px; font-weight: 800; letter-spacing: -0.01em;
    }
    .held-title .dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34,197,94,0.25);
      animation: liveBlink 2s ease-in-out infinite;
    }
    @keyframes liveBlink {
      0%,100% { opacity: 1; }
      50%     { opacity: 0.45; }
    }
    .held-sub {
      margin: 0;
      font-size: 13px; color: rgba(255,255,255,0.82);
      line-height: 1.5;
      max-width: 560px;
    }
    .held-timer-wrap {
      display: grid;
      gap: 10px;
      background: rgba(0,0,0,0.18);
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .held-timer-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
      font-size: 12px; color: rgba(255,255,255,0.75);
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .held-timer {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 34px; font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1;
    }
    .held-timer.soon { color: #fecaca; animation: heldShake 1.2s ease-in-out infinite; }
    @keyframes heldShake {
      0%,100% { transform: translateX(0); }
      25%     { transform: translateX(-1px); }
      75%     { transform: translateX(1px); }
    }
    .held-bar {
      height: 6px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden;
    }
    .held-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399 0%, #fbbf24 60%, #f87171 100%);
      border-radius: 999px;
      transition: width .3s ease;
    }
    .held-actions {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .btn-ghost-light {
      background: rgba(255,255,255,0.08);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.18);
      padding: 10px 16px; border-radius: 999px;
      font-size: 13px; font-weight: 700;
      cursor: pointer;
      transition: background .15s ease;
    }
    .btn-ghost-light:hover { background: rgba(255,255,255,0.14); }
    .btn-ghost-light[disabled] { opacity: .55; cursor: not-allowed; }
    .btn-primary-checkout {
      background: #fff;
      color: #4c1d95;
      border: 1px solid #fff;
      padding: 10px 18px; border-radius: 999px;
      font-size: 13px; font-weight: 800;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
      box-shadow: 0 10px 20px -14px rgba(0,0,0,0.35);
    }
    .btn-primary-checkout:hover { transform: translateY(-1px); box-shadow: 0 14px 24px -14px rgba(0,0,0,0.45); }
    .btn-primary-checkout[disabled] { opacity: .55; cursor: not-allowed; }
    .cancel-btn-danger {
      background: transparent;
      color: #fecaca;
      border: 1px solid rgba(254,202,202,0.35);
      padding: 10px 16px; border-radius: 999px;
      font-size: 13px; font-weight: 700;
      cursor: pointer;
    }
    .cancel-btn-danger:hover { background: rgba(254,202,202,0.1); color: #fff; border-color: rgba(254,202,202,0.55); }
    .cancel-btn-danger[disabled] { opacity: .55; cursor: not-allowed; }
  `],
  template: `
    <a routerLink="/" class="back-link">← Back to home</a>

    @if (loading()) {
      <p class="muted">Loading product…</p>
    } @else if (errorMsg()) {
      <p class="muted">{{ errorMsg() }}</p>
      <a routerLink="/" class="btn btn-outline" style="margin-top: 16px;">Return home</a>
    } @else if (product()) {
      <article class="pdp">
        <div class="gallery-wrap">
          <div class="gallery">
            @for (src of galleryImages(); track src; let idx = $index) {
              <img
                class="slide"
                [class.active]="idx === activeSlide()"
                [src]="src"
                [alt]="product()!.title + ' — view ' + (idx + 1)"
                loading="eager" />
            }

            <button
              class="arrow prev"
              type="button"
              aria-label="Previous image"
              (click)="prevSlide()"
              [disabled]="galleryImages().length < 2">
              ‹
            </button>
            <button
              class="arrow next"
              type="button"
              aria-label="Next image"
              (click)="nextSlide()"
              [disabled]="galleryImages().length < 2">
              ›
            </button>

            @if (galleryImages().length > 1) {
              <div class="dots" aria-hidden="true">
                @for (src of galleryImages(); track src; let idx = $index) {
                  <i
                    [class.active]="idx === activeSlide()"
                    (click)="activeSlide.set(idx)"></i>
                }
              </div>
            }
          </div>

          @if (galleryImages().length > 1) {
            <div class="thumbs" role="tablist" aria-label="Product images">
              @for (src of galleryImages(); track src; let idx = $index) {
                <button
                  type="button"
                  role="tab"
                  class="thumb"
                  [class.active]="idx === activeSlide()"
                  [attr.aria-selected]="idx === activeSlide()"
                  [attr.aria-label]="'Show image ' + (idx + 1)"
                  (click)="activeSlide.set(idx)">
                  <img [src]="src" [alt]="product()!.title + ' thumbnail ' + (idx + 1)" loading="lazy" />
                </button>
              }
            </div>
          }
        </div>

        <div class="info">
          <div>
            <span class="category">{{ product()!.category || 'Featured' }}</span>
            <h1 style="margin-top: 8px; margin-bottom: 6px;">{{ product()!.title }}</h1>
            @if (product()!.brand) { <p class="muted" style="font-size:14px;">by {{ product()!.brand }}</p> }
          </div>

          <div class="price-row">
            <span class="price">{{ formattedPrice() }}</span>
            <span class="badge badge-in-stock" *ngIf="product()!.inStock">In stock</span>
            <span class="badge badge-out-stock" *ngIf="!product()!.inStock">Low stock</span>
          </div>

          <div class="card request-card">
            @if (reservationStatus() !== 'idle') {
              <div class="countdown" [class.accepted]="reservationStatus() === 'accepted'"
                                   [class.denied]="reservationStatus() === 'denied'"
                                   [class.expired]="reservationStatus() === 'expired'">
                <div>
                  <div class="label">
                    @switch (reservationStatus()) {
                      @case ('pending')  { Please wait }
                      @case ('accepted') { Reserved }
                      @case ('denied')   { Not available }
                      @case ('expired')  { Request expired }
                    }
                  </div>
                  <div class="sub">
                    @switch (reservationStatus()) {
                      @case ('pending')  { Confirming availability for you. }
                      @case ('accepted') { Ready for pickup. }
                      @case ('denied')   { Please try again later. }
                      @case ('expired')  { Please try again later. }
                    }
                  </div>
                </div>
                <div class="time">{{ formattedCountdown() }}</div>
                <div class="progress" aria-hidden="true">
                  <i [style.width.%]="countdownProgressPct()"></i>
                </div>
              </div>
            }

            @if (requestResult() && reservationStatus() === 'idle') {
              <div class="request-result" [class.error]="!requestResult()!.ok">
                {{ requestResult()!.message }}
              </div>
            }

            @if (reservationStatus() === 'accepted' && reservation()) {
              <div class="held-banner" role="status" aria-live="polite">
                <div class="held-head">
                  <div style="display: grid; gap: 6px;">
                    <div class="held-title">
                      <span class="dot"></span>
                      Held · Waiting for store confirmation
                    </div>
                    <p class="held-sub">
                      We've reserved this item for 15 minutes. The store is confirming they have it ready — once they mark it
                      available you can complete checkout. If you change your mind you can release the hold below.
                    </p>
                  </div>
                </div>

                <div class="held-timer-wrap">
                  <div class="held-timer-head">
                    <span>⏱ Hold time remaining</span>
                    <span>{{ countdownMinutesLeft() }} min left</span>
                  </div>
                  <div class="held-timer" [class.soon]="currentSecondsLeftPublic() > 0 && currentSecondsLeftPublic() < 180">
                    {{ formattedCountdown() }}
                  </div>
                  <div class="held-bar" aria-hidden="true">
                    <div class="held-bar-fill" [style.width.%]="100 - countdownProgressPct()"></div>
                  </div>
                </div>

                <div class="held-actions">
                  <button class="btn-primary-checkout"
                          type="button"
                          (click)="goToCheckout()"
                          [disabled]="requesting()">
                    💳 Continue to checkout
                  </button>
                  <button class="cancel-btn-danger"
                          type="button"
                          (click)="onCancelHold()"
                          [disabled]="cancelling() || requesting()">
                    @if (cancelling()) { Releasing… }
                    @else { ✗ Cancel hold }
                  </button>
                </div>
              </div>
            } @else {
              <button
                class="btn btn-primary btn-block"
                (click)="onRequestNow()"
                [disabled]="requesting() || reservationStatus() === 'pending'">
                @if (reservationStatus() === 'pending')  { Waiting… }
                @if (reservationStatus() === 'accepted') { Reserved ✓ }
                @if (reservationStatus() === 'denied' || reservationStatus() === 'expired') { Try again }
                @if (reservationStatus() === 'idle') {
                  {{ requesting() ? 'Reserving…' : 'Request Now' }}
                }
              </button>
            }
          </div>

          <dl class="meta-row">
            <div class="meta">
              <dt>Pickup window</dt>
              <dd>15 minute hold</dd>
            </div>
            <div class="meta">
              <dt>Returns</dt>
              <dd>14 days · in-store only</dd>
            </div>
          </dl>
        </div>
      </article>

      @if (similarProducts().length > 0) {
        <section class="similar">
          <div class="section-title">
            <h2>You may also like</h2>
            <a class="muted" style="font-size: 14px;">4 similar items nearby</a>
          </div>

          <div class="similar-grid">
            @for (sp of similarProducts(); track sp.id) {
              <a
                class="card sp"
                [routerLink]="['/p', sp.id]"
                (click)="$event.preventDefault(); navigateTo(sp.id)">
                <div class="sp-img">
                  <img [src]="sp.primaryImageUrl" [alt]="sp.title" loading="lazy" />
                </div>
                <div class="sp-body">
                  <span class="sp-brand">{{ sp.brand || sp.category || 'Local store' }}</span>
                  <span class="sp-title">{{ sp.title }}</span>
                  <span class="price-small">{{ products.formatPrice(sp.retailPriceCents, sp.currency) }}</span>
                </div>
              </a>
            }
          </div>
        </section>
      }
    }
  `,
})
export class ProductDetailPageComponent implements OnInit, OnDestroy {
  static readonly COUNTDOWN_SECONDS = 15 * 60;

  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly product = signal<Product | null>(null);
  readonly similarProducts = signal<Product[]>([]);
  readonly requesting = signal(false);
  readonly cancelling = signal(false);
  readonly requestResult = signal<{ ok: boolean; message: string } | null>(null);
  readonly activeSlide = signal(0);
  readonly reservationStatus = signal<ReservationStatus>('idle');
  readonly deadlineMs = signal<number>(0);
  readonly reservation = signal<any>(null);
  private readonly tick = signal(0);

  private countdownTimer: number | null = null;

  readonly formattedPrice = computed(() => {
    const p = this.product();
    return p ? this.products.formatPrice(p.retailPriceCents, p.currency) : '';
  });

  readonly galleryImages = computed<string[]>(() => {
    const p = this.product();
    if (!p) return [];
    if (p.galleryImages && p.galleryImages.length > 0) return p.galleryImages;
    if (p.primaryImageUrl) return [p.primaryImageUrl];
    return [];
  });

  readonly formattedCountdown = computed(() => {
    this.tick(); // <-- signal dep: forces re-run each tick bump
    const s = this.currentSecondsRemaining();
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  });

  readonly countdownProgressPct = computed(() => {
    this.tick(); // <-- signal dep
    const total = ProductDetailPageComponent.COUNTDOWN_SECONDS;
    const remaining = Math.max(0, Math.min(total, this.currentSecondsRemaining()));
    return 100 - (remaining / total) * 100;
  });

  private currentSecondsRemaining(): number {
    const deadline = this.deadlineMs();
    if (!deadline) return ProductDetailPageComponent.COUNTDOWN_SECONDS;
    const diffMs = deadline - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  currentSecondsLeftPublic(): number {
    return this.currentSecondsRemaining();
  }

  countdownMinutesLeft(): number {
    return Math.floor(this.currentSecondsRemaining() / 60);
  }

  constructor(
    readonly products: ProductService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('productId');
    if (!id) {
      this.loading.set(false);
      this.errorMsg.set('No product was selected.');
      return;
    }
    this.loadProduct(id);
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  @HostListener('document:keydown.arrowleft', ['$event'])
  onLeftKey(e: KeyboardEvent) {
    if (this.isTypingTarget(e)) return;
    this.prevSlide();
  }
  @HostListener('document:keydown.arrowright', ['$event'])
  onRightKey(e: KeyboardEvent) {
    if (this.isTypingTarget(e)) return;
    this.nextSlide();
  }

  prevSlide(): void {
    const n = this.galleryImages().length;
    if (n < 2) return;
    const curr = this.activeSlide();
    this.activeSlide.set(curr === 0 ? n - 1 : curr - 1);
  }
  nextSlide(): void {
    const n = this.galleryImages().length;
    if (n < 2) return;
    const curr = this.activeSlide();
    this.activeSlide.set(curr === n - 1 ? 0 : curr + 1);
  }

  private isTypingTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
  }

  private async loadProduct(productId: string) {
    this.loading.set(true);
    this.activeSlide.set(0);
    this.clearCountdown();
    this.reservationStatus.set('idle');
    try {
      const { product, similar }: SimilarProductsResult =
        await this.products.getWithSimilar(productId);
      this.product.set(product);
      this.similarProducts.set(similar);
    } catch (err) {
      this.errorMsg.set('This product could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  async onRequestNow(): Promise<void> {
    const p = this.product();
    if (!p) return;

    if (this.reservationStatus() === 'pending') return;
    if (this.reservationStatus() === 'accepted') return;
    if (this.reservationStatus() === 'denied' || this.reservationStatus() === 'expired') {
      this.reservationStatus.set('idle');
      this.requestResult.set(null);
      this.reservation.set(null);
    }

    this.requesting.set(true);
    this.requestResult.set(null);
    try {
      const result = await this.products.createReservation({
        productId: p.id,
        variantId: p.variantId ?? null,
        originatingStoreId: p.storeId ?? '3c4e5dad-7cf2-4f5b-a617-ff0adaa04d44',
        radiusKm: 5,
        countdownSeconds: 900,
      });
      this.reservation.set(result);

      if (result.accepted === false) {
        this.reservationStatus.set('denied');
        this.clearCountdown();
        this.deadlineMs.set(Date.now() - 1000);
        this.requestResult.set({
          ok: false,
          message: result.message ?? 'This item is not available right now. Please try again later.',
        });
      } else {
        this.requestResult.set({
          ok: true,
          message: result.message ?? 'Item held for you — proceed to checkout.',
        });
        this.startCountdown(result);
      }
    } catch (err: any) {
      const msg = (err && typeof err === 'object' && 'message' in err)
        ? String((err as any).message)
        : 'We could not reserve the item right now. Please try again in a moment.';
      this.reservationStatus.set('denied');
      this.clearCountdown();
      this.deadlineMs.set(Date.now() - 1000);
      this.requestResult.set({
        ok: false,
        message: msg,
      });
    } finally {
      this.requesting.set(false);
    }
  }

  private startCountdown(reservationResult: any): void {
    this.clearCountdown();
    const total = ProductDetailPageComponent.COUNTDOWN_SECONDS;
    // Prefer server-side expiresAt epoch (ISO string or millis) when available; fall back to local clock.
    let deadline = 0;
    const iso: string | undefined | null = reservationResult?.expiresAt ?? reservationResult?.lock?.expiresAt;
    if (iso && typeof iso === 'string') {
      const t = new Date(iso).getTime();
      if (t && !Number.isNaN(t)) deadline = t;
    } else if (reservationResult?.deadlineMs && typeof reservationResult.deadlineMs === 'number') {
      deadline = reservationResult.deadlineMs;
    } else if (reservationResult?.countdownSeconds && typeof reservationResult.countdownSeconds === 'number') {
      deadline = Date.now() + Math.floor(reservationResult.countdownSeconds * 1000);
    }
    if (!deadline || deadline <= Date.now()) {
      deadline = Date.now() + total * 1000;
    }
    this.deadlineMs.set(deadline);
    this.reservationStatus.set('pending');

    window.setTimeout(() => {
      if (this.reservationStatus() === 'pending') {
        this.reservationStatus.set('accepted');
        this.tick.update((t) => t + 1);
      }
    }, 1500);

    this.countdownTimer = window.setInterval(() => {
      this.tick.update((t) => t + 1);
      const remaining = this.currentSecondsRemaining();
      if (remaining <= 0) {
        if (this.reservationStatus() === 'pending' || this.reservationStatus() === 'accepted') {
          this.reservationStatus.set('expired');
        }
        this.clearCountdown();
      }
    }, 250);
  }

  goToCheckout(): void {
    const reservationResult = this.reservation();
    if (!reservationResult) return;
    this.clearCountdown();
    const state = {
      transactionId: reservationResult.transactionId,
      qrSecureToken: reservationResult.qrSecureToken,
      qrFallbackCode: reservationResult.qrFallbackCode,
      reservation: structuredClone(reservationResult),
    };
    const extras = { state, replaceUrl: false };
    try { this.router.navigate(['/checkout'], extras); return; } catch { /* fallthrough */ }
    this.tick.update((t) => t + 1);
  }

  async onCancelHold(): Promise<void> {
    if (this.cancelling()) return;
    const reservationResult = this.reservation();
    const txId: string | undefined = reservationResult?.transactionId;
    if (!txId) return;
    this.cancelling.set(true);
    try {
      const api = this.auth.resolveApiBasePublic();
      const url = `${api}/reservations/${encodeURIComponent(txId)}/cancel`;
      const res: any = await firstValueFrom(this.http.post(url, {})).catch((e: any) => e?.error ?? null);
      this.clearCountdown();
      this.deadlineMs.set(Date.now() - 1000);
      this.reservationStatus.set('idle');
      this.reservation.set(null);
      this.requestResult.set({
        ok: true,
        message: (res?.status ? `Hold released (${String(res.status).toLowerCase()}). ` : '') +
          'The item is available for other customers.',
      });
    } catch (e: any) {
      this.requestResult.set({
        ok: false,
        message: e?.error?.message ?? e?.message ?? 'Failed to release hold. It will auto-expire.',
      });
    } finally {
      this.cancelling.set(false);
    }
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  navigateTo(id: string): void {
    this.requestResult.set(null);
    this.reservationStatus.set('idle');
    this.clearCountdown();
    this.router.navigate(['/p', id]).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
