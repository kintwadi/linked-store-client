import { Component, OnInit, signal, WritableSignal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface InventoryVariant {
  variantId: string;
  productId?: string;
  productTitle: string | null;
  productDescription: string | null;
  productImageUrl: string | null;
  variantImageUrl?: string | null;
  productGalleryImageUrls?: string[] | null;
  variantGalleryImageUrls?: string[] | null;
  sku: string | null;
  wholesalePriceCents: number | null;
  retailPriceCents: number | null;
  stockQuantity: number | null;
  status: string | null;
}

interface ImageUploadResult {
  key?: string;
  publicUrl: string;
  contentType?: string;
  sizeBytes?: number;
}

interface GalleryItem {
  id: string;
  url: string;
  uploading: boolean;
  progress: number;
}

@Component({
  selector: 'app-store-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  styles: [`
    :host { display: block; }

    .panel {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
    }
    .panel-head {
      padding: 20px 24px 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      border-bottom: 1px solid #f3f4f6;
    }
    .panel-head h2 {
      margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 10px;
    }
    .panel-head h2 .ico {
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--color-primary-50); color: var(--color-primary);
      font-size: 15px;
    }
    .panel-head .muted {
      font-size: 12px; color: #6b7280; font-weight: 500;
    }

    .form-panel {
      margin: 24px;
      padding: 20px 22px;
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 14px;
      display: grid; gap: 18px;
    }
    .form-panel-head {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;
    }
    .form-panel-title {
      font-size: 15px; font-weight: 700; color: #111827;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .form-panel-title .ico {
      width: 24px; height: 24px; border-radius: 7px;
      background: #eef2ff; color: #4338ca;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .form-grid-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
    }
    @media (max-width: 700px) { .form-grid-2 { grid-template-columns: 1fr; } }
    .form-field { display: grid; gap: 6px; }
    .form-field label {
      font-size: 13px; font-weight: 600; color: #374151;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .form-field label .req { color: #ef4444; }
    .form-field input, .form-field select, .form-field textarea {
      width: 100%; box-sizing: border-box; padding: 11px 13px; font-size: 14px;
      color: #111827; background: #fff;
      border: 1px solid #d1d5db; border-radius: 10px;
      font-family: inherit;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none; border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .form-field textarea {
      min-height: 92px; resize: vertical;
    }
    .form-footer {
      display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
      padding-top: 4px;
    }

    .btn-primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn-primary:hover  { background: var(--color-primary-600); }
    .btn-primary:active { transform: translateY(1px); }

    .btn-secondary {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 22px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      transition: background .15s ease, transform .1s ease, box-shadow .15s ease;
      cursor: pointer;
      border: none;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    .btn-ghost {
      background: transparent;
      color: #4b5563;
      padding: 10px 14px;
      font-size: 13px;
    }
    .btn-ghost:hover { background: #f3f4f6; color: #111827; }

    .btn-danger-ghost {
      background: #fef2f2;
      color: #b91c1c;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
    }
    .btn-danger-ghost:hover { background: #fee2e2; }

    .loading {
      padding: 48px 24px; text-align: center; color: #6b7280; font-size: 14px;
    }

    .toasts {
      position: fixed; right: 24px; bottom: 24px;
      display: grid; gap: 10px; z-index: 100;
      pointer-events: none;
    }
    .toast {
      min-width: 300px; max-width: 440px;
      padding: 12px 16px 12px 14px;
      border-radius: 12px;
      box-shadow: 0 12px 32px -10px rgba(0,0,0,0.25);
      display: flex; align-items: flex-start; gap: 10px;
      pointer-events: auto;
      animation: toastIn .25s ease-out;
      border: 1px solid transparent;
    }
    @keyframes toastIn { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    .toast .t-ico {
      width: 22px; height: 22px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; margin-top: 1px; color: #fff; font-weight: 700;
    }
    .toast .t-body { display: grid; gap: 2px; flex: 1; }
    .toast .t-title { font-size: 14px; font-weight: 700; color: #111827; }
    .toast .t-msg   { font-size: 13px; color: #4b5563; line-height: 1.4; }
    .toast.success { background: #ecfdf5; border-color: #a7f3d0; }
    .toast.success .t-ico { background: #10b981; }
    .toast.error   { background: #fef2f2; border-color: #fecaca; }
    .toast.error .t-ico   { background: #ef4444; }

    .media-section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px 16px 14px;
      display: grid;
      gap: 14px;
    }
    .media-section-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; flex-wrap: wrap;
    }
    .media-section-title {
      font-size: 14px; font-weight: 700; color: #111827;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .media-section-title .ico {
      width: 22px; height: 22px; border-radius: 6px;
      background: #ecfeff; color: #0e7490;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px;
    }
    .media-hint {
      font-size: 11px; color: #6b7280; font-weight: 500;
    }

    .dropzone {
      border: 2px dashed #cbd5e1;
      background: #f8fafc;
      border-radius: 12px;
      padding: 18px 16px;
      display: grid;
      place-items: center;
      gap: 8px;
      cursor: pointer;
      transition: border-color .15s ease, background .15s ease;
    }
    .dropzone:hover {
      border-color: var(--color-primary);
      background: #eef2ff33;
    }
    .dropzone.dragging {
      border-color: var(--color-primary);
      background: #eef2ff;
    }
    .dropzone .dz-ico {
      width: 40px; height: 40px; border-radius: 10px;
      background: #e0f2fe; color: #0369a1;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .dropzone .dz-title { font-size: 14px; font-weight: 600; color: #111827; }
    .dropzone .dz-sub { font-size: 12px; color: #6b7280; }
    .dropzone input[type=file] { display: none; }

    .cover-grid {
      display: grid; grid-template-columns: 220px 1fr; gap: 14px;
      align-items: start;
    }
    @media (max-width: 640px) { .cover-grid { grid-template-columns: 1fr; } }

    .cover-preview {
      width: 220px; height: 220px;
      border-radius: 12px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      position: relative;
      display: grid; place-items: center;
    }
    .cover-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-preview .ph {
      display: grid; place-items: center; gap: 6px;
      color: #9ca3af; font-size: 13px; font-weight: 500;
    }
    .cover-preview .ph .ico { font-size: 36px; }
    .cover-preview .overlay {
      position: absolute; inset: 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, transparent 100%);
      opacity: 0;
      transition: opacity .15s ease;
      display: grid; align-items: end; padding: 10px;
    }
    .cover-preview:hover .overlay { opacity: 1; }
    .cover-uploading {
      position: absolute; inset: 0;
      background: rgba(17, 24, 39, 0.72);
      color: #fff;
      display: grid; place-items: center; gap: 8px;
      font-size: 12px; font-weight: 600;
    }
    .progress-track {
      width: 80%; height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px; overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: #34d399;
      border-radius: 999px;
      transition: width .1s linear;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .gallery-item {
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      position: relative;
    }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .gallery-item .ph {
      width: 100%; height: 100%;
      display: grid; place-items: center;
      color: #9ca3af; font-size: 28px;
    }
    .gallery-item .remove-btn {
      position: absolute; top: 6px; right: 6px;
      width: 26px; height: 26px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.95);
      color: #fff;
      border: none;
      display: grid; place-items: center;
      cursor: pointer;
      font-size: 13px; font-weight: 700;
      opacity: 0;
      transition: opacity .15s ease, background .15s ease;
      backdrop-filter: blur(4px);
    }
    .gallery-item:hover .remove-btn { opacity: 1; }
    .gallery-item .remove-btn:hover { background: #dc2626; }
    .gallery-item .uploading-overlay {
      position: absolute; inset: 0;
      background: rgba(17, 24, 39, 0.78);
      color: #fff;
      display: grid; place-items: center; gap: 6px;
      font-size: 11px; font-weight: 600;
      padding: 8px;
    }
    .gallery-item .uploading-overlay .bar {
      width: 90%; height: 5px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px; overflow: hidden;
    }
    .gallery-item .uploading-overlay .bar > div {
      height: 100%; background: #34d399; border-radius: 999px;
    }

    .gallery-dropzone {
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      border: 2px dashed #cbd5e1;
      background: #f8fafc;
      display: grid; place-items: center; gap: 4px;
      cursor: pointer;
      color: #6b7280;
      transition: border-color .15s ease, background .15s ease;
    }
    .gallery-dropzone:hover { border-color: var(--color-primary); background: #eef2ff44; color: var(--color-primary); }
    .gallery-dropzone .ico { font-size: 26px; }
    .gallery-dropzone .label { font-size: 11px; font-weight: 600; text-align: center; }
    .gallery-dropzone input[type=file] { display: none; }
  `],
  template: `
    <div class="toasts">
      @if (successMsg()) {
        <div class="toast success">
          <span class="t-ico">✓</span>
          <div class="t-body"><span class="t-title">Success</span><span class="t-msg">{{ successMsg() }}</span></div>
        </div>
      }
      @if (errorMsg()) {
        <div class="toast error">
          <span class="t-ico">!</span>
          <div class="t-body"><span class="t-title">Something went wrong</span><span class="t-msg">{{ errorMsg() }}</span></div>
        </div>
      }
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>
            <span class="ico">{{ isEditMode() ? '✎' : '＋' }}</span>
            {{ isEditMode() ? 'Edit Product' : 'Add New Product' }}
          </h2>
          <span class="muted">
            {{ isEditMode() ? 'Update inventory details, pricing, and media.' : 'Create a new item for your store catalog.' }}
          </span>
        </div>
      </div>

      @if (loadingVariant()) {
        <div class="loading">Loading product…</div>
      } @else {
        <form class="form-panel" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-panel-head">
            <div class="form-panel-title">
              <span class="ico">{{ isEditMode() ? '✎' : '📦' }}</span>
              {{ isEditMode() ? 'Product details' : 'New product details' }}
            </div>
            <span class="muted">Fields with <span style="color:#ef4444;">*</span> are required</span>
          </div>

          <div class="form-field">
            <label for="p-title">Title <span class="req">*</span></label>
            <input id="p-title" formControlName="title" type="text" placeholder="e.g. Premium Cotton T-Shirt" />
          </div>

          <div class="form-field">
            <label for="p-desc">Description</label>
            <textarea id="p-desc" formControlName="description" placeholder="Short description for customers…"></textarea>
          </div>

          <!-- ===== COVER IMAGE ===== -->
          <div class="media-section">
            <div class="media-section-head">
              <div class="media-section-title">
                <span class="ico">🖼</span>
                Cover image
              </div>
              <span class="media-hint">Upload from your device · JPG / PNG / WebP · Max 20MB</span>
            </div>

            <div class="cover-grid">
              <div class="cover-preview">
                @if (form.get('primaryImageUrl')?.value) {
                  <img [src]="form.get('primaryImageUrl')?.value" alt="Cover preview" />
                } @else {
                  <div class="ph">
                    <div class="ico">🖼</div>
                    <span>No cover yet</span>
                  </div>
                }

                @if (coverUploading()) {
                  <div class="cover-uploading">
                    <div>Uploading {{ coverUploadProgress() }}%</div>
                    <div class="progress-track"><div class="progress-bar" [style.width.%]="coverUploadProgress()"></div></div>
                  </div>
                } @else {
                  <div class="overlay">
                    <button type="button" class="btn btn-danger-ghost" (click)="removeCover()" [disabled]="!form.get('primaryImageUrl')?.value">
                      Remove cover
                    </button>
                  </div>
                }
              </div>

              <div style="display: grid; gap: 10px; align-self: stretch;">
                <label class="dropzone"
                       [class.dragging]="coverDragOver()"
                       (dragover)="onCoverDragOver($event)"
                       (dragleave)="onCoverDragLeave($event)"
                       (drop)="onCoverDrop($event)">
                  <input type="file" accept="image/*" #coverFileInput (change)="onCoverPicked($event)" />
                  <span class="dz-ico">⬆</span>
                  <span class="dz-title">Upload cover image</span>
                  <span class="dz-sub">Click to browse, or drag & drop a file here</span>
                </label>
                <div class="form-field">
                  <label for="p-img">…or paste an image URL</label>
                  <input id="p-img" formControlName="primaryImageUrl" type="text" placeholder="https://… (optional)" />
                </div>
              </div>
            </div>
          </div>

          <!-- ===== GALLERY IMAGES ===== -->
          <div class="media-section">
            <div class="media-section-head">
              <div class="media-section-title">
                <span class="ico">🖼</span>
                Gallery images
                <span style="font-weight: 500; color: #6b7280; font-size: 12px; margin-left: 6px;">
                  ({{ galleryUrls().length }} uploaded)
                </span>
              </div>
              <span class="media-hint">Showcase your product with multiple angles</span>
            </div>

            <div class="gallery-grid">
              @for (item of _galleryItems(); track item.id) {
                <div class="gallery-item">
                  @if (item.url) {
                    <img [src]="item.url" alt="Gallery preview" />
                  } @else {
                    <div class="ph">🖼</div>
                  }
                  @if (item.uploading) {
                    <div class="uploading-overlay">
                      <div>Uploading {{ item.progress }}%</div>
                      <div class="bar"><div [style.width.%]="item.progress"></div></div>
                    </div>
                  } @else {
                    <button type="button" class="remove-btn" (click)="removeGalleryItem(item.id)" title="Remove">✕</button>
                  }
                </div>
              }

              <label class="gallery-dropzone"
                     [class.dragging]="galleryDragOver()"
                     (dragover)="onGalleryDragOver($event)"
                     (dragleave)="onGalleryDragLeave($event)"
                     (drop)="onGalleryDrop($event)">
                <input type="file" accept="image/*" multiple #galleryFileInput (change)="onGalleryPicked($event)" />
                <span class="ico">＋</span>
                <span class="label">Add images</span>
              </label>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field">
              <label for="p-sku">SKU</label>
              <input id="p-sku" formControlName="sku" type="text" placeholder="e.g. SKU-TSHIRT-001" />
            </div>
            <div class="form-field">
              <label for="p-status">Status</label>
              <select id="p-status" formControlName="status">
                <option value="ACTIVE">🟢 ACTIVE</option>
                <option value="DRAFT">🟡 DRAFT</option>
                <option value="ARCHIVED">⚪ ARCHIVED</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field">
              <label for="p-wholesale">Wholesale price ($) <span class="req">*</span></label>
              <input id="p-wholesale" formControlName="wholesalePrice" type="number" step="0.01" min="0" placeholder="12.50" />
            </div>
            <div class="form-field">
              <label for="p-retail">Retail price ($) <span class="req">*</span></label>
              <input id="p-retail" formControlName="retailPrice" type="number" step="0.01" min="0" placeholder="24.99" />
            </div>
          </div>

          <div class="form-field">
            <label for="p-stock">Stock quantity <span class="req">*</span></label>
            <input id="p-stock" formControlName="stockQuantity" type="number" step="1" min="0" placeholder="100" />
          </div>

          <div class="form-footer">
            <button type="button" class="btn btn-secondary" (click)="navigateBack()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || !form.valid || coverUploading() || anyGalleryUploading()">
              @if (saving()) { Saving… } @else { {{ isEditMode() ? '✓ Save changes' : '✓ Create product' }} }
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class StoreProductFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    primaryImageUrl: [''],
    sku: [''],
    wholesalePrice: [0, [Validators.required, Validators.min(0)]],
    retailPrice: [0, [Validators.required, Validators.min(0)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    status: ['ACTIVE'],
  });

  readonly isEditMode = signal(false);
  readonly loadingVariant = signal(false);
  readonly saving = signal(false);
  readonly successMsg = signal<string | null>(null);
  readonly errorMsg = signal<string | null>(null);

  readonly coverUploading = signal(false);
  readonly coverUploadProgress = signal(0);
  readonly coverDragOver = signal(false);
  readonly galleryDragOver = signal(false);

  readonly _galleryItems = signal<GalleryItem[]>([]);
  readonly galleryUrls = signal<string[]>([]);

  anyGalleryUploading(): boolean {
    return this._galleryItems().some(g => g.uploading);
  }

  private variantId: string | null = null;

  ngOnInit(): void {
    this.variantId = this.route.snapshot.paramMap.get('variantId');
    if (this.variantId) {
      this.isEditMode.set(true);
      this.loadVariant();
    }
  }

  private getStoreIdParam(): { storeId: string; isMe: boolean } {
    const storeIdParam = this.route.snapshot.parent?.paramMap.get('storeId') ?? 'me';
    return { storeId: storeIdParam, isMe: storeIdParam === 'me' };
  }

  private async resolveStoreIdForUpload(): Promise<string> {
    const { storeId, isMe } = this.getStoreIdParam();
    if (!isMe) return storeId;
    try {
      const api = this.authService.resolveApiBasePublic();
      const me: any = await firstValueFrom(this.http.get(`${api}/admin/stores/me`));
      return me?.id ?? storeId;
    } catch {
      return storeId;
    }
  }

  private async loadVariant(): Promise<void> {
    this.loadingVariant.set(true);
    try {
      const api = this.authService.resolveApiBasePublic();
      const { storeId, isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(storeId);
      const list = await firstValueFrom(
        this.http.get<InventoryVariant[] | { items?: InventoryVariant[]; data?: InventoryVariant[] }>(
          `${api}/admin/stores/${pathPart}/inventory`
        )
      );
      const arr = Array.isArray(list) ? list : (list.items ?? list.data ?? []);
      const found = (arr as InventoryVariant[]).find(v => v.variantId === this.variantId);
      if (found) {
        this.form.patchValue({
          title: found.productTitle ?? '',
          description: found.productDescription ?? '',
          primaryImageUrl: (found.variantImageUrl || found.productImageUrl) ?? '',
          sku: found.sku ?? '',
          wholesalePrice: found.wholesalePriceCents != null ? (found.wholesalePriceCents / 100) : 0,
          retailPrice: found.retailPriceCents != null ? (found.retailPriceCents / 100) : 0,
          stockQuantity: found.stockQuantity ?? 0,
          status: found.status ?? 'ACTIVE',
        });

        const productGallery = found.productGalleryImageUrls && Array.isArray(found.productGalleryImageUrls)
          ? found.productGalleryImageUrls
          : [];
        const variantGallery = found.variantGalleryImageUrls && Array.isArray(found.variantGalleryImageUrls)
          ? found.variantGalleryImageUrls
          : [];
        const merged = Array.from(new Set([...variantGallery, ...productGallery]));
        this.setInitialGallery(merged);
      }
    } catch (err) {
      console.error('Failed to load variant', err);
      this.showError('Could not load product data.');
    } finally {
      this.loadingVariant.set(false);
      this.cdr.markForCheck();
    }
  }

  private setInitialGallery(urls: string[]): void {
    const items: GalleryItem[] = urls.filter(u => u).map(url => ({
      id: 'init-' + Math.random().toString(36).slice(2, 9),
      url,
      uploading: false,
      progress: 100,
    }));
    this._galleryItems.set(items);
    this.galleryUrls.set(items.map(i => i.url));
  }

  // ---------- Cover upload ----------
  onCoverPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadCover(input.files[0]);
    }
    input.value = '';
  }

  onCoverDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.coverDragOver.set(true);
  }
  onCoverDragLeave(_ev: DragEvent): void { this.coverDragOver.set(false); }

  onCoverDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.coverDragOver.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadCover(file);
    }
  }

  private uploadCover(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showError('Only image files are allowed.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showError('Image is too large (max 20MB).');
      return;
    }
    this.coverUploading.set(true);
    this.coverUploadProgress.set(3);
    this.cdr.markForCheck();
    this.resolveStoreIdForUpload().then(storeId => {
      this.uploadImage(file, 'pending_product', storeId, this.coverUploadProgress)
        .then(url => {
          this.form.get('primaryImageUrl')?.setValue(url);
          this.showSuccess('Cover image uploaded.');
        })
        .catch(err => {
          console.error('Cover upload failed', err);
          this.showError(err?.message || 'Failed to upload cover image.');
        })
        .finally(() => {
          this.coverUploading.set(false);
          this.coverUploadProgress.set(0);
          this.cdr.markForCheck();
        });
    });
  }

  removeCover(): void {
    this.form.get('primaryImageUrl')?.setValue('');
  }

  // ---------- Gallery upload ----------
  onGalleryPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
      files.forEach(f => this.uploadGalleryFile(f));
    }
    input.value = '';
  }

  onGalleryDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.galleryDragOver.set(true);
  }
  onGalleryDragLeave(_ev: DragEvent): void { this.galleryDragOver.set(false); }

  onGalleryDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.galleryDragOver.set(false);
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .forEach(f => this.uploadGalleryFile(f));
    }
  }

  private uploadGalleryFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showError('Only image files are allowed.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showError('Image is too large (max 20MB).');
      return;
    }
    const id = 'g-' + Math.random().toString(36).slice(2, 10);
    const preview: GalleryItem = {
      id,
      url: URL.createObjectURL(file),
      uploading: true,
      progress: 3,
    };
    this._galleryItems.update(prev => [...prev, preview]);
    const progress = signal(3);
    this.resolveStoreIdForUpload().then(storeId => {
      this.uploadImage(file, 'pending_product', storeId, progress)
        .then(publicUrl => {
          this._galleryItems.update(arr => arr.map(g => g.id === id
            ? { ...g, url: publicUrl, uploading: false, progress: 100 }
            : g));
          this.rebuildGalleryUrls();
        })
        .catch(err => {
          console.error('Gallery upload failed', err);
          this.showError(err?.message || `Failed to upload ${file.name}.`);
          this._galleryItems.update(arr => arr.filter(g => g.id !== id));
        })
        .finally(() => {
          this.cdr.markForCheck();
        });
    });

    const poll = setInterval(() => {
      this._galleryItems.update(arr => arr.map(g => g.id === id && g.uploading
        ? { ...g, progress: Math.min(g.progress + 3, progress()) }
        : g));
      if (!this._galleryItems().find(g => g.id === id)?.uploading) {
        clearInterval(poll);
      }
      this.cdr.markForCheck();
    }, 100);
  }

  removeGalleryItem(id: string): void {
    this._galleryItems.update(arr => arr.filter(g => g.id !== id));
    this.rebuildGalleryUrls();
  }

  private rebuildGalleryUrls(): void {
    this.galleryUrls.set(
      this._galleryItems().filter(g => !g.uploading && g.url && !g.url.startsWith('blob:')).map(g => g.url)
    );
  }

  // ---------- Upload driver ----------
  private uploadImage(
    file: File,
    scope: 'pending_product' | 'pending_variant' | 'product' | 'variant',
    storeId: string,
    progressSignal?: WritableSignal<number>
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const api = this.authService.resolveApiBasePublic();
      const form = new FormData();
      form.append('file', file);
      form.append('scope', scope);
      form.append('store_id', storeId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${api}/images/upload`);
      const token = this.authService.getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (progressSignal) {
        xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            progressSignal.set(Math.max(3, pct < 100 ? pct : 97));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data: ImageUploadResult = JSON.parse(xhr.responseText);
            if (progressSignal) progressSignal.set(100);
            resolve(data.publicUrl);
          } catch (err) {
            reject(new Error('Invalid server response.'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData?.message || errData?.error || `Upload failed (${xhr.status}).`));
          } catch {
            reject(new Error(`Upload failed (HTTP ${xhr.status}).`));
          }
        }
      });
      xhr.addEventListener('error', () => {
        const url = `${api}/images/upload`;
        const hint = ` · Check backend is running (${url.split('/api')[0]})`;
        reject(new Error('Network error during upload.' + hint));
      });
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
      xhr.send(form);
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.form.valid || this.saving()) return;
    if (this.coverUploading() || this.anyGalleryUploading()) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    try {
      const api = this.authService.resolveApiBasePublic();
      const { storeId, isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(storeId);

      const raw = this.form.getRawValue();
      const gallery = this.galleryUrls();
      const payload: any = {
        title: raw.title || null,
        description: raw.description || null,
        imageUrl: raw.primaryImageUrl || null,
        variantImageUrl: raw.primaryImageUrl || null,
        productGalleryImageUrls: gallery.length ? gallery : null,
        variantGalleryImageUrls: gallery.length ? gallery : null,
        sku: raw.sku || null,
        wholesalePriceCents: Math.round(Number(raw.wholesalePrice || 0) * 100),
        retailPriceCents: Math.round(Number(raw.retailPrice || 0) * 100),
        stockQuantity: Number(raw.stockQuantity || 0),
        status: raw.status || 'ACTIVE',
      };

      let responseProductId: string | null = null;
      let responseVariantId: string | null = null;

      if (this.isEditMode() && this.variantId) {
        const resp = await firstValueFrom(
          this.http.put<any>(`${api}/admin/stores/${pathPart}/inventory/${encodeURIComponent(this.variantId)}`, payload)
        );
        responseProductId = resp?.productId ?? null;
        responseVariantId = resp?.variantId ?? this.variantId;
        this.showSuccess('Product updated successfully.');
      } else {
        const resp = await firstValueFrom(
          this.http.post<any>(`${api}/admin/stores/${pathPart}/inventory`, payload)
        );
        responseProductId = resp?.productId ?? null;
        responseVariantId = resp?.variantId ?? null;
        this.showSuccess('Product created successfully.');
      }

      const productId = responseProductId ?? responseVariantId;
      if (productId) {
        setTimeout(() => this.router.navigate(['/p', productId, 'qr']), 450);
      } else {
        setTimeout(() => this.navigateBack(), 500);
      }
    } catch (err: any) {
      console.error('Save failed', err);
      this.showError(err?.error?.message || 'Failed to save product. Please try again.');
    } finally {
      this.saving.set(false);
      this.cdr.markForCheck();
    }
  }

  navigateBack(): void {
    const { storeId, isMe } = this.getStoreIdParam();
    const storePath = isMe ? 'me' : storeId;
    this.router.navigate(['/admin', 'stores', storePath, 'products']);
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  private showError(msg: string): void {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(null), 4500);
  }
}
