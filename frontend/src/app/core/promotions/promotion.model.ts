export type DiscountType = 'percentage' | 'fixed';

export interface Promotion {
  id: number;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  applies_to_all: boolean;
  banner_url: string | null;
  accent_color: string;
  cta_label: string;
  coupon_code: string | null;
  requires_coupon: boolean;
  minimum_purchase: string;
  products: Product[];
}

export interface PromotionCollection {
  data: Promotion[];
}
export interface PromotionResponse {
  data: Promotion;
}
import { Product } from '../catalog/catalog.model';
