'use client';

import * as React from 'react';
import Link from 'next/link';
import { SadStrawberry } from '@/components/illustrations/sad-strawberry';
import { Button } from '@/components/ui/button';

/**
 * App-wide runtime-error fallback: any uncaught error while rendering a route
 * shows this friendly page (with a retry) instead of a blank/broken screen.
 * Must be a Client Component and accept `{ error, reset }` per Next.js.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the real error in the console for debugging; the user only sees the
    // friendly page above.
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pastel-pink via-background to-pastel-blue px-6 py-16 text-center">
      <span className="pointer-events-none absolute left-[12%] top-[18%] h-4 w-4 rounded-full bg-primary/30" />
      <span className="pointer-events-none absolute right-[14%] top-[26%] h-6 w-6 rounded-full bg-pastel-blue" />
      <span className="pointer-events-none absolute bottom-[18%] left-[18%] h-5 w-5 rounded-full bg-pastel-yellow" />

      <SadStrawberry className="w-44 drop-shadow-sm sm:w-52" />

      <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
        Ối! Có gì đó không ổn
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        Đã xảy ra một sự cố ngoài ý muốn. Bạn thử tải lại nhé — nếu vẫn chưa được, hãy quay về trang
        chủ giúp mình.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => reset()}>
          Thử lại
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-muted-foreground/70">Mã tham chiếu lỗi: {error.digest}</p>
      )}
    </main>
  );
}
