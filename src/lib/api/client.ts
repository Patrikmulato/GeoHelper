import { config } from '@/config';

type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    // Handle both absolute URLs and relative paths
    let urlString: string;
    if (this.baseUrl.startsWith('http')) {
      // Absolute URL (production/dev backend)
      const url = new URL(path, this.baseUrl);
      urlString = url.toString();
    } else {
      // Relative path (Vercel rewrites)
      urlString = `${this.baseUrl}${path}`;
    }

    // Add query parameters if provided
    if (params) {
      const searchParams = new URLSearchParams(params);
      urlString = `${urlString}?${searchParams.toString()}`;
    }

    return urlString;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const hasBody = body !== undefined;

    const res = await fetch(url, {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, error.message ?? 'Request failed');
    }

    // Extract data from standardized API response format: { success, data, timestamp, path }
    const response = (await res.json()) as { success: boolean; data: T };
    return response.data;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(config.apiBaseUrl);
