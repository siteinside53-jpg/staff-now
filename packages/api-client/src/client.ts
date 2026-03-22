export interface ClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  headers?: Record<string, string>;
}

export class ApiClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...options?.headers,
    };

    if (this.config.getToken) {
      const token = await this.config.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401) {
      this.config.onUnauthorized?.();
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiClientError(
        (data as any).error?.message || 'Request failed',
        response.status,
        (data as any).error?.code,
      );
    }

    return data as T;
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>('GET', path, { params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }

  async upload<T>(path: string, file: File | Blob, fieldName = 'file'): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = { ...this.config.headers };

    if (this.config.getToken) {
      const token = await this.config.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401) {
      this.config.onUnauthorized?.();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new ApiClientError(
        (data as any).error?.message || 'Upload failed',
        response.status,
        (data as any).error?.code,
      );
    }

    return data as T;
  }
}

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}
