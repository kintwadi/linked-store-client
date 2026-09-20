export interface ProductVariant {
  id: string;
  sku: string;
  retailPriceCents: number;
  wholesalePriceCents?: number;
  imageUrl?: string;
  stockQuantity: number;
  storeId: string;
  variantAttributes?: Record<string, any> | null;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  primaryImageUrl: string;
  thumbnailUrl?: string;
  galleryImages?: string[];
  retailPriceCents: number;
  wholesalePriceCents?: number;
  currency: string;
  category?: string;
  brand?: string;
  inStock: boolean;
  variantId?: string;
  storeId?: string;
  sku?: string;
  variants?: ProductVariant[];
}

export interface SimilarProductsResult {
  product: Product;
  similar: Product[];
}
