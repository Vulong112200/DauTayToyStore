import { cn } from '@/lib/utils';

/**
 * Base skeleton block — a muted, pulsing placeholder. Compose these into
 * page-shaped skeletons (see `product-card-skeleton`) and route `loading.tsx`
 * files so slow navigations show structure instead of a blank/frozen screen.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
