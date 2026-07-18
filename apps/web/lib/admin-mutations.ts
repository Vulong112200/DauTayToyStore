import type { QueryClient } from '@tanstack/react-query';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * Shared success/error callbacks for admin delete mutations.
 *
 * Admin list-page deletes are fire-and-forget (`mutate(id)` with no local
 * handling), so a failure — including a STAFF 403 the backend enforces but the
 * UI doesn't pre-hide — used to be a silent no-op. These callbacks give every
 * delete a visible toast on both outcomes and keep the list refresh on success.
 */
export function deleteMutationCallbacks(
  queryClient: QueryClient,
  invalidateKey: readonly unknown[],
  successMessage: string,
  errorMessage: string,
) {
  return {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      toastSuccess(successMessage);
    },
    onError: (error: unknown) => toastError(error, errorMessage),
  };
}

/**
 * Shared success/error callbacks for admin create/update mutations.
 *
 * Unlike deletes (a single list key), a write may need to refresh several caches:
 * the list AND any per-item detail query (`['admin-product', id]`, etc.) an edit
 * page reads. The previous create/update hooks only invalidated the list key, so a
 * detail query — considered "fresh" for `staleTime` (60s) after the edit page first
 * loaded it — kept serving the pre-edit values when the page was reopened, making a
 * successful save look like it did nothing. `refetchType: 'all'` forces even the
 * currently-inactive detail query (unmounted while navigating back to the list) to
 * refetch, not just be marked stale. These callbacks also give every write a visible
 * success/error toast, which create/update previously lacked entirely.
 */
export function writeMutationCallbacks(
  queryClient: QueryClient,
  invalidateKeys: readonly (readonly unknown[])[],
  successMessage: string,
  errorMessage: string,
) {
  return {
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' });
      }
      toastSuccess(successMessage);
    },
    onError: (error: unknown) => toastError(error, errorMessage),
  };
}
