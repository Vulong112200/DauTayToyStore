import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoading() {
  return (
    <section className="container py-12">
      <Skeleton className="h-9 w-32" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border">
            <Skeleton className="aspect-video rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
