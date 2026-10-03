export type OrderStatus =
  'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type DeliveryIssue = 'delayed' | 'customer_unreachable' | 'address_problem';
export interface Courier { id: number; name: string; email: string; latitude?: number | null; longitude?: number | null; location_updated_at?: string | null; }
export interface OrderStatusHistory { id: number; status: OrderStatus; created_at: string; }
export interface OrderItem {
  id: number;
  type: 'product' | 'custom_cake';
  product_id: number | null;
  name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  configuration: Record<string, unknown> | null;
}
export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
}
export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  total: string;
  delivery_date: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_zone_id?: number | null;
  phone: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cancellation_request?: string | null;
  notes: string | null;
  placed_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  delivery_issue?: DeliveryIssue | null;
  delivery_issue_note?: string | null;
  delivery_issue_at?: string | null;
  status_history?: OrderStatusHistory[];
  courier?: Courier | null;
  customer?: OrderCustomer;
  items: OrderItem[];
  payment?: Payment;
}
export type PaymentMethod = 'cash' | 'yape' | 'plin' | 'transfer';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export interface Payment {
  id: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  reference: string | null;
  reviewed_at: string | null;
}
export interface OrderPayload {
  delivery_date: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_zone_id: number | null;
  phone: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cancellation_request?: string | null;
  notes: string | null;
  payment_method: PaymentMethod;
}
export interface OrderResponse {
  data: Order;
}
export interface OrderCollection {
  data: Order[];
}
export interface CourierCollection { data: Courier[]; }

export interface OrderChange { id: number; actor_name: string; field: string; old_value: string | null; new_value: string | null; reason: string | null; created_at: string; }
