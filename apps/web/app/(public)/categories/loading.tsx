import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesLoading() {
  return (
    <section className="container py-12">
      <Skeleton className="h-9 w-56" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-full">
            <CardContent className="flex gap-4 p-6">
              <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
