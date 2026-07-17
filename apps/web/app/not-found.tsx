import type { Metadata } from 'next';
import Link from 'next/link';
import { SadStrawberry } from '@/components/illustrations/sad-strawberry';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  description: 'Trang bạn đang tìm không tồn tại hoặc đã được chuyển đi nơi khác.',
};

/**
 * App-wide 404 fallback: any URL that doesn't match a route (or any `notFound()`
 * call) lands here instead of a bare error code on a blank screen. Server
 * component — no client JS needed.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pastel-pink via-background to-pastel-blue px-6 py-16 text-center">
      {/* playful floating dots */}
      <span className="pointer-events-none absolute left-[12%] top-[18%] h-4 w-4 rounded-full bg-primary/30" />
      <span className="pointer-events-none absolute right-[14%] top-[26%] h-6 w-6 rounded-full bg-pastel-blue" />
      <span className="pointer-events-none absolute bottom-[18%] left-[18%] h-5 w-5 rounded-full bg-pastel-yellow" />
      <span className="pointer-events-none absolute bottom-[24%] right-[16%] h-3 w-3 rounded-full bg-primary/40" />

      <SadStrawberry className="w-44 drop-shadow-sm sm:w-52" />

      <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
        Oops! Trang này đi lạc mất rồi
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        Có vẻ như trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác. Đừng lo, mình đưa
        bạn về nhà nhé!
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground/70">Mã lỗi: 404 — Không tìm thấy trang</p>
    </main>
  );
}
