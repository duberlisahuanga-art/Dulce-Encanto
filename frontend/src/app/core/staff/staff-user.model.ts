export type StaffRole = 'administrador' | 'vendedor' | 'repartidor';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  created_at: string;
}

export interface StaffPayload {
  name: string;
  email: string;
  role: StaffRole;
  password?: string;
  password_confirmation?: string;
  permissions: string[];
}

export interface StaffCollection { data: StaffUser[] }
export interface StaffResponse { data: StaffUser }
