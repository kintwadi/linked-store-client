import { Component, computed, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QRCodeModule } from 'angularx-qrcode';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
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
          <div class="qr-label">Loading today's featured product…</div>
        } @else {
          <div class="card">
            <div class="qr-wrapper">
              <div class="qr-container">
                <qrcode
                  #qrEl
                  [qrdata]="qrUrl()"
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
              [disabled]="loading() || scanningStore()"
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
export class HomePageComponent implements OnInit {
  private readonly featuredId = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly scanningStore = signal<boolean>(true);
  readonly scannedStoreId = signal<string | null>(null);
  readonly scannedStoreName = signal<string | null>(null);
  readonly scannedStoreGateway = signal<string | null>(null);
  private storeResolvedPromise: Promise<string | null> | null = null;

  readonly qrUrl = computed(() => {
    if (!this.featuredId()) return window.location.origin;
    const cached = this.products.getBrowsingHostStore();
    const gateway = cached?.gatewayCode ?? this.scannedStoreGateway();
    return this.products.buildQrUrlFor(this.featuredId(), { gatewayCode: gateway ?? null });
  });

  @ViewChild('ctaBtn', { static: false })
  private readonly ctaBtnRef?: ElementRef<HTMLButtonElement>;

  constructor(
    private readonly products: ProductService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    const cachedHost = this.products.getBrowsingHostStore();
    if (cachedHost?.storeId) {
      this.scannedStoreId.set(cachedHost.storeId);
      if (cachedHost.businessName) this.scannedStoreName.set(cachedHost.businessName);
      if (cachedHost.gatewayCode) this.scannedStoreGateway.set(cachedHost.gatewayCode);
    }
    this.storeResolvedPromise = this.resolveScannedStoreFromUrl();

    let productId: string | null = null;
    const productPromise = (async () => {
      try {
        const allProducts = await this.products.getAllProducts();
        if (Array.isArray(allProducts) && allProducts.length > 0) {
          const idx = Math.floor(Math.random() * allProducts.length);
          productId = allProducts[idx]?.id ?? null;
        }
      } catch {
        productId = null;
      }
      if (!productId) productId = this.products.getFeaturedProductId();
      if (productId) this.featuredId.set(String(productId));
    })();

    await Promise.all([productPromise, this.storeResolvedPromise]);
    this.scanningStore.set(false);
    this.loading.set(false);
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
          this.products.setBrowsingHostStore({
            storeId: String(s.id),
            businessName: String(s.businessName || 'Store'),
            gatewayCode: s.gatewayCode ? String(s.gatewayCode) : null,
          });
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
          this.products.setBrowsingHostStore({
            storeId: String(s.id),
            businessName: String(s.businessName || 'Store'),
            gatewayCode: s.gatewayCode ? String(s.gatewayCode) : null,
          });
          return String(s.id);
        }
      } catch {
        // ignore; fall through to cache default
      }
    }

    return this.scannedStoreId();
  }

  async onExplore(event?: MouseEvent): Promise<void> {
    this.spawnRipple(event);
    const id = this.featuredId() || this.products.getFeaturedProductId();
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    if (this.storeResolvedPromise) await this.storeResolvedPromise;

    const queryParams: Record<string, string> = {};
    const cached = this.products.getBrowsingHostStore();
    if (cached?.gatewayCode) queryParams['gateway'] = cached.gatewayCode;
    else if (cached?.storeId) queryParams['storeId'] = cached.storeId;
    else {
      const qp = this.route.snapshot.queryParamMap;
      const gw = qp.get('gateway') ?? qp.get('gatewayCode') ?? qp.get('token');
      const sid = qp.get('storeId') ?? qp.get('store');
      if (gw && /^\d{8}$/.test(gw.trim())) queryParams['gateway'] = gw.trim();
      else if (sid && /^[0-9a-fA-F-]{20,}$/.test(sid.trim())) queryParams['storeId'] = sid.trim();
    }
    const extras = Object.keys(queryParams).length > 0 ? { queryParams } : undefined;
    if (extras) this.router.navigate(['/p', id], extras);
    else this.router.navigate(['/p', id]);
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
