import { useAuthStore } from '@/store/auth-store';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'cache'> {
  body?: unknown;
  auth?: boolean;
  /** Seconds to cache the response for (Next.js ISR-style revalidation). Omit for no caching. */
  revalidateSeconds?: number;
}

function extractMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'Đã xảy ra lỗi, vui lòng thử lại';
}

export async function apiFetch<TResponse>(
  path: string,
  { body, auth = false, headers, revalidateSeconds, ...init }: RequestOptions = {},
): Promise<TResponse> {
  const accessToken = auth ? useAuthStore.getState().tokens?.accessToken : undefined;

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    method: init.method ?? (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(revalidateSeconds !== undefined
      ? { next: { revalidate: revalidateSeconds } }
      : { cache: 'no-store' as const }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload));
  }

  return payload as TResponse;
}

/** Separate from apiFetch because multipart/form-data needs the browser to set its own
 * Content-Type (with the multipart boundary) — apiFetch always forces application/json. */
export async function apiUpload<TResponse>(path: string, formData: FormData): Promise<TResponse> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;

  const response = await fetch(`${env.apiUrl}${path}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload));
  }

  return payload as TResponse;
}
