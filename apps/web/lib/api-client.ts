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

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
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
  { body, auth = false, headers, ...init }: RequestOptions = {},
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
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload));
  }

  return payload as TResponse;
}
