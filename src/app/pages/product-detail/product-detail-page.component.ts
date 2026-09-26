import { ChangeDetectorRef, Component, computed, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, ProductVariant, SimilarProductsResult } from '../../shared/models/product.model';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

type ReservationStatus = 'idle' | 'pending' | 'requested' | 'reserved' | 'accepted' | 'denied' | 'expired';

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
    .countdown.requested {
      background: #fffbeb;
      color: #92400e;
      border-color: #fde68a;
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
    .status-pill.pending   { background: #e0e7ff; color: #3730a3; }
    .status-pill.requested { background: #fef3c7; color: #92400e; }
    .status-pill.accepted  { background: #d1fae5; color: #065f46; }
    .status-pill.denied    { background: #fee2e2; color: #991b1b; }
    .status-pill.expired   { background: #fee2e2; color: #991b1b; }

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
    .held-banner.ready {
      background: linear-gradient(135deg, #047857 0%, #065f46 100%);
      box-shadow: 0 12px 28px -14px rgba(6,95,70,0.55);
      border-color: rgba(255,255,255,0.12);
    }
    .held-banner.requested {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      box-shadow: 0 12px 28px -14px rgba(180,83,9,0.55);
      border-color: rgba(255,255,255,0.12);
    }
    .held-banner.reserved {
      background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
      box-shadow: 0 12px 28px -14px rgba(146,64,14,0.55);
      border-color: rgba(255,255,255,0.12);
    }
    .held-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .held-title {
      display: inline-flex; align-items: center; gap: 10px;
      font-size: 17px; font-weight: 800; letter-spacing: -0.01em;
    }
    .held-title.ready-label {
      font-size: 18px;
    }
    .held-title.reserved-label {
      font-size: 18px;
    }
    .held-title .dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34,197,94,0.25);
      animation: liveBlink 2s ease-in-out infinite;
    }
    .held-title .dot.ready {
      background: #fff;
      box-shadow: 0 0 0 4px rgba(255,255,255,0.3);
      animation: none;
    }
    .held-title .dot.requested {
      background: #fbbf24;
      box-shadow: 0 0 0 4px rgba(251,191,36,0.3);
      animation: liveBlink 1.1s ease-in-out infinite;
    }
    .held-title .dot.reserved {
      background: #fde047;
      box-shadow: 0 0 0 4px rgba(253,224,71,0.3);
      animation: liveBlink 1.3s ease-in-out infinite;
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
    .btn-primary-checkout.success {
      background: linear-gradient(135deg, #fde68a 0%, #fbbf24 100%);
      color: #7c2d12;
      border-color: #fff;
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

    .store-scan-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(79,110,247,0.10), rgba(129,140,248,0.05));
      border: 1px solid rgba(99,102,241,0.25);
      margin-bottom: 18px;
    }
    .store-scan-ico { font-size: 20px; line-height: 1.2; }
    .store-scan-text { flex: 1; display: grid; gap: 2px; }
    .store-scan-title { font-size: 14px; font-weight: 700; color: #1e1b4b; }
    .store-scan-sub { font-size: 12.5px; color: #4b5563; line-height: 1.5; }
    .store-scan-sub .mono { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #4338ca; }

    .swatches-wrap { display:grid; gap:10px; }
    .swatch-row { display:flex; flex-wrap:wrap; gap:10px; }
    .swatch {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 10px 14px;
      border-radius: 12px;
      background: #fff;
      border: 2px solid var(--color-border);
      color: #111827;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .15s ease, transform .1s ease, box-shadow .15s ease;
      min-width: 110px;
      text-align: left;
    }
    .swatch:hover:not([disabled]):not(.selected) {
      border-color: #c7d2fe;
      transform: translateY(-1px);
    }
    .swatch.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(79,70,229,.12);
    }
    .swatch[disabled] {
      opacity: .55;
      cursor: not-allowed;
      background: #f9fafb;
    }
    .swatch .sw-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .swatch .sw-check {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #fff;
      font-size: 10px;
      line-height: 14px;
      text-align: center;
    }
    .swatch .sw-price {
      font-size: 12px;
      color: var(--color-muted);
      font-weight: 600;
    }
    .swatch .sw-stock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .swatch .sw-stock.in {
      background: #d1fae5;
      color: #065f46;
    }
    .swatch .sw-stock.out {
      background: #f3f4f6;
      color: #6b7280;
    }
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
          @if (scannedStoreId() || scannedStoreGateway()) {
            <div class="store-scan-banner" *ngIf="!loading()">
              <div class="store-scan-ico">🏬</div>
              <div class="store-scan-text">
                <div class="store-scan-title">Shopping from partner location</div>
                <div class="store-scan-sub">
                  Your request will notify our network location for fulfillment.
                </div>
              </div>
            </div>
          }

          <div>
            <span class="category">{{ product()!.category || 'Featured' }}</span>
            <h1 style="margin-top: 8px; margin-bottom: 6px;">{{ product()!.title }}</h1>
            @if (product()!.brand) { <p class="muted" style="font-size:14px;">by {{ product()!.brand }}</p> }
          </div>

          <div class="price-row">
            <span class="price">{{ formattedPrice() }}</span>
            @if (hasVariants()) {
              @if (chosenVariantStock() > 0) {
                <span class="badge badge-in-stock">In stock ({{ chosenVariantStock() }})</span>
              } @else if (chosenVariantStock() === 0) {
                <span class="badge badge-out-stock">Sold out</span>
              } @else {
                @if (hasAnyVariantInStock()) {
                  <span class="badge badge-in-stock">In stock</span>
                } @else {
                  <span class="badge badge-out-stock">NOT AVAILABLE</span>
                }
              }
            } @else {
              <span class="badge badge-in-stock" *ngIf="product()!.inStock">In stock</span>
              <span class="badge badge-out-stock" *ngIf="!product()!.inStock">Low stock</span>
            }
          </div>

          @if (hasVariants()) {
            <div class="swatches-wrap">
              <div style="font-size: 13px; font-weight: 600; color: var(--color-muted);">
                Select size / variant
              </div>
              <div class="swatch-row" role="radiogroup" aria-label="Product variants">
                @for (v of product()!.variants; track v.id) {
                  <button
                    type="button"
                    role="radio"
                    class="swatch"
                    [class.selected]="v.id === selectedVariantId()"
                    [attr.aria-checked]="v.id === selectedVariantId()"
                    [disabled]="variantSoldOut(v)"
                    (click)="selectedVariantId.set(v.id)">
                    <span class="sw-label">
                      @if (v.id === selectedVariantId()) {
                        <span class="sw-check">✓</span>
                      }
                      @if (v.variantAttributes && v.variantAttributes['size']) {
                        Size {{ v.variantAttributes['size'] }}
                      } @else if (v.variantAttributes && v.variantAttributes['color']) {
                        {{ v.variantAttributes['color'] }}
                      } @else {
                        {{ v.sku.length > 10 ? v.sku.slice(v.sku.length - 8) : v.sku }}
                      }
                    </span>
                    <span class="sw-price">
                      {{ products.formatPrice(variantDisplayPriceCents(v), product()!.currency) }}
                    </span>
                    @if (variantHasStock(v)) {
                      <span class="sw-stock in">In stock ({{ v.stockQuantity }})</span>
                    } @else {
                      <span class="sw-stock out">Sold out</span>
                    }
                  </button>
                }
              </div>
            </div>
          }

          <div class="card request-card">
            @if (reservationStatus() === 'pending' || reservationStatus() === 'requested' || reservationStatus() === 'reserved'
                 || reservationStatus() === 'denied' || reservationStatus() === 'expired') {
              <div class="countdown" [class.accepted]="false"
                                   [class.requested]="reservationStatus() === 'requested'"
                                   [class.denied]="reservationStatus() === 'denied'"
                                   [class.expired]="reservationStatus() === 'expired'">
                <div>
                  <div class="label">
                    @switch (reservationStatus()) {
                      @case ('pending')   { Please wait }
                      @case ('requested') { Awaiting seller confirmation }
                      @case ('reserved')  { Awaiting store confirmation }
                      @case ('denied')    { Not available }
                      @case ('expired')   { Request expired }
                    }
                  </div>
                  <div class="sub">
                    @switch (reservationStatus()) {
                      @case ('pending')   { Confirming availability for you. }
                      @case ('requested') { The fulfilling store has been notified and will confirm availability shortly. This can take a few minutes. }
                      @case ('reserved')  { Hold placed — waiting for store to confirm. This usually takes less than 2 minutes. }
                      @case ('denied')    { Please try again later. }
                      @case ('expired')   { Please try again later. }
                    }
                  </div>
                </div>
                <div class="time">{{ formattedCountdown() }}</div>
                <div class="progress" aria-hidden="true">
                  <i [style.width.%]="countdownProgressPct()"></i>
                </div>
              </div>
            }

            @if (chosenVariantStock() === 0 && reservationStatus() === 'idle' && !requestResult()) {
              <div class="request-result error">
                This size is currently sold out; please pick another above.
              </div>
            }

            @if (requestResult() && reservationStatus() === 'idle') {
              <div class="request-result" [class.error]="!requestResult()!.ok">
                @if (chosenVariantStock() === 0 && !requestResult()!.ok) {
                  This size is currently sold out; please pick another above.
                } @else {
                  {{ requestResult()!.message }}
                }
              </div>
            }

            @if (reservationStatus() === 'requested' && reservation()) {
              <div class="held-banner requested" role="status" aria-live="polite">
                <div class="held-head">
                  <div style="display: grid; gap: 6px;">
                    <div class="held-title requested-label">
                      <span class="dot requested"></span>
                      Awaiting seller confirmation
                    </div>
                    <p class="held-sub">
                      📣 The fulfilling store has been notified of your request.
                      Store staff must confirm item availability before a hold is placed.
                      This page will update automatically — please stay connected.
                    </p>
                  </div>
                </div>

                <div class="held-timer-wrap">
                  <div class="held-timer-head">
                    <span>⏳ Waiting for seller (expires soon)</span>
                    <span>{{ countdownMinutesLeft() }} min left</span>
                  </div>
                  <div class="held-timer" [class.soon]="currentSecondsLeftPublic() > 0 && currentSecondsLeftPublic() < 180">
                    {{ formattedCountdown() }}
                  </div>
                  <div class="held-bar" aria-hidden="true">
                    <div class="held-bar-fill reserved-bar" [style.width.%]="100 - countdownProgressPct()"></div>
                  </div>
                </div>

                <div class="held-actions">
                  <button class="cancel-btn-danger"
                          type="button"
                          (click)="onCancelHold()"
                          [disabled]="cancelling() || requesting()">
                    @if (cancelling()) { Cancelling… }
                    @else { ✗ Cancel request }
                  </button>
                </div>
              </div>
            }

            @if (reservationStatus() === 'reserved' && reservation()) {
              <div class="held-banner reserved" role="status" aria-live="polite">
                <div class="held-head">
                  <div style="display: grid; gap: 6px;">
                    <div class="held-title reserved-label">
                      <span class="dot reserved"></span>
                      Awaiting store confirmation
                    </div>
                    <p class="held-sub">
                      🔔 Your 15-minute hold is in place. Store staff will confirm availability shortly.
                      You will see "Ready for checkout" here once confirmed.
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
                    <div class="held-bar-fill reserved-bar" [style.width.%]="100 - countdownProgressPct()"></div>
                  </div>
                </div>

                <div class="held-actions">
                  <button class="cancel-btn-danger"
                          type="button"
                          (click)="onCancelHold()"
                          [disabled]="cancelling() || requesting()">
                    @if (cancelling()) { Releasing… }
                    @else { ✗ Cancel hold }
                  </button>
                </div>
              </div>
            }

            @if (reservationStatus() === 'accepted' && reservation()) {
              <div class="held-banner ready" role="status" aria-live="polite">
                <div class="held-head">
                  <div style="display: grid; gap: 6px;">
                    <div class="held-title ready-label">
                      <span class="dot ready"></span>
                      Ready for checkout
                    </div>
                    <p class="held-sub">
                      🎉 The store confirmed this item is available. Please complete checkout within the hold time to secure it for pickup.
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
                  <button class="btn-primary-checkout success"
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
            } @else if (reservationStatus() !== 'requested' && reservationStatus() !== 'reserved' && reservationStatus() !== 'accepted') {
              <button
                class="btn btn-primary btn-block"
                (click)="onRequestNow()"
                [disabled]="requesting() || reservationStatus() === 'pending' || chosenVariantStock() === 0">
                @if (reservationStatus() === 'pending')  { Waiting… }
                @if (reservationStatus() === 'requested') { Awaiting confirmation }
                @if (reservationStatus() === 'accepted') { Reserved ✓ }
                @if (reservationStatus() === 'denied' || reservationStatus() === 'expired') { Try again }
                @if (reservationStatus() === 'idle') {
                  @if (chosenVariantStock() === 0) { Sold out — pick another size }
                  @else if (requesting()) { Reserving… }
                  @else { Request Now }
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
                [queryParams]="hostQueryParams()"
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
  readonly selectedVariantId = signal<string | null>(null);

  readonly scannedStoreId = signal<string | null>(null);
  readonly scannedStoreName = signal<string | null>(null);
  readonly scannedStoreGateway = signal<string | null>(null);
  readonly hostQueryParams = computed(() => {
    const params: Record<string, string> = {};
    if (this.scannedStoreGateway() && /^\d{8}$/.test(this.scannedStoreGateway()!)) {
      params['gateway'] = this.scannedStoreGateway()!;
    } else if (this.scannedStoreId() && /^[0-9a-fA-F-]{20,}$/.test(this.scannedStoreId()!)) {
      params['storeId'] = this.scannedStoreId()!;
    } else {
      const cachedHost = this.products.getBrowsingHostStore();
      if (cachedHost?.gatewayCode && /^\d{8}$/.test(cachedHost.gatewayCode)) {
        params['gateway'] = cachedHost.gatewayCode;
      } else if (cachedHost?.storeId && /^[0-9a-fA-F-]{20,}$/.test(cachedHost.storeId)) {
        params['storeId'] = cachedHost.storeId;
      }
    }
    return Object.keys(params).length > 0 ? params : null;
  });
  private storeResolvedPromise: Promise<string | null> | null = null;

  private countdownTimer: number | null = null;
  private reservationPollTimer: number | null = null;
  private static readonly RESERVATION_POLL_MS = 1200;
  private static readonly RESERVATION_POLL_MAX_SECONDS = 25;

  readonly currentVariant = computed<ProductVariant | null>(() => {
    const p = this.product();
    const svid = this.selectedVariantId();
    if (!p || !p.variants || !svid) return null;
    return p.variants.find((v) => v.id === svid) ?? null;
  });

  readonly hasAnyVariantInStock = computed(() => {
    const p = this.product();
    return !!p?.variants?.some((v) => Number(v.stockQuantity) > 0);
  });

  readonly chosenPriceCents = computed(() => {
    const v = this.currentVariant();
    const ownerStoreId = v?.storeId ?? this.product()?.storeId ?? null;
    const browsingHostOrigin = this.browsingOriginStoreId();
    const scannedTokenOwner = this.scannedStoreId();
    const retail = v ? v.retailPriceCents : (this.product()?.retailPriceCents ?? 0);
    const wholesale = v ? (v.wholesalePriceCents ?? 0) : (this.product()?.wholesalePriceCents ?? 0);
    const qp = this.route.snapshot.queryParamMap;
    const anyScanParam = !!scannedTokenOwner || !!qp.get('gateway') || !!qp.get('gatewayCode') || !!qp.get('token') || !!qp.get('storeId') || !!qp.get('store');
    const hasCrossHost = !!(browsingHostOrigin && ownerStoreId && browsingHostOrigin !== ownerStoreId);
    const crossStore = anyScanParam || hasCrossHost;
    if (crossStore) {
      return Math.max(retail, retail + Math.max(0, wholesale));
    }
    return retail;
  });

  readonly browsingOriginStoreId = computed<string | null>(() => {
    const cached = this.products.getBrowsingHostStore();
    if (cached?.storeId) return cached.storeId;
    const p = this.product();
    if (p?.storeId) return p.storeId;
    if (p?.variants && p.variants.length > 0) {
      const f = p.variants.find(v => typeof v.storeId === 'string' && v.storeId.length > 0);
      if (f?.storeId) return f.storeId;
    }
    return null;
  });

  readonly chosenVariantStock = computed(() => {
    const v = this.currentVariant();
    return v ? Number(v.stockQuantity) : -1;
  });

  readonly formattedPrice = computed(() => {
    const p = this.product();
    return p ? this.products.formatPrice(this.chosenPriceCents(), p.currency) : '';
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

  hasVariants(): boolean {
    const p = this.product();
    const arr = p ? p['variants'] : undefined;
    return Array.isArray(arr) && arr.length > 0;
  }

  variantStockNum(v: unknown): number {
    const vAny = v as Record<string, unknown>;
    const sq = vAny?.['stockQuantity'];
    if (typeof sq === 'number') return sq;
    if (typeof sq === 'string') { const n = Number(sq); return isNaN(n) ? -1 : n; }
    return -1;
  }

  variantSoldOut(v: unknown): boolean { return this.variantStockNum(v) === 0; }
  variantHasStock(v: unknown): boolean { return this.variantStockNum(v) > 0; }
  variantDisplayPriceCents(v: { retailPriceCents?: number; wholesalePriceCents?: number; storeId?: string }): number {
    const ownerStoreId = v.storeId ?? this.product()?.storeId ?? null;
    const browsingHostOrigin = this.browsingOriginStoreId();
    const scannedTokenOwner = this.scannedStoreId();
    const retail = Number(v.retailPriceCents ?? 0);
    const wholesale = Number(v.wholesalePriceCents ?? 0);
    const qp = this.route.snapshot.queryParamMap;
    const anyScanParam = !!scannedTokenOwner || !!qp.get('gateway') || !!qp.get('gatewayCode') || !!qp.get('token') || !!qp.get('storeId') || !!qp.get('store');
    const hasCrossHost = !!(browsingHostOrigin && ownerStoreId && browsingHostOrigin !== ownerStoreId);
    const crossStore = anyScanParam || hasCrossHost;
    if (crossStore) {
      return Math.max(retail, retail + Math.max(0, wholesale));
    }
    return retail;
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
    // Re-hydrate browsing host store from localStorage BEFORE URL parsing, so
    // navigating to similar products (which drops query params) still preserves
    // the store context the customer scanned in via QR / gateway.
    const cachedHost = this.products.getBrowsingHostStore();
    if (cachedHost?.storeId) {
      this.scannedStoreId.set(cachedHost.storeId);
      if (cachedHost.businessName) this.scannedStoreName.set(cachedHost.businessName);
      if (cachedHost.gatewayCode) this.scannedStoreGateway.set(cachedHost.gatewayCode);
    }
    this.storeResolvedPromise = this.resolveScannedStoreFromUrl();
    void this.storeResolvedPromise.then(() => {
      this.loadProduct(id);
    });
  }

  private async resolveScannedStoreFromUrl(): Promise<string | null> {
    const qp = this.route.snapshot.queryParamMap;
    const gateway = qp.get('gateway') ?? qp.get('gatewayCode') ?? qp.get('token');
    const storeId = qp.get('storeId') ?? qp.get('store');
    const apiBase = this.auth.resolveApiBasePublic();

    if (gateway && /^\d{8}$/.test(gateway.trim())) {
      const code = gateway.trim();
      try {
        const s: any = await firstValueFrom(
          this.http.get(`${apiBase}/stores/gateway/${encodeURIComponent(code)}`),
        );
        if (s && s.id) {
          this.scannedStoreId.set(String(s.id));
          this.scannedStoreName.set(String(s.businessName || 'Store'));
          if (s.gatewayCode) this.scannedStoreGateway.set(String(s.gatewayCode));
          return String(s.id);
        }
      } catch {
        this.scannedStoreGateway.set(code);
      }
    }

    if (storeId && /^[0-9a-fA-F-]{20,}$/.test(storeId.trim())) {
      const sid = storeId.trim();
      try {
        const s: any = await firstValueFrom(
          this.http.get(`${apiBase}/stores/${encodeURIComponent(sid)}`),
        );
        if (s && s.id) {
          this.scannedStoreId.set(String(s.id));
          this.scannedStoreName.set(String(s.businessName || 'Store'));
          if (s.gatewayCode) this.scannedStoreGateway.set(String(s.gatewayCode));
          return String(s.id);
        }
      } catch {
        // ignore; fall through to cache default
      }
    }

    return this.scannedStoreId();
  }

  private async resolveOriginatingStoreId(_product: Product): Promise<string> {
    const cachedHost = this.products.getBrowsingHostStore();
    if (cachedHost?.storeId) return cachedHost.storeId;
    const variantOwnerId =
      (_product?.variants && _product.variants.length > 0
        ? _product.variants.find((v: any) => v && typeof v.storeId === 'string' && v.storeId.length > 0)?.storeId
        : undefined)
      ?? _product?.storeId
      ?? null;
    const scanned = this.scannedStoreId();
    if (scanned) return scanned;
    if (variantOwnerId) return variantOwnerId;
    if (_product?.storeId) return _product.storeId;
    const apiBase = this.auth.resolveApiBasePublic();
    try {
      const list: any[] = await firstValueFrom(this.http.get<any[]>(`${apiBase}/stores`));
      if (Array.isArray(list) && list.length > 0 && list[0]?.id) return String(list[0].id);
    } catch {
      // ignore
    }
    const fallback = 'd7e59214-5adf-4788-beb0-ffccf4ab18f9';
    return fallback;
  }

  ngOnDestroy(): void {
    this.clearCountdown();
    this.clearReservationPolling();
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
    this.clearReservationPolling();
    this.reservationStatus.set('idle');
    try {
      const { product, similar }: SimilarProductsResult =
        await this.products.getWithSimilar(productId);
      this.product.set(product);
      this.selectedVariantId.set(product.variantId ?? product.id ?? null);
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

    if (this.storeResolvedPromise) await this.storeResolvedPromise;

    if (this.reservationStatus() === 'pending') return;
    if (this.reservationStatus() === 'reserved') return;
    if (this.reservationStatus() === 'accepted') return;
    if (this.reservationStatus() === 'denied' || this.reservationStatus() === 'expired') {
      this.reservationStatus.set('idle');
      this.requestResult.set(null);
      this.reservation.set(null);
    }

    this.requesting.set(true);
    this.requestResult.set(null);
    try {
      const originatingStoreId = await this.resolveOriginatingStoreId(p);
      const result = await this.products.createReservation({
        productId: p.id,
        variantId: this.selectedVariantId() ?? p.variantId ?? null,
        originatingStoreId,
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
    this.startReservationPolling();

    this.countdownTimer = window.setInterval(() => {
      this.tick.update((t) => t + 1);
      const remaining = this.currentSecondsRemaining();
      if (remaining <= 0) {
        const cur = this.reservationStatus();
        if (cur === 'pending' || cur === 'requested' || cur === 'reserved' || cur === 'accepted') {
          this.reservationStatus.set('expired');
        }
        this.clearCountdown();
        this.clearReservationPolling();
      }
    }, 250);
  }

  private startReservationPolling(): void {
    this.clearReservationPolling();
    const txId: string | undefined = this.reservation()?.transactionId;
    if (!txId) return;

    const api = this.auth.resolveApiBasePublic();
    const url = `${api}/transactions/${encodeURIComponent(txId)}`;

    let consecutiveErrors = 0;

    const tick = async (): Promise<void> => {
      if (this.reservationPollTimer === null) return;
      const status = this.reservationStatus();
      if (status === 'accepted' || status === 'denied' || status === 'expired') return;
      try {
        const res: any = await firstValueFrom(this.http.get(url)).catch((e: any) => {
          throw e;
        });
        consecutiveErrors = 0;
        const txStatus: string | undefined = res?.status ?? res?.transactionStatus;
        if (!txStatus) {
          this.scheduleNextPoll(tick);
          return;
        }
        switch (txStatus) {
          case 'READY':
          case 'PAID':
          case 'PICKED_UP':
            this.reservationStatus.set('accepted');
            this.tick.update((t) => t + 1);
            this.clearReservationPolling();
            return;
          case 'CANCELED':
          case 'EXPIRED':
          case 'CANCELLED':
          case 'FULFILLER_REJECTED':
            this.reservationStatus.set('denied');
            this.clearCountdown();
            this.clearReservationPolling();
            this.deadlineMs.set(Date.now() - 1000);
            this.requestResult.set({
              ok: false,
              message: 'The store could not fulfill this item right now. Please try again later.',
            });
            return;
          case 'REQUESTED':
            if (this.reservationStatus() !== 'requested') {
              this.reservationStatus.set('requested');
            }
            this.tick.update((t) => t + 1);
            this.scheduleNextPoll(tick);
            return;
          case 'RESERVED':
          case 'FULFILLER_ACCEPTED':
          default:
            if (this.reservationStatus() === 'pending' || this.reservationStatus() === 'requested') this.reservationStatus.set('reserved');
            this.tick.update((t) => t + 1);
            this.scheduleNextPoll(tick);
            return;
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 10) consecutiveErrors = 10;
        this.scheduleNextPoll(tick);
        return;
      }
    };

    this.scheduleNextPoll(tick);
  }

  private scheduleNextPoll(next: () => Promise<void>): void {
    this.reservationPollTimer = window.setTimeout(() => {
      void next();
    }, ProductDetailPageComponent.RESERVATION_POLL_MS);
  }

  private clearReservationPolling(): void {
    if (this.reservationPollTimer !== null) {
      clearTimeout(this.reservationPollTimer);
      this.reservationPollTimer = null;
    }
  }

  goToCheckout(): void {
    const reservationResult = this.reservation();
    if (!reservationResult) return;
    this.clearCountdown();
    this.clearReservationPolling();
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
      this.clearReservationPolling();
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
    this.clearReservationPolling();
    const queryParams: Record<string, string> = {};
    // Persist browsing host store across internal navigation so cross-store
    // split-ledger attribution is preserved even after clicking similar products.
    if (this.scannedStoreGateway() && /^\d{8}$/.test(this.scannedStoreGateway()!)) {
      queryParams['gateway'] = this.scannedStoreGateway()!;
    } else if (this.scannedStoreId() && /^[0-9a-fA-F-]{20,}$/.test(this.scannedStoreId()!)) {
      queryParams['storeId'] = this.scannedStoreId()!;
    } else {
      const cachedHost = this.products.getBrowsingHostStore();
      if (cachedHost?.gatewayCode && /^\d{8}$/.test(cachedHost.gatewayCode)) {
        queryParams['gateway'] = cachedHost.gatewayCode;
      } else if (cachedHost?.storeId && /^[0-9a-fA-F-]{20,}$/.test(cachedHost.storeId)) {
        queryParams['storeId'] = cachedHost.storeId;
      }
    }
    const extras = Object.keys(queryParams).length > 0 ? { queryParams, replaceUrl: false } : { replaceUrl: false };
    this.router.navigate(['/p', id], extras).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
