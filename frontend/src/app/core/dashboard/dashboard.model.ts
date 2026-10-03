import { Order } from '../orders/order.model';

export interface SalesDay {
  date: string;
  label: string;
  total: string;
}
export interface TopProduct {
  name: string;
  quantity: number;
  total: string;
}
export interface DashboardData {
  orders_today: number;
  sales_today: string;
  pending_orders: number;
  customers: number;
  orders_period: number;
  sales_period: string;
  date_from: string;
  date_to: string;
  period_days: number;
  status_filter: string;
  sales_by_day: SalesDay[];
  top_products: TopProduct[];
  recent_orders: Order[];
}
export interface DashboardResponse {
  data: DashboardData;
}
