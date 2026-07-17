import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { ProductListItem } from '@repo/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { formatVnd } from '@/lib/utils';

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
            🧸
          </div>
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
            Hết hàng
          </span>
        )}
        <WishlistButton product={product} className="absolute right-2 top-2" />
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        {product.brandName && (
          <span className="text-xs font-medium text-muted-foreground">{product.brandName}</span>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold hover:text-primary"
        >
          {product.name}
        </Link>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
            {product.avgRating.toFixed(1)} ({product.reviewCount})
          </div>
        )}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-primary">
            {formatVnd(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatVnd(product.compareAtPrice)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
