import type { Metadata } from 'next';
import Link from 'next/link';
import { FlashSaleCard } from '@/components/flash-sales/flash-sale-card';
import { FlashSaleCountdown } from '@/components/flash-sales/flash-sale-countdown';
import { Button } from '@/components/ui/button';
import { flashSalesApi } from '@/lib/api/flash-sales';

export const metadata: Metadata = {
  title: 'Flash Sale',
  description: 'Các đợt flash sale đang diễn ra tại DauTayToy Store — giá sốc, số lượng có hạn!',
};

export default async function FlashSalesPage() {
  // Degrade gracefully to the empty state if the API is momentarily unreachable,
  // rather than throwing the whole page to the error boundary.
  const flashSales = await flashSalesApi.active().catch(() => []);

  return (
    <section className="container py-12">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          <span aria-hidden>⚡</span> Flash Sale
        </h1>
        <p className="mt-2 text-muted-foreground">
          Giá sốc trong thời gian có hạn — nhanh tay kẻo lỡ!
        </p>
      </div>

      {flashSales.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <span className="text-6xl" aria-hidden>
            🍓
          </span>
          <h2 className="mt-4 font-display text-xl font-bold">Chưa có flash sale nào đang diễn ra</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hãy quay lại sau nhé — trong lúc chờ, ghé xem các sản phẩm khác của tụi mình!
          </p>
          <Button className="mt-6" asChild>
            <Link href="/products">Khám phá sản phẩm</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {flashSales.map((flashSale) => (
            <div key={flashSale.id}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold sm:text-2xl">{flashSale.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Kết thúc sau</span>
                  <FlashSaleCountdown endsAt={flashSale.endsAt} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {flashSale.items.map((item) => (
                  <FlashSaleCard key={item.productId} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
