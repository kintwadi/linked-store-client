import { Component, OnInit, signal, WritableSignal, inject, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
  variantAttributes?: Record<string, any> | null;
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

interface VariantCardState {
  key: string;
  expanded: WritableSignal<boolean>;
  coverUploading: WritableSignal<boolean>;
  coverUploadProgress: WritableSignal<number>;
  coverDragOver: WritableSignal<boolean>;
  galleryDragOver: WritableSignal<boolean>;
  galleryItems: WritableSignal<GalleryItem[]>;
  galleryUrls: WritableSignal<string[]>;
}

interface VariantViewRow {
  index: number;
  control: FormGroup;
  expanded: boolean;
  sku: string;
  wholesale: string;
  retail: string;
  stock: number;
  hasCover: boolean;
  coverUrl: string;
  coverUploading: boolean;
  coverUploadProgress: number;
  coverDragOver: boolean;
  galleryDragOver: boolean;
  galleryCount: number;
  galleryItems: GalleryItem[];
  chips: { key: string; value: string }[];
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

    .variants-section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px 16px 14px;
      display: grid;
      gap: 14px;
    }
    .variants-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .variants-title {
      font-size: 14px; font-weight: 700; color: #111827;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .variants-title .ico {
      width: 22px; height: 22px; border-radius: 6px;
      background: #fef3c7; color: #b45309;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px;
    }

    .variant-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fafafa;
      overflow: hidden;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .variant-card:hover { border-color: #d1d5db; }
    .variant-card.open { border-color: #c7d2fe; box-shadow: 0 1px 3px rgba(99,102,241,0.08); }

    .variant-card-head {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      cursor: pointer;
      user-select: none;
    }
    .variant-card-head:hover { background: #f3f4f6; }
    .variant-card-badge {
      width: 32px; height: 32px; border-radius: 9px;
      display: grid; place-items: center;
      background: #eef2ff; color: #4338ca;
      font-weight: 700; font-size: 13px;
      flex-shrink: 0;
    }
    .variant-card-title {
      display: grid; gap: 2px; min-width: 0;
    }
    .variant-card-title .name {
      font-size: 14px; font-weight: 700; color: #111827;
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .variant-card-title .name .sku-chip {
      background: #f3f4f6; color: #4b5563;
      padding: 2px 8px; border-radius: 999px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.01em;
    }
    .variant-card-title .meta {
      font-size: 12px; color: #6b7280; font-weight: 500;
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .variant-card-title .meta .sep { color: #d1d5db; }
    .variant-card-head-actions {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .chev {
      width: 28px; height: 28px; border-radius: 8px;
      display: grid; place-items: center;
      background: #f3f4f6; color: #6b7280;
      transition: transform .2s ease, background .15s ease;
      font-size: 13px;
    }
    .variant-card.open .chev { transform: rotate(180deg); background: #eef2ff; color: #4338ca; }

    .variant-card-body {
      display: grid; gap: 14px;
      padding: 4px 14px 16px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }
    .variant-card-body.hidden-body { display: none; }

    .variant-quick-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr;
      gap: 10px 12px;
      padding: 12px 0 4px;
    }
    @media (max-width: 860px) { .variant-quick-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 480px) { .variant-quick-grid { grid-template-columns: 1fr; } }
    .variant-quick-grid .form-field { gap: 4px; }
    .variant-quick-grid .form-field label { font-size: 12px; }
    .variant-quick-grid .form-field input { padding: 9px 11px; font-size: 13px; }

    .variant-subsection {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 10px; padding: 12px 14px;
      display: grid; gap: 10px;
    }
    .variant-subsection-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    }
    .variant-subsection-title {
      font-size: 13px; font-weight: 700; color: #111827;
      display: inline-flex; align-items: center; gap: 7px;
    }
    .variant-subsection-title .ico {
      width: 20px; height: 20px; border-radius: 6px;
      background: #dbeafe; color: #1d4ed8;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 10px;
    }
    .variant-subsection-title .ico.green { background: #dcfce7; color: #166534; }
    .variant-subsection-title .ico.amber { background: #fef3c7; color: #b45309; }
    .variant-subsection-title .ico.violet { background: #ede9fe; color: #6d28d9; }
    .variant-subsection-hint { font-size: 11px; color: #6b7280; font-weight: 500; }

    .variant-cover-grid {
      display: grid; grid-template-columns: 160px 1fr; gap: 12px; align-items: start;
    }
    @media (max-width: 640px) { .variant-cover-grid { grid-template-columns: 1fr; } }
    .variant-cover-preview {
      width: 160px; height: 160px; border-radius: 10px;
      background: #f3f4f6; border: 1px solid #e5e7eb;
      overflow: hidden; position: relative;
      display: grid; place-items: center;
    }
    .variant-cover-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .variant-cover-preview .ph { color: #9ca3af; font-size: 12px; display: grid; place-items: center; gap: 4px; }
    .variant-cover-preview .ph .ico { font-size: 28px; }
    .variant-cover-preview .overlay-up {
      position: absolute; inset: 0;
      background: rgba(17, 24, 39, 0.68);
      color: #fff; display: grid; place-items: center; gap: 6px;
      font-size: 11px; font-weight: 600;
    }
    .variant-cover-preview .overlay-up .bar { width: 80%; height: 5px; background: rgba(255,255,255,0.2); border-radius: 999px; overflow: hidden; }
    .variant-cover-preview .overlay-up .bar > div { height: 100%; background: #34d399; border-radius: 999px; }
    .variant-cover-preview .overlay-del {
      position: absolute; inset: 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%);
      opacity: 0; transition: opacity .15s ease;
      display: grid; align-items: end; padding: 8px;
    }
    .variant-cover-preview:hover .overlay-del { opacity: 1; }

    .mini-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
    }
    .mini-gallery-item {
      aspect-ratio: 1 / 1; border-radius: 8px; background: #f3f4f6;
      border: 1px solid #e5e7eb; overflow: hidden; position: relative;
    }
    .mini-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .mini-gallery-item .ph { width: 100%; height: 100%; display: grid; place-items: center; color: #9ca3af; font-size: 20px; }
    .mini-gallery-item .remove-btn {
      position: absolute; top: 4px; right: 4px;
      width: 22px; height: 22px; border-radius: 6px;
      background: rgba(239,68,68,0.95); color: #fff; border: none;
      display: grid; place-items: center; cursor: pointer;
      font-size: 11px; font-weight: 700; opacity: 0; transition: opacity .15s ease;
      backdrop-filter: blur(3px);
    }
    .mini-gallery-item:hover .remove-btn { opacity: 1; }
    .mini-gallery-item .up-overlay {
      position: absolute; inset: 0;
      background: rgba(17,24,39,0.72); color: #fff;
      display: grid; place-items: center; gap: 4px;
      font-size: 10px; font-weight: 600;
    }
    .mini-gallery-item .up-overlay .bar { width: 80%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 999px; overflow: hidden; }
    .mini-gallery-item .up-overlay .bar > div { height: 100%; background: #34d399; border-radius: 999px; }

    .mini-gallery-dropzone {
      aspect-ratio: 1 / 1; border-radius: 8px;
      border: 2px dashed #cbd5e1; background: #f8fafc;
      display: grid; place-items: center; gap: 2px;
      cursor: pointer; color: #6b7280;
      transition: border-color .15s ease, background .15s ease;
    }
    .mini-gallery-dropzone:hover { border-color: var(--color-primary); background: #eef2ff44; color: var(--color-primary); }
    .mini-gallery-dropzone .ico { font-size: 20px; }
    .mini-gallery-dropzone .label { font-size: 10px; font-weight: 600; text-align: center; }
    .mini-gallery-dropzone input[type=file] { display: none; }

    .attr-table { display: grid; gap: 8px; }
    .attr-row {
      display: grid; grid-template-columns: 1fr 1.5fr auto;
      gap: 8px; align-items: center;
    }
    @media (max-width: 640px) { .attr-row { grid-template-columns: 1fr; } }
    .attr-row .form-field { gap: 4px; }
    .attr-row .form-field label { font-size: 11px; }
    .attr-row .form-field input { padding: 8px 10px; font-size: 13px; }
    .btn-add-attr {
      justify-self: start;
      background: #eef2ff; color: #4338ca;
      padding: 8px 12px; border-radius: 8px;
      font-size: 12px; font-weight: 600;
      border: 1px solid #c7d2fe;
      display: inline-flex; align-items: center; gap: 5px;
      cursor: pointer; transition: background .15s ease;
    }
    .btn-add-attr:hover { background: #e0e7ff; }

    .mini-dropzone {
      border: 2px dashed #cbd5e1; background: #f8fafc;
      border-radius: 10px; padding: 12px 10px;
      display: grid; place-items: center; gap: 4px;
      cursor: pointer;
      transition: border-color .15s ease, background .15s ease;
    }
    .mini-dropzone:hover { border-color: var(--color-primary); background: #eef2ff33; }
    .mini-dropzone.dragging { border-color: var(--color-primary); background: #eef2ff; }
    .mini-dropzone .dz-ico { width: 28px; height: 28px; border-radius: 8px; background: #e0f2fe; color: #0369a1; display: grid; place-items: center; font-size: 14px; }
    .mini-dropzone .dz-title { font-size: 12px; font-weight: 600; color: #111827; }
    .mini-dropzone .dz-sub { font-size: 10px; color: #6b7280; }
    .mini-dropzone input[type=file] { display: none; }

    .variants-foot {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px; flex-wrap: wrap;
      padding-top: 4px;
    }
    .variants-count { font-size: 12px; color: #6b7280; font-weight: 500; }
    .btn-add-variant {
      background: #eef2ff;
      color: #4338ca;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #c7d2fe;
      display: inline-flex; align-items: center; gap: 6px;
      cursor: pointer;
      transition: background .15s ease;
    }
    .btn-add-variant:hover { background: #e0e7ff; }
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

          <div class="form-field" style="max-width: 320px;">
            <label for="p-status">Status</label>
            <select id="p-status" formControlName="status">
              <option value="ACTIVE">🟢 ACTIVE</option>
              <option value="DRAFT">🟡 DRAFT</option>
              <option value="ARCHIVED">⚪ ARCHIVED</option>
            </select>
          </div>

          <!-- ===== VARIANTS ===== -->
          <div class="variants-section">
            <div class="variants-head">
              <div class="variants-title">
                <span class="ico">⎈</span>
                Variants
                <span style="font-weight: 500; color: #6b7280; font-size: 12px; margin-left: 6px;">
                  ({{ variants.length }} configured)
                </span>
              </div>
              <span class="media-hint">Each variant is like its own mini-product with cover, gallery, and traits</span>
            </div>

            <div class="variants-table">
              <div formArrayName="variants">
                @for (row of variantViewRows(); track row.index; let i = $index) {
                  <div
                    class="variant-card"
                    [class.open]="row.expanded"
                    [formGroupName]="row.index"
                  >
                    <div class="variant-card-head" (click)="toggleVariantExpand(row.index)">
                      <div class="variant-card-badge"><span [textContent]="row.index + 1"></span></div>
                      <div class="variant-card-title">
                        <div class="name">
                          Variant
                          @if (row.sku) { <span class="sku-chip">SKU - <span [textContent]="row.sku"></span></span> }
                          @for (c of row.chips; track c; let ci = $index) {
                            <span class="sku-chip"><span [textContent]="c.key"></span>: <span [textContent]="c.value"></span></span>
                          }
                        </div>
                        <div class="meta">
                          <span>Wholesale $<span [textContent]="row.wholesale"></span></span>
                          <span class="sep">|</span>
                          <span>Retail $<span [textContent]="row.retail"></span></span>
                          <span class="sep">|</span>
                          <span>Stock <span [textContent]="row.stock"></span></span>
                          @if (row.hasCover) { <span class="sep">|</span><span>Picture Cover set</span> }
                          @if (row.galleryCount > 0) { <span class="sep">|</span><span>Picture <span [textContent]="row.galleryCount"></span> gallery</span> }
                        </div>
                      </div>
                      <div class="variant-card-head-actions" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          class="btn btn-danger-ghost"
                          (click)="removeVariantRow(row.index)"
                          [disabled]="variants.length <= 1"
                          title="Remove variant"
                        >
                          X Remove
                        </button>
                        <div class="chev">v</div>
                      </div>
                    </div>

                    <div class="variant-card-body" [class.hidden-body]="!row.expanded">
                      <div class="variant-quick-grid">
                        <div class="form-field">
                          <label>SKU</label>
                          <input type="text" formControlName="sku" [placeholder]="'e.g. SKU-00' + (row.index + 1)" />
                        </div>
                        <div class="form-field">
                          <label>Wholesale ($) <span class="req">*</span></label>
                          <input type="number" formControlName="wholesalePrice" step="0.01" min="0" placeholder="12.50" />
                        </div>
                        <div class="form-field">
                          <label>Retail ($) <span class="req">*</span></label>
                          <input type="number" formControlName="retailPrice" step="0.01" min="0" placeholder="24.99" />
                        </div>
                        <div class="form-field">
                          <label>Stock Qty <span class="req">*</span></label>
                          <input type="number" formControlName="stockQuantity" step="1" min="0" placeholder="100" />
                        </div>
                      </div>

                      <!-- Description -->
                      <div class="variant-subsection">
                        <div class="variant-subsection-head">
                          <div class="variant-subsection-title">
                            <span class="ico amber">=</span> Variant description
                          </div>
                          <span class="variant-subsection-hint">Optional: specifics shown to customers for this variant only</span>
                        </div>
                        <div class="form-field">
                          <textarea
                            formControlName="variantDescription"
                            rows="3"
                            placeholder="e.g. Limited-edition indigo wash, midweight 280 gsm, pre-shrunk..."
                          ></textarea>
                        </div>
                      </div>

                      <!-- Attributes -->
                      <div class="variant-subsection">
                        <div class="variant-subsection-head">
                          <div class="variant-subsection-title">
                            <span class="ico violet">+</span> Custom characteristics
                          </div>
                          <span class="variant-subsection-hint">Label-value pairs: Size / Color / Material / Edition ...</span>
                        </div>
                        <div class="attr-table" formArrayName="attributes">
                          @for (ag of getVariantAttributes(row.index).controls; track ag; let ai = $index) {
                            <div class="attr-row" [formGroupName]="ai">
                              <div class="form-field">
                                <label>Label</label>
                                <input type="text" formControlName="key" placeholder="e.g. Size" />
                              </div>
                              <div class="form-field">
                                <label>Value</label>
                                <input type="text" formControlName="value" placeholder="e.g. XL" />
                              </div>
                              <div style="justify-self: end;">
                                <button
                                  type="button"
                                  class="btn btn-danger-ghost"
                                  (click)="removeVariantAttribute(row.index, ai)"
                                  title="Remove characteristic"
                                >
                                  X
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                        <button type="button" class="btn-add-attr" (click)="addVariantAttribute(row.index)">
                          + Add characteristic
                        </button>
                      </div>

                      <!-- Variant cover -->
                      <div class="variant-subsection">
                        <div class="variant-subsection-head">
                          <div class="variant-subsection-title">
                            <span class="ico">Image</span> Variant cover image
                          </div>
                          <span class="variant-subsection-hint">Overrides the shared product cover for this specific variant</span>
                        </div>
                        <div class="variant-cover-grid">
                          <div class="variant-cover-preview">
                            @if (row.hasCover) {
                              <img [src]="row.coverUrl" alt="Variant cover" />
                            } @else {
                              <div class="ph"><div class="ico">Image</div><span>No variant cover</span></div>
                            }
                            @if (row.coverUploading) {
                              <div class="overlay-up">
                                <div>Uploading <span [textContent]="row.coverUploadProgress"></span>%</div>
                                <div class="bar"><div [style.width.%]="row.coverUploadProgress"></div></div>
                              </div>
                            } @else if (row.hasCover) {
                              <div class="overlay-del">
                                <button type="button" class="btn btn-danger-ghost" (click)="removeVariantCover(row.index)">Remove cover</button>
                              </div>
                            }
                          </div>
                          <div style="display: grid; gap: 10px; align-self: stretch;">
                            <label
                              class="mini-dropzone"
                              [class.dragging]="row.coverDragOver"
                              (dragover)="onVariantCoverDragOver(row.index, $event)"
                              (dragleave)="onVariantCoverDragLeave(row.index, $event)"
                              (drop)="onVariantCoverDrop(row.index, $event)"
                            >
                              <input type="file" accept="image/*" (change)="onVariantCoverPicked(row.index, $event)" />
                              <span class="dz-ico">Up</span>
                              <span class="dz-title">Upload variant cover</span>
                              <span class="dz-sub">Click to browse, or drag & drop</span>
                            </label>
                            <div class="form-field">
                              <label>...or paste an image URL</label>
                              <input type="text" formControlName="variantImageUrl" placeholder="https://... (optional)" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Variant gallery -->
                      <div class="variant-subsection">
                        <div class="variant-subsection-head">
                          <div class="variant-subsection-title">
                            <span class="ico green">Image</span> Variant gallery images
                            <span style="font-weight: 500; color: #6b7280; font-size: 11px; margin-left: 6px;">
                              (<span [textContent]="row.galleryCount"></span> uploaded)
                            </span>
                          </div>
                          <span class="variant-subsection-hint">Additional photos shown only for this variant</span>
                        </div>
                        <div class="mini-gallery-grid">
                          @for (item of row.galleryItems; track item.id) {
                            <div class="mini-gallery-item">
                              @if (item.url) { <img [src]="item.url" alt="Variant gallery" /> }
                              @else { <div class="ph">Image</div> }
                              @if (item.uploading) {
                                <div class="up-overlay">
                                  <div>Uploading <span [textContent]="item.progress"></span>%</div>
                                  <div class="bar"><div [style.width.%]="item.progress"></div></div>
                                </div>
                              } @else {
                                <button type="button" class="remove-btn" (click)="removeVariantGalleryItem(row.index, item.id)" title="Remove">X</button>
                              }
                            </div>
                          }
                          <label
                            class="mini-gallery-dropzone"
                            [class.dragging]="row.galleryDragOver"
                            (dragover)="onVariantGalleryDragOver(row.index, $event)"
                            (dragleave)="onVariantGalleryDragLeave(row.index, $event)"
                            (drop)="onVariantGalleryDrop(row.index, $event)"
                          >
                            <input type="file" accept="image/*" multiple (change)="onVariantGalleryPicked(row.index, $event)" />
                            <span class="ico">+</span>
                            <span class="label">Add images</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="variants-foot">
              <span class="variants-count">
                Tip: Add variants for different sizes, colors, or editions. Each can have its own cover, gallery, and description.
              </span>
              <button type="button" class="btn-add-variant" (click)="addVariantRow()">
                <span>＋</span> Add variant
              </button>
            </div>
          </div>

          <div class="form-footer">
            <button type="button" class="btn btn-secondary" (click)="navigateBack()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || !form.valid || coverUploading() || anyGalleryUploading() || anyVariantUploading()">
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

  private readonly _variantStates = signal<Map<string, VariantCardState>>(new Map());

  private _genStateKey(): string {
    return 'vs-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36).slice(-4);
  }

  getVariantState(index: number): VariantCardState | undefined {
    const ctrl = this.variants.at(index);
    const key = (ctrl as any)?._vk as string | undefined;
    return key ? this._variantStates().get(key) : undefined;
  }

  private _attachStateToControl(ctrl: FormGroup): VariantCardState {
    const key = this._genStateKey();
    (ctrl as any)._vk = key;
    const state: VariantCardState = {
      key,
      expanded: signal(true),
      coverUploading: signal(false),
      coverUploadProgress: signal(0),
      coverDragOver: signal(false),
      galleryDragOver: signal(false),
      galleryItems: signal<GalleryItem[]>([]),
      galleryUrls: signal<string[]>([]),
    };
    this._variantStates.update(m => {
      const n = new Map(m);
      n.set(key, state);
      return n;
    });
    return state;
  }

  private _dropStateForControl(ctrl: FormGroup): void {
    const key = (ctrl as any)?._vk as string | undefined;
    if (!key) return;
    this._variantStates.update(m => {
      const n = new Map(m);
      n.delete(key);
      return n;
    });
  }

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    primaryImageUrl: [''],
    status: ['ACTIVE'],
    variants: this.fb.array([
      this.newVariantRow(),
    ]),
  });

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  toggleVariantExpand(index: number): void {
    const st = this.getVariantState(index);
    if (st) st.expanded.update(v => !v);
    this.cdr.markForCheck();
  }

  private newVariantRow(
    sku?: string, wholesalePrice?: number, retailPrice?: number, stockQuantity?: number,
    variantImageUrl?: string, variantDescription?: string,
    initialGalleryUrls?: string[],
    attributes?: { key: string; value: string }[]
  ): FormGroup {
    const ctrl = this.fb.group({
      sku: [sku ?? ''],
      wholesalePrice: [wholesalePrice ?? 0, [Validators.required, Validators.min(0)]],
      retailPrice: [retailPrice ?? 0, [Validators.required, Validators.min(0)]],
      stockQuantity: [stockQuantity ?? 0, [Validators.required, Validators.min(0)]],
      variantImageUrl: [variantImageUrl ?? ''],
      variantDescription: [variantDescription ?? ''],
      attributes: this.fb.array(
        (attributes ?? []).map(a => this.fb.group({ key: [a.key ?? ''], value: [a.value ?? ''] }))
      ),
    });
    const st = this._attachStateToControl(ctrl);
    if (initialGalleryUrls && initialGalleryUrls.length) {
      const items: GalleryItem[] = initialGalleryUrls.filter(u => u).map(url => ({
        id: 'vinit-' + Math.random().toString(36).slice(2, 9),
        url, uploading: false, progress: 100,
      }));
      st.galleryItems.set(items);
      st.galleryUrls.set(items.map(i => i.url));
    }
    return ctrl;
  }

  getVariantAttributes(index: number): FormArray {
    return (this.variants.at(index) as FormGroup).get('attributes') as FormArray;
  }

  addVariantAttribute(index: number): void {
    const arr = this.getVariantAttributes(index);
    arr.push(this.fb.group({ key: [''], value: [''] }));
    this.cdr.markForCheck();
  }

  removeVariantAttribute(variantIndex: number, attrIndex: number): void {
    const arr = this.getVariantAttributes(variantIndex);
    arr.removeAt(attrIndex);
    this.cdr.markForCheck();
  }

  addVariantRow(): void {
    this.variants.push(this.newVariantRow());
    this.cdr.markForCheck();
  }

  removeVariantRow(index: number): void {
    if (this.variants.length <= 1) return;
    const ctrl = this.variants.at(index) as FormGroup;
    this._dropStateForControl(ctrl);
    this.variants.removeAt(index);
    this.cdr.markForCheck();
  }

  anyVariantUploading(): boolean {
    for (const st of this._variantStates().values()) {
      if (st.coverUploading()) return true;
      if (st.galleryItems().some(g => g.uploading)) return true;
    }
    return false;
  }

  variantState(index: number): VariantCardState | undefined {
    return this.getVariantState(index);
  }

  variantRaw(index: number): any {
    try {
      return (this.variants.at(index) as FormGroup).getRawValue();
    } catch {
      return {};
    }
  }

  variantWholesalePrice(index: number): string {
    const r = this.variantRaw(index);
    return Number(r?.wholesalePrice ?? 0).toFixed(2);
  }

  variantRetailPrice(index: number): string {
    const r = this.variantRaw(index);
    return Number(r?.retailPrice ?? 0).toFixed(2);
  }

  variantDisplay(index: number): {
    sku: string;
    wholesale: string;
    retail: string;
    stock: number;
    hasCover: boolean;
    galleryCount: number;
    chips: { key: string; value: string }[];
  } {
    const r = this.variantRaw(index);
    const chips: { key: string; value: string }[] = [];
    if (Array.isArray(r?.attributes)) {
      for (const a of r.attributes) {
        if (a?.key && a?.value) chips.push({ key: String(a.key), value: String(a.value) });
      }
    }
    return {
      sku: r?.sku ? String(r.sku) : '',
      wholesale: Number(r?.wholesalePrice ?? 0).toFixed(2),
      retail: Number(r?.retailPrice ?? 0).toFixed(2),
      stock: Number(r?.stockQuantity ?? 0),
      hasCover: !!(r?.variantImageUrl && String(r.variantImageUrl).length > 0),
      galleryCount: this.variantGalleryCount(index),
      chips,
    };
  }

  variantSku(index: number): string { return this.variantDisplay(index).sku; }
  variantDisplayWholesale(index: number): string { return this.variantDisplay(index).wholesale; }
  variantDisplayRetail(index: number): string { return this.variantDisplay(index).retail; }
  variantDisplayStock(index: number): number { return this.variantDisplay(index).stock; }
  variantHasCover(index: number): boolean { return this.variantDisplay(index).hasCover; }
  variantDisplayGalleryCount(index: number): number { return this.variantDisplay(index).galleryCount; }
  variantAttributeChips(index: number): { key: string; value: string }[] { return this.variantDisplay(index).chips; }

  variantGalleryCount(index: number): number {
    return this.getVariantState(index)?.galleryUrls()?.length ?? 0;
  }

  variantExpanded(index: number): boolean { return this.variantState(index)?.expanded() ?? true; }
  variantCoverUploading(index: number): boolean { return !!(this.variantState(index)?.coverUploading()); }
  variantCoverUploadProgress(index: number): number { return this.variantState(index)?.coverUploadProgress() ?? 0; }
  variantCoverDragOver(index: number): boolean { return !!(this.variantState(index)?.coverDragOver()); }
  variantGalleryItems(index: number): GalleryItem[] { return this.variantState(index)?.galleryItems() ?? []; }
  variantGalleryDragOver(index: number): boolean { return !!(this.variantState(index)?.galleryDragOver()); }
  variantCoverUrl(index: number): string {
    try {
      const v = (this.variants.at(index) as FormGroup).getRawValue();
      return (v?.variantImageUrl as string) ?? '';
    } catch {
      return '';
    }
  }
  variantHasCoverUrl(index: number): boolean {
    const u = this.variantCoverUrl(index);
    return !!u && String(u).length > 0;
  }
  variantAttributesControls(index: number): any {
    return this.getVariantAttributes(index).controls;
  }

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

  private readonly _variantViewTick = signal(0);
  readonly variantViewRows = computed<VariantViewRow[]>(() => {
    this._variantViewTick();
    const ctrlArr = this.variants;
    const rows: VariantViewRow[] = [];
    for (let idx = 0; idx < ctrlArr.length; idx++) {
      const control = ctrlArr.at(idx) as FormGroup;
      const raw = control.getRawValue();
      const state = this.getVariantState(idx);
      const chips: { key: string; value: string }[] = [];
      if (Array.isArray(raw?.attributes)) {
        for (const a of raw.attributes) {
          if (a?.key && a?.value) chips.push({ key: String(a.key), value: String(a.value) });
        }
      }
      const galleryItems: GalleryItem[] = state ? state.galleryItems() : [];
      const coverUrl: string = (raw?.variantImageUrl as string) ?? '';
      rows.push({
        index: idx,
        control,
        expanded: state ? state.expanded() : true,
        sku: raw?.sku ? String(raw.sku) : '',
        wholesale: Number(raw?.wholesalePrice ?? 0).toFixed(2),
        retail: Number(raw?.retailPrice ?? 0).toFixed(2),
        stock: Number(raw?.stockQuantity ?? 0),
        hasCover: !!coverUrl && String(coverUrl).length > 0,
        coverUrl,
        coverUploading: !!(state?.coverUploading()),
        coverUploadProgress: state?.coverUploadProgress() ?? 0,
        coverDragOver: !!(state?.coverDragOver()),
        galleryDragOver: !!(state?.galleryDragOver()),
        galleryCount: state ? state.galleryUrls().length : 0,
        galleryItems,
        chips,
      });
    }
    return rows;
  });
  private bumpVariantView(): void {
    this._variantViewTick.update(t => (t + 1) % 1_000_000);
  }

  anyGalleryUploading(): boolean {
    return this._galleryItems().some(g => g.uploading);
  }

  private variantId: string | null = null;
  private _vviewTimer: any = null;

  ngOnInit(): void {
    this.variantId = this.route.snapshot.paramMap.get('variantId');
    if (this.variantId) {
      this.isEditMode.set(true);
      this.loadVariant();
    }
    this._vviewTimer = setInterval(() => this.bumpVariantView(), 250);
  }

  ngOnDestroy(): void {
    if (this._vviewTimer) { clearInterval(this._vviewTimer); this._vviewTimer = null; }
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
      const found = await firstValueFrom(
        this.http.get<InventoryVariant>(
          `${api}/admin/stores/${pathPart}/inventory/${encodeURIComponent(this.variantId!)}`
        )
      );
      if (found) {
        this.form.patchValue({
          title: found.productTitle ?? '',
          description: found.productDescription ?? '',
          primaryImageUrl: (found.variantImageUrl || found.productImageUrl) ?? '',
          status: found.status ?? 'ACTIVE',
        });

        this.variants.clear();
        const variantGallery = found.variantGalleryImageUrls && Array.isArray(found.variantGalleryImageUrls)
          ? found.variantGalleryImageUrls
          : [];
        const attrsRaw = found.variantAttributes ?? {};
        let variantDesc = '';
        const attrPairs: { key: string; value: string }[] = [];
        if (attrsRaw && typeof attrsRaw === 'object') {
          for (const [k, v] of Object.entries(attrsRaw as Record<string, any>)) {
            if (k === 'description' && typeof v === 'string') {
              variantDesc = v;
            } else {
              attrPairs.push({ key: k, value: typeof v === 'string' ? v : String(v ?? '') });
            }
          }
        }
        this.variants.push(this.newVariantRow(
          found.sku ?? '',
          found.wholesalePriceCents != null ? (found.wholesalePriceCents / 100) : 0,
          found.retailPriceCents != null ? (found.retailPriceCents / 100) : 0,
          found.stockQuantity ?? 0,
          found.variantImageUrl ?? '',
          variantDesc,
          variantGallery,
          attrPairs,
        ));

        const productGallery = found.productGalleryImageUrls && Array.isArray(found.productGalleryImageUrls)
          ? found.productGalleryImageUrls
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

  // ---------- Variant helpers ----------
  onVariantCoverPicked(index: number, ev: Event): void {
    const st = this.getVariantState(index);
    const input = ev.target as HTMLInputElement;
    if (st && input.files && input.files.length > 0) {
      this.uploadVariantCover(index, st, input.files[0]);
    }
    input.value = '';
  }

  onVariantCoverDragOver(index: number, ev: DragEvent): void {
    ev.preventDefault();
    this.getVariantState(index)?.coverDragOver.set(true);
  }
  onVariantCoverDragLeave(index: number, _ev: DragEvent): void {
    this.getVariantState(index)?.coverDragOver.set(false);
  }

  onVariantCoverDrop(index: number, ev: DragEvent): void {
    ev.preventDefault();
    const st = this.getVariantState(index);
    if (!st) return;
    st.coverDragOver.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadVariantCover(index, st, file);
    }
  }

  private uploadVariantCover(index: number, st: VariantCardState, file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showError('Only image files are allowed.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showError('Image is too large (max 20MB).');
      return;
    }
    st.coverUploading.set(true);
    st.coverUploadProgress.set(3);
    this.cdr.markForCheck();
    this.resolveStoreIdForUpload().then(storeId => {
      this.uploadImage(file, 'pending_variant', storeId, st.coverUploadProgress)
        .then(url => {
          (this.variants.at(index) as FormGroup).get('variantImageUrl')?.setValue(url);
          this.showSuccess('Variant cover image uploaded.');
        })
        .catch(err => {
          console.error('Variant cover upload failed', err);
          this.showError(err?.message || 'Failed to upload variant cover.');
        })
        .finally(() => {
          st.coverUploading.set(false);
          st.coverUploadProgress.set(0);
          this.cdr.markForCheck();
        });
    });
  }

  removeVariantCover(index: number): void {
    (this.variants.at(index) as FormGroup).get('variantImageUrl')?.setValue('');
  }

  onVariantGalleryPicked(index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
      files.forEach(f => this.uploadVariantGalleryFile(index, f));
    }
    input.value = '';
  }
  onVariantGalleryDragOver(index: number, ev: DragEvent): void {
    ev.preventDefault();
    this.getVariantState(index)?.galleryDragOver.set(true);
  }
  onVariantGalleryDragLeave(index: number, _ev: DragEvent): void {
    this.getVariantState(index)?.galleryDragOver.set(false);
  }
  onVariantGalleryDrop(index: number, ev: DragEvent): void {
    ev.preventDefault();
    const st = this.getVariantState(index);
    if (!st) return;
    st.galleryDragOver.set(false);
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files).filter(f => f.type.startsWith('image/')).forEach(f => this.uploadVariantGalleryFile(index, f));
    }
  }

  private uploadVariantGalleryFile(index: number, file: File): void {
    const st = this.getVariantState(index);
    if (!st) return;
    if (!file.type.startsWith('image/')) {
      this.showError('Only image files are allowed.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showError('Image is too large (max 20MB).');
      return;
    }
    const id = 'vg-' + index + '-' + Math.random().toString(36).slice(2, 10);
    const preview: GalleryItem = {
      id, url: URL.createObjectURL(file), uploading: true, progress: 3,
    };
    st.galleryItems.update(prev => [...prev, preview]);
    const progress = signal(3);
    this.resolveStoreIdForUpload().then(storeId => {
      this.uploadImage(file, 'pending_variant', storeId, progress)
        .then(publicUrl => {
          st.galleryItems.update(arr => arr.map(g => g.id === id
            ? { ...g, url: publicUrl, uploading: false, progress: 100 }
            : g));
          st.galleryUrls.set(
            st.galleryItems().filter(g => !g.uploading && g.url && !g.url.startsWith('blob:')).map(g => g.url)
          );
        })
        .catch(err => {
          console.error('Variant gallery upload failed', err);
          this.showError(err?.message || `Failed to upload ${file.name}.`);
          st.galleryItems.update(arr => arr.filter(g => g.id !== id));
        })
        .finally(() => this.cdr.markForCheck());
    });
    const poll = setInterval(() => {
      st.galleryItems.update(arr => arr.map(g => g.id === id && g.uploading
        ? { ...g, progress: Math.min(g.progress + 3, progress()) }
        : g));
      if (!st.galleryItems().find(g => g.id === id)?.uploading) {
        clearInterval(poll);
      }
      this.cdr.markForCheck();
    }, 100);
  }

  removeVariantGalleryItem(index: number, itemId: string): void {
    const st = this.getVariantState(index);
    if (!st) return;
    st.galleryItems.update(arr => arr.filter(g => g.id !== itemId));
    st.galleryUrls.set(
      st.galleryItems().filter(g => !g.uploading && g.url && !g.url.startsWith('blob:')).map(g => g.url)
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
    if (this.anyVariantUploading()) return;
    if (this.variants.length < 1) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    try {
      const api = this.authService.resolveApiBasePublic();
      const { storeId, isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(storeId);

      const raw = this.form.getRawValue();
      const gallery = this.galleryUrls();
      const variantRows: any[] = raw.variants ?? [];

      const buildVariantAttributes = (row: any): Record<string, any> | null => {
        const out: Record<string, any> = {};
        if (row.variantDescription && typeof row.variantDescription === 'string' && row.variantDescription.trim().length > 0) {
          out['description'] = row.variantDescription.trim();
        }
        if (Array.isArray(row.attributes)) {
          for (const a of row.attributes) {
            const k = (a?.key ?? '').toString().trim();
            const v = (a?.value ?? '').toString().trim();
            if (k.length > 0) out[k] = v;
          }
        }
        return Object.keys(out).length > 0 ? out : null;
      };

      const productLevelPayload = {
        title: raw.title || null,
        description: raw.description || null,
        imageUrl: raw.primaryImageUrl || null,
        productGalleryImageUrls: gallery.length ? gallery : null,
        status: raw.status || 'ACTIVE',
      };

      let responseProductId: string | null = null;
      let responseVariantId: string | null = null;

      if (this.isEditMode() && this.variantId) {
        const firstRow = variantRows[0] ?? {};
        const firstState = this.getVariantState(0);
        const variantGalleryUrls = firstState?.galleryUrls() ?? [];
        const payload: any = {
          ...productLevelPayload,
          sku: firstRow.sku || null,
          wholesalePriceCents: Math.round(Number(firstRow.wholesalePrice || 0) * 100),
          retailPriceCents: Math.round(Number(firstRow.retailPrice || 0) * 100),
          stockQuantity: Number(firstRow.stockQuantity || 0),
          variantImageUrl: firstRow.variantImageUrl || null,
          variantGalleryImageUrls: variantGalleryUrls.length ? variantGalleryUrls : null,
          variantAttributes: buildVariantAttributes(firstRow),
        };
        const resp = await firstValueFrom(
          this.http.put<any>(`${api}/admin/stores/${pathPart}/inventory/${encodeURIComponent(this.variantId)}`, payload)
        );
        responseProductId = resp?.productId ?? null;
        responseVariantId = resp?.variantId ?? this.variantId;
        this.showSuccess('Product updated successfully.');
      } else {
        for (let i = 0; i < variantRows.length; i++) {
          const vr = variantRows[i];
          const vst = this.getVariantState(i);
          const vGalleryUrls = vst?.galleryUrls() ?? [];
          const attrs = buildVariantAttributes(vr);

          const isFirstRow = i === 0;
          const payload: any = isFirstRow
            ? {
                ...productLevelPayload,
                sku: vr.sku || null,
                wholesalePriceCents: Math.round(Number(vr.wholesalePrice || 0) * 100),
                retailPriceCents: Math.round(Number(vr.retailPrice || 0) * 100),
                stockQuantity: Number(vr.stockQuantity || 0),
                variantImageUrl: vr.variantImageUrl || (raw.primaryImageUrl || null),
                variantGalleryImageUrls: vGalleryUrls.length ? vGalleryUrls : (gallery.length ? gallery : null),
                variantAttributes: attrs,
              }
            : {
                title: null,
                description: null,
                imageUrl: null,
                productGalleryImageUrls: null,
                status: raw.status || 'ACTIVE',
                productId: responseProductId,
                sku: vr.sku || null,
                wholesalePriceCents: Math.round(Number(vr.wholesalePrice || 0) * 100),
                retailPriceCents: Math.round(Number(vr.retailPrice || 0) * 100),
                stockQuantity: Number(vr.stockQuantity || 0),
                variantImageUrl: vr.variantImageUrl || null,
                variantGalleryImageUrls: vGalleryUrls.length ? vGalleryUrls : null,
                variantAttributes: attrs,
              };

          try {
            const resp = await firstValueFrom(
              this.http.post<any>(`${api}/admin/stores/${pathPart}/inventory`, payload)
            );
            if (isFirstRow) {
              responseProductId = resp?.productId ?? null;
              responseVariantId = resp?.variantId ?? null;
            }
          } catch (vErr: any) {
            if (isFirstRow) throw vErr;
            console.error(`Variant row ${i + 1} failed`, vErr);
          }
        }

        const total = variantRows.length;
        if (responseProductId) {
          this.showSuccess(`Product created with ${total} variant${total !== 1 ? 's' : ''}.`);
        } else {
          this.showSuccess('Product created successfully.');
        }
      }

      setTimeout(() => this.navigateBack(), 450);
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
