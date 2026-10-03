export interface CartItem {
  id: number;
  type: 'product' | 'custom_cake';
  product_id: number | null;
  name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  discount: string;
  total: string;
  image_url: string | null;
  promotion: {
    name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: string;
    savings: string;
  } | null;
  configuration: Record<string, unknown> | null;
}

export interface Cart {
  id: number;
  items: CartItem[];
  items_count: number;
  limits: { per_product: number; per_order: number };
  subtotal: string;
  discount: string;
  coupon_discount: string;
  free_delivery: boolean;
  total: string;
  coupon: {
    code: string;
    name: string;
    minimum_purchase: string;
    is_eligible: boolean;
    amount_remaining: string;
  } | null;
  currency: 'PEN';
}

export interface CartResponse {
  data: Cart;
}
