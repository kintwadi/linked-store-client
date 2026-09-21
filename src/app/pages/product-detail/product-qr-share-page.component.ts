import { Component, computed, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-qr-share-page',
  standalone: true,
  imports: [QRCodeModule, RouterLink],
  styles: [`
    .page-wrap {
      min-height: 100vh;
      background: #f8f9fc;
      color: #1a1a2e;
      position: relative;
      overflow: hidden;
    }

    /* Decorative background */
    .bg-decoration {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .bg-circle {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
    }
    .bg-circle-1 {
      width: 400px;
      height: 400px;
      background: #4f6ef7;
      top: -100px;
      right: -100px;
      opacity: 0.08;
    }
    .bg-circle-2 {
      width: 300px;
      height: 300px;
      background: #8b5cf6;
      bottom: -50px;
      left: -50px;
      opacity: 0.06;
    }
    .bg-circle-3 {
      width: 200px;
      height: 200px;
      background: #4f6ef7;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.04;
    }

    /* Main content */
    main {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 48px 56px;
      box-shadow:
        0 4px 24px rgba(79, 110, 247, 0.08),
        0 1px  4px rgba(0, 0, 0, 0.04);
      border: 1px solid #eef0f6;
      text-align: center;
      max-width: 480px;
      width: 100%;
      animation: cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .qr-wrapper {
      background: #ffffff;
      border: 2px solid #eef0f6;
      border-radius: 16px;
      padding: 24px;
      margin: 0 auto 32px;
      display: inline-block;
      position: relative;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s;
    }
    .qr-wrapper:hover {
      transform: scale(1.03);
      box-shadow: 0 8px 32px rgba(79, 110, 247, 0.15);
    }
    .qr-wrapper::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 20px;
      background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
      z-index: -1;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .qr-wrapper:hover::before {
      opacity: 1;
    }
    .qr-container {
      width: 240px;
      height: 240px;
      position: relative;
      display: grid;
      place-items: center;
    }
    .qr-container :deep(qrcode),
    .qr-container :deep(qrcode img),
    .qr-container :deep(qrcode canvas),
    .qr-container > qrcode,
    .qr-container > * {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
    }
    .scan-line {
      position: absolute;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #4f6ef7, transparent);
      animation: scanMove 2.5s ease-in-out infinite;
      opacity: 0.6;
      border-radius: 2px;
    }
    @keyframes scanMove {
      0%, 100% { top: 15%; }
      50%      { top: 85%; }
    }

    .qr-label {
      font-size: 13px;
      color: #9ca3af;
      font-weight: 500;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #4f6ef7, #6366f1);
      color: #ffffff;
      border: none;
      padding: 18px 40px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      width: 100%;
      justify-content: center;
      position: relative;
      overflow: hidden;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .cta-button::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(79, 110, 247, 0.35);
    }
    .cta-button:hover::before { opacity: 1; }
    .cta-button:active { transform: translateY(0); }
    .cta-button span,
    .cta-button .scan-icon {
      position: relative;
      z-index: 1;
    }
    .scan-icon {
      display: inline-flex;
      align-items: center;
      line-height: 0;
    }
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: rippleAnim 0.6s linear forwards;
      pointer-events: none;
    }
    @keyframes rippleAnim {
      to { transform: scale(4); opacity: 0; }
    }

    .footer-hint {
      text-align: center;
      margin-top: 24px;
      font-size: 13px;
      color: #9ca3af;
      animation: fadeIn 1s ease 0.5s both;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* Responsive */
    @media (max-width: 600px) {
      .card {
        padding: 32px 24px;
        border-radius: 20px;
      }
      .qr-container {
        width: 200px;
        height: 200px;
      }
      .cta-button {
        padding: 16px 28px;
        font-size: 15px;
      }
    }

    @media (max-width: 420px) {
      main   { padding: 24px 14px; }
      .card  { padding: 28px 18px; border-radius: 18px; }
      .qr-wrapper { padding: 18px; margin-bottom: 24px; }
      .qr-container {
        width: 220px;
        height: 220px;
      }
      .qr-label { margin-bottom: 18px; }
    }
  `],
  template: `
    <div class="page-wrap">
      <div class="bg-decoration" aria-hidden="true">
        <div class="bg-circle bg-circle-1"></div>
        <div class="bg-circle bg-circle-2"></div>
        <div class="bg-circle bg-circle-3"></div>
      </div>

      <main>
        @if (loading()) {
          <div class="qr-label">Loading…</div>
        } @else {
          <div class="card">
            <div class="qr-wrapper">
              <div class="qr-container">
                <qrcode
                  #qrEl
                  [qrdata]="productPdpUrl()"
                  [width]="320"
                  [errorCorrectionLevel]="'M'"
                  [elementType]="'img'"
                  [colorDark]="'#1a1a2e'"
                  [colorLight]="'#ffffff'"
                  [margin]="0"
                ></qrcode>
                <div class="scan-line" aria-hidden="true"></div>
              </div>
            </div>

            <div class="qr-label">Scan QR Code</div>

            <button
              #ctaBtn
              type="button"
              class="cta-button"
              (click)="onExplore($event)"
            >
              <span class="scan-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <line x1="7" y1="12" x2="17" y2="12"/>
                </svg>
              </span>
              <span>Scan to find out more or Click here</span>
            </button>

            <div class="footer-hint">
              Point your camera at the QR code to get started
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class ProductQrSharePageComponent implements OnInit {
  readonly productId = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly qrGatewayCode = signal<string | null>(null);
  readonly qrStoreId = signal<string | null>(null);

  readonly productPdpUrl = computed(() => {
    if (!this.productId()) return window.location.origin;
    let gateway: string | null | undefined = this.qrGatewayCode() ?? undefined;
    if (!gateway) {
      const cachedHost = this.products.getBrowsingHostStore();
      if (cachedHost?.gatewayCode) gateway = cachedHost.gatewayCode;
    }
    return this.products.buildQrUrlFor(this.productId(), { gatewayCode: gateway ?? null });
  });

  @ViewChild('ctaBtn', { static: false })
  private readonly ctaBtnRef?: ElementRef<HTMLButtonElement>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly products: ProductService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('productId') || '';
    this.productId.set(id);
    const qp = this.route.snapshot.queryParamMap;
    const gateway = qp.get('gateway') ?? qp.get('gatewayCode') ?? qp.get('token');
    const storeId = qp.get('storeId') ?? qp.get('store');
    if (gateway && /^\d{8}$/.test(gateway.trim())) {
      this.qrGatewayCode.set(gateway.trim());
      this.products.setBrowsingHostStore({
        storeId: this.qrStoreId() ?? '',
        gatewayCode: gateway.trim(),
      });
    }
    if (storeId && /^[0-9a-fA-F-]{20,}$/.test(storeId.trim())) {
      this.qrStoreId.set(storeId.trim());
    }
    this.loading.set(false);
  }

  onExplore(event?: MouseEvent): void {
    this.spawnRipple(event);
    const id = this.productId();
    if (id) {
      const queryParams: Record<string, string> = {};
      if (this.qrGatewayCode()) queryParams['gateway'] = this.qrGatewayCode()!;
      else if (this.qrStoreId()) queryParams['storeId'] = this.qrStoreId()!;
      const extras = Object.keys(queryParams).length > 0 ? { queryParams } : undefined;
      if (extras) this.router.navigate(['/p', id], extras);
      else this.router.navigate(['/p', id]);
    } else {
      this.router.navigate(['/']);
    }
  }

  private spawnRipple(event?: MouseEvent): void {
    const btn = this.ctaBtnRef?.nativeElement;
    if (!btn || !event) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top  = (event.clientY - rect.top  - size / 2) + 'px';
    btn.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 600);
  }
}
