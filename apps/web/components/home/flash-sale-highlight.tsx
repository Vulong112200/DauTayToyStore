import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FlashSaleCard } from '@/components/flash-sales/flash-sale-card';
import { FlashSaleCountdown } from '@/components/flash-sales/flash-sale-countdown';
import { flashSalesApi } from '@/lib/api/flash-sales';

/**
 * Prominent homepage strip for the soonest-ending active flash sale — the main
 * visible cue that a sale is running. Renders nothing when there's no active sale
 * (or the API is unreachable), so it never leaves an empty section behind.
 */
export async function FlashSaleHighlight() {
  const flashSales = await flashSalesApi.active().catch(() => []);
  const featured = flashSales.find((sale) => sale.items.length > 0);
  if (!featured) return null;

  return (
    <section className="container py-12">
      <div className="rounded-3xl bg-gradient-to-br from-pastel-pink via-background to-pastel-yellow p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              <span aria-hidden>⚡</span> {featured.name}
            </h2>
            <FlashSaleCountdown endsAt={featured.endsAt} />
          </div>
          <Link
            href="/flash-sales"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.items.slice(0, 4).map((item) => (
            <FlashSaleCard key={item.productId} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
