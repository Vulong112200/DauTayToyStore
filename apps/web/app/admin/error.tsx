'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Framework-level error boundary for the whole /admin subtree. Any uncaught
 * render error under /admin lands here with a retry, instead of a blank screen.
 * Kept simpler/denser than the public `app/error.tsx` mascot page — admins want
 * the reference code and a fast retry, not a full-bleed illustration.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-center gap-2 font-display text-xl font-bold text-destructive">
        <AlertTriangle className="h-6 w-6" />
        Đã xảy ra lỗi
      </div>
      <p className="max-w-lg text-sm text-muted-foreground">
        Trang quản trị gặp sự cố ngoài ý muốn. Bạn thử lại nhé — nếu vẫn chưa được, hãy quay lại
        trang tổng quan.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Thử lại</Button>
        <Button variant="outline" asChild>
          <Link href="/admin">Về trang tổng quan</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/70">Mã tham chiếu lỗi: {error.digest}</p>
      )}
    </div>
  );
}
