import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [QRCodeModule, RouterLink],
  styles: [`
    .hidden-desktop { display: revert; }
    .hidden-mobile  { display: none; }

    .hero {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .qr-card {
      order: 1;
      justify-self: center;
      width: 100%;
      max-width: 420px;
      padding: 22px 18px 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      text-align: center;
    }
    .qr-wrapper {
      padding: 14px;
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
    .qr-card h3 { font-size: 18px; margin: 0; }
    .qr-card p.legend { font-size: 13px; color: var(--color-muted); margin: 0; line-height: 1.55; }
    .qr-url {
      font-size: 11px;
      line-height: 1.35;
      color: var(--color-muted);
      background: var(--color-primary-50);
      padding: 8px 12px;
      border-radius: 8px;
      word-break: break-all;
      width: 100%;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .cta {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .cta .btn {
      width: 100%;
      max-width: 320px;
      justify-content: center;
    }
    .cta .hint { font-size: 12px; color: var(--color-muted); }

    .headline {
      order: 2;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 540px;
      margin: 0 auto;
      text-align: center;
    }
    .eyebrow {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .14em;
      color: var(--color-primary);
      font-weight: 600;
    }
    .hero h1 {
      font-size: 26px;
      line-height: 1.22;
      margin: 0;
    }
    .hero p.lead {
      font-size: 15px;
      color: var(--color-muted);
      line-height: 1.6;
      margin: 0;
    }
    .headline .inline-cta {
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .headline .inline-cta .hint { font-size: 13px; color: var(--color-muted); }

    .features {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .feature { padding: 20px; }
    .feature h4 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .feature p { font-size: 14px; color: var(--color-muted); }
    .feature-icon {
      width: 38px; height: 38px;
      border-radius: 10px;
      background: var(--color-primary-50);
      color: var(--color-primary);
      display: grid; place-items: center;
      font-size: 18px;
      margin-bottom: 12px;
    }

    @media (min-width: 520px) {
      .hero { gap: 28px; }
      .hero h1 { font-size: 32px; }
    }

    @media (min-width: 900px) {
      .hero {
        grid-template-columns: 1.1fr 1fr;
        gap: 56px;
        align-items: center;
        min-height: 65vh;
        padding-top: 0;
        padding-bottom: 0;
      }
      .headline {
        order: 1;
        margin: 0;
        text-align: left;
        gap: 20px;
        max-width: 560px;
      }
      .qr-card {
        order: 2;
        max-width: 430px;
        padding: 32px;
        gap: 20px;
      }
      .eyebrow { font-size: 13px; letter-spacing: .12em; }
      .hero h1 { font-size: 44px; max-width: 520px; }
      .hero p.lead { font-size: 17px; }
      .headline .inline-cta { justify-content: flex-start; }
      .hidden-desktop { display: none !important; }
      .hidden-mobile  { display: revert; }
      .features {
        margin-top: 80px;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      .feature { padding: 24px; }
      .feature-icon { margin-bottom: 14px; }
    }
  `],
  template: `
    <section class="hero">
      <div class="card qr-card" aria-label="QR code for featured product">
        <div class="qr-wrapper">
          <qrcode
            [qrdata]="qrUrl()"
            [width]="240"
            [errorCorrectionLevel]="'M'"
            [elementType]="'img'"
            [colorDark]="'#111827'"
            [colorLight]="'#ffffff'"
          ></qrcode>
        </div>
        <h3>Scan to find out more</h3>

        <div class="cta hidden-desktop">
          <button class="btn btn-primary" (click)="onExplore()">
            Click here to explore
          </button>
          <span class="hint">or scan the QR code above</span>
        </div>

        <p class="qr-url" title="URL encoded inside the QR code">
          {{ qrUrl() }}
        </p>

        <p class="legend">
          Scan with your phone camera to open today's featured item,
          then tap <strong>Request Now</strong> to reserve it at the closest shop.
        </p>
      </div>

      <div class="headline">
        <span class="eyebrow">Hyperlocal Retail · Instant Neighbourhood Pickup</span>
        <h1>Find the sneaker you want. Available right now, around the corner.</h1>
        <p class="lead">
          Linked-Store connects nearby shops so you can browse, reserve, and collect in 15 minutes —
          no shipping, no waiting. Scan the QR code next to you, or tap the button to explore what's in stock today.
        </p>
        <div class="inline-cta hidden-mobile">
          <button class="btn btn-primary" (click)="onExplore()">
            Click here to explore
          </button>
          <span class="hint">or scan the QR code</span>
        </div>
      </div>
    </section>

    <section class="features" aria-label="Why Linked-Store">
      <div class="card feature">
        <div class="feature-icon">⚡️</div>
        <h4>15-minute pickup</h4>
        <p>Stock is reserved at the store immediately. Collect at your convenience.</p>
      </div>
      <div class="card feature">
        <div class="feature-icon">📍</div>
        <h4>Neighbourhood-first</h4>
        <p>Money stays local. Inventory comes from shops a walk, not a warehouse, away.</p>
      </div>
      <div class="card feature">
        <div class="feature-icon">🔒</div>
        <h4>Scan-only secure pickup</h4>
        <p>QR-auth handoff to your runner or yourself. No missed packages, ever.</p>
      </div>
    </section>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly featuredId = signal<string>('');
  readonly qrUrl = computed(() =>
    this.featuredId() ? this.products.buildQrUrlFor(this.featuredId()) : window.location.origin
  );

  constructor(
    private readonly products: ProductService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const allProducts = await this.products.getAllProducts();
    const firstProduct = allProducts[0];
    const firstId = firstProduct?.id ?? this.products.getFeaturedProductId();
    this.featuredId.set(firstId);
  }

  onExplore(): void {
    const id = this.featuredId() || this.products.getFeaturedProductId();
    this.router.navigate(['/p', id]);
  }
}
