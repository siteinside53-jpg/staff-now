export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'worker' | 'business';
  acceptTerms: boolean;
}

export interface LoginResponse {
  user: { id: string; email: string; role: string; status: string };
  token: string;
}
