import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

/** Success toast — thin wrapper so callers don't import sonner directly everywhere. */
export function toastSuccess(message: string) {
  toast.success(message);
}

/**
 * Error toast that pulls a human message out of whatever was thrown. `ApiError`
 * already carries the server's message (validation text, 403 reason, etc.); any
 * other Error uses its message; everything else falls back to `fallback`.
 */
export function toastError(error: unknown, fallback = 'Đã xảy ra lỗi, vui lòng thử lại') {
  const message =
    error instanceof ApiError || error instanceof Error ? error.message || fallback : fallback;
  toast.error(message);
}

export { toast };
