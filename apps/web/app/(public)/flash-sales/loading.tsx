import { ProductGridSkeleton } from '@/components/catalog/product-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function FlashSalesLoading() {
  return (
    <section className="container py-12">
      <div className="mb-10 flex flex-col items-center gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <ProductGridSkeleton count={4} />
      </div>
    </section>
  );
}
