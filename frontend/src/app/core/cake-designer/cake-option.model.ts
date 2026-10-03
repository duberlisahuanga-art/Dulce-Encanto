export type CakeOptionType = 'size' | 'flavor' | 'filling' | 'covering' | 'decoration' | 'extra';

export interface CakeOption {
  image_url?: string | null;
  id: number;
  type: CakeOptionType;
  name: string;
  slug: string;
  description: string | null;
  price_adjustment: string;
  servings: number | null;
  available_colors: string[];
  sort_order: number;
  is_active: boolean;
}

export interface CakeOptions {
  size: CakeOption[];
  flavor: CakeOption[];
  filling: CakeOption[];
  covering: CakeOption[];
  decoration: CakeOption[];
  extra: CakeOption[];
}

export interface CakeQuotePayload {
  size_id: number;
  flavor_id: number;
  filling_id: number;
  covering_id: number;
  decoration_id: number;
  extra_ids: number[];
  color: string | null;
  secondary_color: string | null;
  detail_color: string | null;
  shape: string | null;
  product_type: 'cake';
  theme: string | null;
  dedication: string | null;
  delivery_date: string;
}

export interface CakeQuote {
  total: string;
  currency: 'PEN';
  selections: CakeOption[];
  color: string | null;
  secondary_color: string | null;
  detail_color: string | null;
  shape: string | null;
  product_type: 'cake';
  theme: string | null;
  dedication: string | null;
  delivery_date: string;
}

export interface CakeImage {
  image_url: string;
  image_path: string;
  model: string;
}

export interface CakeOptionPayload {
  image?: File;
  remove_image?: boolean;
  type: CakeOptionType;
  name: string;
  slug: string;
  description: string | null;
  price_adjustment: number;
  servings: number | null;
  available_colors: string[];
  sort_order: number;
  is_active: boolean;
}
