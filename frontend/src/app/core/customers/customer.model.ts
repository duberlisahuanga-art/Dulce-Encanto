import { Order } from '../orders/order.model';

export interface Customer {
  id: number;
  name: string;
  email: string;
  registered_at: string;
  orders_count: number;
  total_spent: string;
  orders?: Order[];
}

export interface CustomerCollection {
  data: Customer[];
}
export interface CustomerResponse {
  data: Customer;
}
