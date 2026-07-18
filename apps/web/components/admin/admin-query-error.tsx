'use client';

import { AlertCircle } from 'lucide-react';
import { ApiError } from '@/lib/api-client';

/**
 * Inline error state for admin pages whose data comes from a react-query
 * `useQuery`. Previously these pages rendered "Đang tải..." on `isLoading || !data`,
 * which never resolves when the query *errors* (isLoading is false but data is
 * undefined) — the page hung on the spinner forever. Render this on `isError`
 * instead so a 404/permission/network failure is visible and retryable.
 */
export function AdminQueryError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : 'Đã xảy ra lỗi khi tải dữ liệu.';

  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 ${className ?? ''}`}
      role="alert"
    >
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="h-5 w-5" />
        Không thể tải dữ liệu
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
