import { ProductGridSkeleton } from '@/components/catalog/product-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <section className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Skeleton className="h-9 w-40" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="mt-8">
        <ProductGridSkeleton count={8} />
      </div>
    </section>
  );
}
