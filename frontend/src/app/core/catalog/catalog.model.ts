export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
  products?: Product[];
}

export interface Product {
  id: number;
  category_id: number;
  category?: Category;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  original_price?: string;
  discounted_price?: string;
  promotion?: ProductPromotion | null;
  coupon_promotion?: ProductPromotion | null;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
}

export interface ProductPromotion {
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  discount: string;
  coupon_code: string | null;
  minimum_purchase: string;
  ends_at: string;
}

export interface ApiCollection<T> {
  data: T[];
}

export interface ApiItem<T> {
  data: T;
}

export interface ProductDetailResponse {
  data: Product;
  related: Product[];
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}
