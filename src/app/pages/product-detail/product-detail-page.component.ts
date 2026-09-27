import { ChangeDetectorRef, Component, computed, effect, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
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
    :host { display: block; }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .back-link:hover { color: #4f46e5; }

    .breadcrumb-bar {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px 24px 0;
    }

    .main-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }

    .pdp {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      align-items: start;
    }

    /* ===== Gallery ===== */
    .gallery-wrap {
      position: sticky;
      top: 88px;
    }
    .main-image-wrapper {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
      border: 1px solid #e5e7eb;
      position: relative;
      aspect-ratio: 4/3;
      cursor: zoom-in;
    }
    .main-image-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      display: block;
    }
    .main-image-wrapper:hover img {
      transform: scale(1.05);
    }
    .image-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(8px);
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      color: #374151;
      padding: 0;
      z-index: 2;
    }
    .image-nav:hover {
      background: #fff;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      transform: translateY(-50%) scale(1.05);
    }
    .image-nav:disabled { opacity: 0.45; cursor: not-allowed; transform: translateY(-50%); }
    .image-nav.prev { left: 12px; }
    .image-nav.next { right: 12px; }

    .image-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
    }
    .image-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d1d5db;
      border: none;
      cursor: pointer;
      transition: all 0.3s;
      padding: 0;
    }
    .image-dot.active {
      background: #4f46e5;
      width: 24px;
      border-radius: 4px;
    }

    .thumbnails {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .thumbnail {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #e5e7eb;
      cursor: pointer;
      transition: all 0.2s;
      background: #fff;
      padding: 0;
      flex-shrink: 0;
    }
    .thumbnail:hover {
      border-color: #d1d5db;
      transform: translateY(-2px);
    }
    .thumbnail.active {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px #eef2ff;
    }
    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ===== Info ===== */
    .info {
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .partner-banner {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .partner-icon {
      width: 40px;
      height: 40px;
      background: #fff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .partner-icon svg { flex-shrink: 0; }
    .partner-text h4 {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 2px 0;
    }
    .partner-text p {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.4;
      margin: 0;
    }

    .featured-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 4px;
    }
    .featured-badge::before {
      content: '';
      width: 16px;
      height: 2px;
      background: #4f46e5;
      border-radius: 1px;
    }

    .product-title {
      font-size: 36px;
      font-weight: 800;
      color: #111827;
      line-height: 1.15;
      margin: 4px 0 0 0;
      letter-spacing: -0.5px;
    }

    .price-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .price {
      font-size: 32px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
    }
    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #059669;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .stock-badge.out {
      background: #fef2f2;
      color: #b91c1c;
    }
    .stock-badge::before {
      content: '';
      width: 7px;
      height: 7px;
      background: currentColor;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }

    /* Variant pills (swatches styled as pill cards) */
    .swatches-wrap { display:grid; gap: 12px; margin-bottom: 4px; }
    .swatch-row { display:flex; flex-wrap:wrap; gap: 12px; }
    .swatch {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #fff;
      border: 2px solid #e5e7eb;
      color: #111827;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      min-width: 150px;
    }
    .swatch:hover:not([disabled]):not(.selected) {
      border-color: #c7d2fe;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06);
    }
    .swatch.selected {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px #eef2ff;
      background: #fff;
    }
    .swatch[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f9fafb;
    }
    .swatch .sw-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .swatch .sw-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #4f46e5;
      color: #fff;
      font-size: 12px;
      flex-shrink: 0;
    }
    .swatch .sw-price {
      font-size: 14px;
      color: #6b7280;
      font-weight: 600;
    }
    .swatch .sw-stock {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .swatch .sw-stock.out {
      background: #f3f4f6;
      color: #6b7280;
    }
    .swatch .sw-stock::before {
      content: '';
      width: 6px;
      height: 6px;
      background: currentColor;
      border-radius: 50%;
    }

    /* ===== Request / hold CTA area ===== */
    .cta-card {
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .request-btn {
      width: 100%;
      padding: 18px 32px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
      letter-spacing: 0.2px;
    }
    .request-btn:hover:not([disabled]) {
      background: #4338ca;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(79, 70, 229, 0.35);
    }
    .request-btn:active:not([disabled]) { transform: translateY(0); }
    .request-btn[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
      background: #6366f1;
    }

    .request-result {
      padding: 12px 14px;
      border-radius: 10px;
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
      border-radius: 10px;
      background: #eef2ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
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
    .held-title.ready-label,
    .held-title.reserved-label { font-size: 18px; }
    .held-title .dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34,197,94,0.25);
      animation: liveBlink 2s ease-in-out infinite;
    }
    .held-title .dot.ready { background: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,0.3); animation: none; }
    .held-title .dot.requested { background: #fbbf24; box-shadow: 0 0 0 4px rgba(251,191,36,0.3); animation: liveBlink 1.1s ease-in-out infinite; }
    .held-title .dot.reserved { background: #fde047; box-shadow: 0 0 0 4px rgba(253,224,71,0.3); animation: liveBlink 1.3s ease-in-out infinite; }
    @keyframes liveBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
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
    @keyframes heldShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-1px); } 75% { transform: translateX(1px); } }
    .held-bar {
      height: 6px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden;
    }
    .held-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399 0%, #fbbf24 60%, #f87171 100%);
      border-radius: 999px;
      transition: width .3s ease;
    }
    .reserved-bar { /* placeholder for variant if needed */ }
    .held-actions {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
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

    /* ===== Info cards (pickup / returns) ===== */
    .info-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 18px 20px;
      transition: all 0.2s;
    }
    .info-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    }
    .info-card-label {
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .info-card-value {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
    .info-card-value span {
      font-weight: 400;
      color: #6b7280;
    }

    /* ===== Similar products ===== */
    .similar-section {
      max-width: 1280px;
      margin: 0 auto;
      padding: 48px 24px 64px;
    }
    .similar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .similar-title {
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.3px;
      margin: 0;
    }
    .similar-count {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 500;
    }
    .similar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .similar-card {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      transition: all 0.3s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .similar-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      border-color: #d1d5db;
    }
    .similar-card-img {
      aspect-ratio: 4/3;
      overflow: hidden;
      background: #f9fafb;
    }
    .similar-card-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
      display: block;
    }
    .similar-card:hover .similar-card-img img {
      transform: scale(1.08);
    }
    .similar-card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .similar-card-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .similar-card-brand {
      font-size: 12px;
      color: #6b7280;
    }
    .similar-card-price {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }
    .similar-card-stock {
      font-size: 12px;
      color: #059669;
      font-weight: 600;
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .similar-card-stock::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .muted { color: #6b7280; }

    /* ===== Responsive ===== */
    @media (max-width: 968px) {
      .pdp {
        grid-template-columns: 1fr;
        gap: 32px;
      }
      .gallery-wrap {
        position: static;
      }
      .similar-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .product-title {
        font-size: 28px;
      }
      .price {
        font-size: 26px;
      }
    }
    @media (max-width: 640px) {
      .breadcrumb-bar { padding: 16px 16px 0; }
      .main-container { padding: 16px; }
      .similar-section { padding: 32px 16px 48px; }
      .info-cards { grid-template-columns: 1fr; }
      .similar-grid { grid-template-columns: 1fr; }
      .thumbnails { gap: 8px; }
      .thumbnail { width: 64px; height: 64px; }
    }
  `],
  template: `
    <div class="breadcrumb-bar">
      <a routerLink="/" class="back-link">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </a>
    </div>

    @if (loading()) {
      <div class="main-container"><p class="muted">Loading product…</p></div>
    } @else if (errorMsg()) {
      <div class="main-container">
        <p class="muted">{{ errorMsg() }}</p>
        <a routerLink="/" class="btn btn-outline" style="margin-top: 16px;">Return home</a>
      </div>
    } @else if (product()) {
      <div class="main-container">
        <article class="pdp">
          <!-- Gallery -->
          <div class="gallery-wrap">
            <div class="main-image-wrapper">
              @if (galleryImages().length > 0) {
                <img
                  [src]="currentMainImageSrc()"
                  [alt]="currentMainImageAlt()"
                  loading="eager" />
              }

              <button
                type="button"
                class="image-nav prev"
                aria-label="Previous image"
                (click)="prevSlide()"
                [disabled]="galleryImages().length < 2">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                type="button"
                class="image-nav next"
                aria-label="Next image"
                (click)="nextSlide()"
                [disabled]="galleryImages().length < 2">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            @if (galleryImages().length > 1) {
              <div class="image-dots" aria-hidden="true">
                @for (src of galleryImages(); track src; let idx = $index) {
                  <button
                    type="button"
                    class="image-dot"
                    [class.active]="idx === activeSlide()"
                    (click)="activeSlide.set(idx)"></button>
                }
              </div>

              <div class="thumbnails" role="tablist" aria-label="Product images">
                @for (src of galleryImages(); track src; let idx = $index) {
                  <button
                    type="button"
                    role="tab"
                    class="thumbnail"
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

          <!-- Info -->
          <div class="info">
            @if (scannedStoreId() || scannedStoreGateway()) {
              <div class="partner-banner">
                <div class="partner-icon">
                  <svg width="20" height="20" fill="none" stroke="#4f46e5" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div class="partner-text">
                  <h4>Shopping from partner location</h4>
                  <p>Your request will notify our network location for fulfillment.</p>
                </div>
              </div>
            }

            <div>
              <div class="featured-badge">{{ product()!.category || 'Featured' }}</div>
              <h1 class="product-title">{{ product()!.title }}</h1>
              @if (product()!.brand) { <p class="muted" style="font-size:14px; margin-top: 4px;">by {{ product()!.brand }}</p> }
            </div>

            <div class="price-row">
              <span class="price">{{ formattedPrice() }}</span>
              @if (hasVariants()) {
                @if (chosenVariantStock() > 0) {
                  <span class="stock-badge">In stock (<span [textContent]="chosenVariantStock()"></span>)</span>
                } @else if (chosenVariantStock() === 0) {
                  <span class="stock-badge out">Sold out</span>
                } @else {
                  @if (hasAnyVariantInStock()) {
                    <span class="stock-badge">In stock</span>
                  } @else {
                    <span class="stock-badge out">NOT AVAILABLE</span>
                  }
                }
              } @else {
                <span class="stock-badge" *ngIf="product()!.inStock">In stock</span>
                <span class="stock-badge out" *ngIf="!product()!.inStock">Low stock</span>
              }
            </div>

            @if (hasVariants()) {
              <div class="swatches-wrap">
                <div class="section-label">Select size / variant</div>
                <div class="swatch-row" role="radiogroup" aria-label="Product variants">
                  @for (v of product()!.variants; track v.id) {
                    <button
                      type="button"
                      role="radio"
                      class="swatch"
                      [class.selected]="v.id === selectedVariantId()"
                      [attr.aria-checked]="v.id === selectedVariantId()"
                      [disabled]="variantSoldOut(v)"
                      (click)="onSelectVariant(v.id)">
                      <span class="sw-label">
                        @if (v.id === selectedVariantId()) {
                          <span class="sw-check">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        }
                        @if (v.variantAttributes && v.variantAttributes['size']) {
                          Size {{ v.variantAttributes['size'] }}
                        } @else if (v.variantAttributes && v.variantAttributes['color']) {
                          {{ v.variantAttributes['color'] }}
                        } @else {
                          {{ v.sku.length > 12 ? v.sku.slice(v.sku.length - 10) : v.sku }}
                        }
                      </span>
                      <span class="sw-price">
                        {{ products.formatPrice(variantDisplayPriceCents(v), product()!.currency) }}
                      </span>
                      @if (variantHasStock(v)) {
                        <span class="sw-stock in">In stock (<span [textContent]="v.stockQuantity"></span>)</span>
                      } @else {
                        <span class="sw-stock out">Sold out</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <!-- CTA card -->
            <div class="cta-card">
              @if (reservationStatus() === 'pending' || reservationStatus() === 'requested' || reservationStatus() === 'reserved'
                   || reservationStatus() === 'denied' || reservationStatus() === 'expired') {
                <div class="countdown"
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
                        The fulfilling store has been notified of your request.
                        Store staff must confirm item availability before a hold is placed.
                        This page will update automatically — please stay connected.
                      </p>
                    </div>
                  </div>
                  <div class="held-timer-wrap">
                    <div class="held-timer-head">
                      <span>Waiting for seller (expires soon)</span>
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
                      @else { Cancel request }
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
                        Your 15-minute hold is in place. Store staff will confirm availability shortly.
                        You will see "Ready for checkout" here once confirmed.
                      </p>
                    </div>
                  </div>
                  <div class="held-timer-wrap">
                    <div class="held-timer-head">
                      <span>Hold time remaining</span>
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
                      @else { Cancel hold }
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
                        The store confirmed this item is available. Please complete checkout within the hold time to secure it for pickup.
                      </p>
                    </div>
                  </div>
                  <div class="held-timer-wrap">
                    <div class="held-timer-head">
                      <span>Hold time remaining</span>
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
                      Continue to checkout
                    </button>
                    <button class="cancel-btn-danger"
                            type="button"
                            (click)="onCancelHold()"
                            [disabled]="cancelling() || requesting()">
                      @if (cancelling()) { Releasing… }
                      @else { Cancel hold }
                    </button>
                  </div>
                </div>
              } @else if (reservationStatus() !== 'requested' && reservationStatus() !== 'reserved' && reservationStatus() !== 'accepted') {
                <button
                  type="button"
                  class="request-btn"
                  (click)="onRequestNow()"
                  [disabled]="requesting() || reservationStatus() === 'pending' || chosenVariantStock() === 0">
                  @if (reservationStatus() === 'pending')  { Waiting… }
                  @if (reservationStatus() === 'requested') { Awaiting confirmation }
                  @if (reservationStatus() === 'accepted') { Reserved }
                  @if (reservationStatus() === 'denied' || reservationStatus() === 'expired') { Try again }
                  @if (reservationStatus() === 'idle') {
                    @if (chosenVariantStock() === 0) { Sold out — pick another size }
                    @else if (requesting()) { Reserving… }
                    @else { Request Now }
                  }
                </button>
              }
            </div>

            <!-- Info cards -->
            <div class="info-cards">
              <div class="info-card">
                <div class="info-card-label">Pickup window</div>
                <div class="info-card-value">15 minute hold</div>
              </div>
              <div class="info-card">
                <div class="info-card-label">Returns</div>
                <div class="info-card-value">14 days <span>· in-store only</span></div>
              </div>
            </div>
          </div>
        </article>
      </div>

      @if (similarProducts().length > 0) {
        <section class="similar-section">
          <div class="similar-header">
            <h2 class="similar-title">You may also like</h2>
            <span class="similar-count"><span [textContent]="similarProducts().length"></span> similar items nearby</span>
          </div>

          <div class="similar-grid">
            @for (sp of similarProducts(); track sp.id) {
              <a
                class="similar-card"
                [routerLink]="['/p', sp.id]"
                [queryParams]="hostQueryParams()"
                (click)="$event.preventDefault(); navigateTo(sp.id)">
                <div class="similar-card-img">
                  <img [src]="sp.primaryImageUrl" [alt]="sp.title" loading="lazy" />
                </div>
                <div class="similar-card-body">
                  <span class="similar-card-brand">{{ sp.brand || sp.category || 'Local store' }}</span>
                  <span class="similar-card-name">{{ sp.title }}</span>
                  <span class="similar-card-price">{{ products.formatPrice(sp.retailPriceCents, sp.currency) }}</span>
                  @if (productStock(sp) > 0) {
                    <span class="similar-card-stock">In stock (<span [textContent]="productStock(sp)"></span>)</span>
                  } @else if (sp.inStock) {
                    <span class="similar-card-stock">In stock</span>
                  }
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
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (url: string | undefined | null): void => {
      if (typeof url !== 'string' || url.length === 0) return;
      if (seen.has(url)) return;
      seen.add(url);
      out.push(url);
    };
    const v = this.currentVariant();
    if (v) {
      push(v.imageUrl);
      if (Array.isArray(v.galleryImageUrls)) for (const g of v.galleryImageUrls) push(g);
    }
    if (p.galleryImages && p.galleryImages.length > 0) {
      for (const g of p.galleryImages) push(g);
    }
    push(p.primaryImageUrl);
    return out;
  });

  onSelectVariant(variantId: string): void {
    this.selectedVariantId.set(variantId);
    this.activeSlide.set(0);
  }

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

  productStock(p: Product): number {
    if (!p?.variants || p.variants.length === 0) return -1;
    let total = 0;
    for (const v of p.variants) {
      const n = Number(v.stockQuantity);
      if (!isNaN(n) && n > 0) total += n;
    }
    return total;
  }

  countdownMinutesLeft(): number {
    return Math.floor(this.currentSecondsRemaining() / 60);
  }

  private readonly _clampActive = effect(() => {
    const len = this.galleryImages().length;
    const idx = this.activeSlide();
    if (len <= 0) {
      if (idx !== 0) this.activeSlide.set(0);
      return;
    }
    const max = len - 1;
    if (idx < 0 || idx > max) {
      this.activeSlide.set(Math.max(0, Math.min(idx, max)));
    }
  });

  readonly currentMainImageSrc = computed<string>(() => {
    const arr = this.galleryImages();
    const idx = this.activeSlide();
    if (arr.length === 0) return '';
    const safe = Math.max(0, Math.min(idx, arr.length - 1));
    return arr[safe] ?? '';
  });

  readonly currentMainImageAlt = computed<string>(() => {
    const p = this.product();
    if (!p) return '';
    const n = Math.min(this.activeSlide(), Math.max(0, this.galleryImages().length - 1)) + 1;
    return `${p.title} — view ${n}`;
  });

  constructor(
    readonly products: ProductService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const id = pm.get('productId');
      if (!id) {
        this.loading.set(false);
        this.errorMsg.set('No product was selected.');
        return;
      }
      this.requestResult.set(null);
      this.reservation.set(null);
      this.reservationStatus.set('idle');
      this.clearCountdown();
      this.clearReservationPolling();
      const qp = this.route.snapshot.queryParamMap;
      const gateway = qp.get('gateway') ?? qp.get('gatewayCode') ?? qp.get('token');
      const storeId = qp.get('storeId') ?? qp.get('store');
      const cachedHost = this.products.getBrowsingHostStore();
      if (!gateway && !storeId && cachedHost?.storeId) {
        this.scannedStoreId.set(cachedHost.storeId);
        if (cachedHost.businessName) this.scannedStoreName.set(cachedHost.businessName);
        if (cachedHost.gatewayCode) this.scannedStoreGateway.set(cachedHost.gatewayCode);
      } else {
        this.scannedStoreId.set(null);
        this.scannedStoreName.set(null);
        this.scannedStoreGateway.set(null);
      }
      this.storeResolvedPromise = this.resolveScannedStoreFromUrl();
      void this.storeResolvedPromise.then(() => {
        this.loadProduct(id);
      });
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
    const qp = this.route.snapshot.queryParamMap;
    const anyScanParam = !!this.scannedStoreId() || !!qp.get('gateway') || !!qp.get('gatewayCode') || !!qp.get('token') || !!qp.get('storeId') || !!qp.get('store');
    const variantOwnerId =
      (_product?.variants && _product.variants.length > 0
        ? _product.variants.find((v: any) => v && typeof v.storeId === 'string' && v.storeId.length > 0)?.storeId
        : undefined)
      ?? _product?.storeId
      ?? null;

    const pickFirstOtherStoreId = async (avoidId: string | null, fallback: string): Promise<string> => {
      const apiB = this.auth.resolveApiBasePublic();
      const priorityScore = (name: string | null | undefined): number => {
        const n = String(name ?? '').toLowerCase();
        if (n.startsWith('storea')) return 0;
        if (n.startsWith('storeb')) return 1;
        if (n.includes('brooklyn')) return 2;
        if (n.includes('sole') || n.includes('uptown')) return 3;
        if (n.includes('downtown') || n.includes('kicks')) return 4;
        return 9;
      };
      try {
        const list: any[] = await firstValueFrom(this.http.get<any[]>(`${apiB}/stores`));
        if (Array.isArray(list)) {
          const candidates = list
            .filter(s => s?.id && String(s.id) !== String(avoidId || ''))
            .sort((a, b) => priorityScore(a?.businessName) - priorityScore(b?.businessName));
          if (candidates.length > 0) return String(candidates[0].id);
          const all = [...list].sort((a, b) => priorityScore(a?.businessName) - priorityScore(b?.businessName));
          if (all.length > 0 && all[0]?.id) return String(all[0].id);
        }
      } catch {
        // ignore
      }
      return fallback;
    };
    const defaultFallback = 'd7e59214-5adf-4788-beb0-ffccf4ab18f9';

    const cachedHost = this.products.getBrowsingHostStore();
    if (cachedHost?.storeId) {
      if (anyScanParam && variantOwnerId && String(cachedHost.storeId) === String(variantOwnerId)) {
        this.products.clearBrowsingHostStore();
      } else {
        return cachedHost.storeId;
      }
    }

    const scanned = this.scannedStoreId();

    if (anyScanParam) {
      const candidate = scanned || variantOwnerId || _product?.storeId;
      if (candidate && variantOwnerId && String(candidate) !== String(variantOwnerId)) return String(candidate);
      return await pickFirstOtherStoreId(variantOwnerId, defaultFallback);
    }

    if (scanned) return scanned;
    if (variantOwnerId) return variantOwnerId;
    if (_product?.storeId) return _product.storeId;
    try {
      const list: any[] = await firstValueFrom(this.http.get<any[]>(`${this.auth.resolveApiBasePublic()}/stores`));
      if (Array.isArray(list) && list.length > 0 && list[0]?.id) return String(list[0].id);
    } catch {
      // ignore
    }
    return defaultFallback;
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
    this._installCountdownTicker();
  }

  private restartCountdownFrom(expiresAtIso: string | null | undefined): void {
    if (!expiresAtIso) return;
    const t = new Date(expiresAtIso).getTime();
    if (!t || Number.isNaN(t)) return;
    if (t <= Date.now()) return;
    this.clearCountdown();
    this.deadlineMs.set(t);
    this._installCountdownTicker();
  }

  private _installCountdownTicker(): void {
    if (this.countdownTimer !== null) return;
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
          case 'RESERVED':
          case 'FULFILLER_ACCEPTED':
          case 'PAID':
          case 'PICKED_UP':
            this.reservationStatus.set('accepted');
            const fresh = this.reservation();
            if (fresh) {
              if (res?.expiresAt) fresh.expiresAt = res.expiresAt;
              if (res?.lock?.expiresAt) {
                fresh.lock = fresh.lock || {};
                fresh.lock.expiresAt = res.lock.expiresAt;
                if (!fresh.expiresAt) fresh.expiresAt = res.lock.expiresAt;
              }
              if (typeof res?.totalRetailCents === 'number') fresh.totalRetailCents = res.totalRetailCents;
              if (typeof res?.totalWholesaleCents === 'number') fresh.totalWholesaleCents = res.totalWholesaleCents;
              if (typeof res?.crossCustomerStoreSellCents === 'number') fresh.crossCustomerStoreSellCents = res.crossCustomerStoreSellCents;
              if (res?.qrSecureToken) fresh.qrSecureToken = res.qrSecureToken;
              if (res?.qrFallbackCode) fresh.qrFallbackCode = res.qrFallbackCode;
              this.reservation.set(structuredClone(fresh));
              this.restartCountdownFrom(fresh.expiresAt || (fresh.lock && fresh.lock.expiresAt) || null);
            }
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
          default:
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
    const qp = this.route.snapshot.queryParamMap;
    const anyScanParam = !!this.scannedStoreId() || !!qp.get('gateway') || !!qp.get('gatewayCode') || !!qp.get('token') || !!qp.get('storeId') || !!qp.get('store');
    const currentProduct = this.product();
    const currentVariant = this.currentVariant();
    const state = {
      transactionId: reservationResult.transactionId,
      qrSecureToken: reservationResult.qrSecureToken,
      qrFallbackCode: reservationResult.qrFallbackCode,
      reservation: structuredClone(reservationResult),
      hasScanContext: anyScanParam,
      scanGateway: qp.get('gateway') || qp.get('gatewayCode') || qp.get('token') || this.scannedStoreId() || '',
      product: currentProduct ? structuredClone(currentProduct) : undefined,
      variantStoreId: currentVariant?.storeId ?? currentProduct?.storeId ?? undefined,
      variantWholesalePriceCents: currentVariant?.wholesalePriceCents ?? (currentProduct as any)?.wholesalePriceCents ?? undefined,
    };
    const queryParams: Record<string, string> = {};
    const gw = qp.get('gateway') || qp.get('gatewayCode') || qp.get('token');
    if (gw) queryParams['gateway'] = gw;
    const scannedId = this.scannedStoreId();
    if (scannedId) queryParams['storeId'] = scannedId;
    if (qp.get('store')) queryParams['store'] = qp.get('store')!;
    const extras: any = { state, replaceUrl: false };
    if (Object.keys(queryParams).length > 0) extras.queryParams = queryParams;
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
