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
}

export interface SimilarProductsResult {
  product: Product;
  similar: Product[];
}
