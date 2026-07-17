import Image from 'next/image';
import Link from 'next/link';
import type { PublicFlashSaleItem } from '@repo/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { formatVnd } from '@/lib/utils';

export function FlashSaleCard({ item }: { item: PublicFlashSaleItem }) {
  const sold = item.soldCount;
  const limit = item.stockLimit;
  const soldPercent = limit && limit > 0 ? Math.min(100, Math.round((sold / limit) * 100)) : null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <Link
        href={`/products/${item.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {item.primaryImageUrl ? (
          <Image
            src={item.primaryImageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
            🧸
          </div>
        )}
        {item.discountPercent > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
            -{item.discountPercent}%
          </span>
        )}
        {item.soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-bold text-foreground">
            Đã bán hết
          </span>
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/products/${item.slug}`}
          className="line-clamp-2 text-sm font-semibold hover:text-primary"
        >
          {item.name}
        </Link>

        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-primary">
            {formatVnd(item.salePrice)}
          </span>
          {item.originalPrice > item.salePrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatVnd(item.originalPrice)}
            </span>
          )}
        </div>

        {soldPercent !== null ? (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${soldPercent}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Đã bán {sold}/{limit}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Đã bán {sold}</p>
        )}
      </CardContent>
    </Card>
  );
}
