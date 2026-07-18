import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic loading skeleton for the /admin subtree (title + a table-ish block).
 * Shows while a route segment's code/data resolves, instead of a blank panel.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
