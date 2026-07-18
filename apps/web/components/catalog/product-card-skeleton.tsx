import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder matching the shape of `ProductCard` while a catalog page loads. */
export function ProductCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-5 w-1/2" />
      </CardContent>
    </Card>
  );
}

/** A responsive grid of product-card skeletons (same breakpoints as the catalog grid). */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
