export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, string>;
  /** Raw parsed error response body, for endpoints that attach structured
   * extras beyond the standard error envelope (e.g. a list of unmet
   * requirements). Most callers only need `details`. */
  readonly payload?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, string>,
    payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    const errorBody = body as Partial<ApiErrorBody> | undefined;
    throw new ApiError(
      errorBody?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorBody?.error?.code,
      errorBody?.error?.details,
      body,
    );
  }

  return body as T;
}
