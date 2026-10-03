export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  birthday?: string | null;
  last_login_at?: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  message?: string;
  user: AuthUser;
}
